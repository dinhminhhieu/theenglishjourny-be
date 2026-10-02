import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { URL_OPTIONS } from '../../../common/constants/url.constant';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../common/transforms/query.transforms';

export class CreateGrammarCategoryDto {
  @ApiProperty({ example: 'Thì & Thời trong tiếng Anh', maxLength: 200 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Verb Tenses Mastery', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl(URL_OPTIONS, { message: 'imageUrl phải là URL hợp lệ' })
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGrammarCategoryDto extends PartialType(
  CreateGrammarCategoryDto,
) {}

export class GrammarCategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'true/false, bỏ trống = tất cả' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

export class GrammarCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: 'Số bài chưa xoá trong chủ điểm' })
  lessonCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
