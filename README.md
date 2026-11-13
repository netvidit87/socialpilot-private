# SocialPilot Private

**Personal Social Media Management Dashboard**

Single-user, private, low-cost. Built for Cloudflare Workers + D1 + R2.

No SaaS, no billing, no multi-tenant complexity.

---

## Features (Phase 1)

| Feature | Status |
|---------|--------|
| Single-user auth (password, hashed) | ✅ Working |
| Brands / Workspaces | ✅ Working |
| Facebook Page OAuth + connect | ✅ Working (needs Meta App) |
| Post composer (multi-platform captions) | ✅ Working |
| Draft + Schedule posts | ✅ Working |
| Calendar view | ✅ Working |
| Post history | ✅ Working |
| Basic analytics aggregation | ✅ Working (real data only) |
| AI Assistant (on-demand, rate-limited) | ✅ Working (needs AI_API_KEY) |
| Connections dashboard | ✅ Working |
| System health / API status | ✅ Working |
| Encrypted token storage | ✅ Working |
| Cron: scheduled publish + analytics sync | ✅ Working |
| Content Library (R2) | 🟡 Scaffolded |
| Inbox / Comments | 🟡 Scaffolded |
| Smart Links | 🟡 Scaffolded |
| Hashtag collections | 🟡 Scaffolded |
| Reporting export | 🟡 Scaffolded |
| Instagram / TikTok / YouTube / others | 🟡 Provider interface ready |

---

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Recharts
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Media**: Cloudflare R2
- **Cache**: Cloudflare KV (optional)
- **Jobs**: Cloudflare Cron Triggers
- **Auth**: Cookie session + SHA-256 password hash
- **Tokens**: AES-GCM encrypted at rest

---

## Quick Start (Local)

```bash
# 1. Install
npm install

# 2. Generate secrets
npm run secret:generate

# 3. Create .dev.vars
cp .env.example .dev.vars
# Paste SESSION_SECRET & ENCRYPTION_KEY

# 4. Create resources (one-time)
npx wrangler d1 create socialpilot-db
npx wrangler r2 bucket create socialpilot-media
# Update database_id in wrangler.toml

# 5. Migrate
npm run db:migrate:local

# 6. Run (Worker + Frontend)
npm run dev:all
```

Open http://localhost:5173

---

## Deploy ke Cloudflare (Production)

Lihat **[DEPLOY.md](./DEPLOY.md)** untuk panduan lengkap:

1. **Manual deploy** → `npm run deploy`
2. **GitHub + Cloudflare Git integration** (recommended)
3. **GitHub Actions auto-deploy**

### Secrets yang dibutuhkan di Production

| Secret | Wajib? | Cara generate |
|--------|--------|---------------|
| `SESSION_SECRET` | ✅ | `openssl rand -hex 48` |
| `ENCRYPTION_KEY` | ✅ | `openssl rand -base64 32` |
| `AI_API_KEY` | Optional | Dari OpenAI / Groq / OpenRouter |
| `META_APP_ID` | Optional | Meta for Developers |
| `META_APP_SECRET` | Optional | Meta for Developers |

---

## Meta (Facebook) Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create App → type **Business**
3. Add product: **Facebook Login**
4. Settings → Basic: copy **App ID** and **App Secret**
5. Facebook Login → Settings → Valid OAuth Redirect URIs:
   - `http://localhost:5173/api/oauth/facebook/callback` (dev)
   - `https://YOUR_DOMAIN/api/oauth/facebook/callback` (prod)
6. Permissions yang dibutuhkan:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
   - `read_insights`

---

## Architecture Notes

### SocialProvider interface

Setiap platform mengimplementasikan:

```ts
interface SocialProvider {
  connect(): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  getProfile(): Promise<Profile>;
  getPosts(): Promise<Post[]>;
  publishPost(input): Promise<PublishResult>;
  getAnalytics(range): Promise<AnalyticsSnapshot>;
}
```

Facebook fully implemented. Platform lain return "Not available through current API".

### Security

- Passwords: SHA-256 + app secret
- Sessions: HttpOnly, Secure, SameSite=Strict cookies
- Tokens: AES-GCM encrypted before D1 storage
- Secrets: Cloudflare Secrets only (never in frontend or git)
- No scraping, no fake OAuth, no fabricated analytics

### Cost Control

- Free Cloudflare tier covers personal use
- Analytics sync: every 6 hours via Cron
- AI: hard daily limit, on-demand only
- Incremental sync + caching ready

---

## Project Structure

```
/
├── src/                  # React frontend
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── store/
│   └── types/
├── worker/               # Cloudflare Worker
│   ├── index.ts          # Main fetch + router
│   ├── cron/
│   ├── services/         # FacebookProvider, etc.
│   └── utils/
├── migrations/           # D1 SQL migrations
├── .github/workflows/    # Auto deploy
├── wrangler.toml
├── package.json
└── README.md
```

---

## License

Private use. Built for personal social media management.
