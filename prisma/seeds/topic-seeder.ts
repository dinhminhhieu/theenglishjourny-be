import { PrismaClient } from '../../src/generated/prisma/client';
import { SEED_TOPICS, topicName } from './topic-content';

const MAX_TOPIC_NAME_LENGTH = 100;

/** Tạo chủ đề từ vựng mẫu. Đã có chủ đề trùng tên (không phân biệt hoa thường) thì bỏ qua. */
export async function seedTopics(prisma: PrismaClient): Promise<number> {
  let created = 0;
  for (const topic of SEED_TOPICS) {
    const name = topicName(topic);
    if (name.length > MAX_TOPIC_NAME_LENGTH) {
      throw new Error(
        `Tên chủ đề "${name}" dài quá ${MAX_TOPIC_NAME_LENGTH} ký tự`,
      );
    }
    const existing = await prisma.topic.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    await prisma.topic.create({
      data: { name, description: topic.description },
    });
    created++;
  }
  return created;
}
