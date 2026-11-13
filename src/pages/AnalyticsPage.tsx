import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  Eye,
  Heart,
  FileText,
  MousePointerClick,
  PlayCircle,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import type { AnalyticsOverview } from '../types';

const PLATFORMS = [
  'all',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'threads',
  'twitter',
  'pinterest',
  'bluesky',
];

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '14', label: '14 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
];

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null | undefined;
  icon: React.ElementType;
}) {
  const display =
    value === null || value === undefined
      ? '—'
      : value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1000
          ? `${(value / 1000).toFixed(1)}K`
          : String(value);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{display}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { platform: platformParam } = useParams();
  const { currentBrandId } = useAppStore();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [platform, setPlatform] = useState(platformParam || 'all');
  const [range, setRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getAnalytics(currentBrandId || undefined)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [currentBrandId, platform, range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real data from connected accounts only. No fabricated metrics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="input !w-auto"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? 'All networks' : p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="input !w-auto"
          >
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Followers" value={analytics?.followers} icon={Users} />
            <MetricCard label="Reach" value={analytics?.reach} icon={Eye} />
            <MetricCard label="Impressions" value={analytics?.impressions} icon={Eye} />
            <MetricCard label="Engagement" value={analytics?.engagement} icon={Heart} />
            <MetricCard label="Posts" value={analytics?.posts} icon={FileText} />
            <MetricCard label="Video Views" value={analytics?.videoViews} icon={PlayCircle} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Link Clicks" value={analytics?.clicks} icon={MousePointerClick} />
          </div>

          {analytics?.note && (
            <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
              <AlertCircle size={18} className="mt-0.5 text-amber-600" />
              <p className="text-sm text-amber-800">{analytics.note}</p>
            </div>
          )}

          {/* Placeholder for charts - data driven when available */}
          <div className="card p-6">
            <h2 className="mb-4 font-semibold">Performance over time</h2>
            <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
              Charts appear after the first successful analytics sync.
              <br />
              Connect accounts and wait for cron / manual sync.
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-semibold">Top Performing Posts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-gray-500">
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Post</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Reach</th>
                    <th className="pb-3 font-medium">Likes</th>
                    <th className="pb-3 font-medium">Comments</th>
                    <th className="pb-3 font-medium">Eng. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      No post analytics yet. Publish content and sync to see performance.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
