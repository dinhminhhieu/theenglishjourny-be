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
  CreateItemSetDto,
  ImportItemSetsDto,
  ImportResultDto,
  ItemSetDetailDto,
  ItemSetDto,
  ItemSetPreviewDto,
  ItemSetQueryDto,
  ItemSetReleaseDto,
  ReplaceItemSetQuestionsDto,
  UpdateItemSetDto,
} from './dto/item-set.dto';
import { ItemSetService } from './item-set.service';

@ApiTags('Admin · Question bank')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/item-sets')
export class AdminItemSetController {
  constructor(private readonly itemSets: ItemSetService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách bộ câu hỏi, lọc theo kỳ thi, kỹ năng, part, dạng câu',
  })
  @ApiPaginatedResponse(ItemSetDto)
  findAll(
    @Query() query: ItemSetQueryDto,
  ): Promise<PaginatedResult<ItemSetDto>> {
    return this.itemSets.findAll(query);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã nhập bộ câu hỏi')
  @ApiOperation({ summary: 'Nhập nhiều bộ câu hỏi, trùng code thì cập nhật' })
  @ApiSuccessResponse(ImportResultDto)
  importMany(
    @Body() dto: ImportItemSetsDto,
    @CurrentUser() user: AppUser,
  ): Promise<ImportResultDto> {
    return this.itemSets.importMany(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết bộ câu hỏi, gồm đáp án' })
  @ApiSuccessResponse(ItemSetDetailDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ItemSetDetailDto> {
    return this.itemSets.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo bộ câu hỏi thành công')
  @ApiOperation({ summary: 'Tạo bộ câu hỏi (nháp), có thể kèm câu hỏi' })
  @ApiSuccessResponse(ItemSetDetailDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateItemSetDto,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDetailDto> {
    return this.itemSets.create(dto, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật bộ câu hỏi thành công')
  @ApiOperation({ summary: 'Sửa thông tin chung, bài đọc, audio, transcript' })
  @ApiSuccessResponse(ItemSetDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemSetDto,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDetailDto> {
    return this.itemSets.update(id, dto, user.id);
  }

  @Put(':id/questions')
  @ResponseMessage('Đã lưu câu hỏi')
  @ApiOperation({ summary: 'Thay toàn bộ nhóm và câu hỏi' })
  @ApiSuccessResponse(ItemSetDetailDto)
  replaceQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceItemSetQuestionsDto,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDetailDto> {
    return this.itemSets.replaceQuestions(id, dto, user.id);
  }

  @Get(':id/preview')
  @ApiOperation({
    summary: 'Xem như học viên, kèm những điểm còn thiếu để phát hành',
  })
  @ApiSuccessResponse(ItemSetPreviewDto)
  preview(@Param('id', ParseUUIDPipe) id: string): Promise<ItemSetPreviewDto> {
    return this.itemSets.preview(id);
  }

  @Get(':id/releases')
  @ApiOperation({ summary: 'Các bản đã phát hành' })
  @ApiSuccessResponse(ItemSetReleaseDto, { isArray: true })
  releases(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ItemSetReleaseDto[]> {
    return this.itemSets.releases(id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Xuất đúng định dạng nhập' })
  @ApiSuccessResponse(CreateItemSetDto)
  export(@Param('id', ParseUUIDPipe) id: string): Promise<CreateItemSetDto> {
    return this.itemSets.export(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã phát hành bộ câu hỏi')
  @ApiOperation({ summary: 'Phát hành, tạo bản chụp mới nếu có thay đổi' })
  @ApiSuccessResponse(ItemSetDetailDto)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDetailDto> {
    return this.itemSets.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã gỡ phát hành')
  @ApiOperation({
    summary: 'Gỡ khỏi phần luyện tập. Đề đã phát hành vẫn giữ bản cũ',
  })
  @ApiSuccessResponse(ItemSetDetailDto)
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDetailDto> {
    return this.itemSets.unpublish(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá bộ câu hỏi')
  @ApiOperation({ summary: 'Xoá mềm, chặn nếu đang nằm trong đề' })
  @ApiSuccessResponse(ItemSetDto)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDto> {
    return this.itemSets.remove(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã khôi phục bộ câu hỏi')
  @ApiOperation({ summary: 'Khôi phục bộ đã xoá' })
  @ApiSuccessResponse(ItemSetDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AppUser,
  ): Promise<ItemSetDto> {
    return this.itemSets.restore(id, user.id);
  }
}
