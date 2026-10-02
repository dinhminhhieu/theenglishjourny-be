import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { URL_OPTIONS } from '../../../common/constants/url.constant';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../common/transforms/query.transforms';
import { IsBandScore } from '../../../common/validators/is-band-score.validator';
import { CefrLevel, LessonStatus } from '../../../generated/prisma/enums';
import { LessonDto } from './lesson.dto';

export class CreateCourseDto {
  @ApiProperty({
    example: 'IELTS-4-5',
    description: 'Mã duy nhất, chữ hoa, số, gạch ngang',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9-]{2,50}$/, {
    message: 'code chỉ gồm chữ hoa, số, gạch ngang, từ 2 đến 50 ký tự',
  })
  code: string;

  @ApiProperty({ example: 'IELTS 4.0 đến 5.0', maxLength: 300 })
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
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl(URL_OPTIONS, { message: 'thumbnailUrl phải là URL hợp lệ' })
  @MaxLength(2048)
  thumbnailUrl?: string | null;

  @ApiPropertyOptional({
    enum: CefrLevel,
    enumName: 'CefrLevel',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(CefrLevel)
  levelFrom?: CefrLevel | null;

  @ApiPropertyOptional({
    enum: CefrLevel,
    enumName: 'CefrLevel',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(CefrLevel)
  levelTo?: CefrLevel | null;

  @ApiPropertyOptional({ example: 4.0, nullable: true })
  @IsOptional()
  @IsBandScore()
  targetBandFrom?: number | null;

  @ApiPropertyOptional({ example: 5.0, nullable: true })
  @IsOptional()
  @IsBandScore()
  targetBandTo?: number | null;

  @ApiPropertyOptional({
    default: true,
    description: 'false = khoá học thử, ai cũng học được',
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({
    example: 499000,
    minimum: 0,
    nullable: true,
    description: 'Giá VND, số nguyên',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    example: 365,
    minimum: 1,
    nullable: true,
    description: 'null = trọn đời',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  accessDays?: number | null;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CourseQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'true/false, bỏ trống = tất cả' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

export class CourseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'IELTS-4-5' })
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', nullable: true })
  levelFrom: CefrLevel | null;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', nullable: true })
  levelTo: CefrLevel | null;

  @ApiProperty({ type: Number, nullable: true })
  targetBandFrom: number | null;

  @ApiProperty({ type: Number, nullable: true })
  targetBandTo: number | null;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty({ type: Number, nullable: true })
  price: number | null;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ type: Number, nullable: true })
  accessDays: number | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ description: 'Số unit chưa xoá' })
  lessonCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class CourseDetailDto extends CourseDto {
  @ApiProperty({
    type: [LessonDto],
    description: 'Unit chưa xoá, đã sắp theo sortOrder',
  })
  lessons: LessonDto[];
}
