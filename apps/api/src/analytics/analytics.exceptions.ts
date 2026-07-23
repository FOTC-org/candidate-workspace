import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/exceptions';
import {
  ANALYTICS_PROVIDER_UNAVAILABLE,
  ANALYTICS_INVALID_RESPONSE,
} from './models';

export class AnalyticsProviderUnavailableException extends DomainException {
  constructor(public readonly attemptsMade: number) {
    super(
      'ANALYTICS_PROVIDER_UNAVAILABLE',
      `${ANALYTICS_PROVIDER_UNAVAILABLE}: attempts made ${attemptsMade}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class AnalyticsInvalidResponseException extends DomainException {
  constructor(public readonly attemptsMade: number = 1) {
    super(
      'ANALYTICS_INVALID_RESPONSE',
      ANALYTICS_INVALID_RESPONSE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
