export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  CACHE?: KVNamespace;
  ASSETS?: Fetcher;
  APP_NAME: string;
  APP_URL: string;
  ENVIRONMENT: string;
  // Secrets
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  AI_API_KEY?: string;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
}

export type Platform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'threads'
  | 'twitter'
  | 'pinterest'
  | 'bluesky'
  | 'google-business';

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type AccountStatus =
  | 'connected'
  | 'needs_reconnect'
  | 'expired'
  | 'permission_required'
  | 'rate_limited'
  | 'error'
  | 'disconnected';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface SocialProvider {
  platform: Platform;
  connect(params: ConnectParams): Promise<ConnectResult>;
  disconnect(accountId: string): Promise<void>;
  getProfile(accountId: string, accessToken: string): Promise<Profile>;
  getPosts(accountId: string, accessToken: string, options?: PaginationOptions): Promise<Post[]>;
  publishPost(accountId: string, accessToken: string, input: PublishInput): Promise<PublishResult>;
  getAnalytics(accountId: string, accessToken: string, range: DateRange): Promise<AnalyticsSnapshot>;
  getComments?(accountId: string, accessToken: string, options?: PaginationOptions): Promise<Comment[]>;
  replyToComment?(accountId: string, commentId: string, message: string, accessToken: string): Promise<void>;
}

export interface ConnectParams {
  code?: string;
  redirectUri: string;
  state?: string;
}

export interface ConnectResult {
  platformAccountId: string;
  accountName: string;
  username?: string;
  profilePictureUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

export interface Profile {
  id: string;
  name: string;
  username?: string;
  pictureUrl?: string;
  followers?: number;
  following?: number;
  bio?: string;
}

export interface PublishInput {
  caption?: string;
  title?: string;
  description?: string;
  mediaUrls?: string[];
  linkUrl?: string;
  scheduledAt?: string;
  hashtags?: string[];
  firstComment?: string;
  altText?: string;
}

export interface PublishResult {
  platformPostId: string;
  publishedAt: string;
  url?: string;
}

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
}

export interface AnalyticsSnapshot {
  followers?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  videoViews?: number;
  postsCount?: number;
  growth?: number;
  raw?: Record<string, unknown>;
  available: boolean;
  message?: string;
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface Post {
  id: string;
  caption?: string;
  mediaUrls?: string[];
  publishedAt?: string;
  metrics?: Record<string, number>;
}

export interface Comment {
  id: string;
  authorName: string;
  authorId?: string;
  message: string;
  createdAt: string;
  parentId?: string;
}
