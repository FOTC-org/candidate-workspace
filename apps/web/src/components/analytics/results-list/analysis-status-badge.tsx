import type { AnalysisStatus } from "@/types";

export interface AnalysisStatusBadgeProps {
  status: AnalysisStatus;
}

const STATUS_STYLES: Record<AnalysisStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SUCCESS: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function AnalysisStatusBadge({
  status,
}: AnalysisStatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
