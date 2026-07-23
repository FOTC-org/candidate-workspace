import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions';
import { REPORT_NOT_FOUND } from './models';

export class ReportNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(
      'REPORT_NOT_FOUND',
      `${REPORT_NOT_FOUND}: ${identifier}`,
      HttpStatus.NOT_FOUND,
    );
  }
}
