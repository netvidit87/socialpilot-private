export default function ReportingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate performance reports from real analytics data
        </p>
      </div>
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">
          Reports will be available after analytics data is synced.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Export formats: CSV / JSON (PDF optional). Templates: Weekly, Monthly, Content,
          Platform Comparison, Growth.
        </p>
      </div>
    </div>
  );
}
