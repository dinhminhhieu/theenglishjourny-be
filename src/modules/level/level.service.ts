import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Level } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { LevelQueryDto } from './dto/level-query.dto';
import { LevelDto } from './dto/level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { toLevelDto } from './level.mapper';

const LEVEL_NOT_FOUND = 'Không tìm thấy level';

/** Level là bảng tra CEFR kèm điểm tương đương: không phân trang, không xoá mềm. */
@Injectable()
export class LevelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: LevelQueryDto): Promise<LevelDto[]> {
    const levels = await this.prisma.level.findMany({
      where: query.includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { cefrLevel: 'asc' }],
    });
    return levels.map(toLevelDto);
  }

  async findOne(id: string): Promise<LevelDto> {
    return toLevelDto(await this.getOrThrow(id));
  }

  async create(dto: CreateLevelDto): Promise<LevelDto> {
    this.assertRanges(dto);
    await this.assertCefrAvailable(dto.cefrLevel);
    const level = await this.prisma.level.create({
      data: {
        cefrLevel: dto.cefrLevel,
        name: dto.name,
        description: dto.description ?? null,
        toeicScoreMin: dto.toeicScoreMin ?? null,
        toeicScoreMax: dto.toeicScoreMax ?? null,
        ieltsMin: dto.ieltsMin ?? null,
        ieltsMax: dto.ieltsMax ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return toLevelDto(level);
  }

  async update(id: string, dto: UpdateLevelDto): Promise<LevelDto> {
    const level = await this.getOrThrow(id);
    if (dto.cefrLevel !== undefined && dto.cefrLevel !== level.cefrLevel) {
      await this.assertCefrAvailable(dto.cefrLevel, id);
    }
    // Kiểm tra khoảng điểm trên dữ liệu sau khi gộp, vì PATCH có thể chỉ gửi một đầu.
    this.assertRanges({
      toeicScoreMin: dto.toeicScoreMin ?? level.toeicScoreMin,
      toeicScoreMax: dto.toeicScoreMax ?? level.toeicScoreMax,
      ieltsMin:
        dto.ieltsMin ??
        (level.ieltsMin === null ? null : Number(level.ieltsMin)),
      ieltsMax:
        dto.ieltsMax ??
        (level.ieltsMax === null ? null : Number(level.ieltsMax)),
    });
    const updated = await this.prisma.level.update({
      where: { id },
      data: dto,
    });
    return toLevelDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    const [users, grammarLessons] = await Promise.all([
      this.prisma.user.count({ where: { levelId: id } }),
      this.prisma.grammarLesson.count({ where: { levelId: id } }),
    ]);
    if (users > 0 || grammarLessons > 0) {
      throw new ConflictException(
        `Level đang được dùng bởi ${users} người dùng và ${grammarLessons} bài ngữ pháp, hãy tắt thay vì xoá`,
      );
    }
    await this.prisma.level.delete({ where: { id } });
  }

  private async getOrThrow(id: string): Promise<Level> {
    const level = await this.prisma.level.findUnique({ where: { id } });
    if (!level) {
      throw new NotFoundException(LEVEL_NOT_FOUND);
    }
    return level;
  }

  private async assertCefrAvailable(
    cefrLevel: Level['cefrLevel'],
    excludeId?: string,
  ) {
    const existing = await this.prisma.level.findFirst({
      where: { cefrLevel, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Đã có level cho mức ${cefrLevel}`);
    }
  }

  private assertRanges(range: {
    toeicScoreMin?: number | null;
    toeicScoreMax?: number | null;
    ieltsMin?: number | null;
    ieltsMax?: number | null;
  }): void {
    if (
      range.toeicScoreMin != null &&
      range.toeicScoreMax != null &&
      range.toeicScoreMin > range.toeicScoreMax
    ) {
      throw new BadRequestException(
        'toeicScoreMin phải nhỏ hơn hoặc bằng toeicScoreMax',
      );
    }
    if (
      range.ieltsMin != null &&
      range.ieltsMax != null &&
      range.ieltsMin > range.ieltsMax
    ) {
      throw new BadRequestException('ieltsMin phải nhỏ hơn hoặc bằng ieltsMax');
    }
  }
}
