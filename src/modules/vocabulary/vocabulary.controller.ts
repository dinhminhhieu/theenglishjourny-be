import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import { VocabularyQueryDto } from './dto/vocabulary-query.dto';
import { VocabularyDto, VocabularySummaryDto } from './dto/vocabulary.dto';
import { VocabularyService } from './vocabulary.service';

@ApiTags('Vocabulary')
@Controller('vocabularies')
export class VocabularyController {
  constructor(private readonly vocabularies: VocabularyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Tìm từ theo tiền tố, có phân trang (công khai)' })
  @ApiPaginatedResponse(VocabularySummaryDto)
  search(
    @Query() query: VocabularyQueryDto,
  ): Promise<PaginatedResult<VocabularySummaryDto>> {
    return this.vocabularies.search(query);
  }

  @Public()
  @Get('word/:word')
  @ApiOperation({
    summary:
      'Chi tiết từ theo chính tả, ví dụ /vocabularies/word/asking%20price',
  })
  @ApiParam({ name: 'word', example: 'check' })
  @ApiSuccessResponse(VocabularyDto)
  findByWord(@Param('word') word: string): Promise<VocabularyDto> {
    return this.vocabularies.findByWord(word);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết từ theo id' })
  @ApiSuccessResponse(VocabularyDto)
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<VocabularyDto> {
    return this.vocabularies.findById(id);
  }
}
