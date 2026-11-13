import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';

export default function BrandsPage() {
  const { brands, setBrands, setCurrentBrandId, currentBrandId } = useAppStore();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.createBrand({ name: name.trim(), timezone });
      const updated = await api.getBrands();
      setBrands(updated);
      if (!currentBrandId) setCurrentBrandId(res.id);
      setName('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this brand and all its data?')) return;
    try {
      await api.deleteBrand(id);
      const updated = brands.filter((b) => b.id !== id);
      setBrands(updated);
      if (currentBrandId === id) {
        setCurrentBrandId(updated[0]?.id || null);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organize your social accounts into brands / workspaces
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Create Brand</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            placeholder="Brand name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input max-w-xs"
            placeholder="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            <Plus size={16} />
            Create
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{b.name}</h3>
                <p className="mt-1 text-xs text-gray-400">{b.timezone}</p>
                {b.description && (
                  <p className="mt-2 text-sm text-gray-500">{b.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                className="btn-ghost !p-2 text-red-500"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {currentBrandId === b.id && (
              <span className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Active
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
