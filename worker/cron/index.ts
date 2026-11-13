import type { Env } from '../types';
import { FacebookProvider } from '../services/facebook';
import { decrypt, generateId } from '../utils/crypto';

export async function handleScheduled(event: ScheduledEvent, env: Env) {
  const cron = event.cron;
  console.log(`[cron] Running: ${cron}`);

  try {
    if (cron === '0 */6 * * *') {
      // Every 6 hours
      await processScheduledPosts(env);
      await syncAnalytics(env);
    } else if (cron === '0 2 * * *') {
      // Daily cleanup
      await checkTokenExpiration(env);
      await cleanupOldLogs(env);
    }
  } catch (e) {
    console.error('[cron] Error:', e);
  }
}

async function processScheduledPosts(env: Env) {
  const now = new Date().toISOString();
  const due = await env.DB.prepare(
    `SELECT p.id, p.brand_id, pp.id as pp_id, pp.social_account_id, pp.platform,
            pp.caption, pp.media_ids, pp.link_url, pp.first_comment
     FROM posts p
     JOIN post_platforms pp ON pp.post_id = p.id
     WHERE p.status = 'scheduled' AND p.scheduled_at <= ? AND pp.status = 'scheduled'
     LIMIT 20`
  )
    .bind(now)
    .all();

  for (const row of due.results || []) {
    try {
      await env.DB.prepare(
        `UPDATE posts SET status = 'publishing', updated_at = datetime('now') WHERE id = ?`
      )
        .bind(row.id)
        .run();
      await env.DB.prepare(
        `UPDATE post_platforms SET status = 'publishing' WHERE id = ?`
      )
        .bind(row.pp_id)
        .run();

      // Load token
      const tokenRow = await env.DB.prepare(
        `SELECT access_token_encrypted FROM oauth_tokens WHERE social_account_id = ?`
      )
        .bind(row.social_account_id)
        .first<{ access_token_encrypted: string }>();

      if (!tokenRow) {
        throw new Error('No token found');
      }

      const accessToken = await decrypt(tokenRow.access_token_encrypted, env.ENCRYPTION_KEY);
      const account = await env.DB.prepare(
        `SELECT platform_account_id FROM social_accounts WHERE id = ?`
      )
        .bind(row.social_account_id)
        .first<{ platform_account_id: string }>();

      if (row.platform === 'facebook' && account) {
        const fb = new FacebookProvider(env);
        const result = await fb.publishPost(account.platform_account_id, accessToken, {
          caption: row.caption as string,
          linkUrl: row.link_url as string | undefined,
        });

        await env.DB.prepare(
          `UPDATE post_platforms SET status = 'published', platform_post_id = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(result.platformPostId, result.publishedAt, row.pp_id)
          .run();

        // Check if all platforms for this post are done
        const pending = await env.DB.prepare(
          `SELECT COUNT(*) as c FROM post_platforms WHERE post_id = ? AND status NOT IN ('published', 'failed')`
        )
          .bind(row.id)
          .first<{ c: number }>();

        if ((pending?.c || 0) === 0) {
          await env.DB.prepare(
            `UPDATE posts SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
          )
            .bind(row.id)
            .run();
        }
      } else {
        // Platform not yet implemented for publishing
        await env.DB.prepare(
          `UPDATE post_platforms SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?`
        )
          .bind('Publishing not implemented for this platform yet', row.pp_id)
          .run();
      }
    } catch (e: any) {
      console.error(`[cron] Publish failed for post ${row.id}:`, e.message);
      await env.DB.prepare(
        `UPDATE post_platforms SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(e.message || 'Unknown error', row.pp_id)
        .run();
      await env.DB.prepare(
        `UPDATE posts SET status = 'failed', updated_at = datetime('now') WHERE id = ?`
      )
        .bind(row.id)
        .run();
    }
  }
}

async function syncAnalytics(env: Env) {
  const accounts = await env.DB.prepare(
    `SELECT sa.id, sa.platform, sa.platform_account_id
     FROM social_accounts sa
     WHERE sa.status = 'connected' AND sa.platform = 'facebook'
     LIMIT 10`
  ).all();

  const fb = new FacebookProvider(env);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const acc of accounts.results || []) {
    try {
      const tokenRow = await env.DB.prepare(
        `SELECT access_token_encrypted FROM oauth_tokens WHERE social_account_id = ?`
      )
        .bind(acc.id)
        .first<{ access_token_encrypted: string }>();
      if (!tokenRow) continue;

      const token = await decrypt(tokenRow.access_token_encrypted, env.ENCRYPTION_KEY);
      const analytics = await fb.getAnalytics(acc.platform_account_id as string, token, {
        from: weekAgo,
        to: today,
      });

      if (analytics.available) {
        await env.DB.prepare(
          `INSERT INTO analytics_daily
           (id, social_account_id, date, followers, reach, impressions, engagement, clicks, video_views, posts_count, raw_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(social_account_id, date) DO UPDATE SET
             followers = excluded.followers,
             reach = excluded.reach,
             impressions = excluded.impressions,
             engagement = excluded.engagement,
             clicks = excluded.clicks,
             video_views = excluded.video_views,
             posts_count = excluded.posts_count,
             raw_data = excluded.raw_data`
        )
          .bind(
            generateId(),
            acc.id,
            today,
            analytics.followers ?? null,
            analytics.reach ?? null,
            analytics.impressions ?? null,
            analytics.engagement ?? null,
            analytics.clicks ?? null,
            analytics.videoViews ?? null,
            analytics.postsCount ?? null,
            JSON.stringify(analytics.raw || {})
          )
          .run();

        await env.DB.prepare(
          `UPDATE social_accounts SET last_synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        )
          .bind(acc.id)
          .run();
      }
    } catch (e: any) {
      console.error(`[cron] Analytics sync failed for ${acc.id}:`, e.message);
      await env.DB.prepare(
        `UPDATE social_accounts SET status = 'error', updated_at = datetime('now') WHERE id = ?`
      )
        .bind(acc.id)
        .run();
    }
  }
}

async function checkTokenExpiration(env: Env) {
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `UPDATE social_accounts
     SET status = 'needs_reconnect', updated_at = datetime('now')
     WHERE token_expires_at IS NOT NULL AND token_expires_at < ? AND status = 'connected'`
  )
    .bind(soon)
    .run();
}

async function cleanupOldLogs(env: Env) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(`DELETE FROM api_logs WHERE created_at < ?`).bind(cutoff).run();
}
