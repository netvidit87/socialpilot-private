-- SocialPilot Private - Initial Schema
-- Personal use only. Single user + multiple brands + multiple social accounts.

PRAGMA foreign_keys = ON;

-- Users (single private user)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Brands / Workspaces
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_id);

-- Social Accounts (connected pages/profiles)
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- facebook, instagram, tiktok, youtube, linkedin, threads, twitter, pinterest, bluesky, google-business
  platform_account_id TEXT NOT NULL,
  account_name TEXT,
  username TEXT,
  profile_picture_url TEXT,
  status TEXT NOT NULL DEFAULT 'connected', -- connected, needs_reconnect, expired, permission_required, rate_limited, error, disconnected
  scopes TEXT, -- JSON array of granted scopes
  last_synced_at TEXT,
  token_expires_at TEXT,
  metadata TEXT, -- JSON for platform-specific data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(platform, platform_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_brand ON social_accounts(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);

-- OAuth Tokens (encrypted at application level)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id TEXT PRIMARY KEY,
  social_account_id TEXT NOT NULL UNIQUE REFERENCES social_accounts(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TEXT,
  scopes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Posts (master content)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, publishing, published, failed, cancelled
  scheduled_at TEXT,
  published_at TEXT,
  campaign TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_brand ON posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at);

-- Platform-specific post content
CREATE TABLE IF NOT EXISTS post_platforms (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  caption TEXT,
  title TEXT,          -- for YouTube etc.
  description TEXT,
  hashtags TEXT,       -- JSON array
  mentions TEXT,       -- JSON array
  alt_text TEXT,
  first_comment TEXT,
  media_ids TEXT,      -- JSON array of media ids
  link_url TEXT,
  platform_post_id TEXT, -- ID returned by platform after publish
  status TEXT NOT NULL DEFAULT 'draft',
  error_message TEXT,
  published_at TEXT,
  metrics TEXT,        -- JSON snapshot of post metrics
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_platforms_post ON post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_post_platforms_account ON post_platforms(social_account_id);

-- Media library (R2 references)
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER,
  r2_key TEXT NOT NULL,
  url TEXT,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds REAL,
  tags TEXT,           -- JSON array
  folder TEXT,
  is_favorite INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_brand ON media(brand_id);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);

-- Comments / Inbox items
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL,
  platform_post_id TEXT,
  author_name TEXT,
  author_id TEXT,
  author_avatar TEXT,
  message TEXT,
  parent_id TEXT,      -- for replies
  status TEXT NOT NULL DEFAULT 'unread', -- unread, read, resolved
  is_reply INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(platform, platform_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comments_account ON comments(social_account_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- Hashtags
CREATE TABLE IF NOT EXISTS hashtags (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  platform TEXT,       -- null = all
  category TEXT,
  notes TEXT,
  collection_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hashtag_collections (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Smart Links
CREATE TABLE IF NOT EXISTS smart_links (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smart_link_clicks (
  id TEXT PRIMARY KEY,
  smart_link_id TEXT NOT NULL REFERENCES smart_links(id) ON DELETE CASCADE,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
  referrer TEXT,
  country TEXT,
  device TEXT,
  user_agent TEXT,
  ip_hash TEXT          -- hashed for privacy
);

CREATE INDEX IF NOT EXISTS idx_smart_link_clicks_link ON smart_link_clicks(smart_link_id);

-- Analytics (daily aggregates)
CREATE TABLE IF NOT EXISTS analytics_daily (
  id TEXT PRIMARY KEY,
  social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  followers INTEGER,
  following INTEGER,
  reach INTEGER,
  impressions INTEGER,
  engagement INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  clicks INTEGER,
  video_views INTEGER,
  profile_views INTEGER,
  posts_count INTEGER,
  raw_data TEXT,       -- JSON for extra metrics
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(social_account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_account_date ON analytics_daily(social_account_id, date);

-- Post-level analytics
CREATE TABLE IF NOT EXISTS analytics_posts (
  id TEXT PRIMARY KEY,
  post_platform_id TEXT NOT NULL REFERENCES post_platforms(id) ON DELETE CASCADE,
  reach INTEGER,
  impressions INTEGER,
  engagement INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  clicks INTEGER,
  video_views INTEGER,
  engagement_rate REAL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_data TEXT
);

-- Reports
CREATE TABLE IF NOT EXISTS report_templates (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,           -- weekly, monthly, content, comparison, growth
  config TEXT,         -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES report_templates(id),
  title TEXT NOT NULL,
  date_from TEXT,
  date_to TEXT,
  platforms TEXT,      -- JSON
  metrics TEXT,        -- JSON
  data TEXT,           -- JSON snapshot
  format TEXT DEFAULT 'json',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI Usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- generate, rewrite, analyze, etc.
  model TEXT,
  tokens_used INTEGER,
  cost_estimate REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, created_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data TEXT,           -- JSON
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Settings (key-value per user)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(user_id, key)
);

-- API Logs (no secrets!)
CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY,
  platform TEXT,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
