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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AppUser } from '../../common/types/app-user.type';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import {
  CreateGrammarCategoryDto,
  GrammarCategoryDto,
  GrammarCategoryQueryDto,
  UpdateGrammarCategoryDto,
} from './dto/grammar-category.dto';
import { GrammarCategoryService } from './grammar-category.service';

@ApiTags('Admin · Grammar')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/grammar/categories')
export class AdminGrammarCategoryController {
  constructor(private readonly categories: GrammarCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chủ điểm ngữ pháp' })
  @ApiPaginatedResponse(GrammarCategoryDto)
  findAll(
    @Query() query: GrammarCategoryQueryDto,
  ): Promise<PaginatedResult<GrammarCategoryDto>> {
    return this.categories.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chủ điểm' })
  @ApiSuccessResponse(GrammarCategoryDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GrammarCategoryDto> {
    return this.categories.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo chủ điểm thành công')
  @ApiOperation({ summary: 'Tạo chủ điểm' })
  @ApiSuccessResponse(GrammarCategoryDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateGrammarCategoryDto,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarCategoryDto> {
    return this.categories.create(dto, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật chủ điểm thành công')
  @ApiOperation({ summary: 'Cập nhật chủ điểm' })
  @ApiSuccessResponse(GrammarCategoryDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGrammarCategoryDto,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarCategoryDto> {
    return this.categories.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá chủ điểm')
  @ApiOperation({ summary: 'Xoá mềm chủ điểm' })
  @ApiSuccessResponse(GrammarCategoryDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarCategoryDto> {
    return this.categories.remove(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục chủ điểm')
  @ApiOperation({ summary: 'Khôi phục chủ điểm đã xoá' })
  @ApiSuccessResponse(GrammarCategoryDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarCategoryDto> {
    return this.categories.restore(id, user.id);
  }
}
