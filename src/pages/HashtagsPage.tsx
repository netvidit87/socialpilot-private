export default function HashtagsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hashtag Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Save and organize hashtag collections (manual tracking)
        </p>
      </div>
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">No hashtags saved yet.</p>
        <p className="mt-2 text-xs text-gray-400">
          Official APIs rarely provide hashtag analytics. This feature is designed for manual
          collections only — no fake metrics.
        </p>
      </div>
    </div>
  );
}
