"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function Navigation(): React.JSX.Element {
  const router = useRouter();
  const [role, setRole] = React.useState<string>("");

  React.useEffect(() => {
    const userRole = document.cookie
      .split("; ")
      .find((r) => r.startsWith("userRole="))
      ?.split("=")[1];
    setRole(userRole ?? "");
  }, []);

  function handleLogout(): void {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    document.cookie = "refreshToken=; Max-Age=0; path=/";
    document.cookie = "userRole=; Max-Age=0; path=/";
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="text-lg font-bold text-gray-900">UserHub</span>
        <div className="flex items-center gap-4">
          <a
            href="/profile"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Profile
          </a>
          {role === "ADMIN" && (
            <a
              href="/users"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Users
            </a>
          )}
          <button
            onClick={handleLogout}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
