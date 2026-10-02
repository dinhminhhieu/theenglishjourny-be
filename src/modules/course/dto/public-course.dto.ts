import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  toBoolean,
  trimString,
} from '../../../common/transforms/query.transforms';
import {
  LessonBlockKind,
  LessonProgressStatus,
  TestKind,
} from '../../../generated/prisma/enums';
import { CourseDto } from './course.dto';
import { LessonDto } from './lesson.dto';

export class PublicCourseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề hoặc mã' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'false = chỉ khoá học thử, true = chỉ khoá phải mua',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isLocked?: boolean;
}

/** Bản cho người học: bỏ các trường quản trị, thêm quyền học của người đang gọi. */
export class PublicCourseDto extends OmitType(CourseDto, [
  'sortOrder',
  'status',
  'lessonCount',
  'deletedAt',
  'createdAt',
  'updatedAt',
] as const) {
  @ApiProperty({ description: 'Số unit đã phát hành' })
  lessonCount: number;

  @ApiProperty({
    description:
      'Người gọi có được học nội dung khoá này không. Khoá mở luôn là true.',
  })
  hasAccess: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Ngày hết hạn quyền học, null nếu không giới hạn',
  })
  accessExpiresAt: Date | null;
}

export class PublicLessonSummaryDto extends OmitType(LessonDto, [
  'courseId',
  'topicId',
  'sortOrder',
  'status',
  'publishedAt',
  'deletedAt',
  'createdAt',
  'updatedAt',
] as const) {}

export class PublicCourseDetailDto extends PublicCourseDto {
  @ApiProperty({
    type: [PublicLessonSummaryDto],
    description: 'Unit đã phát hành, đã sắp theo thứ tự học',
  })
  lessons: PublicLessonSummaryDto[];
}

export class PublicGrammarLessonRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'MOD-01-TENSE',
    description: 'Dùng để gọi GET /grammar/lessons/:code',
  })
  code: string;

  @ApiProperty()
  title: string;
}

export class PublicTestRefDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Dùng để gọi POST /lesson-blocks/:id/attempts',
  })
  id: string;

  @ApiProperty({ example: 'UNIT3-READING' })
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TestKind, enumName: 'TestKind' })
  kind: TestKind;

  @ApiProperty()
  questionCount: number;

  @ApiProperty({ type: Number, nullable: true })
  durationMinutes: number | null;
}

export class PublicLessonProgressDto {
  @ApiProperty({ enum: LessonProgressStatus, enumName: 'LessonProgressStatus' })
  status: LessonProgressStatus;

  @ApiProperty()
  completedBlocks: number;

  @ApiProperty()
  totalBlocks: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: Date | null;
}

export class PublicLessonBlockDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: LessonBlockKind, enumName: 'LessonBlockKind' })
  kind: LessonBlockKind;

  @ApiProperty({ example: 'Grammar' })
  skillName: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  instructions: string | null;

  @ApiProperty()
  xpReward: number;

  @ApiProperty({
    type: PublicGrammarLessonRefDto,
    nullable: true,
    description:
      'Bài ngữ pháp của block GRAMMAR. null nếu block thuộc loại khác hoặc bài chưa phát hành.',
  })
  grammarLesson: PublicGrammarLessonRefDto | null;

  @ApiProperty({
    type: PublicTestRefDto,
    nullable: true,
    description:
      'Đề luyện tập của block. null nếu block không có đề hoặc đề chưa phát hành.',
  })
  test: PublicTestRefDto | null;

  @ApiProperty({
    description:
      'Người đang gọi đã hoàn thành block này chưa. Khách luôn là false.',
  })
  completed: boolean;
}

export class PublicLessonDetailDto extends PublicLessonSummaryDto {
  @ApiProperty({ format: 'uuid' })
  courseId: string;

  @ApiProperty({ example: 'IELTS-4-5' })
  courseCode: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Chủ đề từ vựng của unit, dùng cho block VOCABULARY',
  })
  topicId: string | null;

  @ApiProperty({ type: [PublicLessonBlockDto] })
  blocks: PublicLessonBlockDto[];

  @ApiProperty({
    type: PublicLessonProgressDto,
    nullable: true,
    description: 'Tiến độ của người đang gọi. null với khách hoặc chưa học.',
  })
  progress: PublicLessonProgressDto | null;
}
