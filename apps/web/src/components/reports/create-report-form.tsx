"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PaginatedReportsDto } from "@/types";
import { createReportSchema, CreateReportValues } from "./types";
import { useCreateReportSubmission } from "./hooks/use-create-report-submission";

export interface CreateReportFormProps {
  accessToken: string;
  onDataChange: (data: PaginatedReportsDto) => void;
}

export function CreateReportForm({
  accessToken,
  onDataChange,
}: CreateReportFormProps): React.JSX.Element {
  const { submissionError, submit } = useCreateReportSubmission(
    accessToken,
    onDataChange,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateReportValues>({ resolver: zodResolver(createReportSchema) });

  async function onSubmit(values: CreateReportValues): Promise<void> {
    await submit(values.dateFrom, values.dateTo);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">
        Generate a report
      </h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-wrap items-end gap-4"
      >
        <div>
          <label
            htmlFor="dateFrom"
            className="block text-sm font-medium text-gray-700"
          >
            From
          </label>
          <input
            id="dateFrom"
            type="date"
            {...register("dateFrom")}
            className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.dateFrom && (
            <p className="mt-1 text-xs text-red-600">{errors.dateFrom.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="dateTo"
            className="block text-sm font-medium text-gray-700"
          >
            To
          </label>
          <input
            id="dateTo"
            type="date"
            {...register("dateTo")}
            className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.dateTo && (
            <p className="mt-1 text-xs text-red-600">{errors.dateTo.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Generating..." : "Generate report"}
        </button>
      </form>

      {submissionError && (
        <div
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {submissionError}
        </div>
      )}
    </div>
  );
}
