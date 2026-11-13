import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Eye,
  Heart,
  FileText,
  Calendar,
  Plug,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import type { AnalyticsOverview, SystemStatus } from '../types';

function MetricCard({
  label,
  value,
  icon: Icon,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  icon: React.ElementType;
  suffix?: string;
}) {
  const display =
    value === null || value === undefined
      ? '—'
      : value >= 1000
        ? `${(value / 1000).toFixed(1)}K`
        : String(value);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {display}
            {suffix && value != null && (
              <span className="ml-1 text-sm font-normal text-gray-400">{suffix}</span>
            )}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { accounts, brands, currentBrandId } = useAppStore();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [aiUsage, setAiUsage] = useState<{ today: number; thisMonth: number } | null>(null);

  useEffect(() => {
    api.getAnalytics(currentBrandId || undefined).then(setAnalytics).catch(() => {});
    api.getSystemStatus().then(setStatus).catch(() => {});
    api.aiUsage().then(setAiUsage).catch(() => {});
  }, [currentBrandId]);

  const connectedCount = accounts.filter((a) => a.status === 'connected').length;
  const needsSetup = accounts.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Good {getGreeting()}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your personal social media command center
        </p>
      </div>

      {/* Setup checklist */}
      {needsSetup && (
        <div className="card border-primary/20 bg-primary/5 p-6">
          <h2 className="font-semibold text-primary">Get started</h2>
          <p className="mt-1 text-sm text-gray-600">
            Complete these steps to start managing your social accounts.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <ChecklistItem done={brands.length > 0} label="Create a Brand" to="/brands" />
            <ChecklistItem done={false} label="Connect Facebook Page" to="/settings/connections" />
            <ChecklistItem done={false} label="Connect Instagram" to="/settings/connections" />
            <ChecklistItem done={false} label="Create your first post" to="/planner" />
            <ChecklistItem done={status?.aiConfigured || false} label="Configure AI (optional)" to="/settings" />
          </ul>
          <div className="mt-5">
            <Link
              to="/settings/connections"
              className="btn-primary !bg-blue-600 hover:!bg-blue-700"
            >
              <Plug size={16} />
              Connect Facebook Page
            </Link>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Followers" value={analytics?.followers} icon={Users} />
        <MetricCard label="Reach" value={analytics?.reach} icon={Eye} />
        <MetricCard label="Engagement" value={analytics?.engagement} icon={Heart} />
        <MetricCard label="Posts" value={analytics?.posts} icon={FileText} />
      </div>

      {analytics?.note && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <AlertCircle size={12} />
          {analytics.note}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Connected accounts */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Connected Accounts</h2>
            <Link to="/settings/connections" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </div>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Plug size={32} className="mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No accounts connected yet</p>
              <Link to="/settings/connections" className="btn-primary mt-4">
                Connect your first account
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-surface-border">
              {accounts.map((acc) => (
                <li key={acc.id} className="flex items-center gap-3 py-3">
                  <PlatformBadge platform={acc.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{acc.account_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{acc.platform}</p>
                  </div>
                  <StatusDot status={acc.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick status */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">System Health</h2>
            <ul className="space-y-2 text-sm">
              <StatusRow label="Worker" ok={status?.worker === 'healthy'} />
              <StatusRow label="Database" ok={status?.database === 'healthy'} />
              <StatusRow label="Meta API" ok={status?.metaConfigured} labelOff="Not configured" />
              <StatusRow label="AI" ok={status?.aiConfigured} labelOff="Not configured" />
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">AI Usage</h2>
            <p className="text-2xl font-semibold">
              {aiUsage?.today ?? 0}
              <span className="text-sm font-normal text-gray-400"> / 10 today</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {aiUsage?.thisMonth ?? 0} this month
            </p>
            <Link to="/ai" className="btn-secondary mt-3 w-full text-xs">
              <Sparkles size={14} />
              Open AI Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/planner" className="card flex items-center gap-3 p-4 transition hover:border-primary/40">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">Create Post</p>
            <p className="text-xs text-gray-400">Compose & schedule</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-gray-300" />
        </Link>
        <Link to="/planner/calendar" className="card flex items-center gap-3 p-4 transition hover:border-primary/40">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">Calendar</p>
            <p className="text-xs text-gray-400">View schedule</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-gray-300" />
        </Link>
        <Link to="/analytics" className="card flex items-center gap-3 p-4 transition hover:border-primary/40">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Eye size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">Analytics</p>
            <p className="text-xs text-gray-400">Performance overview</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-gray-300" />
        </Link>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function ChecklistItem({ done, label, to }: { done: boolean; label: string; to: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 size={16} className="text-green-600" />
      ) : (
        <div className="h-4 w-4 rounded border border-gray-300" />
      )}
      <Link to={to} className={done ? 'text-gray-400 line-through' : 'text-gray-700 hover:text-primary'}>
        {label}
      </Link>
    </li>
  );
}

function StatusRow({
  label,
  ok,
  labelOff,
}: {
  label: string;
  ok?: boolean;
  labelOff?: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="flex items-center gap-1.5 text-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-amber-400'}`}
        />
        {ok ? 'Healthy' : labelOff || 'Check'}
      </span>
    </li>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'connected'
      ? 'bg-green-500'
      : status === 'needs_reconnect' || status === 'expired'
        ? 'bg-amber-400'
        : 'bg-red-400';
  return (
    <span className="flex items-center gap-1.5 text-xs capitalize text-gray-500">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    facebook: 'bg-blue-600',
    instagram: 'bg-pink-600',
    tiktok: 'bg-gray-900',
    youtube: 'bg-red-600',
    linkedin: 'bg-blue-700',
    threads: 'bg-gray-800',
    twitter: 'bg-sky-500',
    pinterest: 'bg-red-700',
    bluesky: 'bg-sky-600',
    'google-business': 'bg-green-600',
  };
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold uppercase text-white ${colors[platform] || 'bg-gray-500'}`}
    >
      {platform.slice(0, 2)}
    </div>
  );
}
