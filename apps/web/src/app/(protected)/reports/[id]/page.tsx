import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getReportApi } from "@/lib/api/reports";
import { ReportDetails } from "@/components/reports/report-details/report-details";

export const metadata: Metadata = { title: "Report details — UserHub" };

export default async function ReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) notFound();

  let report;
  try {
    report = await getReportApi(accessToken, id);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 401) redirect("/api/auth/logout");
    if (status === 403 || status === 404) notFound();
    throw err;
  }

  return (
    <div>
      <Link
        href="/reports"
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← Back to reports
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Report details</h1>
      <ReportDetails report={report} />
    </div>
  );
}
