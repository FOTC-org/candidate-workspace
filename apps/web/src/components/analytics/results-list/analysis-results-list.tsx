"use client";

import * as React from "react";
import type { AnalysisDto, PaginatedAnalysesDto } from "@/types";
import { getAnalysisHistoryApi } from "@/lib/api/client";
import { AnalysisStatusBadge } from "./analysis-status-badge";

export interface AnalysisResultsListProps {
  rows: AnalysisDto[];
  total: number;
  page: number;
  limit: number;
  accessToken: string;
  userId: string;
  onDataChange: (data: PaginatedAnalysesDto) => void;
}

export function AnalysisResultsList({
  rows,
  total,
  page,
  limit,
  accessToken,
  userId,
  onDataChange,
}: AnalysisResultsListProps): React.JSX.Element {
  async function handlePageChange(newPage: number): Promise<void> {
    const updated = await getAnalysisHistoryApi(
      accessToken,
      userId,
      newPage,
      limit,
    );
    onDataChange(updated);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">No analyses yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Text
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Sentiment
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Keywords
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((analysis) => (
            <tr key={analysis.id} className="hover:bg-gray-50">
              <td className="max-w-xs truncate px-4 py-3 text-gray-900">
                {analysis.text}
              </td>
              <td className="px-4 py-3">
                <AnalysisStatusBadge status={analysis.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {analysis.sentiment ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {analysis.keywords ? analysis.keywords.join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(analysis.createdAt).toLocaleDateString("en-CA")}
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
