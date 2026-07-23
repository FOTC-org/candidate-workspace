"use client";

import * as React from "react";
import type { PaginatedReportsDto } from "@/types";
import { CreateReportForm } from "./create-report-form";
import { ReportsList } from "./reports-list/reports-list";

export interface ReportsPageFormProps {
  initialData: PaginatedReportsDto;
  accessToken: string;
}

export function ReportsPageForm({
  initialData,
  accessToken,
}: ReportsPageFormProps): React.JSX.Element {
  const [data, setData] = React.useState<PaginatedReportsDto>(initialData);

  return (
    <div className="space-y-6">
      <CreateReportForm accessToken={accessToken} onDataChange={setData} />
      <ReportsList
        rows={data.items}
        total={data.total}
        page={data.page}
        limit={data.limit}
        accessToken={accessToken}
        onDataChange={setData}
      />
    </div>
  );
}
