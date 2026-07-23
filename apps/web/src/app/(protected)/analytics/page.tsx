import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getMeApi } from "@/lib/api/users";
import { getAnalysisHistoryApi } from "@/lib/api/analytics";
import { AnalyticsPageForm } from "@/components/analytics/analytics-page-form";

export const metadata: Metadata = { title: "Analytics — UserHub" };

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) notFound();

  let userId: string;
  let data;
  try {
    const me = await getMeApi(accessToken);
    userId = me.id;
    data = await getAnalysisHistoryApi(accessToken, userId, 1, 20);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 401) redirect("/api/auth/logout");
    throw err;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Analytics</h1>
      <AnalyticsPageForm
        initialData={data}
        accessToken={accessToken}
        userId={userId}
      />
    </div>
  );
}
