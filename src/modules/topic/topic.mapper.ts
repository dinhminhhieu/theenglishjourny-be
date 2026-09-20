import { Topic } from '../../generated/prisma/client';
import { TopicDto } from './dto/topic.dto';

export function toTopicDto(topic: Topic): TopicDto {
  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    imageUrl: topic.imageUrl,
    isActive: topic.isActive,
    deletedAt: topic.deletedAt,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}
