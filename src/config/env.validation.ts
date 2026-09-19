import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Khai báo + validate toàn bộ biến môi trường app cần.
 * App sẽ crash ngay lúc boot nếu thiếu hoặc sai kiểu, thay vì lỗi ngầm lúc runtime.
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 8000;

  @IsString()
  API_PREFIX: string = 'api/v1';

  /** Danh sách origin cho CORS, phân cách bằng dấu phẩy. Rỗng = cho phép tất cả. */
  @IsString()
  ALLOWED_ORIGINS: string = '';

  @IsString()
  @MinLength(1)
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET phải dài ít nhất 32 ký tự' })
  JWT_ACCESS_SECRET: string;

  /** Định dạng của thư viện ms, vd "15m", "1h". */
  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 7;

  // ---- Mail ----
  // Không có SMTP_HOST thì email được in ra console (chỉ nên dùng khi dev).

  @IsString()
  MAIL_FROM: string = 'The IELTS Foundation <no-reply@theieltsfoundation.com>';

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  /** 465 = SMTPS (TLS ngay từ đầu), 587 = STARTTLS. */
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 587;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;
}

/** ConfigService đã được type theo EnvironmentVariables; dùng `get('KEY', { infer: true })`. */
export type AppConfigService = ConfigService<EnvironmentVariables, true>;

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new Error(
      `Biến môi trường không hợp lệ:\n- ${messages.join('\n- ')}`,
    );
  }

  return validated;
}
