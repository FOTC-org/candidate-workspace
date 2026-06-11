import Link from "next/link";

export default function UsersNotFound(): React.JSX.Element {
  return (
    <div className="py-16 text-center">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">Users not found</h2>
      <p className="mb-6 text-gray-500">
        The requested users page could not be found.
      </p>
      <Link
        href="/profile"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to profile
      </Link>
    </div>
  );
}
