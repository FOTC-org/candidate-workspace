export default function UsersLoading(): React.JSX.Element {
  return (
    <div>
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-gray-100 p-4 last:border-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
