import * as React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyzeForm } from "../components/analytics/analyze-form";
import type { AnalysisDto, PaginatedAnalysesDto } from "../types";

vi.mock("../lib/api/client", () => ({
  analyzeApi: vi.fn(),
  getAnalysisHistoryApi: vi.fn(),
}));

import { analyzeApi, getAnalysisHistoryApi } from "../lib/api/client";

const makeAnalysis = (overrides: Partial<AnalysisDto> = {}): AnalysisDto => ({
  id: "analysis-1",
  userId: "user-1",
  text: "some note",
  status: "SUCCESS",
  sentiment: "positive",
  keywords: ["great"],
  errorCode: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const emptyHistory: PaginatedAnalysesDto = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
};

describe("AnalyzeForm", () => {
  const defaultProps = {
    accessToken: "token",
    userId: "user-1",
    onDataChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAnalysisHistoryApi).mockResolvedValue(emptyHistory);
  });

  it("does not call the API and shows a validation error when text is empty", async () => {
    render(<AnalyzeForm {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByText("Text is required")).toBeDefined();
    });
    expect(analyzeApi).not.toHaveBeenCalled();
  });

  it("shows the in-progress state while the mutation is pending", async () => {
    let resolveAnalyze!: (value: AnalysisDto) => void;
    const pending = new Promise<AnalysisDto>((resolve) => {
      resolveAnalyze = resolve;
    });
    vi.mocked(analyzeApi).mockReturnValue(pending);

    render(<AnalyzeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "a good note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /analyzing/i })).toBeDefined();
    });

    await act(async () => {
      resolveAnalyze(makeAnalysis());
    });
  });

  it("renders the retry affordance and a derived error message on failure", async () => {
    vi.mocked(analyzeApi).mockRejectedValue({
      errorCode: "ANALYTICS_PROVIDER_UNAVAILABLE",
      message: "raw message",
    });

    render(<AnalyzeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "a note __error_500__" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/analytics service is currently unavailable/i),
      ).toBeDefined();
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });

  it("resubmits on retry and renders the result on success", async () => {
    vi.mocked(analyzeApi).mockRejectedValueOnce({
      errorCode: "ANALYTICS_PROVIDER_UNAVAILABLE",
    });
    const succeeded = makeAnalysis({ sentiment: "neutral" });
    vi.mocked(analyzeApi).mockResolvedValueOnce(succeeded);
    const updatedHistory: PaginatedAnalysesDto = {
      items: [succeeded],
      total: 1,
      page: 1,
      limit: 20,
    };
    vi.mocked(getAnalysisHistoryApi).mockResolvedValueOnce(updatedHistory);

    render(<AnalyzeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "a note __error_500__" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeDefined();
      expect(screen.getByText("neutral")).toBeDefined();
    });
    expect(defaultProps.onDataChange).toHaveBeenCalledWith(updatedHistory);
  });
});
