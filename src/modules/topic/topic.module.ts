import { Module } from '@nestjs/common';
import { AdminTopicWordController } from './admin-topic-word.controller';
import { TopicWordService } from './topic-word.service';
import { TopicController } from './topic.controller';
import { TopicService } from './topic.service';

@Module({
  controllers: [TopicController, AdminTopicWordController],
  providers: [TopicService, TopicWordService],
  exports: [TopicService],
})
export class TopicModule {}
