"use client";

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="mb-2 text-lg font-semibold text-red-800">
        Failed to load users
      </h2>
      <p className="mb-4 text-sm text-red-600">{error.message}</p>
      <button
        onClick={reset}
        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
