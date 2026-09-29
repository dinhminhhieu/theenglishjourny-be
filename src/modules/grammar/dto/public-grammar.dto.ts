import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { trimString } from '../../../common/transforms/query.transforms';
import { CefrLevel, LessonTier } from '../../../generated/prisma/enums';
import { GrammarCategoryDto } from './grammar-category.dto';
import { GrammarLessonDto } from './grammar-lesson.dto';
import { GrammarSectionDto } from './grammar-section.dto';

export class PublicGrammarCategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class PublicGrammarLessonQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  grammarCategoryId?: string;

  @ApiPropertyOptional({ enum: LessonTier, enumName: 'LessonTier' })
  @IsOptional()
  @IsEnum(LessonTier)
  tier?: LessonTier;

  @ApiPropertyOptional({
    enum: CefrLevel,
    enumName: 'CefrLevel',
    description: 'Chỉ lấy bài có khoảng levelFrom đến levelTo chứa mức này',
  })
  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề hoặc mã' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** Bản cho người học: bỏ các trường quản trị như trạng thái, xoá mềm, thời điểm sửa. */
export class PublicGrammarCategoryDto extends OmitType(GrammarCategoryDto, [
  'sortOrder',
  'isActive',
  'lessonCount',
  'deletedAt',
  'createdAt',
  'updatedAt',
] as const) {
  @ApiProperty({ description: 'Số bài đã phát hành trong chủ điểm' })
  lessonCount: number;
}

export class PublicGrammarLessonDto extends OmitType(GrammarLessonDto, [
  'sortOrder',
  'status',
  'deletedAt',
  'createdAt',
  'updatedAt',
] as const) {}

export class PublicGrammarLessonDetailDto extends PublicGrammarLessonDto {
  @ApiProperty({ example: 'Thì & Thời trong tiếng Anh' })
  categoryTitle: string;

  @ApiProperty({
    type: [GrammarSectionDto],
    description: 'Đã sắp theo sortOrder',
  })
  sections: GrammarSectionDto[];
}
