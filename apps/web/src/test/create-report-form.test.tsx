import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateReportForm } from "../components/reports/create-report-form";
import type { PaginatedReportsDto } from "../types";

vi.mock("../lib/api/client", () => ({
  createReportApi: vi.fn(),
  listReportsApi: vi.fn(),
}));

import { createReportApi, listReportsApi } from "../lib/api/client";

const emptyList: PaginatedReportsDto = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
};

describe("CreateReportForm", () => {
  const defaultProps = {
    accessToken: "token",
    onDataChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listReportsApi).mockResolvedValue(emptyList);
  });

  function fillDates(from: string, to: string): void {
    fireEvent.change(screen.getByLabelText("From"), { target: { value: from } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: to } });
  }

  it("shows a validation error and does not call the API when dateFrom is after dateTo", async () => {
    render(<CreateReportForm {...defaultProps} />);

    fillDates("2024-06-30", "2024-06-01");
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Start date must not be after end date"),
      ).toBeDefined();
    });
    expect(createReportApi).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not call the API when dateTo is in the future", async () => {
    render(<CreateReportForm {...defaultProps} />);

    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      .toISOString()
      .slice(0, 10);
    fillDates("2024-01-01", future);
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(
        screen.getByText("End date must not be in the future"),
      ).toBeDefined();
    });
    expect(createReportApi).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not call the API when the range exceeds 365 days", async () => {
    render(<CreateReportForm {...defaultProps} />);

    fillDates("2020-01-01", "2022-01-01");
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Date range must not exceed 365 days"),
      ).toBeDefined();
    });
    expect(createReportApi).not.toHaveBeenCalled();
  });

  it("submits, refreshes the list, and clears the submission error on success", async () => {
    const updatedList: PaginatedReportsDto = {
      items: [
        {
          id: "report-1",
          requestedById: "user-1",
          dateFrom: "2024-06-01",
          dateTo: "2024-06-30",
          isEmpty: false,
          analysisCount: 5,
          sentimentDistribution: { positive: 5 },
          mostActiveUsers: [],
          createdAt: "2024-07-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    vi.mocked(createReportApi).mockResolvedValue(updatedList.items[0]);
    vi.mocked(listReportsApi).mockResolvedValue(updatedList);

    render(<CreateReportForm {...defaultProps} />);

    fillDates("2024-06-01", "2024-06-30");
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(createReportApi).toHaveBeenCalledWith(
        "token",
        "2024-06-01",
        "2024-06-30",
      );
      expect(defaultProps.onDataChange).toHaveBeenCalledWith(updatedList);
    });
  });

  it("renders a submission error when the API call fails", async () => {
    vi.mocked(createReportApi).mockRejectedValue({
      message: "Something went wrong on the server",
    });

    render(<CreateReportForm {...defaultProps} />);

    fillDates("2024-06-01", "2024-06-30");
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong on the server"),
      ).toBeDefined();
    });
  });
});
