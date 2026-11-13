#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  SocialPilot Private - First Time Setup"
echo "=========================================="
echo ""

# Check node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak ditemukan. Install Node.js 18+ dulu."
  exit 1
fi

echo "✅ Node.js $(node -v)"
echo ""

# Install deps
echo "📦 Installing dependencies..."
npm install
echo ""

# Generate secrets
echo "🔐 Generating secrets..."
SESSION_SECRET=$(openssl rand -hex 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo ""
echo "SESSION_SECRET=$SESSION_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

# Create .dev.vars
if [ ! -f .dev.vars ]; then
  cat > .dev.vars << EOL
SESSION_SECRET=$SESSION_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
APP_URL=http://localhost:5173
ENVIRONMENT=development
DEFAULT_TIMEZONE=Asia/Jakarta
AI_DAILY_LIMIT=30
EOL
  echo "✅ File .dev.vars dibuat"
else
  echo "⚠️  .dev.vars sudah ada, dilewati"
fi

echo ""
echo "=========================================="
echo "  Langkah selanjutnya:"
echo "=========================================="
echo ""
echo "1. Buat D1 database:"
echo "   npx wrangler d1 create socialpilot-db"
echo ""
echo "2. Buat R2 bucket:"
echo "   npx wrangler r2 bucket create socialpilot-media"
echo ""
echo "3. Update database_id di wrangler.toml"
echo ""
echo "4. Jalankan migrasi:"
echo "   npm run db:migrate:local"
echo ""
echo "5. Jalankan development:"
echo "   npm run dev:all"
echo ""
echo "Atau langsung deploy production:"
echo "   npm run deploy"
echo ""
