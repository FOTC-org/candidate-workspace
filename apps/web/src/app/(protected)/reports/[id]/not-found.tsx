import Link from "next/link";

export default function ReportDetailsNotFound(): React.JSX.Element {
  return (
    <div className="py-16 text-center">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">
        Report not found
      </h2>
      <p className="mb-6 text-gray-500">
        This report doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/reports"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to reports
      </Link>
    </div>
  );
}
