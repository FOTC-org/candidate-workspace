import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getUsersApi } from "@/lib/api/users";
import { UsersPageForm } from "@/components/users/users-page-form";

export const metadata: Metadata = { title: "Users — UserHub" };

export default async function UsersPage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) notFound();

  let data;
  try {
    data = await getUsersApi(accessToken, 1, 20);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 401) redirect("/api/auth/logout");
    throw err;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Users</h1>
      <UsersPageForm initialData={data} accessToken={accessToken} />
    </div>
  );
}
