"use client";

import * as React from "react";
import type { PaginatedAnalysesDto } from "@/types";
import { AnalyzeForm } from "./analyze-form";
import { AnalysisResultsList } from "./results-list/analysis-results-list";

export interface AnalyticsPageFormProps {
  initialData: PaginatedAnalysesDto;
  accessToken: string;
  userId: string;
}

export function AnalyticsPageForm({
  initialData,
  accessToken,
  userId,
}: AnalyticsPageFormProps): React.JSX.Element {
  const [data, setData] = React.useState<PaginatedAnalysesDto>(initialData);

  return (
    <div className="space-y-6">
      <AnalyzeForm
        accessToken={accessToken}
        userId={userId}
        onDataChange={setData}
      />
      <AnalysisResultsList
        rows={data.items}
        total={data.total}
        page={data.page}
        limit={data.limit}
        accessToken={accessToken}
        userId={userId}
        onDataChange={setData}
      />
    </div>
  );
}
