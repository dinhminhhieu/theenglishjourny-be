import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import type { AppUser } from '../../../common/types/app-user.type';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import { AttemptService } from './attempt.service';
import {
  AttemptDetailDto,
  AttemptQueryDto,
  AttemptReviewDto,
  AttemptSummaryDto,
  CheckAnswerDto,
  CheckResultDto,
  SaveDraftDto,
  SaveDraftResultDto,
  SubmitAttemptDto,
} from './dto/attempt.dto';

/** Bài làm của người đang đăng nhập. Bài của người khác luôn trả 404. */
@ApiTags('Attempts')
@ApiBearerAuth()
@Controller('attempts')
export class AttemptController {
  constructor(private readonly attempts: AttemptService) {}

  @Get()
  @ApiOperation({ summary: 'Lịch sử làm bài' })
  @ApiPaginatedResponse(AttemptSummaryDto)
  findMine(
    @CurrentUser() user: AppUser,
    @Query() query: AttemptQueryDto,
  ): Promise<PaginatedResult<AttemptSummaryDto>> {
    return this.attempts.findMine(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Bài đang làm: nội dung đề, bài nháp, đồng hồ. Bài đã nộp: kết quả',
  })
  @ApiSuccessResponse(AttemptDetailDto)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<AttemptDetailDto> {
    return this.attempts.findOneForUser(id, user);
  }

  @Put(':id/draft')
  @ApiOperation({
    summary: 'Lưu nháp toàn bộ câu trả lời, gọi định kỳ hoặc khi đổi câu',
  })
  @ApiSuccessResponse(SaveDraftResultDto)
  saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
    @Body() dto: SaveDraftDto,
  ): Promise<SaveDraftResultDto> {
    return this.attempts.saveDraft(id, user, dto);
  }

  @Post(':id/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chế độ luyện tập: xem đáp án một câu, câu đó bị khoá',
  })
  @ApiSuccessResponse(CheckResultDto)
  check(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
    @Body() dto: CheckAnswerDto,
  ): Promise<CheckResultDto> {
    return this.attempts.check(id, user, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã nộp bài')
  @ApiOperation({ summary: 'Nộp và chấm. Gọi lại vẫn trả kết quả cũ' })
  @ApiSuccessResponse(AttemptDetailDto)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
    @Body() dto: SubmitAttemptDto,
  ): Promise<AttemptDetailDto> {
    return this.attempts.submit(id, user, dto);
  }

  @Post(':id/abandon')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã huỷ bài làm')
  @ApiOperation({ summary: 'Huỷ bài đang làm để làm lại từ đầu' })
  @ApiSuccessResponse(AttemptSummaryDto)
  abandon(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<AttemptSummaryDto> {
    return this.attempts.abandon(id, user);
  }

  @Get(':id/review')
  @ApiOperation({
    summary: 'Xem lại bài đã chấm: đáp án, giải thích, transcript',
  })
  @ApiSuccessResponse(AttemptReviewDto)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<AttemptReviewDto> {
    return this.attempts.review(id, user);
  }
}
