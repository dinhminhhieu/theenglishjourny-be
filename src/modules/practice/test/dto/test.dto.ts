import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { URL_OPTIONS } from '../../../../common/constants/url.constant';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../../common/transforms/query.transforms';
import {
  AttemptMode,
  Exam,
  ExamSkill,
  IeltsModule,
  LessonStatus,
  TestKind,
} from '../../../../generated/prisma/enums';

export class TestFieldsDto {
  @ApiProperty({ example: 'TOEIC-FULL-01' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9-]{2,50}$/, {
    message: 'code chỉ gồm chữ hoa, số, gạch ngang, từ 2 đến 50 ký tự',
  })
  code: string;

  @ApiProperty({ example: 'TOEIC Full Test 01' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

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

  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  @IsEnum(Exam)
  exam: Exam;

  @ApiPropertyOptional({
    enum: IeltsModule,
    enumName: 'IeltsModule',
    nullable: true,
    description: 'Bắt buộc với đề IELTS',
  })
  @IsOptional()
  @IsEnum(IeltsModule)
  module?: IeltsModule | null;

  @ApiProperty({ enum: TestKind, enumName: 'TestKind' })
  @IsEnum(TestKind)
  kind: TestKind;

  @ApiPropertyOptional({
    enum: ExamSkill,
    enumName: 'ExamSkill',
    nullable: true,
    description: 'Bắt buộc với đề SECTION',
  })
  @IsOptional()
  @IsEnum(ExamSkill)
  skill?: ExamSkill | null;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 1,
    maximum: 300,
    description: 'Bỏ trống = theo định dạng kỳ thi',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes?: number | null;

  @ApiPropertyOptional({
    default: true,
    description: 'false = chỉ dùng trong unit của khoá học',
  })
  @IsOptional()
  @IsBoolean()
  isListed?: boolean;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description: 'XP để mở khoá, 0 = miễn phí khi đã đăng nhập',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  xpCost?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateTestDto extends TestFieldsDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Các bộ câu hỏi theo thứ tự',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(150)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  itemSetIds?: string[];
}

export class UpdateTestDto extends PartialType(TestFieldsDto) {}

export class ReplaceTestItemsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Thứ tự trong mảng là thứ tự admin xếp; đề FULL, SECTION tự xếp lại theo part',
  })
  @IsArray()
  @ArrayMaxSize(150)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  itemSetIds: string[];
}

export class TestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Exam, enumName: 'Exam' })
  @IsOptional()
  @IsEnum(Exam)
  exam?: Exam;

  @ApiPropertyOptional({ enum: TestKind, enumName: 'TestKind' })
  @IsOptional()
  @IsEnum(TestKind)
  kind?: TestKind;

  @ApiPropertyOptional({ enum: ExamSkill, enumName: 'ExamSkill' })
  @IsOptional()
  @IsEnum(ExamSkill)
  skill?: ExamSkill;

  @ApiPropertyOptional({ enum: LessonStatus, enumName: 'LessonStatus' })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isListed?: boolean;

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

export class PublicTestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Exam, enumName: 'Exam' })
  @IsOptional()
  @IsEnum(Exam)
  exam?: Exam;

  @ApiPropertyOptional({ enum: IeltsModule, enumName: 'IeltsModule' })
  @IsOptional()
  @IsEnum(IeltsModule)
  module?: IeltsModule;

  @ApiPropertyOptional({ enum: TestKind, enumName: 'TestKind' })
  @IsOptional()
  @IsEnum(TestKind)
  kind?: TestKind;

  @ApiPropertyOptional({ enum: ExamSkill, enumName: 'ExamSkill' })
  @IsOptional()
  @IsEnum(ExamSkill)
  skill?: ExamSkill;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class StartAttemptDto {
  @ApiPropertyOptional({
    enum: AttemptMode,
    enumName: 'AttemptMode',
    description:
      'Bỏ trống: đề FULL, SECTION là thi thử, bài luyện là luyện tập',
  })
  @IsOptional()
  @IsEnum(AttemptMode)
  mode?: AttemptMode;
}

// ---- Output ----

export class PartReportDto {
  @ApiProperty()
  part: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  minQuestions: number;

  @ApiProperty()
  maxQuestions: number;

  @ApiProperty()
  actualQuestions: number;

  @ApiProperty()
  itemSets: number;
}

export class SectionReportDto {
  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  skill: ExamSkill;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: Number, nullable: true })
  requiredQuestions: number | null;

  @ApiProperty()
  actualQuestions: number;

  @ApiProperty({ type: [PartReportDto] })
  parts: PartReportDto[];
}

export class BlueprintReportDto {
  @ApiProperty({ description: 'Đề đã đủ điều kiện phát hành chưa' })
  ok: boolean;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty({ type: [SectionReportDto] })
  sections: SectionReportDto[];
}

export class TestDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  exam: Exam;

  @ApiProperty({ enum: IeltsModule, enumName: 'IeltsModule', nullable: true })
  module: IeltsModule | null;

  @ApiProperty({ enum: TestKind, enumName: 'TestKind' })
  kind: TestKind;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill', nullable: true })
  skill: ExamSkill | null;

  @ApiProperty({ type: Number, nullable: true })
  durationMinutes: number | null;

  @ApiProperty()
  isListed: boolean;

  @ApiProperty()
  xpCost: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ type: Number, nullable: true })
  releaseVersion: number | null;

  @ApiProperty()
  hasUnpublishedChanges: boolean;

  @ApiProperty()
  itemCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class TestItemDto {
  @ApiProperty({ format: 'uuid' })
  itemSetId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  skill: ExamSkill;

  @ApiProperty({ type: Number, nullable: true })
  part: number | null;

  @ApiProperty({ enum: IeltsModule, enumName: 'IeltsModule', nullable: true })
  module: IeltsModule | null;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  totalMarks: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Bản phát hành hiện tại của bộ câu hỏi',
  })
  releaseVersion: number | null;

  @ApiProperty({
    description:
      'Bộ đã có bản mới hơn bản đang dùng trong đề, cần phát hành lại đề',
  })
  hasNewerRelease: boolean;
}

export class TestDetailDto extends TestDto {
  @ApiProperty({ type: [TestItemDto] })
  items: TestItemDto[];

  @ApiProperty({ type: BlueprintReportDto })
  blueprint: BlueprintReportDto;
}

export class PublicTestSectionDto {
  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  skill: ExamSkill;

  @ApiProperty({ example: 'Nghe' })
  title: string;

  @ApiProperty()
  questionCount: number;

  @ApiProperty({ type: Number, nullable: true })
  durationMinutes: number | null;

  @ApiProperty({ type: [Number] })
  parts: number[];
}

export class MyTestStatsDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Bài đang làm dở',
  })
  activeAttemptId: string | null;

  @ApiProperty()
  attempts: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Điểm cao nhất: band, điểm TOEIC hoặc phần trăm',
  })
  bestScore: number | null;
}

export class PublicTestDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  exam: Exam;

  @ApiProperty({ enum: IeltsModule, enumName: 'IeltsModule', nullable: true })
  module: IeltsModule | null;

  @ApiProperty({ enum: TestKind, enumName: 'TestKind' })
  kind: TestKind;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill', nullable: true })
  skill: ExamSkill | null;

  @ApiProperty()
  questionCount: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Thời gian thi thử',
  })
  durationMinutes: number | null;

  @ApiProperty()
  xpCost: number;

  @ApiProperty({
    description:
      'Đã mở khoá hoặc đề miễn phí. Khách luôn là false với đề cần XP',
  })
  isUnlocked: boolean;

  @ApiProperty({
    type: MyTestStatsDto,
    nullable: true,
    description: 'null với khách',
  })
  me: MyTestStatsDto | null;
}

export class PublicTestDetailDto extends PublicTestDto {
  @ApiProperty({ type: [PublicTestSectionDto] })
  sections: PublicTestSectionDto[];
}

export class UnlockResultDto {
  @ApiProperty()
  unlocked: boolean;

  @ApiProperty({
    description: 'XP bị trừ lần này, 0 nếu đã mở từ trước hoặc đề miễn phí',
  })
  xpSpent: number;

  @ApiProperty()
  xpBalance: number;
}
