/**
 * Hình dạng các cột JSON của ngân hàng câu hỏi. Dùng để validate và mô tả Swagger.
 * Chữ trong đề viết markdown; chỗ trống trong template viết {{1}}, {{2}}... theo thứ tự câu trong nhóm.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { URL_OPTIONS } from '../../../common/constants/url.constant';

export class OptionDto {
  @ApiProperty({ example: 'A', description: 'Mã lựa chọn: chữ, số, gạch dưới' })
  @Matches(/^[A-Za-z0-9_]{1,12}$/, {
    message: 'key chỉ gồm chữ, số, gạch dưới, tối đa 12 ký tự',
  })
  key: string;

  @ApiPropertyOptional({ example: 'The river is polluted' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  imageUrl?: string;
}

export class WordLimitDto {
  @ApiProperty({ minimum: 0, maximum: 5, example: 2 })
  @IsInt()
  @Min(0)
  @Max(5)
  maxWords: number;

  @ApiProperty({ description: 'Được thêm một con số ngoài số từ' })
  @IsBoolean()
  allowNumber: boolean;
}

export class ImageDto {
  @ApiProperty()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  alt?: string;
}

export class ParagraphDto {
  @ApiPropertyOptional({
    example: 'B',
    description: 'Nhãn đoạn, bắt buộc với dạng nối tiêu đề',
  })
  @IsOptional()
  @Matches(/^[A-Z]$/, { message: 'label là một chữ in hoa' })
  label?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  markdown: string;
}

export class PassageDto {
  @ApiProperty({ example: 'main', description: 'Mã bài đọc trong bộ' })
  @Matches(/^[a-z0-9-]{1,20}$/, {
    message: 'key chỉ gồm chữ thường, số, gạch ngang',
  })
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  imageUrl?: string;

  @ApiProperty({ type: [ParagraphDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ParagraphDto)
  paragraphs: ParagraphDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  footnote?: string;
}

export class StimulusDto {
  @ApiPropertyOptional({ type: [PassageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PassageDto)
  passages?: PassageDto[];

  @ApiPropertyOptional({
    type: [ImageDto],
    description: 'Ảnh chung, vd biểu đồ',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];
}

export class TranscriptSegmentDto {
  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  startSec: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  endSec?: number;

  @ApiPropertyOptional({ example: 'Man' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  speaker?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}

export class TranscriptDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TranscriptSegmentDto)
  segments: TranscriptSegmentDto[];
}

// ---- Nội dung nhóm câu ----

/** Nhóm chỉ có hình minh hoạ tuỳ chọn, vd TOEIC Part 1, Part 3 có biểu đồ. */
export class MediaGroupContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAlt?: string;
}

export class HeadingExampleDto {
  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @Matches(/^[A-Z]$/)
  paragraph?: string;

  @ApiProperty({ example: 'iii' })
  @IsString()
  @IsNotEmpty()
  key: string;
}

/** Nhóm dùng chung một danh sách lựa chọn, vd List of Headings, danh sách người. */
export class OptionsGroupContentDto {
  @ApiPropertyOptional({ example: 'List of Headings' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiProperty({ type: [OptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(26)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];

  @ApiPropertyOptional({
    description: 'Một lựa chọn được dùng cho nhiều câu',
  })
  @IsOptional()
  @IsBoolean()
  allowReuse?: boolean;

  @ApiPropertyOptional({ type: HeadingExampleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeadingExampleDto)
  example?: HeadingExampleDto;
}

/** Nhóm điền từ: template, bảng, sơ đồ bước hoặc hình, kèm giới hạn từ hoặc word bank. */
export class CompletionGroupContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ enum: ['NOTES', 'FORM'] })
  @IsOptional()
  @IsIn(['NOTES', 'FORM'])
  style?: 'NOTES' | 'FORM';

  @ApiPropertyOptional({
    description: 'Đoạn văn markdown, chỗ trống viết {{1}}, {{2}}...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  template?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'array', items: { type: 'string' } },
    description: 'Các dòng của bảng, mỗi ô là chuỗi, có thể chứa {{n}}',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  rows?: string[][];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  steps?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAlt?: string;

  @ApiPropertyOptional({ type: WordLimitDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WordLimitDto)
  wordLimit?: WordLimitDto;

  @ApiPropertyOptional({
    type: [OptionDto],
    description: 'Word bank. Có word bank thì đáp án là key lựa chọn',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(26)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowReuse?: boolean;
}

// ---- Nội dung câu hỏi ----

export class EmptyContentDto {}

export class ChoicesQuestionContentDto {
  @ApiProperty({ type: [OptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}

export class ParagraphQuestionContentDto {
  @ApiProperty({ example: 'B', description: 'Đoạn văn cần chọn tiêu đề' })
  @Matches(/^[A-Z]$/, { message: 'paragraph là một chữ in hoa' })
  paragraph: string;
}

export class MarkerDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;
}

export class MarkerQuestionContentDto {
  @ApiPropertyOptional({
    type: MarkerDto,
    description: 'Vị trí nhãn trên hình, tính theo phần trăm',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MarkerDto)
  marker?: MarkerDto;
}

// ---- Đáp án ----

export class OptionAnswerDto {
  @IsIn(['OPTION'])
  kind: 'OPTION';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keys: string[];
}

export class OptionSetAnswerDto {
  @IsIn(['OPTION_SET'])
  kind: 'OPTION_SET';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keys: string[];
}

export class TextAnswerDto {
  @IsIn(['TEXT'])
  kind: 'TEXT';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  accepted: string[];

  @IsOptional()
  @IsBoolean()
  strict?: boolean;
}

export class TextSetItemDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  accepted: string[];
}

export class TextSetAnswerDto {
  @IsIn(['TEXT_SET'])
  kind: 'TEXT_SET';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TextSetItemDto)
  items: TextSetItemDto[];

  @IsOptional()
  @IsBoolean()
  strict?: boolean;
}

export class EvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  passageKey?: string;

  @IsOptional()
  @Matches(/^[A-Z]$/)
  paragraph?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  quote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  startSec?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  endSec?: number;
}
