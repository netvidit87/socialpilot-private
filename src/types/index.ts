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

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  timezone: string;
  description?: string;
  created_at: string;
}

export interface SocialAccount {
  id: string;
  brand_id: string;
  platform: Platform;
  platform_account_id: string;
  account_name: string;
  username?: string;
  profile_picture_url?: string;
  status: AccountStatus;
  last_synced_at?: string;
  token_expires_at?: string;
  brand_name?: string;
}

export interface Post {
  id: string;
  brand_id: string;
  title?: string;
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  campaign?: string;
  notes?: string;
  platforms?: string;
  created_at: string;
}

export interface AnalyticsOverview {
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  engagement: number | null;
  posts: number | null;
  videoViews: number | null;
  clicks: number | null;
  note?: string;
}

export interface SystemStatus {
  worker: string;
  database: string;
  storage: string;
  accounts: Array<{ platform: string; status: string; count: number }>;
  metaConfigured: boolean;
  aiConfigured: boolean;
  youtubeConfigured: boolean;
  tiktokConfigured: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}
