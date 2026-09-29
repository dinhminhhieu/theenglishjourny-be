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
import { CourseService } from './course.service';
import {
  CourseDetailDto,
  CourseDto,
  CourseQueryDto,
  CreateCourseDto,
  UpdateCourseDto,
} from './dto/course.dto';

@ApiTags('Admin · Courses')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/courses')
export class AdminCourseController {
  constructor(private readonly courses: CourseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khoá học' })
  @ApiPaginatedResponse(CourseDto)
  findAll(@Query() query: CourseQueryDto): Promise<PaginatedResult<CourseDto>> {
    return this.courses.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khoá kèm danh sách unit' })
  @ApiSuccessResponse(CourseDetailDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CourseDetailDto> {
    return this.courses.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo khoá học thành công')
  @ApiOperation({ summary: 'Tạo khoá học (nháp)' })
  @ApiSuccessResponse(CourseDetailDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: AppUser,
  ): Promise<CourseDetailDto> {
    return this.courses.create(dto, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật khoá học thành công')
  @ApiOperation({ summary: 'Cập nhật khoá học' })
  @ApiSuccessResponse(CourseDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AppUser,
  ): Promise<CourseDetailDto> {
    return this.courses.update(id, dto, user.id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã phát hành khoá học')
  @ApiOperation({ summary: 'Phát hành khoá (cần ít nhất một unit)' })
  @ApiSuccessResponse(CourseDto)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<CourseDto> {
    return this.courses.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã chuyển khoá về nháp')
  @ApiOperation({ summary: 'Gỡ phát hành' })
  @ApiSuccessResponse(CourseDto)
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<CourseDto> {
    return this.courses.unpublish(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá khoá học')
  @ApiOperation({ summary: 'Xoá mềm khoá học' })
  @ApiSuccessResponse(CourseDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<CourseDto> {
    return this.courses.remove(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục khoá học')
  @ApiOperation({ summary: 'Khôi phục khoá đã xoá' })
  @ApiSuccessResponse(CourseDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<CourseDto> {
    return this.courses.restore(id, user.id);
  }
}
