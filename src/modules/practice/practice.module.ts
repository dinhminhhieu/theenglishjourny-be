import { Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module';
import { StorageModule } from '../storage/storage.module';
import { XpModule } from '../xp/xp.module';
import { AdminAttemptController } from './attempt/admin-attempt.controller';
import { AttemptController } from './attempt/attempt.controller';
import { AttemptService } from './attempt/attempt.service';
import { LessonBlockController } from './attempt/lesson-block.controller';
import { PracticeCatalogService } from './attempt/practice-catalog.service';
import { PracticeController } from './attempt/practice.controller';
import { ExamFormatController } from './formats/exam-format.controller';
import { AdminItemSetController } from './item-set/admin-item-set.controller';
import { ItemSetService } from './item-set/item-set.service';
import { AdminTestController } from './test/admin-test.controller';
import { TestCatalogService } from './test/test-catalog.service';
import { TestController } from './test/test.controller';
import { TestService } from './test/test.service';

/** Ngân hàng câu hỏi, đề, làm bài và chấm điểm cho IELTS, TOEIC và bài tập tự do. */
@Module({
  imports: [StorageModule, XpModule, CourseModule],
  controllers: [
    ExamFormatController,
    AdminItemSetController,
    AdminTestController,
    AdminAttemptController,
    TestController,
    PracticeController,
    LessonBlockController,
    AttemptController,
  ],
  providers: [
    ItemSetService,
    TestService,
    TestCatalogService,
    AttemptService,
    PracticeCatalogService,
  ],
})
export class PracticeModule {}
