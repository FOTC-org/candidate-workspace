import * as React from "react";
import type { AnalysisDto, PaginatedAnalysesDto } from "@/types";
import { analyzeApi, getAnalysisHistoryApi } from "@/lib/api/client";
import { ANALYTICS_ERROR_MESSAGES } from "../models";

function extractErrorMessage(err: unknown): string {
  const parsed = err as { errorCode?: string; message?: string };
  if (parsed.errorCode && ANALYTICS_ERROR_MESSAGES[parsed.errorCode]) {
    return ANALYTICS_ERROR_MESSAGES[parsed.errorCode];
  }
  return parsed.message ?? "Something went wrong. Please try again.";
}

export interface UseAnalyzeSubmissionResult {
  submissionError: string;
  lastResult: AnalysisDto | null;
  submit: (text: string) => Promise<void>;
}

export function useAnalyzeSubmission(
  accessToken: string,
  userId: string,
  onDataChange: (data: PaginatedAnalysesDto) => void,
): UseAnalyzeSubmissionResult {
  const [submissionError, setSubmissionError] = React.useState<string>("");
  const [lastResult, setLastResult] = React.useState<AnalysisDto | null>(
    null,
  );

  const submit = React.useCallback(
    async (text: string): Promise<void> => {
      setSubmissionError("");
      setLastResult(null);
      try {
        const result = await analyzeApi(accessToken, userId, text);
        setLastResult(result);
        const updated = await getAnalysisHistoryApi(accessToken, userId, 1, 20);
        onDataChange(updated);
      } catch (err: unknown) {
        setSubmissionError(extractErrorMessage(err));
      }
    },
    [accessToken, userId, onDataChange],
  );

  return { submissionError, lastResult, submit };
}
