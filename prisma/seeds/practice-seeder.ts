import {
  LessonStatus,
  Prisma,
  PrismaClient,
} from '../../src/generated/prisma/client';
import {
  validateForPublish,
  validateItemSetTree,
} from '../../src/modules/practice/content/item-set.validator';
import { buildItemSetRelease } from '../../src/modules/practice/content/release.builder';
import {
  ITEM_SET_TREE_INCLUDE,
  toReleaseSource,
} from '../../src/modules/practice/item-set/item-set.mapper';
import {
  buildStructure,
  defaultDuration,
  validateTestBlueprint,
} from '../../src/modules/practice/test/test-structure';
import type { SeedItemSet, SeedTest } from './practice-content';

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Tạo và phát hành một bộ câu hỏi mẫu. Đã có (trùng code) thì bỏ qua, không ghi đè bản admin đã sửa. */
export async function seedItemSet(
  prisma: PrismaClient,
  seed: SeedItemSet,
): Promise<boolean> {
  if (await prisma.itemSet.findUnique({ where: { code: seed.code } })) {
    return false;
  }
  const meta = {
    exam: seed.exam,
    skill: seed.skill,
    module: seed.module,
    part: seed.part,
  };
  const tree = validateItemSetTree({
    meta,
    stimulus: seed.stimulus,
    transcript: seed.transcript,
    groups: seed.groups,
  });
  const audio = seed.audioAssetId ? { ready: true } : null;
  const errors = [...tree.errors, ...validateForPublish(meta, tree, audio)];
  if (errors.length > 0) {
    throw new Error(
      `Bộ mẫu ${seed.code} không hợp lệ:\n- ${errors.join('\n- ')}`,
    );
  }
  const itemSet = await prisma.itemSet.create({
    data: {
      code: seed.code,
      title: seed.title,
      description: seed.description,
      ...meta,
      difficulty: seed.difficulty,
      tags: seed.tags,
      source: 'Nội dung mẫu tự soạn',
      stimulus: json(tree.stimulus),
      transcript: json(tree.transcript),
      audioAssetId: seed.audioAssetId,
      questionCount: tree.questionCount,
      totalMarks: tree.totalMarks,
    },
  });
  for (const group of tree.groups) {
    const created = await prisma.questionGroup.create({
      data: {
        itemSetId: itemSet.id,
        type: group.type,
        instructions: group.instructions,
        content: json(group.content),
        passageKey: group.passageKey,
        sortOrder: group.sortOrder,
      },
    });
    for (const question of group.questions) {
      await prisma.question.create({
        data: {
          groupId: created.id,
          number: question.number,
          marks: question.marks,
          sortOrder: question.sortOrder,
          prompt: question.prompt,
          content: json(question.content),
          answer: json(question.answer),
          explanation: question.explanation,
          evidence: question.evidence ? json(question.evidence) : Prisma.DbNull,
          tags: question.tags,
        },
      });
    }
  }
  const row = await prisma.itemSet.findUniqueOrThrow({
    where: { id: itemSet.id },
    include: ITEM_SET_TREE_INCLUDE,
  });
  const built = buildItemSetRelease(toReleaseSource(row));
  const release = await prisma.itemSetRelease.create({
    data: {
      itemSetId: itemSet.id,
      version: 1,
      content: json(built.content),
      answerKey: json(built.answerKey),
      questionCount: built.questionCount,
      totalMarks: built.totalMarks,
      audioAssetId: seed.audioAssetId,
      ...meta,
    },
  });
  await prisma.itemSet.update({
    where: { id: itemSet.id },
    data: {
      currentReleaseId: release.id,
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedRevision: row.revision,
    },
  });
  return true;
}

/** Tạo và phát hành một đề mẫu từ các bộ đã seed. */
export async function seedTest(
  prisma: PrismaClient,
  seed: SeedTest,
): Promise<boolean> {
  if (await prisma.test.findUnique({ where: { code: seed.code } })) {
    return false;
  }
  const itemSets = await Promise.all(
    seed.itemSetCodes.map((code) =>
      prisma.itemSet.findUniqueOrThrow({
        where: { code },
        include: { currentRelease: true },
      }),
    ),
  );
  const infos = itemSets.map((itemSet) => ({
    itemSetId: itemSet.id,
    code: itemSet.code,
    exam: itemSet.exam,
    skill: itemSet.skill,
    module: itemSet.module,
    part: itemSet.part,
    totalMarks: itemSet.totalMarks,
    questionCount: itemSet.questionCount,
    releaseId: itemSet.currentReleaseId,
  }));
  const shape = {
    exam: seed.exam,
    module: seed.module,
    kind: seed.kind,
    skill: seed.skill,
  };
  const report = validateTestBlueprint(shape, infos, { requireReleases: true });
  if (!report.ok) {
    throw new Error(
      `Đề mẫu ${seed.code} không hợp lệ:\n- ${report.errors.join('\n- ')}`,
    );
  }
  const structure = buildStructure(
    shape,
    infos.map((info) => ({ ...info, releaseId: info.releaseId as string })),
  );
  const test = await prisma.test.create({
    data: {
      code: seed.code,
      title: seed.title,
      description: seed.description,
      ...shape,
      xpCost: seed.xpCost,
      items: {
        create: itemSets.map((itemSet, sortOrder) => ({
          itemSetId: itemSet.id,
          sortOrder,
        })),
      },
    },
  });
  const release = await prisma.testRelease.create({
    data: {
      testId: test.id,
      version: 1,
      structure: json(structure),
      durationMinutes: defaultDuration(structure),
      questionCount: infos.reduce(
        (total, info) => total + info.questionCount,
        0,
      ),
      totalMarks: infos.reduce((total, info) => total + info.totalMarks, 0),
    },
  });
  await prisma.test.update({
    where: { id: test.id },
    data: {
      currentReleaseId: release.id,
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedRevision: test.revision,
    },
  });
  return true;
}
