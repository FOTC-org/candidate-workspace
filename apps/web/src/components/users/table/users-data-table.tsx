"use client";

import * as React from "react";
import type { UserDto, PaginatedUsersDto } from "@/types";
import { deactivateUserApi, getUsersApi } from "@/lib/api/client";

export interface UsersDataTableProps {
  rows: UserDto[];
  total: number;
  page: number;
  limit: number;
  accessToken: string;
  onDataChange: (data: PaginatedUsersDto) => void;
}

export function UsersDataTable({
  rows,
  total,
  page,
  limit,
  accessToken,
  onDataChange,
}: UsersDataTableProps): React.JSX.Element {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  async function handleDeactivate(id: string): Promise<void> {
    setLoadingId(id);
    try {
      await deactivateUserApi(accessToken, id);
      const updated = await getUsersApi(accessToken, page, limit);
      onDataChange(updated);
    } finally {
      setLoadingId(null);
    }
  }

  async function handlePageChange(newPage: number): Promise<void> {
    const updated = await getUsersApi(accessToken, newPage, limit);
    onDataChange(updated);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Email
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Role
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Created
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900">{user.email}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(user.createdAt).toLocaleDateString("en-CA")}
              </td>
              <td className="px-4 py-3 text-right">
                {user.isActive && (
                  <button
                    onClick={() => handleDeactivate(user.id)}
                    disabled={loadingId === user.id}
                    className="rounded bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    {loadingId === user.id ? "Deactivating..." : "Deactivate"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {total > limit && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page * limit >= total}
              className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
