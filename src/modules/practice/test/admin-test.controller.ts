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
import { Role } from '../../../common/constants/roles.constant';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AppUser } from '../../../common/types/app-user.type';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import {
  BlueprintReportDto,
  CreateTestDto,
  ReplaceTestItemsDto,
  TestDetailDto,
  TestDto,
  TestQueryDto,
  UpdateTestDto,
} from './dto/test.dto';
import { TestService } from './test.service';

@ApiTags('Admin · Tests')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/tests')
export class AdminTestController {
  constructor(private readonly tests: TestService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đề' })
  @ApiPaginatedResponse(TestDto)
  findAll(@Query() query: TestQueryDto): Promise<PaginatedResult<TestDto>> {
    return this.tests.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết đề, các bộ câu hỏi và báo cáo đủ câu theo định dạng',
  })
  @ApiSuccessResponse(TestDetailDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TestDetailDto> {
    return this.tests.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo đề thành công')
  @ApiOperation({ summary: 'Tạo đề (nháp)' })
  @ApiSuccessResponse(TestDetailDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateTestDto,
    @CurrentUser() user: AppUser,
  ): Promise<TestDetailDto> {
    return this.tests.create(dto, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật đề thành công')
  @ApiOperation({ summary: 'Sửa thông tin đề' })
  @ApiSuccessResponse(TestDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestDto,
    @CurrentUser() user: AppUser,
  ): Promise<TestDetailDto> {
    return this.tests.update(id, dto, user.id);
  }

  @Put(':id/items')
  @ResponseMessage('Đã lưu danh sách bộ câu hỏi')
  @ApiOperation({ summary: 'Thay danh sách bộ câu hỏi của đề' })
  @ApiSuccessResponse(TestDetailDto)
  replaceItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceTestItemsDto,
    @CurrentUser() user: AppUser,
  ): Promise<TestDetailDto> {
    return this.tests.replaceItems(id, dto, user.id);
  }

  @Get(':id/validation')
  @ApiOperation({
    summary: 'Kiểm tra đề theo định dạng kỳ thi, vd "Part 5: 28/30"',
  })
  @ApiSuccessResponse(BlueprintReportDto)
  validate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BlueprintReportDto> {
    return this.tests.validate(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã phát hành đề')
  @ApiOperation({ summary: 'Phát hành, chụp bản hiện tại của các bộ câu hỏi' })
  @ApiSuccessResponse(TestDetailDto)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<TestDetailDto> {
    return this.tests.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã gỡ phát hành đề')
  @ApiOperation({ summary: 'Gỡ khỏi thư viện. Bài đang làm vẫn nộp được' })
  @ApiSuccessResponse(TestDetailDto)
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<TestDetailDto> {
    return this.tests.unpublish(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá đề')
  @ApiOperation({ summary: 'Xoá mềm đề' })
  @ApiSuccessResponse(TestDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<TestDto> {
    return this.tests.remove(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục đề')
  @ApiOperation({ summary: 'Khôi phục đề đã xoá' })
  @ApiSuccessResponse(TestDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<TestDto> {
    return this.tests.restore(id, user.id);
  }
}
