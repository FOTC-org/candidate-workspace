import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalysisResultsList } from "../components/analytics/results-list/analysis-results-list";
import type { AnalysisDto, PaginatedAnalysesDto } from "../types";

vi.mock("../lib/api/client", () => ({
  getAnalysisHistoryApi: vi.fn(),
}));

import { getAnalysisHistoryApi } from "../lib/api/client";

const makeAnalysis = (overrides: Partial<AnalysisDto> = {}): AnalysisDto => ({
  id: "analysis-1",
  userId: "user-1",
  text: "some note",
  status: "SUCCESS",
  sentiment: "positive",
  keywords: ["great", "service"],
  errorCode: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("AnalysisResultsList", () => {
  const defaultProps = {
    rows: [makeAnalysis()],
    total: 1,
    page: 1,
    limit: 20,
    accessToken: "token",
    userId: "user-1",
    onDataChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no analyses", () => {
    render(<AnalysisResultsList {...defaultProps} rows={[]} total={0} />);

    expect(screen.getByText("No analyses yet.")).toBeDefined();
  });

  it("renders analysis rows with status, sentiment, and keywords", () => {
    render(<AnalysisResultsList {...defaultProps} />);

    expect(screen.getByText("some note")).toBeDefined();
    expect(screen.getByText("SUCCESS")).toBeDefined();
    expect(screen.getByText("positive")).toBeDefined();
    expect(screen.getByText("great, service")).toBeDefined();
  });

  it("renders a dash for null sentiment and keywords", () => {
    const pending = makeAnalysis({
      status: "PENDING",
      sentiment: null,
      keywords: null,
    });
    render(<AnalysisResultsList {...defaultProps} rows={[pending]} />);

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(2);
  });

  it("hides pagination when total <= limit", () => {
    render(<AnalysisResultsList {...defaultProps} total={5} limit={20} />);

    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
  });

  it("shows pagination and fetches the new page when total > limit", async () => {
    const nextPageData: PaginatedAnalysesDto = {
      items: [makeAnalysis({ id: "analysis-2" })],
      total: 50,
      page: 2,
      limit: 20,
    };
    vi.mocked(getAnalysisHistoryApi).mockResolvedValue(nextPageData);

    render(<AnalysisResultsList {...defaultProps} total={50} limit={20} />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(getAnalysisHistoryApi).toHaveBeenCalledWith(
        "token",
        "user-1",
        2,
        20,
      );
      expect(defaultProps.onDataChange).toHaveBeenCalledWith(nextPageData);
    });
  });
});
