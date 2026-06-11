import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions';
import { USER_NOT_FOUND, USER_ALREADY_EXISTS, USER_INACTIVE } from './models';

export class UserNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(
      'USER_NOT_FOUND',
      `${USER_NOT_FOUND}: ${identifier}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(
      'USER_ALREADY_EXISTS',
      `${USER_ALREADY_EXISTS}: ${email}`,
      HttpStatus.CONFLICT,
    );
  }
}

export class UserInactiveException extends DomainException {
  constructor() {
    super('USER_INACTIVE', USER_INACTIVE, HttpStatus.FORBIDDEN);
  }
}
