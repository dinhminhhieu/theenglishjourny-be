import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/roles.constant';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import { VocabularyQueryDto } from '../vocabulary/dto/vocabulary-query.dto';
import { VocabularySummaryDto } from '../vocabulary/dto/vocabulary.dto';
import {
  AddTopicWordsDto,
  AddTopicWordsResultDto,
  CheckTopicWordsDto,
  TopicWordCheckDto,
} from './dto/topic-word.dto';
import { TopicDto } from './dto/topic.dto';
import { TopicWordService } from './topic-word.service';
import { TopicService } from './topic.service';

@ApiTags('Admin · Topics')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/topics/:id')
export class AdminTopicWordController {
  constructor(
    private readonly topics: TopicService,
    private readonly topicWords: TopicWordService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Chi tiết chủ đề cho admin, gồm cả chủ đề đang tắt',
  })
  @ApiSuccessResponse(TopicDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TopicDto> {
    return this.topics.findForAdmin(id);
  }

  @Get('words')
  @ApiOperation({ summary: 'Danh sách từ trong chủ đề' })
  @ApiPaginatedResponse(VocabularySummaryDto)
  listWords(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: VocabularyQueryDto,
  ): Promise<PaginatedResult<VocabularySummaryDto>> {
    return this.topicWords.list(id, query, 'admin');
  }

  @Post('words/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Dò danh sách từ trong từ điển trước khi import: từ nào có, từ nào đã nằm trong chủ đề',
  })
  @ApiSuccessResponse(TopicWordCheckDto)
  checkWords(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckTopicWordsDto,
  ): Promise<TopicWordCheckDto> {
    return this.topicWords.check(id, dto.words);
  }

  @Post('words')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã thêm từ vào chủ đề')
  @ApiOperation({ summary: 'Gắn từ vào chủ đề, từ đã có thì bỏ qua' })
  @ApiSuccessResponse(AddTopicWordsResultDto)
  addWords(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTopicWordsDto,
  ): Promise<AddTopicWordsResultDto> {
    return this.topicWords.add(id, dto.vocabularyIds);
  }

  @Delete('words/:vocabularyId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã gỡ từ khỏi chủ đề')
  @ApiOperation({ summary: 'Gỡ một từ khỏi chủ đề, từ vẫn còn trong từ điển' })
  @ApiSuccessResponse()
  async removeWord(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vocabularyId', ParseUUIDPipe) vocabularyId: string,
  ): Promise<null> {
    await this.topicWords.remove(id, vocabularyId);
    return null;
  }
}
