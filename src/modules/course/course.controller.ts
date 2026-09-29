import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import type { AppUser } from '../../common/types/app-user.type';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import { CourseService } from './course.service';
import {
  PublicCourseDetailDto,
  PublicCourseDto,
  PublicCourseQueryDto,
} from './dto/public-course.dto';

/**
 * API cho người học. Khách xem được danh mục và giới thiệu khoá;
 * gửi kèm token thì `hasAccess` phản ánh đúng quyền học của người đó.
 */
@ApiTags('Courses')
@ApiBearerAuth()
@OptionalAuth()
@Controller('courses')
export class CourseController {
  constructor(private readonly courses: CourseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khoá đã phát hành (khách xem được)' })
  @ApiPaginatedResponse(PublicCourseDto)
  findAll(
    @Query() query: PublicCourseQueryDto,
    @CurrentUser() user?: AppUser,
  ): Promise<PaginatedResult<PublicCourseDto>> {
    return this.courses.findPublished(query, user);
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Giới thiệu khoá theo mã, kèm danh sách unit đã phát hành',
  })
  @ApiParam({ name: 'code', example: 'IELTS-4-5' })
  @ApiSuccessResponse(PublicCourseDetailDto)
  findByCode(
    @Param('code') code: string,
    @CurrentUser() user?: AppUser,
  ): Promise<PublicCourseDetailDto> {
    return this.courses.findPublishedByCode(code, user);
  }
}
