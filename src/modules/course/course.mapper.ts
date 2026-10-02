import { decimalToNumber } from '../../common/utils/decimal.util';
import {
  LessonProgressStatus,
  LessonStatus,
  Prisma,
} from '../../generated/prisma/client';
import type { CourseAccess } from './course-access.service';
import { CourseDetailDto, CourseDto } from './dto/course.dto';
import { LessonBlockDto } from './dto/lesson-block.dto';
import { LessonDetailDto, LessonDto } from './dto/lesson.dto';
import {
  PublicCourseDetailDto,
  PublicCourseDto,
  PublicLessonBlockDto,
  PublicLessonDetailDto,
  PublicLessonSummaryDto,
  PublicTestRefDto,
} from './dto/public-course.dto';

export const LESSON_INCLUDE = {
  _count: { select: { blocks: true } },
} satisfies Prisma.LessonInclude;

export const LESSON_DETAIL_INCLUDE = {
  ...LESSON_INCLUDE,
  blocks: {
    orderBy: { sortOrder: 'asc' as const },
    include: { skill: { select: { name: true } } },
  },
} satisfies Prisma.LessonInclude;

export const COURSE_INCLUDE = {
  _count: { select: { lessons: { where: { deletedAt: null } } } },
} satisfies Prisma.CourseInclude;

export const COURSE_DETAIL_INCLUDE = {
  ...COURSE_INCLUDE,
  lessons: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: LESSON_INCLUDE,
  },
} satisfies Prisma.CourseInclude;

// ---------- Bản cho người học: chỉ nội dung đã phát hành, chưa xoá ----------

export const PUBLISHED_COURSE_WHERE = {
  deletedAt: null,
  status: LessonStatus.PUBLISHED,
} satisfies Prisma.CourseWhereInput;

export const PUBLISHED_LESSON_WHERE = {
  deletedAt: null,
  status: LessonStatus.PUBLISHED,
} satisfies Prisma.LessonWhereInput;

export const PUBLIC_COURSE_INCLUDE = {
  _count: { select: { lessons: { where: PUBLISHED_LESSON_WHERE } } },
} satisfies Prisma.CourseInclude;

export const PUBLIC_COURSE_DETAIL_INCLUDE = {
  ...PUBLIC_COURSE_INCLUDE,
  lessons: {
    where: PUBLISHED_LESSON_WHERE,
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: LESSON_INCLUDE,
  },
} satisfies Prisma.CourseInclude;

export const PUBLIC_LESSON_DETAIL_INCLUDE = {
  ...LESSON_INCLUDE,
  course: { select: { id: true, code: true, title: true, isLocked: true } },
  blocks: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      skill: { select: { name: true } },
      grammarLesson: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          deletedAt: true,
          category: { select: { isActive: true, deletedAt: true } },
        },
      },
      test: {
        select: {
          id: true,
          code: true,
          title: true,
          kind: true,
          status: true,
          deletedAt: true,
          currentRelease: {
            select: { questionCount: true, durationMinutes: true },
          },
        },
      },
    },
  },
} satisfies Prisma.LessonInclude;

export type PublicCourseRow = Prisma.CourseGetPayload<{
  include: typeof PUBLIC_COURSE_INCLUDE;
}>;
export type PublicCourseDetailRow = Prisma.CourseGetPayload<{
  include: typeof PUBLIC_COURSE_DETAIL_INCLUDE;
}>;
export type PublicLessonDetailRow = Prisma.LessonGetPayload<{
  include: typeof PUBLIC_LESSON_DETAIL_INCLUDE;
}>;

export type LessonRow = Prisma.LessonGetPayload<{
  include: typeof LESSON_INCLUDE;
}>;
export type LessonDetailRow = Prisma.LessonGetPayload<{
  include: typeof LESSON_DETAIL_INCLUDE;
}>;
export type CourseRow = Prisma.CourseGetPayload<{
  include: typeof COURSE_INCLUDE;
}>;
export type CourseDetailRow = Prisma.CourseGetPayload<{
  include: typeof COURSE_DETAIL_INCLUDE;
}>;

export function toCourseDto(row: CourseRow): CourseDto {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    levelFrom: row.levelFrom,
    levelTo: row.levelTo,
    targetBandFrom: decimalToNumber(row.targetBandFrom),
    targetBandTo: decimalToNumber(row.targetBandTo),
    isLocked: row.isLocked,
    price: row.price,
    currency: row.currency,
    accessDays: row.accessDays,
    sortOrder: row.sortOrder,
    status: row.status,
    publishedAt: row.publishedAt,
    lessonCount: row._count.lessons,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCourseDetailDto(row: CourseDetailRow): CourseDetailDto {
  return { ...toCourseDto(row), lessons: row.lessons.map(toLessonDto) };
}

export function toLessonDto(row: LessonRow): LessonDto {
  return {
    id: row.id,
    courseId: row.courseId,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    topicId: row.topicId,
    xpReward: row.xpReward,
    estimatedMinutes: row.estimatedMinutes,
    sortOrder: row.sortOrder,
    status: row.status,
    publishedAt: row.publishedAt,
    blockCount: row._count.blocks,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toLessonDetailDto(row: LessonDetailRow): LessonDetailDto {
  return {
    ...toLessonDto(row),
    blocks: row.blocks.map((block): LessonBlockDto => ({
      id: block.id,
      kind: block.kind,
      skillId: block.skillId,
      skillName: block.skill.name,
      title: block.title,
      instructions: block.instructions,
      xpReward: block.xpReward,
      grammarLessonId: block.grammarLessonId,
      testId: block.testId,
      sortOrder: block.sortOrder,
    })),
  };
}

// ---------- Bản cho người học ----------

export function toPublicCourseDto(
  row: PublicCourseRow,
  access: CourseAccess,
): PublicCourseDto {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    levelFrom: row.levelFrom,
    levelTo: row.levelTo,
    targetBandFrom: decimalToNumber(row.targetBandFrom),
    targetBandTo: decimalToNumber(row.targetBandTo),
    isLocked: row.isLocked,
    price: row.price,
    currency: row.currency,
    accessDays: row.accessDays,
    publishedAt: row.publishedAt,
    lessonCount: row._count.lessons,
    hasAccess: access.hasAccess,
    accessExpiresAt: access.accessExpiresAt,
  };
}

export function toPublicCourseDetailDto(
  row: PublicCourseDetailRow,
  access: CourseAccess,
): PublicCourseDetailDto {
  return {
    ...toPublicCourseDto(row, access),
    lessons: row.lessons.map(toPublicLessonSummaryDto),
  };
}

export function toPublicLessonSummaryDto(
  row: LessonRow,
): PublicLessonSummaryDto {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    xpReward: row.xpReward,
    estimatedMinutes: row.estimatedMinutes,
    blockCount: row._count.blocks,
  };
}

export interface LessonProgressView {
  status: LessonProgressStatus;
  completedBlockIds: string[];
  completedAt: Date | null;
}

export function toPublicLessonDetailDto(
  row: PublicLessonDetailRow,
  progress: LessonProgressView | null = null,
): PublicLessonDetailDto {
  const completed = new Set(progress?.completedBlockIds ?? []);
  return {
    ...toPublicLessonSummaryDto(row),
    courseId: row.course.id,
    courseCode: row.course.code,
    courseTitle: row.course.title,
    topicId: row.topicId,
    blocks: row.blocks.map((block): PublicLessonBlockDto => {
      const grammar = block.grammarLesson;
      // Bài ngữ pháp chưa phát hành thì không lộ ra, khớp với GET /grammar/lessons/:code.
      const isGrammarVisible =
        grammar !== null &&
        grammar.status === LessonStatus.PUBLISHED &&
        grammar.deletedAt === null &&
        grammar.category.isActive &&
        grammar.category.deletedAt === null;
      return {
        id: block.id,
        kind: block.kind,
        skillName: block.skill.name,
        title: block.title,
        instructions: block.instructions,
        xpReward: block.xpReward,
        grammarLesson: isGrammarVisible
          ? { id: grammar.id, code: grammar.code, title: grammar.title }
          : null,
        test: toPublicTestRef(block.test),
        completed: completed.has(block.id),
      };
    }),
    progress: progress
      ? {
          status: progress.status,
          completedBlocks: row.blocks.filter((block) => completed.has(block.id))
            .length,
          totalBlocks: row.blocks.length,
          completedAt: progress.completedAt,
        }
      : null,
  };
}

/** Đề của block chỉ hiện khi đã phát hành và chưa xoá, giống cách ẩn bài ngữ pháp nháp. */
function toPublicTestRef(
  test: PublicLessonDetailRow['blocks'][number]['test'],
): PublicTestRefDto | null {
  if (
    !test ||
    test.status !== LessonStatus.PUBLISHED ||
    test.deletedAt !== null ||
    !test.currentRelease
  ) {
    return null;
  }
  return {
    id: test.id,
    code: test.code,
    title: test.title,
    kind: test.kind,
    questionCount: test.currentRelease.questionCount,
    durationMinutes: test.currentRelease.durationMinutes,
  };
}
