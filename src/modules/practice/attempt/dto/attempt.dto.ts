import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import {
  AttemptMode,
  AttemptSource,
  AttemptStatus,
  Exam,
  ExamSkill,
  IeltsModule,
  SubmitReason,
} from '../../../../generated/prisma/enums';

const JSON_OBJECT = { type: 'object', additionalProperties: true } as const;

export class CustomPracticeDto {
  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  @IsEnum(Exam)
  exam: Exam;

  @ApiPropertyOptional({ enum: IeltsModule, enumName: 'IeltsModule' })
  @IsOptional()
  @IsEnum(IeltsModule)
  module?: IeltsModule;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  @IsEnum(ExamSkill)
  skill: ExamSkill;

  @ApiPropertyOptional({
    example: 5,
    description: 'Luyện theo part, vd TOEIC Part 5',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  part?: number;

  @ApiPropertyOptional({
    example: 'IELTS_MATCHING_HEADINGS',
    description: 'Luyện theo dạng câu',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]{3,60}$/)
  questionType?: string;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 60,
    description:
      'Số câu mong muốn, hệ thống ghép đủ bộ nên có thể nhiều hơn một chút',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  questionCount?: number;

  @ApiPropertyOptional({
    enum: AttemptMode,
    enumName: 'AttemptMode',
    default: AttemptMode.PRACTICE,
  })
  @IsOptional()
  @IsEnum(AttemptMode)
  mode?: AttemptMode;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 180,
    description: 'Giới hạn thời gian khi chọn chế độ thi thử',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  timeLimitMinutes?: number;
}

export class SaveDraftDto {
  @ApiProperty({
    minimum: 1,
    description: 'Tăng dần mỗi lần lưu. Lần lưu có seq cũ hơn bị bỏ qua',
  })
  @IsInt()
  @Min(1)
  seq: number;

  @ApiProperty({
    ...JSON_OBJECT,
    description:
      'Toàn bộ câu trả lời hiện tại: { [questionId]: "B" | ["A", "C"] | "river bank" | null }',
    example: { '0192f3a1-0000-7000-8000-000000000001': 'B' },
  })
  @IsObject()
  answers: Record<string, unknown>;
}

export class SubmitAttemptDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seq?: number;

  @ApiPropertyOptional({
    ...JSON_OBJECT,
    description:
      'Câu trả lời cuối cùng, gửi kèm để khỏi mất lần lưu chưa kịp gửi',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}

export class CheckAnswerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    nullable: true,
    description: 'Câu trả lời của câu này. Sau khi xem đáp án, câu bị khoá',
  })
  @IsOptional()
  response?: string | string[] | null;
}

export class AttemptQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  @IsOptional()
  @IsEnum(AttemptStatus)
  status?: AttemptStatus;

  @ApiPropertyOptional({ enum: AttemptSource, enumName: 'AttemptSource' })
  @IsOptional()
  @IsEnum(AttemptSource)
  source?: AttemptSource;

  @ApiPropertyOptional({ enum: Exam, enumName: 'Exam' })
  @IsOptional()
  @IsEnum(Exam)
  exam?: Exam;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  testId?: string;
}

export class AdminAttemptQueryDto extends AttemptQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class PracticeCatalogQueryDto {
  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  @IsEnum(Exam)
  exam: Exam;

  @ApiPropertyOptional({ enum: IeltsModule, enumName: 'IeltsModule' })
  @IsOptional()
  @IsEnum(IeltsModule)
  module?: IeltsModule;
}

// ---- Output ----

export class AttemptOverallDto {
  @ApiProperty({
    enum: ['IELTS_BAND', 'TOEIC_SCALED', 'TOEIC_TOTAL', 'PERCENT'],
  })
  kind: 'IELTS_BAND' | 'TOEIC_SCALED' | 'TOEIC_TOTAL' | 'PERCENT';

  @ApiProperty({ example: 6.5 })
  value: number;
}

export class AttemptSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  exam: Exam;

  @ApiProperty({ enum: AttemptMode, enumName: 'AttemptMode' })
  mode: AttemptMode;

  @ApiProperty({ enum: AttemptSource, enumName: 'AttemptSource' })
  source: AttemptSource;

  @ApiProperty({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  status: AttemptStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  testId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  lessonBlockId: string | null;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  maxScore: number;

  @ApiProperty({ type: Number, nullable: true })
  rawScore: number | null;

  @ApiProperty({ type: Number, nullable: true })
  percent: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Band, điểm TOEIC hoặc phần trăm tuỳ overall.kind',
  })
  score: number | null;

  @ApiProperty({ type: AttemptOverallDto, nullable: true })
  overall: AttemptOverallDto | null;

  @ApiProperty({ format: 'date-time' })
  startedAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deadlineAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ enum: SubmitReason, enumName: 'SubmitReason', nullable: true })
  submitReason: SubmitReason | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  gradedAt: Date | null;
}

export class AdminAttemptUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: String, nullable: true })
  displayName: string | null;
}

export class AdminAttemptDto extends AttemptSummaryDto {
  @ApiProperty({ type: AdminAttemptUserDto })
  user: AdminAttemptUserDto;
}

export class AttemptTimerDto {
  @ApiProperty({
    format: 'date-time',
    description:
      'Giờ server, FE đếm ngược theo remainingSeconds thay vì đồng hồ máy',
  })
  serverNow: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deadlineAt: Date | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'null = không giới hạn thời gian',
  })
  remainingSeconds: number | null;

  @ApiProperty({ description: 'Số giây được nộp trễ sau khi hết giờ' })
  graceSeconds: number;
}

export class AttemptDetailDto {
  @ApiProperty({ type: AttemptSummaryDto })
  attempt: AttemptSummaryDto;

  @ApiProperty({
    description: 'true = tiếp tục bài đang làm dở thay vì tạo bài mới',
  })
  resumed: boolean;

  @ApiProperty({ type: AttemptTimerDto })
  timer: AttemptTimerDto;

  @ApiProperty({
    type: 'array',
    items: JSON_OBJECT,
    nullable: true,
    description:
      'Nội dung đề khi đang làm: phần, bộ câu hỏi, audio, câu hỏi kèm displayNumber và input. Không có đáp án. null khi đã nộp',
  })
  sections: Record<string, unknown>[] | null;

  @ApiProperty({
    ...JSON_OBJECT,
    nullable: true,
    description: 'Câu trả lời đã lưu',
  })
  draft: Record<string, unknown> | null;

  @ApiProperty()
  draftSeq: number;

  @ApiProperty({
    ...JSON_OBJECT,
    nullable: true,
    description: 'Chế độ luyện tập: kết quả các câu đã xem đáp án',
  })
  checked: Record<string, unknown> | null;

  @ApiProperty({
    ...JSON_OBJECT,
    nullable: true,
    description: 'Kết quả theo kỹ năng khi đã chấm',
  })
  result: Record<string, unknown> | null;
}

export class SaveDraftResultDto {
  @ApiProperty({
    description: 'false = lần lưu này cũ hơn lần đã lưu nên bị bỏ qua',
  })
  accepted: boolean;

  @ApiProperty()
  draftSeq: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSavedAt: Date | null;

  @ApiProperty({ type: AttemptTimerDto })
  timer: AttemptTimerDto;
}

export class CheckResultDto {
  @ApiProperty({ format: 'uuid' })
  questionId: string;

  @ApiProperty()
  displayNumber: number;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    nullable: true,
  })
  response: string | string[] | null;

  @ApiProperty()
  score: number;

  @ApiProperty()
  maxScore: number;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty({ type: 'array', items: JSON_OBJECT })
  slots: Record<string, unknown>[];

  @ApiProperty({ ...JSON_OBJECT, description: 'Đáp án đúng (AnswerSpec)' })
  correctAnswer: Record<string, unknown>;

  @ApiProperty({ type: String, nullable: true })
  explanation: string | null;

  @ApiProperty({ ...JSON_OBJECT, nullable: true })
  evidence: Record<string, unknown> | null;
}

export class AttemptReviewDto {
  @ApiProperty({ type: AttemptSummaryDto })
  attempt: AttemptSummaryDto;

  @ApiProperty({ ...JSON_OBJECT, nullable: true })
  result: Record<string, unknown> | null;

  @ApiProperty({
    type: 'array',
    items: JSON_OBJECT,
    description:
      'Như lúc làm bài, thêm transcript, câu trả lời, đúng sai, đáp án, giải thích từng câu',
  })
  sections: Record<string, unknown>[];
}

export class PracticePartDto {
  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill' })
  skill: ExamSkill;

  @ApiProperty({ type: Number, nullable: true })
  part: number | null;

  @ApiProperty({ example: 'Hoàn thành câu' })
  name: string;

  @ApiProperty({ description: 'Số bộ câu hỏi có thể luyện' })
  itemSets: number;

  @ApiProperty({ description: 'Tổng số câu có thể luyện' })
  questions: number;
}

export class PracticeTypeDto {
  @ApiProperty({ example: 'IELTS_MATCHING_HEADINGS' })
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ExamSkill, enumName: 'ExamSkill', isArray: true })
  skills: ExamSkill[];

  @ApiProperty({ description: 'Số nhóm câu có thể luyện' })
  groups: number;
}

export class PracticeCatalogDto {
  @ApiProperty({ enum: Exam, enumName: 'Exam' })
  exam: Exam;

  @ApiProperty({ type: [PracticePartDto] })
  parts: PracticePartDto[];

  @ApiProperty({ type: [PracticeTypeDto] })
  questionTypes: PracticeTypeDto[];
}

export class BlockCompletionDto {
  @ApiProperty({ description: 'false nếu block đã hoàn thành từ trước' })
  newlyCompleted: boolean;

  @ApiProperty()
  lessonCompleted: boolean;

  @ApiProperty()
  completedBlocks: number;

  @ApiProperty()
  totalBlocks: number;
}
