import * as React from "react";
import type { PaginatedReportsDto } from "@/types";
import { createReportApi, listReportsApi } from "@/lib/api/client";

function extractErrorMessage(err: unknown): string {
  const parsed = err as { message?: string };
  return parsed.message ?? "Something went wrong. Please try again.";
}

export interface UseCreateReportSubmissionResult {
  submissionError: string;
  submit: (dateFrom: string, dateTo: string) => Promise<void>;
}

export function useCreateReportSubmission(
  accessToken: string,
  onDataChange: (data: PaginatedReportsDto) => void,
): UseCreateReportSubmissionResult {
  const [submissionError, setSubmissionError] = React.useState<string>("");

  const submit = React.useCallback(
    async (dateFrom: string, dateTo: string): Promise<void> => {
      setSubmissionError("");
      try {
        await createReportApi(accessToken, dateFrom, dateTo);
        const updated = await listReportsApi(accessToken, 1, 20);
        onDataChange(updated);
      } catch (err: unknown) {
        setSubmissionError(extractErrorMessage(err));
      }
    },
    [accessToken, onDataChange],
  );

  return { submissionError, submit };
}
