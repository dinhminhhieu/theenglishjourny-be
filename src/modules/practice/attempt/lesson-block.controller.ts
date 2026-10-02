import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import type { AppUser } from '../../../common/types/app-user.type';
import { StartAttemptDto } from '../test/dto/test.dto';
import { AttemptService } from './attempt.service';
import { AttemptDetailDto, BlockCompletionDto } from './dto/attempt.dto';

/** Học trong unit: khoá phải mua thì khách nhận 401, chưa ghi danh nhận 403. */
@ApiTags('Courses')
@ApiBearerAuth()
@Controller('lesson-blocks')
export class LessonBlockController {
  constructor(private readonly attempts: AttemptService) {}

  @Post(':id/attempts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bắt đầu hoặc tiếp tục bài luyện của block' })
  @ApiSuccessResponse(AttemptDetailDto)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
    @Body() dto: StartAttemptDto,
  ): Promise<AttemptDetailDto> {
    return this.attempts.startFromLessonBlock(id, user, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã hoàn thành')
  @ApiOperation({
    summary: 'Đánh dấu xong block không có bài luyện, vd đọc ngữ pháp',
  })
  @ApiSuccessResponse(BlockCompletionDto)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<BlockCompletionDto> {
    return this.attempts.completeLessonBlock(id, user);
  }
}
