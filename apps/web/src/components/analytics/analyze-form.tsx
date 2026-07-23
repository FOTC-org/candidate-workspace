"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PaginatedAnalysesDto } from "@/types";
import { useAnalyzeSubmission } from "./hooks/use-analyze-submission";

const analyzeSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

type AnalyzeValues = z.infer<typeof analyzeSchema>;

export interface AnalyzeFormProps {
  accessToken: string;
  userId: string;
  onDataChange: (data: PaginatedAnalysesDto) => void;
}

export function AnalyzeForm({
  accessToken,
  userId,
  onDataChange,
}: AnalyzeFormProps): React.JSX.Element {
  const { submissionError, lastResult, submit } = useAnalyzeSubmission(
    accessToken,
    userId,
    onDataChange,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnalyzeValues>({ resolver: zodResolver(analyzeSchema) });

  async function onSubmit(values: AnalyzeValues): Promise<void> {
    await submit(values.text);
  }

  React.useEffect(() => {
    if (lastResult) reset();
  }, [lastResult, reset]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">
        Analyze a note
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="text"
            className="block text-sm font-medium text-gray-700"
          >
            Text
          </label>
          <textarea
            id="text"
            rows={4}
            {...register("text")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.text && (
            <p className="mt-1 text-xs text-red-600">{errors.text.message}</p>
          )}
        </div>

        {submissionError && (
          <div
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {submissionError}
          </div>
        )}

        {lastResult && !submissionError && (
          <div
            className="rounded-md bg-green-50 p-3 text-sm text-green-700"
            role="status"
          >
            Analysis complete — sentiment:{" "}
            <strong>{lastResult.sentiment}</strong>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Analyzing..." : submissionError ? "Retry" : "Analyze"}
        </button>
      </form>
    </div>
  );
}
