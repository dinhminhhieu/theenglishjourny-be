import { Prisma } from '../../../generated/prisma/client';
import { getQuestionType } from '../formats/question-types';
import type { GroupDraft } from '../content/item-set.validator';
import type { ReleaseSource } from '../content/release.builder';
import type {
  CreateItemSetDto,
  ItemSetDetailDto,
  ItemSetDto,
  QuestionGroupDto,
} from './dto/item-set.dto';

export const ITEM_SET_LIST_INCLUDE = {
  currentRelease: { select: { version: true } },
  groups: { select: { type: true }, orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ItemSetInclude;

export const ITEM_SET_TREE_INCLUDE = {
  currentRelease: { select: { version: true } },
  audioAsset: {
    select: { id: true, status: true, durationSeconds: true, purpose: true },
  },
  groups: {
    orderBy: { sortOrder: 'asc' as const },
    include: { questions: { orderBy: { sortOrder: 'asc' as const } } },
  },
} satisfies Prisma.ItemSetInclude;

export type ItemSetListRow = Prisma.ItemSetGetPayload<{
  include: typeof ITEM_SET_LIST_INCLUDE;
}>;
export type ItemSetTreeRow = Prisma.ItemSetGetPayload<{
  include: typeof ITEM_SET_TREE_INCLUDE;
}>;

export function toItemSetDto(row: ItemSetListRow | ItemSetTreeRow): ItemSetDto {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    exam: row.exam,
    skill: row.skill,
    module: row.module,
    part: row.part,
    difficulty: row.difficulty,
    levelFrom: row.levelFrom,
    levelTo: row.levelTo,
    tags: row.tags,
    practiceEnabled: row.practiceEnabled,
    audioAssetId: row.audioAssetId,
    questionTypes: [...new Set(row.groups.map((group) => group.type))],
    questionCount: row.questionCount,
    totalMarks: row.totalMarks,
    status: row.status,
    publishedAt: row.publishedAt,
    releaseVersion: row.currentRelease?.version ?? null,
    hasUnpublishedChanges: row.publishedRevision !== row.revision,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toItemSetDetailDto(row: ItemSetTreeRow): ItemSetDetailDto {
  return {
    ...toItemSetDto(row),
    source: row.source,
    stimulus: asRecord(row.stimulus),
    transcript: Array.isArray(row.transcript)
      ? (row.transcript as unknown as ItemSetDetailDto['transcript'])
      : [],
    audio: row.audioAsset
      ? {
          id: row.audioAsset.id,
          ready: row.audioAsset.status === 'READY',
          durationSeconds: row.audioAsset.durationSeconds,
        }
      : null,
    groups: row.groups.map((group): QuestionGroupDto => ({
      id: group.id,
      type: group.type,
      typeName: getQuestionType(group.type)?.nameVi ?? group.type,
      instructions: group.instructions,
      content: asRecord(group.content),
      passageKey: group.passageKey,
      questions: group.questions.map((question) => ({
        id: question.id,
        number: question.number,
        marks: question.marks,
        prompt: question.prompt,
        content: asRecord(question.content),
        answer: asRecord(question.answer),
        explanation: question.explanation,
        evidence: question.evidence ? asRecord(question.evidence) : null,
        tags: question.tags,
        grammarLessonId: question.grammarLessonId,
      })),
    })),
  };
}

/** Câu hỏi đang lưu trong DB, chuyển về dạng nháp để validate lại cùng metadata mới. */
export function toGroupDrafts(row: ItemSetTreeRow): GroupDraft[] {
  return row.groups.map((group) => ({
    id: group.id,
    type: group.type,
    instructions: group.instructions,
    content: group.content,
    passageKey: group.passageKey,
    questions: group.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      content: question.content,
      answer: question.answer,
      explanation: question.explanation,
      evidence: question.evidence,
      tags: question.tags,
      grammarLessonId: question.grammarLessonId,
    })),
  }));
}

export function toReleaseSource(row: ItemSetTreeRow): ReleaseSource {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    exam: row.exam,
    skill: row.skill,
    module: row.module,
    part: row.part,
    difficulty: row.difficulty,
    levelFrom: row.levelFrom,
    levelTo: row.levelTo,
    stimulus: row.stimulus,
    transcript: row.transcript,
    audio: row.audioAsset
      ? { durationSeconds: row.audioAsset.durationSeconds }
      : null,
    groups: row.groups.map((group) => ({
      id: group.id,
      type: group.type,
      instructions: group.instructions,
      content: group.content,
      passageKey: group.passageKey,
      questions: group.questions.map((question) => ({
        id: question.id,
        number: question.number,
        marks: question.marks,
        prompt: question.prompt,
        content: question.content,
        answer: question.answer,
        explanation: question.explanation,
        evidence: question.evidence,
        tags: question.tags,
        grammarLessonId: question.grammarLessonId,
      })),
    })),
  };
}

/** Xuất bộ câu hỏi đúng định dạng nhập, để sao chép giữa môi trường hoặc sửa hàng loạt ngoài hệ thống. */
export function toImportShape(row: ItemSetTreeRow): CreateItemSetDto {
  const detail = toItemSetDetailDto(row);
  return {
    code: row.code,
    title: row.title,
    description: row.description,
    exam: row.exam,
    skill: row.skill,
    module: row.module,
    part: row.part,
    stimulus: detail.stimulus,
    transcript: detail.transcript,
    audioAssetId: row.audioAssetId,
    difficulty: row.difficulty,
    levelFrom: row.levelFrom,
    levelTo: row.levelTo,
    tags: row.tags,
    source: row.source,
    practiceEnabled: row.practiceEnabled,
    groups: detail.groups.map((group) => ({
      type: group.type,
      instructions: group.instructions,
      content: group.content,
      passageKey: group.passageKey,
      questions: group.questions.map((question) => ({
        prompt: question.prompt,
        content: question.content,
        answer: question.answer,
        explanation: question.explanation,
        evidence: question.evidence,
        tags: question.tags,
        grammarLessonId: question.grammarLessonId,
      })),
    })),
  } as CreateItemSetDto;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
