import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getMeApi } from "@/lib/api/users";
import { ProfileCard } from "@/components/core/profile-card";

export const metadata: Metadata = { title: "Profile — UserHub" };

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) notFound();

  let user;
  try {
    user = await getMeApi(accessToken);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 401) redirect("/api/auth/logout");
    throw err;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>
      <ProfileCard user={user} />
    </div>
  );
}
