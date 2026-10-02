import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AppUser } from '../../common/types/app-user.type';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import {
  XpSummaryDto,
  XpTransactionDto,
  XpTransactionQueryDto,
} from './dto/xp.dto';
import { XpService } from './xp.service';

@ApiTags('XP')
@ApiBearerAuth()
@Controller('me/xp')
export class XpController {
  constructor(private readonly xp: XpService) {}

  @Get()
  @ApiOperation({ summary: 'Số dư XP và streak của người đang đăng nhập' })
  @ApiSuccessResponse(XpSummaryDto)
  summary(@CurrentUser() user: AppUser): Promise<XpSummaryDto> {
    return this.xp.summary(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lịch sử cộng, tiêu XP' })
  @ApiPaginatedResponse(XpTransactionDto)
  transactions(
    @CurrentUser() user: AppUser,
    @Query() query: XpTransactionQueryDto,
  ): Promise<PaginatedResult<XpTransactionDto>> {
    return this.xp.transactions(user.id, query);
  }
}
