import { Module } from '@nestjs/common';
import { XpModule } from '../xp/xp.module';
import { AdminCourseController } from './admin-course.controller';
import { AdminLessonController } from './admin-lesson.controller';
import { CourseAccessService } from './course-access.service';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { LessonController } from './lesson.controller';
import { LessonProgressService } from './lesson-progress.service';
import { LessonService } from './lesson.service';

@Module({
  imports: [XpModule],
  controllers: [
    AdminCourseController,
    AdminLessonController,
    CourseController,
    LessonController,
  ],
  providers: [
    CourseService,
    LessonService,
    CourseAccessService,
    LessonProgressService,
  ],
  exports: [
    CourseService,
    LessonService,
    CourseAccessService,
    LessonProgressService,
  ],
})
export class CourseModule {}
