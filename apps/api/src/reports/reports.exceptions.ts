import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/exceptions';
import { REPORT_NOT_OWNED, REPORT_ARCHIVAL_RESTRICTED } from './models';

export class ReportNotOwnedException extends DomainException {
  constructor(reportId: string) {
    super(
      'REPORT_NOT_OWNED',
      `${REPORT_NOT_OWNED}: ${reportId}`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ReportArchivalRestrictedException extends DomainException {
  constructor(reportId: string) {
    super(
      'REPORT_ARCHIVAL_RESTRICTED',
      `${REPORT_ARCHIVAL_RESTRICTED}: ${reportId}`,
      HttpStatus.FORBIDDEN,
    );
  }
}
