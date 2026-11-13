import { useEffect, useState } from 'react';
import { Plug, RefreshCw, Unplug, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import type { Platform } from '../types';

const PLATFORMS: { id: Platform; name: string; color: string; description: string }[] = [
  { id: 'facebook', name: 'Facebook Page', color: 'bg-blue-600', description: 'Pages you manage' },
  { id: 'instagram', name: 'Instagram Professional', color: 'bg-pink-600', description: 'Business / Creator' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-gray-900', description: 'Creator account' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', description: 'Channel' },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700', description: 'Profile or Page' },
  { id: 'threads', name: 'Threads', color: 'bg-gray-800', description: 'Threads profile' },
  { id: 'twitter', name: 'X / Twitter', color: 'bg-sky-500', description: 'X account' },
  { id: 'pinterest', name: 'Pinterest', color: 'bg-red-700', description: 'Business account' },
  { id: 'bluesky', name: 'Bluesky', color: 'bg-sky-600', description: 'AT Protocol' },
  { id: 'google-business', name: 'Google Business', color: 'bg-green-600', description: 'Business Profile' },
];

export default function ConnectionsPage() {
  const { accounts, setAccounts, currentBrandId } = useAppStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [system, setSystem] = useState<any>(null);

  useEffect(() => {
    api.getAccounts(currentBrandId || undefined).then(setAccounts).catch(() => {});
    api.getSystemStatus().then(setSystem).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      const name = params.get('name');
      setMessage({
        type: 'ok',
        text: name
          ? `Facebook Page "${name}" berhasil terhubung!`
          : `${params.get('connected')} connected successfully`,
      });
      // Refresh accounts list
      api.getAccounts(currentBrandId || undefined).then(setAccounts).catch(() => {});
      window.history.replaceState({}, '', '/settings/connections');
    }
    if (params.get('error')) {
      setMessage({ type: 'err', text: params.get('error') || 'Connection failed' });
      window.history.replaceState({}, '', '/settings/connections');
    }
  }, [currentBrandId]);

  const handleConnect = async (platform: Platform) => {
    if (!currentBrandId) {
      setMessage({ type: 'err', text: 'Buat Brand terlebih dahulu di menu Brands' });
      return;
    }
    setLoading(platform);
    setMessage(null);
    try {
      if (platform === 'facebook') {
        // Get OAuth URL → redirect browser to Facebook login
        const { url } = await api.connectFacebook(currentBrandId);
        // Full page redirect to Facebook OAuth
        window.location.href = url;
        return;
      }
      setMessage({
        type: 'err',
        text: `${platform} belum dikonfigurasi. Lihat Settings → API credentials.`,
      });
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message });
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Putuskan koneksi akun ini? Token akan dihapus.')) return;
    try {
      await api.disconnectAccount(id);
      setAccounts(accounts.filter((a) => a.id !== id));
      setMessage({ type: 'ok', text: 'Akun berhasil diputuskan' });
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message });
    }
  };

  const connectedMap = new Map(accounts.map((a) => [a.platform, a]));
  const facebookConnected = connectedMap.get('facebook');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-gray-500">
          Hubungkan akun sosial via OAuth resmi. Token disimpan terenkripsi.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Prominent Facebook connect card */}
      <div className="card border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              f
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Facebook Page</h2>
              <p className="mt-0.5 text-sm text-gray-600">
                Klik Connect → login Facebook di browser → pilih Page → kembali ke dashboard
              </p>
              {facebookConnected ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Connected
                  </span>
                  <span className="font-medium text-gray-800">{facebookConnected.account_name}</span>
                  <span className="text-xs text-gray-400">
                    ID: {facebookConnected.platform_account_id}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Membutuhkan Meta App (App ID + App Secret) — lihat panduan di bawah
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {facebookConnected ? (
              <>
                <button
                  onClick={() => handleConnect('facebook')}
                  disabled={loading === 'facebook'}
                  className="btn-secondary"
                >
                  {loading === 'facebook' ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Reconnect
                </button>
                <button
                  onClick={() => handleDisconnect(facebookConnected.id)}
                  className="btn-ghost text-red-600"
                >
                  <Unplug size={16} />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => handleConnect('facebook')}
                disabled={loading === 'facebook' || !system?.metaConfigured}
                className="btn-primary !bg-blue-600 hover:!bg-blue-700"
                title={
                  !system?.metaConfigured
                    ? 'Set META_APP_ID dan META_APP_SECRET dulu'
                    : 'Buka Facebook login'
                }
              >
                {loading === 'facebook' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ExternalLink size={16} />
                )}
                Connect Facebook
              </button>
            )}
          </div>
        </div>
      </div>

      {!system?.metaConfigured && (
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">Meta App belum dikonfigurasi</p>
            <p className="mt-1 text-amber-800">
              Agar tombol Connect Facebook berfungsi, set secrets di Cloudflare:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-amber-100/80 p-3 text-xs text-amber-900">
{`npx wrangler secret put META_APP_ID
npx wrangler secret put META_APP_SECRET`}
            </pre>
            <p className="mt-2 text-xs text-amber-700">
              Di Meta Developer Console, tambahkan Valid OAuth Redirect URI:
              <br />
              <code className="rounded bg-amber-100 px-1">
                https://socialpilot-private.deckyoktario24.workers.dev/api/oauth/facebook/callback
              </code>
            </p>
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Semua platform
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map((p) => {
          const connected = connectedMap.get(p.id);
          return (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold uppercase text-white ${p.color}`}
                >
                  {p.id.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="text-xs text-gray-400">{p.description}</p>
                </div>
              </div>

              {connected ? (
                <div className="mt-4 space-y-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <p className="truncate font-medium">{connected.account_name}</p>
                    <p className="text-xs text-gray-400">ID: {connected.platform_account_id}</p>
                    {connected.last_synced_at && (
                      <p className="text-xs text-gray-400">
                        Last sync: {new Date(connected.last_synced_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs capitalize text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {connected.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleDisconnect(connected.id)}
                      className="btn-ghost ml-auto !px-2 !py-1 text-xs text-red-600"
                    >
                      <Unplug size={14} />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-1 flex-col justify-end">
                  <button
                    onClick={() => handleConnect(p.id)}
                    disabled={loading === p.id}
                    className="btn-primary w-full"
                  >
                    {loading === p.id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Plug size={16} />
                    )}
                    Connect
                  </button>
                  {p.id !== 'facebook' && (
                    <p className="mt-2 text-center text-[10px] text-gray-400">
                      Requires API credentials
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
