import { useEffect, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { api } from '../services/api';

const ACTIONS = [
  { id: 'generate', label: 'Generate caption' },
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
  { id: 'hashtags', label: 'Generate hashtags' },
];

const PLATFORMS = [
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

export default function AiPage() {
  const [action, setAction] = useState('generate');
  const [platform, setPlatform] = useState('instagram');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('English');
  const [topic, setTopic] = useState('');
  const [caption, setCaption] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<{ today: number; thisMonth: number } | null>(null);

  useEffect(() => {
    api.aiUsage().then(setUsage).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await api.aiGenerate({
        action,
        platform,
        tone,
        language,
        topic: topic || undefined,
        caption: caption || undefined,
      });
      setResult(res.content);
      const u = await api.aiUsage();
      setUsage(u);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="mt-1 text-sm text-gray-500">
          On-demand only. No automatic AI calls. Default limit: 10 requests/day.
        </p>
      </div>

      <div className="card flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-gray-500">Usage today</p>
          <p className="text-xl font-semibold">
            {usage?.today ?? 0}
            <span className="text-sm font-normal text-gray-400"> / 10</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">This month</p>
          <p className="text-xl font-semibold">{usage?.thisMonth ?? 0}</p>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Action</label>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Platform</label>
            <select
              className="input"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tone</label>
            <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="witty">Witty</option>
              <option value="inspirational">Inspirational</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <input
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Topic / Keywords</label>
          <input
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What is the post about?"
          />
        </div>

        {(action === 'rewrite' || action === 'shorten' || action === 'expand') && (
          <div>
            <label className="label">Existing caption</label>
            <textarea
              className="input min-h-[100px]"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <button onClick={handleGenerate} disabled={loading} className="btn-primary">
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {result && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Result</h2>
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">{result}</pre>
          <button
            className="btn-secondary mt-3"
            onClick={() => navigator.clipboard.writeText(result)}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}
