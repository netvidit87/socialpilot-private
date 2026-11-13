import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Image, Calendar, Send, Save } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import type { Platform } from '../types';

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'threads', label: 'Threads' },
  { id: 'twitter', label: 'X' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'bluesky', label: 'Bluesky' },
];

export default function PlannerPage() {
  const { accounts, currentBrandId } = useAppStore();
  const navigate = useNavigate();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['facebook']);
  const [captions, setCaptions] = useState<Record<string, string>>({ facebook: '' });
  const [activeTab, setActiveTab] = useState<Platform>('facebook');
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState<'draft' | 'scheduled'>('draft');
  const [campaign, setCampaign] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const brandAccounts = accounts.filter(
    (a) => a.brand_id === currentBrandId && a.status === 'connected'
  );

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== p);
      }
      setCaptions((c) => ({ ...c, [p]: c[p] || '' }));
      return [...prev, p];
    });
    setActiveTab(p);
  };

  const handleAi = async (action: string) => {
    setAiLoading(true);
    try {
      const res = await api.aiGenerate({
        action,
        platform: activeTab,
        caption: captions[activeTab],
        topic: captions[activeTab] || undefined,
        tone: 'professional',
      });
      setCaptions((c) => ({ ...c, [activeTab]: res.content }));
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (as: 'draft' | 'scheduled') => {
    if (!currentBrandId) {
      setMessage({ type: 'err', text: 'Select a brand first' });
      return;
    }
    if (as === 'scheduled' && !scheduledAt) {
      setMessage({ type: 'err', text: 'Pick a schedule time' });
      return;
    }

    const platforms = selectedPlatforms
      .map((p) => {
        const acc = brandAccounts.find((a) => a.platform === p);
        if (!acc) return null;
        return {
          socialAccountId: acc.id,
          platform: p,
          caption: captions[p] || '',
        };
      })
      .filter(Boolean);

    if (platforms.length === 0) {
      setMessage({
        type: 'err',
        text: 'No connected accounts for the selected platforms. Connect accounts first.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.createPost({
        brandId: currentBrandId,
        status: as,
        scheduledAt: as === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
        campaign: campaign || undefined,
        notes: notes || undefined,
        platforms,
      });
      setMessage({ type: 'ok', text: as === 'draft' ? 'Draft saved' : 'Post scheduled' });
      if (as === 'scheduled') {
        setTimeout(() => navigate('/planner/calendar'), 1000);
      }
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Post</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform-specific captions. Only connected accounts will be used.
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

      {/* Platform selector */}
      <div className="card p-5">
        <label className="label">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const connected = brandAccounts.some((a) => a.platform === p.id);
            const selected = selectedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-surface-border text-gray-600 hover:bg-gray-50'
                } ${!connected ? 'opacity-50' : ''}`}
                title={connected ? 'Connected' : 'Not connected'}
              >
                {p.label}
                {!connected && ' ·'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Composer with per-platform tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-surface-border overflow-x-auto">
          {selectedPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap ${
                activeTab === p
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Caption</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleAi('generate')}
                  disabled={aiLoading}
                  className="btn-ghost !py-1 !px-2 text-xs"
                >
                  <Sparkles size={12} />
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => handleAi('rewrite')}
                  disabled={aiLoading || !captions[activeTab]}
                  className="btn-ghost !py-1 !px-2 text-xs"
                >
                  Rewrite
                </button>
                <button
                  type="button"
                  onClick={() => handleAi('shorten')}
                  disabled={aiLoading || !captions[activeTab]}
                  className="btn-ghost !py-1 !px-2 text-xs"
                >
                  Shorten
                </button>
              </div>
            </div>
            <textarea
              className="input min-h-[140px] resize-y"
              placeholder={`Write your ${activeTab} caption...`}
              value={captions[activeTab] || ''}
              onChange={(e) =>
                setCaptions((c) => ({ ...c, [activeTab]: e.target.value }))
              }
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {(captions[activeTab] || '').length} characters
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Image size={16} />
            <span>Media upload via Content Library (R2) — connect storage to enable</span>
          </div>
        </div>
      </div>

      {/* Schedule & meta */}
      <div className="card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Schedule (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={scheduledAt}
              onChange={(e) => {
                setScheduledAt(e.target.value);
                if (e.target.value) setStatus('scheduled');
              }}
            />
          </div>
          <div>
            <label className="label">Campaign</label>
            <input
              className="input"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="e.g. Summer 2025"
            />
          </div>
        </div>
        <div>
          <label className="label">Notes (private)</label>
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="btn-secondary"
        >
          <Save size={16} />
          Save Draft
        </button>
        <button
          onClick={() => handleSave('scheduled')}
          disabled={saving || !scheduledAt}
          className="btn-primary"
        >
          <Calendar size={16} />
          Schedule
        </button>
      </div>
    </div>
  );
}
