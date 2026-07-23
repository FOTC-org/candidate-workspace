import { Injectable } from '@nestjs/common';

interface SuccessfulAnalysisRecord {
  userId: string;
  sentiment: string | null;
  user: { email: string; isActive: boolean };
}

export interface ActiveUserAggregate {
  userId: string;
  email: string;
  analysisCount: number;
}

export interface ReportAggregation {
  isEmpty: boolean;
  analysisCount: number;
  sentimentDistribution: Record<string, number>;
  mostActiveUsers: ActiveUserAggregate[];
  coversOnlyInactiveUsers: boolean;
}

const MOST_ACTIVE_USERS_LIMIT = 5;

@Injectable()
export class ReportsAggregationService {
  aggregate(records: SuccessfulAnalysisRecord[]): ReportAggregation {
    if (records.length === 0) {
      return {
        isEmpty: true,
        analysisCount: 0,
        sentimentDistribution: {},
        mostActiveUsers: [],
        coversOnlyInactiveUsers: false,
      };
    }

    const sentimentDistribution: Record<string, number> = {};
    const perUser = new Map<
      string,
      { email: string; isActive: boolean; count: number }
    >();

    for (const record of records) {
      if (record.sentiment) {
        sentimentDistribution[record.sentiment] =
          (sentimentDistribution[record.sentiment] ?? 0) + 1;
      }

      const existing = perUser.get(record.userId);
      if (existing) {
        existing.count += 1;
      } else {
        perUser.set(record.userId, {
          email: record.user.email,
          isActive: record.user.isActive,
          count: 1,
        });
      }
    }

    const coversOnlyInactiveUsers = [...perUser.values()].every(
      (u) => !u.isActive,
    );

    const mostActiveUsers = [...perUser.entries()]
      .map(([userId, data]) => ({
        userId,
        email: data.email,
        analysisCount: data.count,
      }))
      .sort((a, b) => {
        if (b.analysisCount !== a.analysisCount) {
          return b.analysisCount - a.analysisCount;
        }
        return a.email.localeCompare(b.email);
      })
      .slice(0, MOST_ACTIVE_USERS_LIMIT);

    return {
      isEmpty: false,
      analysisCount: records.length,
      sentimentDistribution,
      mostActiveUsers,
      coversOnlyInactiveUsers,
    };
  }
}
