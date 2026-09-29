import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGrammarCategoryDto,
  GrammarCategoryDto,
  GrammarCategoryQueryDto,
  UpdateGrammarCategoryDto,
} from './dto/grammar-category.dto';
import { GrammarCategoryRow, toGrammarCategoryDto } from './grammar.mapper';

const CATEGORY_NOT_FOUND = 'Không tìm thấy chủ điểm ngữ pháp';

const CATEGORY_INCLUDE = {
  _count: { select: { lessons: { where: { deletedAt: null } } } },
} satisfies Prisma.GrammarCategoryInclude;

@Injectable()
export class GrammarCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: GrammarCategoryQueryDto,
  ): Promise<PaginatedResult<GrammarCategoryDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.GrammarCategoryWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.grammarCategory.count({ where }),
      this.prisma.grammarCategory.findMany({
        where,
        include: CATEGORY_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toGrammarCategoryDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async findOne(id: string): Promise<GrammarCategoryDto> {
    const row = await this.prisma.grammarCategory.findUnique({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(CATEGORY_NOT_FOUND);
    }
    return toGrammarCategoryDto(row);
  }

  async create(
    dto: CreateGrammarCategoryDto,
    actorId: string,
  ): Promise<GrammarCategoryDto> {
    await this.assertTitleAvailable(dto.title);
    const row = await this.prisma.grammarCategory.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: CATEGORY_INCLUDE,
    });
    return toGrammarCategoryDto(row);
  }

  async update(
    id: string,
    dto: UpdateGrammarCategoryDto,
    actorId: string,
  ): Promise<GrammarCategoryDto> {
    const current = await this.getActiveOrThrow(id);
    if (dto.title !== undefined && dto.title !== current.title) {
      await this.assertTitleAvailable(dto.title, id);
    }
    const row = await this.prisma.grammarCategory.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
      include: CATEGORY_INCLUDE,
    });
    return toGrammarCategoryDto(row);
  }

  async remove(id: string, actorId: string): Promise<GrammarCategoryDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.grammarCategory.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
      include: CATEGORY_INCLUDE,
    });
    return toGrammarCategoryDto(row);
  }

  async restore(id: string, actorId: string): Promise<GrammarCategoryDto> {
    const deleted = await this.prisma.grammarCategory.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy chủ điểm đã xoá');
    }
    const row = await this.prisma.grammarCategory.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
      include: CATEGORY_INCLUDE,
    });
    return toGrammarCategoryDto(row);
  }

  /** Dùng bởi lesson service để kiểm tra chủ điểm còn dùng được. */
  async assertExists(id: string): Promise<void> {
    await this.getActiveOrThrow(id);
  }

  private async getActiveOrThrow(id: string): Promise<GrammarCategoryRow> {
    const row = await this.prisma.grammarCategory.findFirst({
      where: { id, deletedAt: null },
      include: CATEGORY_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(CATEGORY_NOT_FOUND);
    }
    return row;
  }

  private async assertTitleAvailable(title: string, excludeId?: string) {
    const existing = await this.prisma.grammarCategory.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? 'Tiêu đề trùng với một chủ điểm đã xoá, hãy khôi phục hoặc dùng tiêu đề khác'
          : 'Tiêu đề chủ điểm đã tồn tại',
      );
    }
  }
}
