import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../../common/transforms/query.transforms';
import {
  CefrLevel,
  Exam,
  ExamSkill,
  IeltsModule,
  LessonStatus,
} from '../../../../generated/prisma/enums';
import { StimulusDto, TranscriptSegmentDto } from '../../content/content.dto';

const JSON_OBJECT = { type: 'object', additionalProperties: true } as const;

export class QuestionInputDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Có id = sửa câu cũ, giữ nguyên id để thống kê. Bỏ trống = câu mới',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Đề câu hỏi, markdown' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  prompt?: string | null;

  @ApiPropertyOptional({
    ...JSON_OBJECT,
    description:
      'Theo dạng câu: { options } cho trắc nghiệm, { paragraph } cho nối tiêu đề, { marker } cho điền nhãn',
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiProperty({
    ...JSON_OBJECT,
    description:
      'Đáp án: { kind: "OPTION", keys } | { kind: "OPTION_SET", keys } | { kind: "TEXT", accepted, strict? } | { kind: "TEXT_SET", items: [{ accepted }] }',
    example: { kind: 'TEXT', accepted: ['(the) river bank'] },
  })
  @IsObject()
  answer: Record<string, unknown>;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Giải thích tiếng Việt, hiện khi xem lại bài',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string | null;

  @ApiPropertyOptional({
    ...JSON_OBJECT,
    nullable: true,
    description: '{ passageKey?, paragraph?, quote?, startSec?, endSec? }',
  })
  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['inference', 'present-simple'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Bài ngữ pháp để gợi ý ôn khi làm sai',
  })
  @IsOptional()
  @IsUUID()
  grammarLessonId?: string | null;
}

export class QuestionGroupInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    example: 'IELTS_MATCHING_HEADINGS',
    description: 'Mã dạng câu, xem GET /exam-formats',
  })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,60}$/, { message: 'type là mã dạng câu viết hoa' })
  type: string;

  @ApiPropertyOptional({
    example: 'Choose the correct heading for each paragraph.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiPropertyOptional({
    ...JSON_OBJECT,
    description:
      'Theo dạng câu: danh sách lựa chọn, template có {{1}}, bảng, sơ đồ, hình, wordLimit',
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true, example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  passageKey?: string | null;

  @ApiProperty({ type: [QuestionInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions: QuestionInputDto[];
}

export class ReplaceItemSetQuestionsDto {
  @ApiProperty({
    type: [QuestionGroupInputDto],
    description:
      'Thứ tự trong mảng là thứ tự hiển thị. Số câu do server tự đánh',
  })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuestionGroupInputDto)
  groups: QuestionGroupInputDto[];
}

export class ItemSetFieldsDto {
  @ApiProperty({
    example: 'TOEIC-P5-0001',
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

  @ApiProperty({ example: 'Urban beekeeping' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  @IsEnum(Exam)
  exam: Exam;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  @IsEnum(ExamSkill)
  skill: ExamSkill;

  @ApiPropertyOptional({
    enum: IeltsModule,
    enumName: 'IeltsModule',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(IeltsModule)
  module?: IeltsModule | null;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 1,
    maximum: 7,
    description: 'Part theo kỳ thi, bỏ trống với bài tập tự do',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  part?: number | null;

  @ApiPropertyOptional({ type: StimulusDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StimulusDto)
  stimulus?: StimulusDto;

  @ApiPropertyOptional({ type: [TranscriptSegmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TranscriptSegmentDto)
  transcript?: TranscriptSegmentDto[];

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'File audio đã upload qua /admin/uploads',
  })
  @IsOptional()
  @IsUUID()
  audioAssetId?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number | null;

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

  @ApiPropertyOptional({ type: [String], example: ['environment'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Nguồn và giấy phép nội dung, chỉ admin thấy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  source?: string | null;

  @ApiPropertyOptional({
    default: true,
    description: 'Cho phép bốc vào phần luyện theo part',
  })
  @IsOptional()
  @IsBoolean()
  practiceEnabled?: boolean;
}

export class CreateItemSetDto extends ItemSetFieldsDto {
  @ApiPropertyOptional({
    type: [QuestionGroupInputDto],
    description: 'Có thể tạo kèm câu hỏi luôn',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuestionGroupInputDto)
  groups?: QuestionGroupInputDto[];
}

export class UpdateItemSetDto extends PartialType(ItemSetFieldsDto) {}

export class ImportItemSetsDto {
  @ApiProperty({
    type: [CreateItemSetDto],
    description:
      'Mỗi phần tử là một bộ câu hỏi đủ nội dung. Trùng code thì cập nhật bộ cũ',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateItemSetDto)
  items: CreateItemSetDto[];
}

export class ItemSetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Exam, enumName: 'Exam' })
  @IsOptional()
  @IsEnum(Exam)
  exam?: Exam;

  @ApiPropertyOptional({ enum: ExamSkill, enumName: 'ExamSkill' })
  @IsOptional()
  @IsEnum(ExamSkill)
  skill?: ExamSkill;

  @ApiPropertyOptional({ enum: IeltsModule, enumName: 'IeltsModule' })
  @IsOptional()
  @IsEnum(IeltsModule)
  module?: IeltsModule;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  part?: number;

  @ApiPropertyOptional({ enum: LessonStatus, enumName: 'LessonStatus' })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @ApiPropertyOptional({ example: 'IELTS_MATCHING_HEADINGS' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  questionType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã hoặc tiêu đề' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

export class ItemSetDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  exam: Exam;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  skill: ExamSkill;

  @ApiProperty({ enum: IeltsModule, enumName: 'IeltsModule', nullable: true })
  module: IeltsModule | null;

  @ApiProperty({ type: Number, nullable: true })
  part: number | null;

  @ApiProperty({ type: Number, nullable: true })
  difficulty: number | null;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', nullable: true })
  levelFrom: CefrLevel | null;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', nullable: true })
  levelTo: CefrLevel | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  practiceEnabled: boolean;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  audioAssetId: string | null;

  @ApiProperty({ type: [String], description: 'Các dạng câu có trong bộ' })
  questionTypes: string[];

  @ApiProperty()
  questionCount: number;

  @ApiProperty({ description: 'Tổng điểm, câu Choose TWO tính 2' })
  totalMarks: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Phiên bản phát hành hiện tại',
  })
  releaseVersion: number | null;

  @ApiProperty({ description: 'Bản nháp đã sửa mà chưa phát hành lại' })
  hasUnpublishedChanges: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class QuestionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Số thứ tự trong bộ' })
  number: number;

  @ApiProperty()
  marks: number;

  @ApiProperty({ type: String, nullable: true })
  prompt: string | null;

  @ApiProperty(JSON_OBJECT)
  content: Record<string, unknown>;

  @ApiProperty(JSON_OBJECT)
  answer: Record<string, unknown>;

  @ApiProperty({ type: String, nullable: true })
  explanation: string | null;

  @ApiProperty({ ...JSON_OBJECT, nullable: true })
  evidence: Record<string, unknown> | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  grammarLessonId: string | null;
}

export class QuestionGroupDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  typeName: string;

  @ApiProperty()
  instructions: string;

  @ApiProperty(JSON_OBJECT)
  content: Record<string, unknown>;

  @ApiProperty({ type: String, nullable: true })
  passageKey: string | null;

  @ApiProperty({ type: [QuestionDto] })
  questions: QuestionDto[];
}

export class ItemSetAudioDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  ready: boolean;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds: number | null;
}

export class ItemSetDetailDto extends ItemSetDto {
  @ApiProperty({ type: String, nullable: true })
  source: string | null;

  @ApiProperty(JSON_OBJECT)
  stimulus: Record<string, unknown>;

  @ApiProperty({ type: [TranscriptSegmentDto] })
  transcript: TranscriptSegmentDto[];

  @ApiProperty({ type: ItemSetAudioDto, nullable: true })
  audio: ItemSetAudioDto | null;

  @ApiProperty({ type: [QuestionGroupDto] })
  groups: QuestionGroupDto[];
}

export class ItemSetPreviewDto {
  @ApiProperty({
    ...JSON_OBJECT,
    description: 'Nội dung đúng như người học sẽ thấy, không có đáp án',
  })
  content: Record<string, unknown>;

  @ApiProperty({
    type: [String],
    description: 'Những điểm còn thiếu để phát hành được',
  })
  publishIssues: string[];
}

export class ItemSetReleaseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  totalMarks: number;

  @ApiProperty({ type: String, nullable: true })
  createdBy: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class ImportItemResultDto {
  @ApiProperty()
  index: number;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: ['CREATED', 'UPDATED', 'FAILED'] })
  status: 'CREATED' | 'UPDATED' | 'FAILED';

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  id: string | null;

  @ApiProperty({ type: [String] })
  errors: string[];
}

export class ImportResultDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  updated: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [ImportItemResultDto] })
  results: ImportItemResultDto[];
}
