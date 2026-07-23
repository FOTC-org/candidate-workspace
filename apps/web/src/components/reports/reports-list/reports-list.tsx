"use client";

import * as React from "react";
import type { ReportDto, PaginatedReportsDto } from "@/types";
import { listReportsApi } from "@/lib/api/client";
import Link from "next/link";

export interface ReportsListProps {
  rows: ReportDto[];
  total: number;
  page: number;
  limit: number;
  accessToken: string;
  onDataChange: (data: PaginatedReportsDto) => void;
}

export function ReportsList({
  rows,
  total,
  page,
  limit,
  accessToken,
  onDataChange,
}: ReportsListProps): React.JSX.Element {
  async function handlePageChange(newPage: number): Promise<void> {
    const updated = await listReportsApi(accessToken, newPage, limit);
    onDataChange(updated);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">No reports yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Date range
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Analyses
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Created
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((report) => (
            <tr key={report.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900">
                {new Date(report.dateFrom).toLocaleDateString("en-CA")} –{" "}
                {new Date(report.dateTo).toLocaleDateString("en-CA")}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {report.isEmpty ? "Empty" : report.analysisCount}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(report.createdAt).toLocaleDateString("en-CA")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/reports/${report.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View
                </Link>
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
