import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../../../common/transforms/query.transforms';
import { SectionType } from '../../../generated/prisma/enums';

/** Một section gửi lên khi thay toàn bộ nội dung bài. Có id = cập nhật, không id = tạo mới. */
export class GrammarSectionInputDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Bỏ trống để tạo mới' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: SectionType, enumName: 'SectionType' })
  @IsEnum(SectionType)
  type: SectionType;

  @ApiProperty({
    example: '01',
    description: 'Mã hiển thị trên thanh điều hướng, duy nhất trong bài',
  })
  @Transform(trimString)
  @IsString()
  @Matches(/^[A-Za-z0-9-]{1,10}$/, {
    message: 'code chỉ gồm chữ, số, gạch ngang, tối đa 10 ký tự',
  })
  code: string;

  @ApiProperty({
    example: 'Bản chất Tense-Aspect & 4 Ngữ cảnh Cốt lõi',
    maxLength: 300,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({
    example: 'Aspect: Simple (Fact-based)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Hình dạng theo type, xem các *ContentDto',
  })
  @IsObject()
  content: Record<string, unknown>;
}

export class ReplaceGrammarSectionsDto {
  @ApiProperty({
    type: [GrammarSectionInputDto],
    description: 'Thứ tự trong mảng là thứ tự hiển thị',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GrammarSectionInputDto)
  sections: GrammarSectionInputDto[];
}

export class GrammarSectionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: SectionType, enumName: 'SectionType' })
  type: SectionType;

  @ApiProperty({ example: '01' })
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  content: Record<string, unknown>;

  @ApiProperty()
  sortOrder: number;
}
