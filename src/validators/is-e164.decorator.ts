import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsE164(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isE164',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          const e164Regex = /^\+?[1-9]\d{1,14}$/;
          return typeof value === 'string' && e164Regex.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'O número deve estar no formato E.164 (ex: +5511999998888)';
        },
      },
    });
  };
}
