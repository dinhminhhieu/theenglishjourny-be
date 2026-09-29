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
import { ApiSuccessResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateLevelDto } from './dto/create-level.dto';
import { LevelQueryDto } from './dto/level-query.dto';
import { LevelDto } from './dto/level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { LevelService } from './level.service';

@ApiTags('Admin · Levels')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/levels')
export class AdminLevelController {
  constructor(private readonly levels: LevelService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách level' })
  @ApiSuccessResponse(LevelDto, { isArray: true })
  findAll(@Query() query: LevelQueryDto): Promise<LevelDto[]> {
    return this.levels.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết level' })
  @ApiSuccessResponse(LevelDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LevelDto> {
    return this.levels.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo level thành công')
  @ApiOperation({ summary: 'Tạo level' })
  @ApiSuccessResponse(LevelDto, { status: HttpStatus.CREATED })
  create(@Body() dto: CreateLevelDto): Promise<LevelDto> {
    return this.levels.create(dto);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật level thành công')
  @ApiOperation({ summary: 'Cập nhật level' })
  @ApiSuccessResponse(LevelDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLevelDto,
  ): Promise<LevelDto> {
    return this.levels.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã xoá level')
  @ApiOperation({ summary: 'Xoá level (chỉ khi chưa được dùng)' })
  @ApiSuccessResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<null> {
    await this.levels.remove(id);
    return null;
  }
}
