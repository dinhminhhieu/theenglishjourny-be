import { Module } from '@nestjs/common';
import { AdminCourseController } from './admin-course.controller';
import { AdminLessonController } from './admin-lesson.controller';
import { CourseAccessService } from './course-access.service';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';

@Module({
  controllers: [
    AdminCourseController,
    AdminLessonController,
    CourseController,
    LessonController,
  ],
  providers: [CourseService, LessonService, CourseAccessService],
  exports: [CourseService, LessonService, CourseAccessService],
})
export class CourseModule {}
