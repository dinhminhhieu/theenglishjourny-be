import { decimalToNumber } from '../../common/utils/decimal.util';
import { Prisma } from '../../generated/prisma/client';
import { CourseDetailDto, CourseDto } from './dto/course.dto';
import { LessonBlockDto } from './dto/lesson-block.dto';
import { LessonDetailDto, LessonDto } from './dto/lesson.dto';

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
      sortOrder: block.sortOrder,
    })),
  };
}
