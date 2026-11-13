/**
 * Meta Graph API integration for Facebook Pages.
 * Official API only. No scraping.
 *
 * Required permissions (request in Meta App):
 * - pages_show_list
 * - pages_read_engagement
 * - pages_manage_posts
 * - pages_read_user_content
 * - read_insights (for analytics)
 */

import type {
  SocialProvider,
  ConnectParams,
  ConnectResult,
  Profile,
  PublishInput,
  PublishResult,
  DateRange,
  AnalyticsSnapshot,
  PaginationOptions,
  Post,
  Comment,
  Env,
} from '../types';
import { encrypt, decrypt } from '../utils/crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export class FacebookProvider implements SocialProvider {
  platform = 'facebook' as const;

  constructor(private env: Env) {}

  private get appId() {
    return this.env.META_APP_ID;
  }
  private get appSecret() {
    return this.env.META_APP_SECRET;
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  getOAuthUrl(redirectUri: string, state: string): string {
    if (!this.isConfigured()) {
      throw new Error('Meta App credentials not configured');
    }
    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: redirectUri,
      state,
      scope: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content',
        'read_insights',
      ].join(','),
      response_type: 'code',
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  }

  async connect(params: ConnectParams): Promise<ConnectResult> {
    if (!this.isConfigured()) {
      throw new Error('Meta App credentials not configured');
    }
    if (!params.code) throw new Error('Missing authorization code');

    // Exchange code for user access token
    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', this.appId!);
    tokenUrl.searchParams.set('client_secret', this.appSecret!);
    tokenUrl.searchParams.set('redirect_uri', params.redirectUri);
    tokenUrl.searchParams.set('code', params.code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message: string };
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Failed to exchange code');
    }

    // Get long-lived token
    const llUrl = new URL(`${GRAPH}/oauth/access_token`);
    llUrl.searchParams.set('grant_type', 'fb_exchange_token');
    llUrl.searchParams.set('client_id', this.appId!);
    llUrl.searchParams.set('client_secret', this.appSecret!);
    llUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const llRes = await fetch(llUrl.toString());
    const llData = (await llRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const userToken = llData.access_token || tokenData.access_token;

    // Fetch pages the user manages
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,picture,category&access_token=${userToken}`
    );
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        access_token: string;
        picture?: { data?: { url?: string } };
      }>;
      error?: { message: string };
    };

    if (!pagesRes.ok || !pagesData.data?.length) {
      throw new Error(
        pagesData.error?.message ||
          'No Facebook Pages found. Make sure you manage at least one Page.'
      );
    }

    // For personal use we take the first page (UI can later allow selection)
    const page = pagesData.data[0];

    const expiresAt = llData.expires_in
      ? new Date(Date.now() + llData.expires_in * 1000).toISOString()
      : undefined;

    return {
      platformAccountId: page.id,
      accountName: page.name,
      profilePictureUrl: page.picture?.data?.url,
      accessToken: page.access_token, // page token
      expiresAt,
      scopes: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content',
        'read_insights',
      ],
      metadata: { pageId: page.id },
    };
  }

  async disconnect(_accountId: string): Promise<void> {
    // Token revocation is best-effort; we just delete from our DB
  }

  async getProfile(accountId: string, accessToken: string): Promise<Profile> {
    const res = await fetch(
      `${GRAPH}/${accountId}?fields=id,name,username,picture,fan_count,about&access_token=${accessToken}`
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch profile');

    return {
      id: data.id,
      name: data.name,
      username: data.username,
      pictureUrl: data.picture?.data?.url,
      followers: data.fan_count,
      bio: data.about,
    };
  }

  async getPosts(
    accountId: string,
    accessToken: string,
    options: PaginationOptions = {}
  ): Promise<Post[]> {
    const limit = options.limit ?? 25;
    const url = `${GRAPH}/${accountId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${accessToken}`;
    const res = await fetch(url);
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch posts');

    return (data.data || []).map((p: any) => ({
      id: p.id,
      caption: p.message,
      mediaUrls: p.full_picture ? [p.full_picture] : [],
      publishedAt: p.created_time,
      metrics: {
        likes: p.likes?.summary?.total_count ?? 0,
        comments: p.comments?.summary?.total_count ?? 0,
        shares: p.shares?.count ?? 0,
      },
    }));
  }

  async publishPost(
    accountId: string,
    accessToken: string,
    input: PublishInput
  ): Promise<PublishResult> {
    const body = new URLSearchParams();
    if (input.caption) body.set('message', input.caption);
    if (input.linkUrl) body.set('link', input.linkUrl);
    if (input.scheduledAt) {
      const ts = Math.floor(new Date(input.scheduledAt).getTime() / 1000);
      body.set('published', 'false');
      body.set('scheduled_publish_time', String(ts));
    }
    body.set('access_token', accessToken);

    // Photo upload path
    if (input.mediaUrls?.length === 1 && !input.linkUrl) {
      body.set('url', input.mediaUrls[0]);
      const res = await fetch(`${GRAPH}/${accountId}/photos`, {
        method: 'POST',
        body,
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error?.message || 'Failed to publish photo');
      return {
        platformPostId: data.id || data.post_id,
        publishedAt: new Date().toISOString(),
      };
    }

    // Text / link post
    const res = await fetch(`${GRAPH}/${accountId}/feed`, {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data.error?.message || 'Failed to publish post');

    return {
      platformPostId: data.id,
      publishedAt: new Date().toISOString(),
    };
  }

  async getAnalytics(
    accountId: string,
    accessToken: string,
    range: DateRange
  ): Promise<AnalyticsSnapshot> {
    // Page insights require read_insights permission
    try {
      const metrics = [
        'page_follows',
        'page_impressions',
        'page_impressions_unique',
        'page_post_engagements',
        'page_fan_adds',
      ].join(',');

      const url = `${GRAPH}/${accountId}/insights?metric=${metrics}&period=day&since=${range.from}&until=${range.to}&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;

      if (!res.ok) {
        return {
          available: false,
          message:
            data.error?.message ||
            'Requires additional API permission (read_insights) or token lacks access',
        };
      }

      const extract = (name: string): number | undefined => {
        const m = data.data?.find((x: any) => x.name === name);
        if (!m?.values?.length) return undefined;
        return m.values.reduce((s: number, v: any) => s + (v.value || 0), 0);
      };

      // Current followers
      const profile = await this.getProfile(accountId, accessToken);

      return {
        available: true,
        followers: profile.followers,
        impressions: extract('page_impressions'),
        reach: extract('page_impressions_unique'),
        engagement: extract('page_post_engagements'),
        growth: extract('page_fan_adds'),
        raw: data,
      };
    } catch (e: any) {
      return {
        available: false,
        message: e.message || 'Analytics unavailable',
      };
    }
  }

  async getComments(
    accountId: string,
    accessToken: string,
    options: PaginationOptions = {}
  ): Promise<Comment[]> {
    // Fetch recent posts then their comments (simplified)
    const posts = await this.getPosts(accountId, accessToken, { limit: 10 });
    const comments: Comment[] = [];

    for (const post of posts.slice(0, 5)) {
      const res = await fetch(
        `${GRAPH}/${post.id}/comments?fields=id,from,message,created_time&limit=20&access_token=${accessToken}`
      );
      const data = (await res.json()) as any;
      if (res.ok && data.data) {
        for (const c of data.data) {
          comments.push({
            id: c.id,
            authorName: c.from?.name || 'Unknown',
            authorId: c.from?.id,
            message: c.message,
            createdAt: c.created_time,
          });
        }
      }
    }
    return comments;
  }

  async replyToComment(
    _accountId: string,
    commentId: string,
    message: string,
    accessToken: string
  ): Promise<void> {
    const body = new URLSearchParams({ message, access_token: accessToken });
    const res = await fetch(`${GRAPH}/${commentId}/comments`, {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data.error?.message || 'Failed to reply');
  }

  // Helpers used by API routes
  async encryptToken(token: string): Promise<string> {
    return encrypt(token, this.env.ENCRYPTION_KEY);
  }

  async decryptToken(encrypted: string): Promise<string> {
    return decrypt(encrypted, this.env.ENCRYPTION_KEY);
  }
}
