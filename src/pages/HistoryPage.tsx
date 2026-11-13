import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';

export default function HistoryPage({ status }: { status?: string }) {
  const { currentBrandId } = useAppStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState(status || '');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .getPosts({
        brandId: currentBrandId || undefined,
        status: filter || undefined,
      })
      .then(setPosts)
      .catch(() => {});
  }, [currentBrandId, filter]);

  const filtered = posts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.platforms || '').toLowerCase().includes(q) ||
      (p.campaign || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {status === 'scheduled' ? 'Scheduled Posts' : 'Post History'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">All posts across your accounts</p>
        </div>
        <Link to="/planner" className="btn-primary">
          <Plus size={16} />
          Create Post
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input !w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/50 text-gray-500">
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Scheduled / Published</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No posts yet.{' '}
                    <Link to="/planner" className="text-primary hover:underline">
                      Create your first post
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 capitalize">{p.platforms || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.campaign || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.scheduled_at
                        ? new Date(p.scheduled_at).toLocaleString()
                        : p.published_at
                          ? new Date(p.published_at).toLocaleString()
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-50 text-blue-700',
    publishing: 'bg-amber-50 text-amber-700',
    published: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] || styles.draft}`}
    >
      {status}
    </span>
  );
}
