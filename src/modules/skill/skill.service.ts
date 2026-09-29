import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Skill } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { SkillDto } from './dto/skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { toSkillDto } from './skill.mapper';

const SKILL_NOT_FOUND = 'Không tìm thấy kỹ năng';

/** Kỹ năng là bảng phân loại nhỏ: không phân trang, không xoá mềm, ẩn bằng isActive. */
@Injectable()
export class SkillService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SkillQueryDto): Promise<SkillDto[]> {
    const skills = await this.prisma.skill.findMany({
      where: query.includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return skills.map(toSkillDto);
  }

  async findOne(id: string): Promise<SkillDto> {
    return toSkillDto(await this.getOrThrow(id));
  }

  async create(dto: CreateSkillDto): Promise<SkillDto> {
    await this.assertNameAvailable(dto.name);
    const skill = await this.prisma.skill.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return toSkillDto(skill);
  }

  async update(id: string, dto: UpdateSkillDto): Promise<SkillDto> {
    const skill = await this.getOrThrow(id);
    if (dto.name !== undefined && dto.name !== skill.name) {
      await this.assertNameAvailable(dto.name, id);
    }
    const updated = await this.prisma.skill.update({
      where: { id },
      data: dto,
    });
    return toSkillDto(updated);
  }

  /** Xoá cứng, chỉ khi chưa có block bài học nào dùng. Có thì tắt isActive thay vì xoá. */
  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    const inUse = await this.prisma.lessonBlock.count({
      where: { skillId: id },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Kỹ năng đang được dùng trong ${inUse} block bài học, hãy tắt thay vì xoá`,
      );
    }
    await this.prisma.skill.delete({ where: { id } });
  }

  private async getOrThrow(id: string): Promise<Skill> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      throw new NotFoundException(SKILL_NOT_FOUND);
    }
    return skill;
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.skill.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Tên kỹ năng đã tồn tại');
    }
  }
}
