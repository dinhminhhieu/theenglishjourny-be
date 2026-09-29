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
  Put,
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
import { ReplaceLessonBlocksDto } from './dto/lesson-block.dto';
import {
  CreateLessonDto,
  LessonDetailDto,
  LessonDto,
  LessonQueryDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { LessonService } from './lesson.service';

@ApiTags('Admin · Courses')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/lessons')
export class AdminLessonController {
  constructor(private readonly lessons: LessonService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách unit, lọc theo courseId' })
  @ApiPaginatedResponse(LessonDto)
  findAll(@Query() query: LessonQueryDto): Promise<PaginatedResult<LessonDto>> {
    return this.lessons.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết unit kèm blocks' })
  @ApiSuccessResponse(LessonDetailDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LessonDetailDto> {
    return this.lessons.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo unit thành công')
  @ApiOperation({ summary: 'Tạo unit (nháp)' })
  @ApiSuccessResponse(LessonDetailDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDetailDto> {
    return this.lessons.create(dto, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật unit thành công')
  @ApiOperation({ summary: 'Cập nhật thông tin unit (không gồm blocks)' })
  @ApiSuccessResponse(LessonDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDetailDto> {
    return this.lessons.update(id, dto, user.id);
  }

  @Put(':id/blocks')
  @ResponseMessage('Cập nhật nội dung unit thành công')
  @ApiOperation({
    summary: 'Thay toàn bộ blocks của unit',
    description:
      'Gửi cả mảng: có id là cập nhật, không id là tạo mới, id không còn trong mảng sẽ bị xoá. Block GRAMMAR phải có grammarLessonId.',
  })
  @ApiSuccessResponse(LessonDetailDto)
  replaceBlocks(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceLessonBlocksDto,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDetailDto> {
    return this.lessons.replaceBlocks(id, dto, user.id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã phát hành unit')
  @ApiOperation({ summary: 'Phát hành unit (cần ít nhất một block)' })
  @ApiSuccessResponse(LessonDto)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDto> {
    return this.lessons.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã chuyển unit về nháp')
  @ApiOperation({ summary: 'Gỡ phát hành' })
  @ApiSuccessResponse(LessonDto)
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDto> {
    return this.lessons.unpublish(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá unit')
  @ApiOperation({ summary: 'Xoá mềm unit' })
  @ApiSuccessResponse(LessonDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDto> {
    return this.lessons.remove(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục unit')
  @ApiOperation({ summary: 'Khôi phục unit đã xoá' })
  @ApiSuccessResponse(LessonDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<LessonDto> {
    return this.lessons.restore(id, user.id);
  }
}
