# Deploy SocialPilot Private ke GitHub + Cloudflare

Panduan lengkap agar proyek ini **mudah di-deploy** dan **auto-update** setiap kali push ke GitHub.

---

## Prasyarat

- Akun GitHub
- Akun Cloudflare (sudah ada dari screenshot)
- Node.js 18+
- Wrangler CLI (`npm i -g wrangler`)

---

## Cara 1: Deploy Manual (Paling Cepat)

```bash
# 1. Install dependencies
npm install

# 2. Login Cloudflare (jika belum)
npx wrangler login

# 3. Pastikan secrets sudah ada di Dashboard
# (Dari screenshot kamu sudah punya: SESSION_SECRET, ENCRYPTION_KEY, AI_API_KEY)

# 4. Apply migrations (jika belum)
npx wrangler d1 migrations apply socialpilot-db --remote

# 5. Build + Deploy
npm run deploy
```

Selesai. Aplikasi live di:
`https://socialpilot-private.deckyoktario24.workers.dev`

---

## Cara 2: Push ke GitHub + Connect Cloudflare (Recommended)

### Langkah 1 — Buat Repository GitHub

```bash
cd socialpilot-private

# Init git (jika belum)
git init
git add .
git commit -m "Initial commit: SocialPilot Private ready for Cloudflare"

# Buat repo di GitHub (via web atau gh CLI)
# Lalu:
git remote add origin https://github.com/USERNAME/socialpilot-private.git
git branch -M main
git push -u origin main
```

### Langkah 2 — Connect ke Cloudflare Workers

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. Klik **Create** → **Connect to Git**
3. Pilih GitHub → Authorize → pilih repo `socialpilot-private`
4. Settings:
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `/` (biarkan kosong)
   - **Node version**: `18` atau `20`

5. Klik **Save and Deploy**

Cloudflare akan otomatis:
- Build frontend (`vite build`)
- Deploy Worker + Assets
- Setiap push ke `main` → auto deploy

### Langkah 3 — Bindings & Secrets (sudah sebagian ada)

Dari screenshot kamu sudah punya:

| Type     | Name            | Status          |
|----------|-----------------|-----------------|
| Secret   | AI_API_KEY      | ✅ Ada          |
| Secret   | ENCRYPTION_KEY  | ✅ Ada          |
| Secret   | SESSION_SECRET  | ✅ Ada          |
| Variable | APP_NAME        | ✅ Ada          |
| Variable | APP_URL         | ✅ Ada          |
| Variable | ENVIRONMENT     | ✅ production   |
| D1       | DB              | ✅ socialpilot-db |
| R2       | MEDIA_BUCKET    | ✅ socialpilot-media |
| R2       | VIDEOS          | ✅ grok-videos (opsional) |

**Yang masih perlu ditambahkan (jika pakai Facebook):**

```bash
npx wrangler secret put META_APP_ID
npx wrangler secret put META_APP_SECRET
```

Atau lewat Dashboard → Settings → Variables and secrets → Add.

---

## Cara 3: GitHub Actions (Advanced Auto Deploy)

File `.github/workflows/deploy.yml` sudah disiapkan.

1. Di GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Tambahkan secrets:

| Name                     | Value                                      |
|--------------------------|--------------------------------------------|
| `CLOUDFLARE_API_TOKEN`   | Buat di Cloudflare → My Profile → API Tokens (template: Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID`  | Dari Dashboard URL / Overview              |

3. Setiap push ke `main` akan otomatis deploy.

---

## Setelah Deploy Pertama

1. Buka URL workers.dev kamu
2. Muncul **Setup** page → buat password admin (min 8 karakter)
3. Brand default otomatis dibuat
4. Pergi ke **Connections** → Connect Facebook (butuh Meta App)
5. Selesai! Bisa mulai buat post, schedule, lihat analytics.

---

## Custom Domain (Opsional)

1. Cloudflare Dashboard → Workers & Pages → socialpilot-private → Settings → Domains & Routes
2. **Add Custom Domain** → masukkan domainmu
3. Update `APP_URL` di Variables menjadi domain custom
4. Di Meta App → tambahkan OAuth Redirect URI domain baru

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `database_id` masih 0000... | Biarkan. Cloudflare Git integration / dashboard yang handle binding |
| Build gagal TypeScript | Jalankan `npm run typecheck` lokal dulu |
| OAuth Facebook error | Pastikan Redirect URI di Meta App sama persis dengan `APP_URL/api/oauth/facebook/callback` |
| Cron tidak jalan | Cron hanya aktif di production (bukan `wrangler dev`) |
| Secrets tidak terbaca | Pastikan di Environment **Production**, bukan Preview |

---

## Perintah Ringkas Sehari-hari

```bash
# Local development
npm run dev:all

# Deploy cepat
npm run deploy

# Lihat logs production
npm run cf:tail

# Generate secrets baru
npm run secret:generate
```

---

Selesai. Proyek siap production-grade.
