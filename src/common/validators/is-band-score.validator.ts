import { registerDecorator, ValidationOptions } from 'class-validator';

/** Band IELTS: số từ 0 đến 9, bước 0.5. */
export function IsBandScore(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isBandScore',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} phải là band từ 0 đến 9, bước 0.5`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'number' &&
          value >= 0 &&
          value <= 9 &&
          Number.isInteger(value * 2),
      },
    });
  };
}
