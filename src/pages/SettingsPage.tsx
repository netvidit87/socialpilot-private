import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function SettingsPage() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    api.getSystemStatus().then(setStatus).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          API credentials, AI limits, and system configuration
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">API Credentials Status</h2>
        <p className="mb-4 text-sm text-gray-500">
          Secrets are stored via Cloudflare Workers Secrets. Never put them in frontend code.
        </p>
        <ul className="space-y-2 text-sm">
          <CredentialRow
            name="Meta (Facebook / Instagram)"
            ok={status?.metaConfigured}
            vars="META_APP_ID, META_APP_SECRET"
          />
          <CredentialRow
            name="YouTube / Google"
            ok={status?.youtubeConfigured}
            vars="YOUTUBE_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
          />
          <CredentialRow
            name="TikTok"
            ok={status?.tiktokConfigured}
            vars="TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET"
          />
          <CredentialRow name="AI (OpenAI-compatible)" ok={status?.aiConfigured} vars="AI_API_KEY" />
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">How to set secrets</h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-300">
{`npx wrangler secret put META_APP_ID
npx wrangler secret put META_APP_SECRET
npx wrangler secret put AI_API_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ENCRYPTION_KEY`}
        </pre>
        <p className="mt-3 text-xs text-gray-400">
          ENCRYPTION_KEY must be a 32-byte key encoded as base64. Generate with:
          <code className="ml-1 rounded bg-gray-100 px-1">
            openssl rand -base64 32
          </code>
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">System Health</h2>
        <ul className="space-y-1 text-sm">
          <li>Worker: {status?.worker || '—'}</li>
          <li>Database: {status?.database || '—'}</li>
          <li>Storage: {status?.storage || '—'}</li>
        </ul>
      </div>
    </div>
  );
}

function CredentialRow({
  name,
  ok,
  vars,
}: {
  name: string;
  ok?: boolean;
  vars: string;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-xs text-gray-400">{vars}</p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {ok ? 'Configured' : 'Not configured'}
      </span>
    </li>
  );
}
