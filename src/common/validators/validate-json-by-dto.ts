import {
  ClassConstructor,
  instanceToPlain,
  plainToInstance,
} from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

export interface JsonValidationResult {
  /** Bản đã lược bỏ key lạ, dùng để lưu. */
  value: Record<string, unknown>;
  errors: string[];
}

/**
 * Validate một object JSON tự do bằng DTO class-validator, không ném lỗi.
 * Dùng cho các cột JSON có hình dạng thay đổi theo loại, vd nội dung section ngữ pháp hay nhóm câu hỏi.
 */
export function validateJsonByDto(
  dto: ClassConstructor<object>,
  input: unknown,
): JsonValidationResult {
  const source =
    input !== null && typeof input === 'object' && !Array.isArray(input)
      ? input
      : {};
  const instance = plainToInstance(dto, source);
  // forbidUnknownValues tắt để DTO rỗng (không có decorator) vẫn validate được: khi đó mọi key đều bị báo là thừa.
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: false,
  });
  const messages =
    input !== undefined &&
    input !== null &&
    (typeof input !== 'object' || Array.isArray(input))
      ? ['phải là object']
      : flattenValidationErrors(errors);
  return {
    value: instanceToPlain(instance) as Record<string, unknown>,
    errors: messages,
  };
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map(
      (message) => `${path}: ${message}`,
    );
    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });
}
