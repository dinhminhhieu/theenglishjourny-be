import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AppUser } from '../../../common/types/app-user.type';
import { AttemptService } from './attempt.service';
import {
  AttemptDetailDto,
  CustomPracticeDto,
  PracticeCatalogDto,
  PracticeCatalogQueryDto,
} from './dto/attempt.dto';
import { PracticeCatalogService } from './practice-catalog.service';

@ApiTags('Practice')
@Controller('practice')
export class PracticeController {
  constructor(
    private readonly catalog: PracticeCatalogService,
    private readonly attempts: AttemptService,
  ) {}

  @Public()
  @Get('catalog')
  @ApiOperation({
    summary: 'Các part và dạng câu đang có để luyện (công khai)',
  })
  @ApiSuccessResponse(PracticeCatalogDto)
  getCatalog(
    @Query() query: PracticeCatalogQueryDto,
  ): Promise<PracticeCatalogDto> {
    return this.catalog.catalog(query.exam, query.module);
  }

  @Post('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bắt đầu luyện theo part hoặc dạng câu' })
  @ApiSuccessResponse(AttemptDetailDto, { status: 201 })
  start(
    @Body() dto: CustomPracticeDto,
    @CurrentUser() user: AppUser,
  ): Promise<AttemptDetailDto> {
    return this.attempts.startCustom(dto, user);
  }
}
