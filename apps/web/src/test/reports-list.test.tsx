import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportsList } from "../components/reports/reports-list/reports-list";
import type { ReportDto, PaginatedReportsDto } from "../types";

vi.mock("../lib/api/client", () => ({
  listReportsApi: vi.fn(),
}));

import { listReportsApi } from "../lib/api/client";

const makeReport = (overrides: Partial<ReportDto> = {}): ReportDto => ({
  id: "report-1",
  requestedById: "user-1",
  dateFrom: "2024-06-01",
  dateTo: "2024-06-30",
  isEmpty: false,
  analysisCount: 4,
  sentimentDistribution: { positive: 4 },
  mostActiveUsers: [],
  createdAt: "2024-07-01T00:00:00.000Z",
  ...overrides,
});

describe("ReportsList", () => {
  const defaultProps = {
    rows: [makeReport()],
    total: 1,
    page: 1,
    limit: 20,
    accessToken: "token",
    onDataChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no reports", () => {
    render(<ReportsList {...defaultProps} rows={[]} total={0} />);

    expect(screen.getByText("No reports yet.")).toBeDefined();
  });

  it("renders report rows with date range and analysis count", () => {
    render(<ReportsList {...defaultProps} />);

    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByRole("link", { name: /view/i })).toBeDefined();
  });

  it("renders 'Empty' instead of a count for an empty report", () => {
    const emptyReport = makeReport({ isEmpty: true, analysisCount: 0 });
    render(<ReportsList {...defaultProps} rows={[emptyReport]} />);

    expect(screen.getByText("Empty")).toBeDefined();
  });

  it("hides pagination when total <= limit", () => {
    render(<ReportsList {...defaultProps} total={5} limit={20} />);

    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
  });

  it("shows pagination and fetches the new page when total > limit", async () => {
    const nextPageData: PaginatedReportsDto = {
      items: [makeReport({ id: "report-2" })],
      total: 50,
      page: 2,
      limit: 20,
    };
    vi.mocked(listReportsApi).mockResolvedValue(nextPageData);

    render(<ReportsList {...defaultProps} total={50} limit={20} />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(listReportsApi).toHaveBeenCalledWith("token", 2, 20);
      expect(defaultProps.onDataChange).toHaveBeenCalledWith(nextPageData);
    });
  });
});
