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
import {
  CreateGrammarLessonDto,
  GrammarLessonDetailDto,
  GrammarLessonDto,
  GrammarLessonQueryDto,
  UpdateGrammarLessonDto,
} from './dto/grammar-lesson.dto';
import { ReplaceGrammarSectionsDto } from './dto/grammar-section.dto';
import { GrammarLessonService } from './grammar-lesson.service';

@ApiTags('Admin · Grammar')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/grammar/lessons')
export class AdminGrammarLessonController {
  constructor(private readonly lessons: GrammarLessonService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách bài ngữ pháp' })
  @ApiPaginatedResponse(GrammarLessonDto)
  findAll(
    @Query() query: GrammarLessonQueryDto,
  ): Promise<PaginatedResult<GrammarLessonDto>> {
    return this.lessons.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết bài kèm sections' })
  @ApiSuccessResponse(GrammarLessonDetailDto)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GrammarLessonDetailDto> {
    return this.lessons.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo bài ngữ pháp thành công')
  @ApiOperation({ summary: 'Tạo bài (ở trạng thái nháp)' })
  @ApiSuccessResponse(GrammarLessonDetailDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateGrammarLessonDto,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDetailDto> {
    return this.lessons.create(dto, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật bài thành công')
  @ApiOperation({ summary: 'Cập nhật thông tin bài (không gồm sections)' })
  @ApiSuccessResponse(GrammarLessonDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGrammarLessonDto,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDetailDto> {
    return this.lessons.update(id, dto, user.id);
  }

  @Put(':id/sections')
  @ResponseMessage('Cập nhật nội dung bài thành công')
  @ApiOperation({
    summary: 'Thay toàn bộ sections của bài',
    description:
      'Gửi cả mảng: có id là cập nhật, không id là tạo mới, id không còn trong mảng sẽ bị xoá. Thứ tự mảng là thứ tự hiển thị. content được validate theo type.',
  })
  @ApiSuccessResponse(GrammarLessonDetailDto)
  replaceSections(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceGrammarSectionsDto,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDetailDto> {
    return this.lessons.replaceSections(id, dto, user.id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã phát hành bài')
  @ApiOperation({ summary: 'Phát hành bài (cần có ít nhất một section)' })
  @ApiSuccessResponse(GrammarLessonDto)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDto> {
    return this.lessons.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã chuyển bài về nháp')
  @ApiOperation({ summary: 'Gỡ phát hành, chuyển về nháp' })
  @ApiSuccessResponse(GrammarLessonDto)
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDto> {
    return this.lessons.unpublish(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá bài')
  @ApiOperation({ summary: 'Xoá mềm bài' })
  @ApiSuccessResponse(GrammarLessonDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDto> {
    return this.lessons.remove(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục bài')
  @ApiOperation({ summary: 'Khôi phục bài đã xoá' })
  @ApiSuccessResponse(GrammarLessonDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<GrammarLessonDto> {
    return this.lessons.restore(id, user.id);
  }
}
