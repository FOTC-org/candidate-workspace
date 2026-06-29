import { HttpException } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    statusCode: number,
  ) {
    super({ errorCode, message, statusCode }, statusCode);
  }
}
