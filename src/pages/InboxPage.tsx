export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comments and messages from connected accounts
        </p>
      </div>
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">
          Inbox will populate after you connect accounts and sync comments.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Messaging/DM requires additional API permissions that may not be available on free tiers.
          Comments are supported via Meta Graph API when permissions are granted.
        </p>
      </div>
    </div>
  );
}
