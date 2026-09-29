import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../common/transforms/query.transforms';
import { LessonStatus } from '../../../generated/prisma/enums';
import { LessonBlockDto } from './lesson-block.dto';

export class CreateLessonDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  courseId: string;

  @ApiProperty({
    example: 'UNIT-03',
    description: 'Duy nhất trong khoá, chữ hoa, số, gạch ngang',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9-]{2,50}$/, {
    message: 'code chỉ gồm chữ hoa, số, gạch ngang, từ 2 đến 50 ký tự',
  })
  code: string;

  @ApiProperty({ example: 'Unit 3: Travel', maxLength: 300 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'thumbnailUrl phải là URL hợp lệ' },
  )
  @MaxLength(2048)
  thumbnailUrl?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Chủ đề từ vựng của unit',
  })
  @IsOptional()
  @IsUUID()
  topicId?: string | null;

  @ApiPropertyOptional({ default: 50, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number | null;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

export class LessonQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề hoặc mã' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: LessonStatus, enumName: 'LessonStatus' })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

export class LessonDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  courseId: string;

  @ApiProperty({ example: 'UNIT-03' })
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  topicId: string | null;

  @ApiProperty()
  xpReward: number;

  @ApiProperty({ type: Number, nullable: true })
  estimatedMinutes: number | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty()
  blockCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class LessonDetailDto extends LessonDto {
  @ApiProperty({ type: [LessonBlockDto] })
  blocks: LessonBlockDto[];
}
