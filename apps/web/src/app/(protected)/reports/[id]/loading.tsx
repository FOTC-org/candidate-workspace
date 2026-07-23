export default function ReportDetailsLoading(): React.JSX.Element {
  return (
    <div>
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-4">
        <div className="h-24 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}
