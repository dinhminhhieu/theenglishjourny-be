import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/constants/roles.constant';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import { AttemptService } from './attempt.service';
import {
  AdminAttemptDto,
  AdminAttemptQueryDto,
  AttemptReviewDto,
} from './dto/attempt.dto';

@ApiTags('Admin · Attempts')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/attempts')
export class AdminAttemptController {
  constructor(private readonly attempts: AttemptService) {}

  @Get()
  @ApiOperation({ summary: 'Bài làm của mọi học viên' })
  @ApiPaginatedResponse(AdminAttemptDto)
  findAll(
    @Query() query: AdminAttemptQueryDto,
  ): Promise<PaginatedResult<AdminAttemptDto>> {
    return this.attempts.adminFindAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết bài đã chấm' })
  @ApiSuccessResponse(AttemptReviewDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AttemptReviewDto> {
    return this.attempts.adminReview(id);
  }
}
