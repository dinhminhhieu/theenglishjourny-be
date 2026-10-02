import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { SEED_TOPICS } from './seeds/topic-content';
import { seedTopics } from './seeds/topic-seeder';

const prisma = new PrismaClient();

seedTopics(prisma)
  .then((created) => {
    console.log(
      `Chủ đề xong: tạo mới ${created}/${SEED_TOPICS.length}, bỏ qua ${SEED_TOPICS.length - created} chủ đề đã có.`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
