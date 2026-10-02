import 'reflect-metadata';
import 'dotenv/config';
import { CefrLevel, PrismaClient } from '../src/generated/prisma/client';
import { SEED_ITEM_SETS, SEED_TESTS } from './seeds/practice-content';
import { seedItemSet, seedTest } from './seeds/practice-seeder';
import { seedTopics } from './seeds/topic-seeder';

const prisma = new PrismaClient();

const SKILLS = [
  { name: 'Listening', description: 'Kỹ năng nghe', sortOrder: 1 },
  { name: 'Reading', description: 'Kỹ năng đọc', sortOrder: 2 },
  { name: 'Writing', description: 'Kỹ năng viết', sortOrder: 3 },
  { name: 'Speaking', description: 'Kỹ năng nói', sortOrder: 4 },
  { name: 'Grammar', description: 'Ngữ pháp', sortOrder: 5 },
  { name: 'Vocabulary', description: 'Từ vựng', sortOrder: 6 },
  { name: 'Pronunciation', description: 'Phát âm', sortOrder: 7 },
];

/**
 * Khoảng điểm tương đương mang tính tham khảo: TOEIC theo bảng của ETS,
 * IELTS theo bảng của IELTS.org. TOEIC Listening & Reading không có mức C2.
 */
const LEVELS = [
  {
    cefrLevel: CefrLevel.A1,
    name: 'Beginner',
    description: 'Mới bắt đầu, hiểu và dùng các câu rất cơ bản',
    toeicScoreMin: 10,
    toeicScoreMax: 224,
    ieltsMin: 1.0,
    ieltsMax: 2.5,
    sortOrder: 1,
  },
  {
    cefrLevel: CefrLevel.A2,
    name: 'Elementary',
    description: 'Giao tiếp được trong tình huống quen thuộc, đơn giản',
    toeicScoreMin: 225,
    toeicScoreMax: 549,
    ieltsMin: 3.0,
    ieltsMax: 3.5,
    sortOrder: 2,
  },
  {
    cefrLevel: CefrLevel.B1,
    name: 'Intermediate',
    description: 'Xử lý được hầu hết tình huống khi đi lại, học tập, làm việc',
    toeicScoreMin: 550,
    toeicScoreMax: 784,
    ieltsMin: 4.0,
    ieltsMax: 5.0,
    sortOrder: 3,
  },
  {
    cefrLevel: CefrLevel.B2,
    name: 'Upper Intermediate',
    description:
      'Hiểu ý chính văn bản phức tạp, giao tiếp trôi chảy với người bản xứ',
    toeicScoreMin: 785,
    toeicScoreMax: 944,
    ieltsMin: 5.5,
    ieltsMax: 6.5,
    sortOrder: 4,
  },
  {
    cefrLevel: CefrLevel.C1,
    name: 'Advanced',
    description: 'Dùng ngôn ngữ linh hoạt cho mục đích học thuật và chuyên môn',
    toeicScoreMin: 945,
    toeicScoreMax: 990,
    ieltsMin: 7.0,
    ieltsMax: 8.0,
    sortOrder: 5,
  },
  {
    cefrLevel: CefrLevel.C2,
    name: 'Proficient',
    description: 'Gần như người bản xứ',
    toeicScoreMin: null,
    toeicScoreMax: null,
    ieltsMin: 8.5,
    ieltsMax: 9.0,
    sortOrder: 6,
  },
];

async function main(): Promise<void> {
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      create: skill,
      update: { description: skill.description, sortOrder: skill.sortOrder },
    });
  }

  for (const level of LEVELS) {
    const { cefrLevel, ...data } = level;
    await prisma.level.upsert({
      where: { cefrLevel },
      create: { cefrLevel, ...data },
      update: data,
    });
  }

  await seedTopics(prisma);

  for (const itemSet of SEED_ITEM_SETS) {
    await seedItemSet(prisma, itemSet);
  }
  for (const test of SEED_TESTS) {
    await seedTest(prisma, test);
  }

  const [skills, levels, topics, itemSets, tests] = await Promise.all([
    prisma.skill.count(),
    prisma.level.count(),
    prisma.topic.count(),
    prisma.itemSet.count(),
    prisma.test.count(),
  ]);
  console.log(
    `Seed xong: ${skills} skill, ${levels} level, ${topics} chủ đề, ${itemSets} bộ câu hỏi, ${tests} đề.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
