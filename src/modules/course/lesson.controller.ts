import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import type { AppUser } from '../../common/types/app-user.type';
import { PublicLessonDetailDto } from './dto/public-course.dto';
import { LessonService } from './lesson.service';

@ApiTags('Courses')
@ApiBearerAuth()
@OptionalAuth()
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessons: LessonService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Nội dung unit kèm các block',
    description:
      'Khoá mở thì khách cũng đọc được. Khoá phải mua: khách nhận 401, người chưa ghi danh hoặc hết hạn nhận 403.',
  })
  @ApiSuccessResponse(PublicLessonDetailDto)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AppUser,
  ): Promise<PublicLessonDetailDto> {
    return this.lessons.findPublishedById(id, user);
  }
}
