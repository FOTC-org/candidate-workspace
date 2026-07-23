import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { User, Report } from '@prisma/client';
import {
  ReportNotOwnedException,
  ReportArchivalRestrictedException,
} from './reports.exceptions';

@Injectable()
export class ReportsAuthorizationService {
  assertCanView(user: User, report: Report): void {
    if (user.role === Role.ADMIN) return;

    if (report.requestedById !== user.id) {
      throw new ReportNotOwnedException(report.id);
    }

    if (user.role === Role.MANAGER && report.coversOnlyInactiveUsers) {
      throw new ReportArchivalRestrictedException(report.id);
    }
  }
}
