import type { ReportDto } from "@/types";
import { SentimentDistribution } from "./sentiment-distribution";
import { ActiveUsersList } from "./active-users-list";

export interface ReportDetailsProps {
  report: ReportDto;
}

export function ReportDetails({ report }: ReportDetailsProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Date range</dt>
            <dd className="text-sm text-gray-900">
              {new Date(report.dateFrom).toLocaleDateString("en-CA")} –{" "}
              {new Date(report.dateTo).toLocaleDateString("en-CA")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Analyses</dt>
            <dd className="text-sm text-gray-900">
              {report.isEmpty ? "Empty" : report.analysisCount}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-sm text-gray-900">
              {new Date(report.createdAt).toLocaleDateString("en-CA")}
            </dd>
          </div>
        </dl>
      </div>

      {report.isEmpty ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">
            No successful analyses were found in this date range.
          </p>
        </div>
      ) : (
        <>
          <SentimentDistribution distribution={report.sentimentDistribution} />
          <ActiveUsersList users={report.mostActiveUsers} />
        </>
      )}
    </div>
  );
}
