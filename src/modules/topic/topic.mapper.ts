import { Prisma, Topic } from '../../generated/prisma/client';
import { TopicDto } from './dto/topic.dto';

export const TOPIC_INCLUDE = {
  _count: { select: { topicWords: true } },
} satisfies Prisma.TopicInclude;

type TopicRow = Topic & { _count?: { topicWords: number } };

export function toTopicDto(topic: TopicRow): TopicDto {
  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    imageUrl: topic.imageUrl,
    isActive: topic.isActive,
    wordCount: topic._count?.topicWords ?? 0,
    deletedAt: topic.deletedAt,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}
