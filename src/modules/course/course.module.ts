import { Module } from '@nestjs/common';
import { AdminCourseController } from './admin-course.controller';
import { AdminLessonController } from './admin-lesson.controller';
import { CourseService } from './course.service';
import { LessonService } from './lesson.service';

@Module({
  controllers: [AdminCourseController, AdminLessonController],
  providers: [CourseService, LessonService],
  exports: [CourseService, LessonService],
})
export class CourseModule {}
