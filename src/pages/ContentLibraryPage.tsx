export default function ContentLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          Media stored in Cloudflare R2
        </p>
      </div>
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">No media yet.</p>
        <p className="mt-2 text-xs text-gray-400">
          Create an R2 bucket named <code className="rounded bg-gray-100 px-1">socialpilot-media</code> and
          bind it in wrangler.toml to enable uploads.
        </p>
      </div>
    </div>
  );
}
