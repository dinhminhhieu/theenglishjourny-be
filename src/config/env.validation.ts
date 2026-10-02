import { ConfigService } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * enableImplicitConversion biến chuỗi "false" thành true, nên biến boolean phải đọc giá trị gốc.
 * Chỉ chạy khi biến có trong môi trường, thiếu thì giữ giá trị mặc định của class.
 */
const toEnvBoolean = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => obj[key] === true || obj[key] === 'true' || obj[key] === '1';

/** Tài khoản mặc định của MinIO local, cấm dùng khi chạy production. */
const LOCAL_S3_KEY = 'minioadmin';

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
  MAIL_FROM: string = 'The English Journey <no-reply@theenglishjourney.com>';

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

  // ---- Object storage (S3, Cloudflare R2, MinIO) ----
  // Mặc định khớp với MinIO trong docker-compose.yml để chạy local không cần cấu hình.

  /** Bỏ trống khi dùng AWS S3. MinIO local: http://localhost:9000. R2: https://<account>.r2.cloudflarestorage.com */
  @IsString()
  S3_ENDPOINT: string = 'http://localhost:9000';

  /** R2 dùng "auto". */
  @IsString()
  S3_REGION: string = 'us-east-1';

  @IsString()
  @MinLength(1)
  S3_ACCESS_KEY_ID: string = LOCAL_S3_KEY;

  @IsString()
  @MinLength(1)
  S3_SECRET_ACCESS_KEY: string = LOCAL_S3_KEY;

  /** MinIO cần true, R2 chạy được cả hai, AWS S3 để false. */
  @Transform(toEnvBoolean)
  @IsBoolean()
  S3_FORCE_PATH_STYLE: boolean = true;

  /** Bucket cho ảnh, ai cũng đọc được. */
  @IsString()
  @MinLength(3)
  S3_PUBLIC_BUCKET: string = 'theenglishjourney-public';

  /** Bucket cho audio đề và file ghi âm, chỉ đọc qua link có chữ ký. */
  @IsString()
  @MinLength(3)
  S3_PRIVATE_BUCKET: string = 'theenglishjourney-private';

  /** Địa chỉ public của bucket ảnh, thường là CDN. */
  @IsString()
  S3_PUBLIC_BASE_URL: string = 'http://localhost:9000/theenglishjourney-public';

  @IsInt()
  @Min(60)
  @Max(86400)
  S3_PRESIGN_PUT_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(60)
  @Max(604800)
  S3_PRESIGN_GET_TTL_SECONDS: number = 7200;

  // ---- Bài làm ----

  /** Số giây cho phép nộp trễ sau khi hết giờ, bù độ trễ mạng. */
  @IsInt()
  @Min(0)
  @Max(600)
  ATTEMPT_GRACE_SECONDS: number = 30;

  /** Số bài làm tối đa một người được bắt đầu trong 24 giờ, chống cào đề. */
  @IsInt()
  @Min(1)
  ATTEMPT_DAILY_LIMIT: number = 50;
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

  const messages = errors.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
  if (
    validated.NODE_ENV === Environment.Production &&
    (validated.S3_ACCESS_KEY_ID === LOCAL_S3_KEY ||
      validated.S3_SECRET_ACCESS_KEY === LOCAL_S3_KEY)
  ) {
    messages.push(
      'Production phải cấu hình S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY thật',
    );
  }

  if (messages.length > 0) {
    throw new Error(
      `Biến môi trường không hợp lệ:\n- ${messages.join('\n- ')}`,
    );
  }

  return validated;
}
