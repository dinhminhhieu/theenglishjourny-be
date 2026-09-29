import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../common/transforms/query.transforms';
import {
  CefrLevel,
  LessonStatus,
  LessonTier,
} from '../../../generated/prisma/enums';
import { GrammarSectionDto } from './grammar-section.dto';

export class GrammarHighlightDto {
  @ApiProperty({ example: 'Công thức' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label: string;

  @ApiProperty({ example: '5 Cấu trúc chuẩn' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value: string;

  @ApiPropertyOptional({ enum: ['default', 'danger'], default: 'default' })
  @IsOptional()
  @IsIn(['default', 'danger'])
  tone?: 'default' | 'danger';
}

export class CreateGrammarLessonDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  grammarCategoryId: string;

  @ApiProperty({
    example: 'MOD-01-TENSE',
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

  @ApiProperty({
    example: 'Chuyên đề #01: Thì Hiện tại đơn (Present Simple Tense)',
    maxLength: 300,
  })
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

  @ApiPropertyOptional({
    nullable: true,
    description: 'Đoạn mô tả ngắn hiện ở thẻ bài',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string | null;

  @ApiProperty({ enum: LessonTier, enumName: 'LessonTier' })
  @IsEnum(LessonTier)
  tier: LessonTier;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', example: 'A1' })
  @IsEnum(CefrLevel)
  levelFrom: CefrLevel;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', example: 'C1' })
  @IsEnum(CefrLevel)
  levelTo: CefrLevel;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Level chính của bài, tham chiếu bảng levels',
  })
  @IsOptional()
  @IsUUID()
  levelId?: string | null;

  @ApiPropertyOptional({
    type: [GrammarHighlightDto],
    description: 'Các ô số liệu tóm tắt, tối đa 6',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => GrammarHighlightDto)
  highlights?: GrammarHighlightDto[];

  @ApiPropertyOptional({ example: 25, minimum: 1, nullable: true })
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

export class UpdateGrammarLessonDto extends PartialType(
  CreateGrammarLessonDto,
) {}

export class GrammarLessonQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  grammarCategoryId?: string;

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

export class GrammarLessonDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  grammarCategoryId: string;

  @ApiProperty({ example: 'MOD-01-TENSE' })
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  summary: string | null;

  @ApiProperty({ enum: LessonTier, enumName: 'LessonTier' })
  tier: LessonTier;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel' })
  levelFrom: CefrLevel;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel' })
  levelTo: CefrLevel;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  levelId: string | null;

  @ApiProperty({ type: [GrammarHighlightDto] })
  highlights: GrammarHighlightDto[];

  @ApiProperty({ type: Number, nullable: true })
  estimatedMinutes: number | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ description: 'Số section trong bài' })
  sectionCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class GrammarLessonDetailDto extends GrammarLessonDto {
  @ApiProperty({
    type: [GrammarSectionDto],
    description: 'Đã sắp theo sortOrder',
  })
  sections: GrammarSectionDto[];
}
