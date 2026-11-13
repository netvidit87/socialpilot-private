import type { Env } from './types';
import { json, error, unauthorized, notFound, serverError } from './utils/response';
import {
  getSessionUserId,
  createSession,
  sessionCookie,
  clearSessionCookie,
  ensureSingleUser,
  hashPassword,
  verifyPassword,
  generateId,
} from './utils/auth';
import { FacebookProvider } from './services/facebook';
import { encrypt, decrypt } from './utils/crypto';

export { handleScheduled } from './cron/index';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS for local dev
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request),
      });
    }

    try {
      // Public routes
      if (path === '/api/health') {
        return withCors(json({ status: 'ok', app: env.APP_NAME }), request);
      }

      if (path === '/api/auth/status') {
        const userId = await getSessionUserId(request, env);
        const hasUser = !!(await ensureSingleUser(env));
        return withCors(
          json({
            authenticated: !!userId,
            setupRequired: !hasUser,
          }),
          request
        );
      }

      if (path === '/api/auth/setup' && request.method === 'POST') {
        return withCors(await handleSetup(request, env), request);
      }

      if (path === '/api/auth/login' && request.method === 'POST') {
        return withCors(await handleLogin(request, env), request);
      }

      if (path === '/api/auth/logout' && request.method === 'POST') {
        return withCors(
          new Response(JSON.stringify({ success: true, data: null, error: null }), {
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': clearSessionCookie(),
            },
          }),
          request
        );
      }

      // Public OAuth callback (Facebook redirects here — no session cookie required)
      if (path === '/api/oauth/facebook/callback' && request.method === 'GET') {
        return await handleFacebookCallback(request, env);
      }

      // Protected routes
      const userId = await getSessionUserId(request, env);
      if (!userId && path.startsWith('/api/')) {
        return withCors(unauthorized(), request);
      }

      // API Router
      if (path.startsWith('/api/')) {
        const res = await routeApi(path, request, env, userId!);
        return withCors(res, request);
      }

      // Serve frontend static assets (Workers Assets / SPA)
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response('Not found — run npm run build before deploy', { status: 404 });
    } catch (e: any) {
      console.error(e);
      return withCors(serverError(e.message || 'Unexpected error'), request);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const { handleScheduled } = await import('./cron/index');
    ctx.waitUntil(handleScheduled(event, env));
  },
};

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function withCors(res: Response, request: Request): Response {
  const headers = new Headers(res.headers);
  const cors = corsHeaders(request);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v as string));
  return new Response(res.body, { status: res.status, headers });
}

// --------------- Auth handlers ---------------

async function handleSetup(request: Request, env: Env): Promise<Response> {
  const existing = await ensureSingleUser(env);
  if (existing) {
    return error('ALREADY_SETUP', 'Application already set up. Please login.', 400);
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!body.password || body.password.length < 8) {
    return error('VALIDATION', 'Password must be at least 8 characters');
  }

  const id = generateId();
  const passwordHash = await hashPassword(body.password, env.SESSION_SECRET);

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)`
  )
    .bind(id, body.email || null, passwordHash, body.displayName || 'Admin')
    .run();

  // Create default brand
  const brandId = generateId();
  await env.DB.prepare(
    `INSERT INTO brands (id, user_id, name, timezone) VALUES (?, ?, ?, ?)`
  )
    .bind(brandId, id, 'My Brand', 'UTC')
    .run();

  const token = await createSession(id, env);
  return new Response(
    JSON.stringify({
      success: true,
      data: { userId: id, brandId },
      error: null,
    }),
    {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie(token),
      },
    }
  );
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { password?: string; email?: string };
  if (!body.password) return error('VALIDATION', 'Password required');

  const user = await env.DB.prepare(`SELECT id, password_hash, email FROM users LIMIT 1`).first<{
    id: string;
    password_hash: string;
    email: string | null;
  }>();

  if (!user) {
    return error('NOT_SETUP', 'Application not set up yet. Complete initial setup first.', 400);
  }

  const ok = await verifyPassword(body.password, user.password_hash, env.SESSION_SECRET);
  if (!ok) return error('INVALID_CREDENTIALS', 'Invalid password', 401);

  await env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`)
    .bind(user.id)
    .run();

  const token = await createSession(user.id, env);
  return new Response(
    JSON.stringify({
      success: true,
      data: { userId: user.id },
      error: null,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie(token),
      },
    }
  );
}

// --------------- Facebook OAuth callback (public) ---------------

async function handleFacebookCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');

  const fail = (msg: string) =>
    Response.redirect(`${origin}/settings/connections?error=${encodeURIComponent(msg)}`, 302);

  if (oauthError) return fail(oauthError);
  if (!code || !stateRaw) return fail('Missing authorization code from Facebook');

  let state: { brandId: string; userId: string; origin?: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return fail('Invalid OAuth state');
  }

  const fb = new FacebookProvider(env);
  const redirectUri = `${origin}/api/oauth/facebook/callback`;

  try {
    const result = await fb.connect({ code, redirectUri });
    const encrypted = await encrypt(result.accessToken, env.ENCRYPTION_KEY);

    // Upsert: update if same page already connected
    const existing = await env.DB.prepare(
      `SELECT id FROM social_accounts WHERE platform = 'facebook' AND platform_account_id = ?`
    )
      .bind(result.platformAccountId)
      .first<{ id: string }>();

    let accountId: string;
    if (existing) {
      accountId = existing.id;
      await env.DB.prepare(
        `UPDATE social_accounts SET
           brand_id = ?, account_name = ?, profile_picture_url = ?, status = 'connected',
           scopes = ?, token_expires_at = ?, metadata = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(
          state.brandId,
          result.accountName,
          result.profilePictureUrl || null,
          JSON.stringify(result.scopes),
          result.expiresAt || null,
          JSON.stringify(result.metadata || {}),
          accountId
        )
        .run();

      await env.DB.prepare(
        `UPDATE oauth_tokens SET
           access_token_encrypted = ?, expires_at = ?, scopes = ?, updated_at = datetime('now')
         WHERE social_account_id = ?`
      )
        .bind(
          encrypted,
          result.expiresAt || null,
          JSON.stringify(result.scopes),
          accountId
        )
        .run();
    } else {
      accountId = generateId();
      await env.DB.prepare(
        `INSERT INTO social_accounts
         (id, brand_id, platform, platform_account_id, account_name, profile_picture_url, status, scopes, token_expires_at, metadata)
         VALUES (?, ?, 'facebook', ?, ?, ?, 'connected', ?, ?, ?)`
      )
        .bind(
          accountId,
          state.brandId,
          result.platformAccountId,
          result.accountName,
          result.profilePictureUrl || null,
          JSON.stringify(result.scopes),
          result.expiresAt || null,
          JSON.stringify(result.metadata || {})
        )
        .run();

      await env.DB.prepare(
        `INSERT INTO oauth_tokens (id, social_account_id, access_token_encrypted, expires_at, scopes)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          generateId(),
          accountId,
          encrypted,
          result.expiresAt || null,
          JSON.stringify(result.scopes)
        )
        .run();
    }

    return Response.redirect(
      `${origin}/settings/connections?connected=facebook&name=${encodeURIComponent(result.accountName)}`,
      302
    );
  } catch (e: any) {
    console.error('Facebook OAuth error:', e);
    return fail(e.message || 'Facebook connection failed');
  }
}

// --------------- API Router ---------------

async function routeApi(
  path: string,
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const method = request.method;
  const url = new URL(request.url);

  // Brands
  if (path === '/api/brands' && method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT * FROM brands WHERE user_id = ? ORDER BY created_at`
    )
      .bind(userId)
      .all();
    return json(rows.results);
  }

  if (path === '/api/brands' && method === 'POST') {
    const body = (await request.json()) as { name: string; timezone?: string; description?: string };
    if (!body.name) return error('VALIDATION', 'Name required');
    const id = generateId();
    await env.DB.prepare(
      `INSERT INTO brands (id, user_id, name, timezone, description) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, userId, body.name, body.timezone || 'UTC', body.description || null)
      .run();
    return json({ id }, 201);
  }

  if (path.match(/^\/api\/brands\/[^/]+$/) && method === 'PUT') {
    const id = path.split('/').pop()!;
    const body = (await request.json()) as any;
    await env.DB.prepare(
      `UPDATE brands SET name = COALESCE(?, name), timezone = COALESCE(?, timezone),
       description = COALESCE(?, description), updated_at = datetime('now') WHERE id = ? AND user_id = ?`
    )
      .bind(body.name ?? null, body.timezone ?? null, body.description ?? null, id, userId)
      .run();
    return json({ id });
  }

  if (path.match(/^\/api\/brands\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop()!;
    await env.DB.prepare(`DELETE FROM brands WHERE id = ? AND user_id = ?`).bind(id, userId).run();
    return json({ deleted: true });
  }

  // Accounts / Connections
  if (path === '/api/accounts' && method === 'GET') {
    const brandId = url.searchParams.get('brandId');
    let query = `
      SELECT sa.*, b.name as brand_name
      FROM social_accounts sa
      JOIN brands b ON b.id = sa.brand_id
      WHERE b.user_id = ?
    `;
    const params: any[] = [userId];
    if (brandId) {
      query += ` AND sa.brand_id = ?`;
      params.push(brandId);
    }
    query += ` ORDER BY sa.platform, sa.account_name`;
    const rows = await env.DB.prepare(query).bind(...params).all();
    return json(rows.results);
  }

  // Facebook OAuth start — opens Facebook login in browser
  if (path === '/api/accounts/connect/facebook' && method === 'GET') {
    const fb = new FacebookProvider(env);
    if (!fb.isConfigured()) {
      return error(
        'NOT_CONFIGURED',
        'Meta App belum dikonfigurasi. Jalankan: npx wrangler secret put META_APP_ID dan META_APP_SECRET'
      );
    }
    const brandId = url.searchParams.get('brandId');
    if (!brandId) return error('VALIDATION', 'brandId required');

    // Use live request origin so redirect matches production workers.dev URL
    const origin = url.origin;
    const state = btoa(JSON.stringify({ brandId, userId, ts: Date.now(), origin }));
    const redirectUri = `${origin}/api/oauth/facebook/callback`;
    const oauthUrl = fb.getOAuthUrl(redirectUri, state);
    return json({ url: oauthUrl, redirectUri });
  }

  // Disconnect account
  if (path.match(/^\/api\/accounts\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop()!;
    // Verify ownership
    const row = await env.DB.prepare(
      `SELECT sa.id FROM social_accounts sa
       JOIN brands b ON b.id = sa.brand_id
       WHERE sa.id = ? AND b.user_id = ?`
    )
      .bind(id, userId)
      .first();
    if (!row) return notFound('Account not found');
    await env.DB.prepare(`DELETE FROM social_accounts WHERE id = ?`).bind(id).run();
    return json({ deleted: true });
  }

  // Posts
  if (path === '/api/posts' && method === 'GET') {
    const brandId = url.searchParams.get('brandId');
    const status = url.searchParams.get('status');
    let query = `
      SELECT p.*, 
        (SELECT GROUP_CONCAT(pp.platform) FROM post_platforms pp WHERE pp.post_id = p.id) as platforms
      FROM posts p
      JOIN brands b ON b.id = p.brand_id
      WHERE b.user_id = ?
    `;
    const params: any[] = [userId];
    if (brandId) {
      query += ` AND p.brand_id = ?`;
      params.push(brandId);
    }
    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY p.created_at DESC LIMIT 100`;
    const rows = await env.DB.prepare(query).bind(...params).all();
    return json(rows.results);
  }

  if (path === '/api/posts' && method === 'POST') {
    const body = (await request.json()) as {
      brandId: string;
      title?: string;
      status?: string;
      scheduledAt?: string;
      campaign?: string;
      notes?: string;
      platforms: Array<{
        socialAccountId: string;
        platform: string;
        caption?: string;
        title?: string;
        description?: string;
        hashtags?: string[];
        mediaIds?: string[];
        linkUrl?: string;
        firstComment?: string;
        altText?: string;
      }>;
    };

    if (!body.brandId || !body.platforms?.length) {
      return error('VALIDATION', 'brandId and at least one platform required');
    }

    const postId = generateId();
    await env.DB.prepare(
      `INSERT INTO posts (id, brand_id, title, status, scheduled_at, campaign, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        postId,
        body.brandId,
        body.title || null,
        body.status || 'draft',
        body.scheduledAt || null,
        body.campaign || null,
        body.notes || null,
        userId
      )
      .run();

    for (const p of body.platforms) {
      await env.DB.prepare(
        `INSERT INTO post_platforms
         (id, post_id, social_account_id, platform, caption, title, description, hashtags, media_ids, link_url, first_comment, alt_text, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          generateId(),
          postId,
          p.socialAccountId,
          p.platform,
          p.caption || null,
          p.title || null,
          p.description || null,
          p.hashtags ? JSON.stringify(p.hashtags) : null,
          p.mediaIds ? JSON.stringify(p.mediaIds) : null,
          p.linkUrl || null,
          p.firstComment || null,
          p.altText || null,
          body.status || 'draft'
        )
        .run();
    }

    return json({ id: postId }, 201);
  }

  // Analytics overview
  if (path === '/api/analytics' && method === 'GET') {
    const brandId = url.searchParams.get('brandId');
    // Aggregate last known analytics
    let query = `
      SELECT 
        SUM(ad.followers) as total_followers,
        SUM(ad.reach) as total_reach,
        SUM(ad.impressions) as total_impressions,
        SUM(ad.engagement) as total_engagement,
        SUM(ad.posts_count) as total_posts,
        SUM(ad.video_views) as total_video_views,
        SUM(ad.clicks) as total_clicks
      FROM analytics_daily ad
      JOIN social_accounts sa ON sa.id = ad.social_account_id
      JOIN brands b ON b.id = sa.brand_id
      WHERE b.user_id = ?
        AND ad.date = (SELECT MAX(date) FROM analytics_daily WHERE social_account_id = ad.social_account_id)
    `;
    const params: any[] = [userId];
    if (brandId) {
      query += ` AND sa.brand_id = ?`;
      params.push(brandId);
    }
    const row = await env.DB.prepare(query).bind(...params).first();
    return json({
      followers: row?.total_followers ?? null,
      reach: row?.total_reach ?? null,
      impressions: row?.total_impressions ?? null,
      engagement: row?.total_engagement ?? null,
      posts: row?.total_posts ?? null,
      videoViews: row?.total_video_views ?? null,
      clicks: row?.total_clicks ?? null,
      note: 'Values are from last successful sync. Connect accounts and run sync to populate.',
    });
  }

  // System status
  if (path === '/api/system/status' && method === 'GET') {
    const accounts = await env.DB.prepare(
      `SELECT platform, status, COUNT(*) as count FROM social_accounts sa
       JOIN brands b ON b.id = sa.brand_id WHERE b.user_id = ?
       GROUP BY platform, status`
    )
      .bind(userId)
      .all();

    return json({
      worker: 'healthy',
      database: 'healthy',
      storage: 'healthy',
      accounts: accounts.results,
      metaConfigured: !!(env.META_APP_ID && env.META_APP_SECRET),
      aiConfigured: !!env.AI_API_KEY,
      youtubeConfigured: !!env.YOUTUBE_API_KEY,
      tiktokConfigured: !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),
    });
  }

  // AI generate (cost controlled)
  if (path === '/api/ai/generate' && method === 'POST') {
    if (!env.AI_API_KEY) {
      return error('NOT_CONFIGURED', 'AI_API_KEY not set');
    }

    // Check daily limit
    const today = new Date().toISOString().slice(0, 10);
    const usage = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM ai_usage WHERE user_id = ? AND date(created_at) = ?`
    )
      .bind(userId, today)
      .first<{ c: number }>();

    const limitRow = await env.DB.prepare(
      `SELECT value FROM settings WHERE user_id = ? AND key = 'ai_daily_limit'`
    )
      .bind(userId)
      .first<{ value: string }>();
    const dailyLimit = parseInt(limitRow?.value || '10', 10);

    if ((usage?.c || 0) >= dailyLimit) {
      return error('AI_LIMIT', `Daily AI limit reached (${dailyLimit}). Increase in Settings > AI.`);
    }

    const body = (await request.json()) as {
      action: string;
      topic?: string;
      platform?: string;
      tone?: string;
      language?: string;
      caption?: string;
    };

    // Call OpenAI-compatible API
    try {
      const prompt = buildAiPrompt(body);
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional social media content assistant. Reply with concise, ready-to-use content. Prefer JSON when multiple fields are requested.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      const aiData = (await aiRes.json()) as any;
      if (!aiRes.ok) {
        return error('AI_ERROR', aiData.error?.message || 'AI request failed');
      }

      const content = aiData.choices?.[0]?.message?.content || '';

      await env.DB.prepare(
        `INSERT INTO ai_usage (id, user_id, action, model, tokens_used) VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          generateId(),
          userId,
          body.action || 'generate',
          'gpt-4o-mini',
          aiData.usage?.total_tokens || 0
        )
        .run();

      return json({ content, usage: aiData.usage });
    } catch (e: any) {
      return error('AI_ERROR', e.message);
    }
  }

  // AI usage stats
  if (path === '/api/ai/usage' && method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM ai_usage WHERE user_id = ? AND date(created_at) = ?`
    )
      .bind(userId, today)
      .first<{ c: number }>();

    const monthStart = today.slice(0, 8) + '01';
    const monthCount = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM ai_usage WHERE user_id = ? AND created_at >= ?`
    )
      .bind(userId, monthStart)
      .first<{ c: number }>();

    return json({
      today: todayCount?.c || 0,
      thisMonth: monthCount?.c || 0,
    });
  }

  return notFound(`API route not found: ${method} ${path}`);
}

function buildAiPrompt(body: {
  action: string;
  topic?: string;
  platform?: string;
  tone?: string;
  language?: string;
  caption?: string;
}): string {
  const lang = body.language || 'English';
  const tone = body.tone || 'professional';
  const platform = body.platform || 'general social media';

  switch (body.action) {
    case 'rewrite':
      return `Rewrite this caption for ${platform} in a ${tone} tone, language: ${lang}. Keep the core message:\n\n${body.caption}`;
    case 'hashtags':
      return `Generate 10-15 relevant hashtags for a ${platform} post about: ${body.topic || body.caption}. Language: ${lang}. Return only the hashtags separated by spaces.`;
    case 'shorten':
      return `Shorten this caption for ${platform} while keeping the key message. Language: ${lang}:\n\n${body.caption}`;
    case 'expand':
      return `Expand this caption for ${platform} in a ${tone} tone. Language: ${lang}:\n\n${body.caption}`;
    default:
      return `Generate a ready-to-post caption for ${platform}.
Topic: ${body.topic || 'general'}
Tone: ${tone}
Language: ${lang}
Include a short call-to-action if appropriate.
Return only the caption text.`;
  }
}
