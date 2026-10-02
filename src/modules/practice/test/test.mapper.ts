import { Prisma } from '../../../generated/prisma/client';
import type { AttemptStructure } from '../content/structure.types';
import type {
  PublicTestSectionDto,
  TestDto,
  TestItemDto,
} from './dto/test.dto';
import type { TestItemInfo } from './test-structure';

export const TEST_LIST_INCLUDE = {
  currentRelease: { select: { version: true } },
  _count: { select: { items: true } },
} satisfies Prisma.TestInclude;

export const TEST_DETAIL_INCLUDE = {
  ...TEST_LIST_INCLUDE,
  currentRelease: { select: { version: true, structure: true } },
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      itemSet: {
        select: {
          id: true,
          code: true,
          title: true,
          exam: true,
          skill: true,
          module: true,
          part: true,
          questionCount: true,
          totalMarks: true,
          status: true,
          deletedAt: true,
          currentRelease: {
            select: {
              id: true,
              version: true,
              questionCount: true,
              totalMarks: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TestInclude;

export type TestListRow = Prisma.TestGetPayload<{
  include: typeof TEST_LIST_INCLUDE;
}>;
export type TestDetailRow = Prisma.TestGetPayload<{
  include: typeof TEST_DETAIL_INCLUDE;
}>;

export function toTestDto(row: TestListRow | TestDetailRow): TestDto {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    exam: row.exam,
    module: row.module,
    kind: row.kind,
    skill: row.skill,
    durationMinutes: row.durationMinutes,
    isListed: row.isListed,
    xpCost: row.xpCost,
    sortOrder: row.sortOrder,
    status: row.status,
    publishedAt: row.publishedAt,
    releaseVersion: row.currentRelease?.version ?? null,
    hasUnpublishedChanges: row.publishedRevision !== row.revision,
    itemCount: row._count.items,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Bộ câu hỏi của đề, dùng bản phát hành hiện tại của từng bộ. */
export function toItemInfos(row: TestDetailRow): TestItemInfo[] {
  return row.items.map(({ itemSet }) => ({
    itemSetId: itemSet.id,
    code: itemSet.code,
    exam: itemSet.exam,
    skill: itemSet.skill,
    module: itemSet.module,
    part: itemSet.part,
    totalMarks: itemSet.currentRelease?.totalMarks ?? itemSet.totalMarks,
    questionCount:
      itemSet.currentRelease?.questionCount ?? itemSet.questionCount,
    releaseId:
      itemSet.deletedAt === null && itemSet.currentRelease
        ? itemSet.currentRelease.id
        : null,
  }));
}

export function toTestItems(row: TestDetailRow): TestItemDto[] {
  const used = new Set(
    releasedStructure(row.currentRelease?.structure).sections.flatMap(
      (section) => section.items.map((item) => item.itemSetReleaseId),
    ),
  );
  return row.items.map(({ itemSet }) => ({
    itemSetId: itemSet.id,
    code: itemSet.code,
    title: itemSet.title,
    skill: itemSet.skill,
    part: itemSet.part,
    module: itemSet.module,
    questionCount: itemSet.questionCount,
    totalMarks: itemSet.totalMarks,
    status: itemSet.status,
    releaseVersion: itemSet.currentRelease?.version ?? null,
    hasNewerRelease:
      row.currentRelease !== null &&
      itemSet.currentRelease !== null &&
      !used.has(itemSet.currentRelease.id),
  }));
}

export function releasedStructure(value: unknown): AttemptStructure {
  const structure = value as AttemptStructure | null | undefined;
  return structure && Array.isArray(structure.sections)
    ? structure
    : { formatKey: 'GENERAL', kind: 'PRACTICE', sections: [] };
}

export function toPublicSections(
  structure: AttemptStructure,
): PublicTestSectionDto[] {
  return structure.sections.map((section) => ({
    skill: section.skill,
    title: section.title,
    questionCount: section.items.reduce(
      (total, item) => total + item.totalMarks,
      0,
    ),
    durationMinutes: section.durationMinutes,
    parts: [
      ...new Set(
        section.items
          .map((item) => item.part)
          .filter((part): part is number => part !== null),
      ),
    ],
  }));
}
