import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/roles.constant';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AppUser } from '../../common/types/app-user.type';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicAdminQueryDto, TopicQueryDto } from './dto/topic-query.dto';
import { TopicDto } from './dto/topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { VocabularyQueryDto } from '../vocabulary/dto/vocabulary-query.dto';
import { VocabularySummaryDto } from '../vocabulary/dto/vocabulary.dto';
import { TopicWordService } from './topic-word.service';
import { TopicService } from './topic.service';

@ApiTags('Topics')
@Controller('topics')
export class TopicController {
  constructor(
    private readonly topics: TopicService,
    private readonly topicWords: TopicWordService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách chủ đề đang hoạt động (công khai)' })
  @ApiPaginatedResponse(TopicDto)
  findPublic(
    @Query() query: TopicQueryDto,
  ): Promise<PaginatedResult<TopicDto>> {
    return this.topics.findPublic(query);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách chủ đề cho admin, gồm cả đang tắt và đã xoá',
  })
  @ApiPaginatedResponse(TopicDto)
  findAll(
    @Query() query: TopicAdminQueryDto,
  ): Promise<PaginatedResult<TopicDto>> {
    return this.topics.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một chủ đề (công khai)' })
  @ApiSuccessResponse(TopicDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TopicDto> {
    return this.topics.findOne(id);
  }

  @Public()
  @Get(':id/words')
  @ApiOperation({ summary: 'Danh sách từ của một chủ đề (công khai)' })
  @ApiPaginatedResponse(VocabularySummaryDto)
  findWords(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: VocabularyQueryDto,
  ): Promise<PaginatedResult<VocabularySummaryDto>> {
    return this.topicWords.list(id, query, 'public');
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ResponseMessage('Tạo chủ đề thành công')
  @ApiOperation({ summary: 'Tạo chủ đề (admin)' })
  @ApiSuccessResponse(TopicDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateTopicDto,
    @CurrentUser() user: AppUser,
  ): Promise<TopicDto> {
    return this.topics.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ResponseMessage('Cập nhật chủ đề thành công')
  @ApiOperation({ summary: 'Cập nhật chủ đề (admin)' })
  @ApiSuccessResponse(TopicDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicDto,
    @CurrentUser() user: AppUser,
  ): Promise<TopicDto> {
    return this.topics.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá chủ đề')
  @ApiOperation({ summary: 'Xoá mềm chủ đề (admin)' })
  @ApiSuccessResponse(TopicDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<TopicDto> {
    return this.topics.remove(id, user.id);
  }

  @Post(':id/restore')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục chủ đề')
  @ApiOperation({ summary: 'Khôi phục chủ đề đã xoá mềm (admin)' })
  @ApiSuccessResponse(TopicDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<TopicDto> {
    return this.topics.restore(id, user.id);
  }
}
