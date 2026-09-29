import { Module } from '@nestjs/common';
import { AdminGrammarCategoryController } from './admin-grammar-category.controller';
import { AdminGrammarLessonController } from './admin-grammar-lesson.controller';
import { GrammarCategoryService } from './grammar-category.service';
import { GrammarLessonService } from './grammar-lesson.service';
import { GrammarController } from './grammar.controller';

@Module({
  controllers: [
    AdminGrammarCategoryController,
    AdminGrammarLessonController,
    GrammarController,
  ],
  providers: [GrammarCategoryService, GrammarLessonService],
  exports: [GrammarCategoryService, GrammarLessonService],
})
export class GrammarModule {}
