import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { AssetService } from './asset.service';
import {
  AssetDto,
  AssetQueryDto,
  CompleteUploadDto,
  CreateUploadDto,
  UploadTicketDto,
} from './dto/upload.dto';

/**
 * Upload 3 bước: xin link (POST), trình duyệt PUT file thẳng lên storage, rồi xác nhận (POST :id/complete).
 * File không đi qua API nên upload audio lớn không làm nghẽn server.
 */
@ApiTags('Admin · Uploads')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/uploads')
export class AdminUploadController {
  constructor(private readonly assets: AssetService) {}

  @Post()
  @ResponseMessage('Đã cấp link upload')
  @ApiOperation({ summary: 'Xin link upload file (bước 1)' })
  @ApiSuccessResponse(UploadTicketDto, { status: HttpStatus.CREATED })
  create(
    @Body() dto: CreateUploadDto,
    @CurrentUser() user: AppUser,
  ): Promise<UploadTicketDto> {
    return this.assets.createUpload(dto, user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Upload thành công')
  @ApiOperation({ summary: 'Xác nhận đã upload xong (bước 3)' })
  @ApiSuccessResponse(AssetDto)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteUploadDto,
  ): Promise<AssetDto> {
    return this.assets.complete(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Thư viện file' })
  @ApiPaginatedResponse(AssetDto)
  findAll(@Query() query: AssetQueryDto): Promise<PaginatedResult<AssetDto>> {
    return this.assets.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết file kèm link xem' })
  @ApiSuccessResponse(AssetDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AssetDto> {
    return this.assets.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá file')
  @ApiOperation({ summary: 'Xoá file chưa được dùng' })
  @ApiSuccessResponse(AssetDto)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<AssetDto> {
    return this.assets.remove(id);
  }
}
