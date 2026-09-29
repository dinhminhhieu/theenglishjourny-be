import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import {
  PublicGrammarCategoryDto,
  PublicGrammarCategoryQueryDto,
  PublicGrammarLessonDetailDto,
  PublicGrammarLessonDto,
  PublicGrammarLessonQueryDto,
} from './dto/public-grammar.dto';
import { GrammarCategoryService } from './grammar-category.service';
import { GrammarLessonService } from './grammar-lesson.service';

/** API cho người học: chỉ đọc, chỉ thấy nội dung đã phát hành. */
@ApiTags('Grammar')
@Public()
@Controller('grammar')
export class GrammarController {
  constructor(
    private readonly categories: GrammarCategoryService,
    private readonly lessons: GrammarLessonService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Danh sách chủ điểm ngữ pháp đang bật (công khai)' })
  @ApiPaginatedResponse(PublicGrammarCategoryDto)
  findCategories(
    @Query() query: PublicGrammarCategoryQueryDto,
  ): Promise<PaginatedResult<PublicGrammarCategoryDto>> {
    return this.categories.findPublished(query);
  }

  @Get('lessons')
  @ApiOperation({ summary: 'Danh sách bài ngữ pháp đã phát hành (công khai)' })
  @ApiPaginatedResponse(PublicGrammarLessonDto)
  findLessons(
    @Query() query: PublicGrammarLessonQueryDto,
  ): Promise<PaginatedResult<PublicGrammarLessonDto>> {
    return this.lessons.findPublished(query);
  }

  @Get('lessons/:code')
  @ApiOperation({ summary: 'Chi tiết bài ngữ pháp theo mã, kèm sections' })
  @ApiParam({ name: 'code', example: 'MOD-01-TENSE' })
  @ApiSuccessResponse(PublicGrammarLessonDetailDto)
  findLessonByCode(
    @Param('code') code: string,
  ): Promise<PublicGrammarLessonDetailDto> {
    return this.lessons.findPublishedByCode(code);
  }
}
