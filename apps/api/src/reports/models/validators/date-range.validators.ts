import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const MAX_RANGE_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@ValidatorConstraint({ name: 'isDateFromBeforeOrEqualDateTo', async: false })
class IsDateFromBeforeOrEqualDateToConstraint
  implements ValidatorConstraintInterface
{
  validate(dateTo: Date, args: ValidationArguments): boolean {
    const dateFrom = (args.object as { dateFrom?: Date }).dateFrom;
    if (!dateFrom || !dateTo) return true;
    return dateFrom.getTime() <= dateTo.getTime();
  }

  defaultMessage(): string {
    return 'dateFrom must not be after dateTo';
  }
}

export function IsDateFromBeforeOrEqualDateTo(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsDateFromBeforeOrEqualDateToConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: Date): boolean {
    if (!value) return true;
    return value.getTime() <= Date.now();
  }

  defaultMessage(): string {
    return 'dateTo must not be in the future';
  }
}

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsNotFutureDateConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isWithinMaxRangeDays', async: false })
class IsWithinMaxRangeDaysConstraint implements ValidatorConstraintInterface {
  validate(dateTo: Date, args: ValidationArguments): boolean {
    const dateFrom = (args.object as { dateFrom?: Date }).dateFrom;
    if (!dateFrom || !dateTo) return true;
    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / MS_PER_DAY;
    return diffDays <= MAX_RANGE_DAYS;
  }

  defaultMessage(): string {
    return `Date range must not exceed ${MAX_RANGE_DAYS} days`;
  }
}

export function IsWithinMaxRangeDays(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsWithinMaxRangeDaysConstraint,
    });
  };
}
