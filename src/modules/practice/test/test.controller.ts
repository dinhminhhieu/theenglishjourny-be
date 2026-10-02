import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../../common/decorators/optional-auth.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import type { AppUser } from '../../../common/types/app-user.type';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import { AttemptService } from '../attempt/attempt.service';
import { AttemptDetailDto } from '../attempt/dto/attempt.dto';
import {
  PublicTestDetailDto,
  PublicTestDto,
  PublicTestQueryDto,
  StartAttemptDto,
  UnlockResultDto,
} from './dto/test.dto';
import { TestCatalogService } from './test-catalog.service';

@ApiTags('Tests')
@ApiBearerAuth()
@Controller('tests')
export class TestController {
  constructor(
    private readonly catalog: TestCatalogService,
    private readonly attempts: AttemptService,
  ) {}

  @OptionalAuth()
  @Get()
  @ApiOperation({
    summary:
      'Thư viện đề. Gửi token thì có trạng thái mở khoá và điểm cao nhất',
  })
  @ApiPaginatedResponse(PublicTestDto)
  findAll(
    @Query() query: PublicTestQueryDto,
    @CurrentUser() user?: AppUser,
  ): Promise<PaginatedResult<PublicTestDto>> {
    return this.catalog.findPublished(query, user);
  }

  @OptionalAuth()
  @Get(':code')
  @ApiParam({ name: 'code', example: 'TOEIC-FULL-01' })
  @ApiOperation({
    summary:
      'Giới thiệu đề: các phần, số câu, thời gian. Không có nội dung câu hỏi',
  })
  @ApiSuccessResponse(PublicTestDetailDto)
  findOne(
    @Param('code') code: string,
    @CurrentUser() user?: AppUser,
  ): Promise<PublicTestDetailDto> {
    return this.catalog.findPublishedByCode(code, user);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã mở khoá đề')
  @ApiOperation({ summary: 'Mở khoá đề bằng XP. Thiếu XP trả 402' })
  @ApiSuccessResponse(UnlockResultDto)
  unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<UnlockResultDto> {
    return this.catalog.unlock(id, user);
  }

  @Post(':id/attempts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bắt đầu hoặc tiếp tục làm đề' })
  @ApiSuccessResponse(AttemptDetailDto)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
    @Body() dto: StartAttemptDto,
  ): Promise<AttemptDetailDto> {
    return this.attempts.startFromTest(id, user, dto);
  }
}
