import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { listReportsApi } from "@/lib/api/reports";
import { ReportsPageForm } from "@/components/reports/reports-page-form";

export const metadata: Metadata = { title: "Reports — UserHub" };

export default async function ReportsPage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) notFound();

  let data;
  try {
    data = await listReportsApi(accessToken, 1, 20);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 401) redirect("/api/auth/logout");
    throw err;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Reports</h1>
      <ReportsPageForm initialData={data} accessToken={accessToken} />
    </div>
  );
}
