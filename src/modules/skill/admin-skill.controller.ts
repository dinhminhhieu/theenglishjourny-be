import {
  Body,
  Controller,
  Get,
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
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { SkillDto } from './dto/skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillService } from './skill.service';

@ApiTags('Admin · Skills')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/skills')
export class AdminSkillController {
  constructor(private readonly skills: SkillService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kỹ năng' })
  @ApiSuccessResponse(SkillDto, { isArray: true })
  findAll(@Query() query: SkillQueryDto): Promise<SkillDto[]> {
    return this.skills.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kỹ năng' })
  @ApiSuccessResponse(SkillDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SkillDto> {
    return this.skills.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo kỹ năng thành công')
  @ApiOperation({ summary: 'Tạo kỹ năng' })
  @ApiSuccessResponse(SkillDto, { status: HttpStatus.CREATED })
  create(@Body() dto: CreateSkillDto): Promise<SkillDto> {
    return this.skills.create(dto);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật kỹ năng thành công')
  @ApiOperation({ summary: 'Cập nhật kỹ năng' })
  @ApiSuccessResponse(SkillDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillDto> {
    return this.skills.update(id, dto);
  }
}
