import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { trimString } from '../../../common/transforms/query.transforms';
import {
  AssetPurpose,
  AssetStatus,
  AssetVisibility,
} from '../../../generated/prisma/enums';

export class CreateUploadDto {
  @ApiProperty({ enum: AssetPurpose, enumName: 'AssetPurpose' })
  @IsEnum(AssetPurpose)
  purpose: AssetPurpose;

  @ApiProperty({ example: 'toeic-test-01-part-1.mp3' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'audio/mpeg' })
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  contentType: string;

  @ApiProperty({ example: 4200000, description: 'Dung lượng file, byte' })
  @IsInt()
  @Min(1)
  sizeBytes: number;
}

export class CompleteUploadDto {
  @ApiPropertyOptional({
    example: 312,
    description: 'Độ dài audio tính bằng giây, FE đọc từ file trước khi upload',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;
}

export class AssetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AssetPurpose, enumName: 'AssetPurpose' })
  @IsOptional()
  @IsEnum(AssetPurpose)
  purpose?: AssetPurpose;

  @ApiPropertyOptional({ enum: AssetStatus, enumName: 'AssetStatus' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}

export class AssetDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'audio/2026/09/0192f3a1.mp3' })
  key: string;

  @ApiProperty({ enum: AssetPurpose, enumName: 'AssetPurpose' })
  purpose: AssetPurpose;

  @ApiProperty({ enum: AssetVisibility, enumName: 'AssetVisibility' })
  visibility: AssetVisibility;

  @ApiProperty({ enum: AssetStatus, enumName: 'AssetStatus' })
  status: AssetStatus;

  @ApiProperty({ example: 'audio/mpeg' })
  contentType: string;

  @ApiProperty({ type: Number, nullable: true })
  sizeBytes: number | null;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds: number | null;

  @ApiProperty({ type: String, nullable: true })
  originalName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Ảnh: URL public dán thẳng vào nội dung. Audio: link có chữ ký, hết hạn sau vài giờ. null khi chưa upload xong',
  })
  url: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class UploadTicketDto {
  @ApiProperty({ type: AssetDto })
  asset: AssetDto;

  @ApiProperty({
    description: 'PUT file lên URL này, kèm đúng các header bên dưới',
  })
  uploadUrl: string;

  @ApiProperty({ example: 'PUT' })
  method: 'PUT';

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { 'Content-Type': 'audio/mpeg' },
  })
  headers: Record<string, string>;

  @ApiProperty({ format: 'date-time' })
  expiresAt: Date;
}
