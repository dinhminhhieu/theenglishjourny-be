import {
  GrammarCategory,
  GrammarLesson,
  GrammarSection,
} from '../../generated/prisma/client';
import { GrammarCategoryDto } from './dto/grammar-category.dto';
import {
  GrammarHighlightDto,
  GrammarLessonDetailDto,
  GrammarLessonDto,
} from './dto/grammar-lesson.dto';
import { GrammarSectionDto } from './dto/grammar-section.dto';

export type GrammarCategoryRow = GrammarCategory & {
  _count: { lessons: number };
};

export type GrammarLessonRow = GrammarLesson & {
  _count: { sections: number };
};

export type GrammarLessonDetailRow = GrammarLessonRow & {
  sections: GrammarSection[];
};

export function toGrammarCategoryDto(
  row: GrammarCategoryRow,
): GrammarCategoryDto {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    lessonCount: row._count.lessons,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toGrammarLessonDto(row: GrammarLessonRow): GrammarLessonDto {
  return {
    id: row.id,
    grammarCategoryId: row.grammarCategoryId,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    tier: row.tier,
    levelFrom: row.levelFrom,
    levelTo: row.levelTo,
    levelId: row.levelId,
    highlights: Array.isArray(row.highlights)
      ? (row.highlights as unknown as GrammarHighlightDto[])
      : [],
    estimatedMinutes: row.estimatedMinutes,
    sortOrder: row.sortOrder,
    status: row.status,
    publishedAt: row.publishedAt,
    sectionCount: row._count.sections,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toGrammarSectionDto(
  section: GrammarSection,
): GrammarSectionDto {
  return {
    id: section.id,
    type: section.type,
    code: section.code,
    title: section.title,
    subtitle: section.subtitle,
    content:
      section.content && typeof section.content === 'object'
        ? (section.content as Record<string, unknown>)
        : {},
    sortOrder: section.sortOrder,
  };
}

export function toGrammarLessonDetailDto(
  row: GrammarLessonDetailRow,
): GrammarLessonDetailDto {
  return {
    ...toGrammarLessonDto(row),
    sections: row.sections.map(toGrammarSectionDto),
  };
}
