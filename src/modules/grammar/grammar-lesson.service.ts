import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  cefrLevelsFrom,
  cefrLevelsUpTo,
  isCefrRangeValid,
} from '../../common/constants/cefr.constant';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { CefrLevel, LessonStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGrammarLessonDto,
  GrammarLessonDetailDto,
  GrammarLessonDto,
  GrammarLessonQueryDto,
  UpdateGrammarLessonDto,
} from './dto/grammar-lesson.dto';
import { ReplaceGrammarSectionsDto } from './dto/grammar-section.dto';
import {
  PublicGrammarLessonDetailDto,
  PublicGrammarLessonDto,
  PublicGrammarLessonQueryDto,
} from './dto/public-grammar.dto';
import { GrammarCategoryService } from './grammar-category.service';
import {
  GrammarLessonRow,
  toGrammarLessonDetailDto,
  toGrammarLessonDto,
  toPublicGrammarLessonDetailDto,
  toPublicGrammarLessonDto,
} from './grammar.mapper';
import { validateSectionContent } from './section-content.validator';

const LESSON_NOT_FOUND = 'Không tìm thấy bài ngữ pháp';

const LESSON_INCLUDE = {
  _count: { select: { sections: true } },
} satisfies Prisma.GrammarLessonInclude;

const LESSON_DETAIL_INCLUDE = {
  ...LESSON_INCLUDE,
  sections: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.GrammarLessonInclude;

const PUBLIC_LESSON_DETAIL_INCLUDE = {
  ...LESSON_DETAIL_INCLUDE,
  category: { select: { title: true } },
} satisfies Prisma.GrammarLessonInclude;

/** Người học chỉ thấy bài đã phát hành, chưa xoá, thuộc chủ điểm đang bật. */
const PUBLISHED_LESSON_WHERE = {
  deletedAt: null,
  status: LessonStatus.PUBLISHED,
  category: { deletedAt: null, isActive: true },
} satisfies Prisma.GrammarLessonWhereInput;

@Injectable()
export class GrammarLessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: GrammarCategoryService,
  ) {}

  async findAll(
    query: GrammarLessonQueryDto,
  ): Promise<PaginatedResult<GrammarLessonDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.GrammarLessonWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.grammarCategoryId
        ? { grammarCategoryId: query.grammarCategoryId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.grammarLesson.count({ where }),
      this.prisma.grammarLesson.findMany({
        where,
        include: LESSON_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toGrammarLessonDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async findPublished(
    query: PublicGrammarLessonQueryDto,
  ): Promise<PaginatedResult<PublicGrammarLessonDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.GrammarLessonWhereInput = {
      ...PUBLISHED_LESSON_WHERE,
      ...(query.grammarCategoryId
        ? { grammarCategoryId: query.grammarCategoryId }
        : {}),
      ...(query.tier ? { tier: query.tier } : {}),
      ...(query.level
        ? {
            levelFrom: { in: cefrLevelsUpTo(query.level) },
            levelTo: { in: cefrLevelsFrom(query.level) },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.grammarLesson.count({ where }),
      this.prisma.grammarLesson.findMany({
        where,
        include: LESSON_INCLUDE,
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toPublicGrammarLessonDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  /** Mã bài không phân biệt hoa thường trên URL. */
  async findPublishedByCode(
    code: string,
  ): Promise<PublicGrammarLessonDetailDto> {
    const row = await this.prisma.grammarLesson.findFirst({
      where: { ...PUBLISHED_LESSON_WHERE, code: code.trim().toUpperCase() },
      include: PUBLIC_LESSON_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }
    return toPublicGrammarLessonDetailDto(row);
  }

  async findOne(id: string): Promise<GrammarLessonDetailDto> {
    const row = await this.prisma.grammarLesson.findUnique({
      where: { id },
      include: LESSON_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }
    return toGrammarLessonDetailDto(row);
  }

  async create(
    dto: CreateGrammarLessonDto,
    actorId: string,
  ): Promise<GrammarLessonDetailDto> {
    await this.categories.assertExists(dto.grammarCategoryId);
    await this.assertCodeAvailable(dto.code);
    this.assertCefrRange(dto.levelFrom, dto.levelTo);
    await this.assertLevelExists(dto.levelId);

    const row = await this.prisma.grammarLesson.create({
      data: {
        grammarCategoryId: dto.grammarCategoryId,
        code: dto.code,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        summary: dto.summary ?? null,
        tier: dto.tier,
        levelFrom: dto.levelFrom,
        levelTo: dto.levelTo,
        levelId: dto.levelId ?? null,
        highlights: toJson(dto.highlights ?? []),
        estimatedMinutes: dto.estimatedMinutes ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: LESSON_DETAIL_INCLUDE,
    });
    return toGrammarLessonDetailDto(row);
  }

  async update(
    id: string,
    dto: UpdateGrammarLessonDto,
    actorId: string,
  ): Promise<GrammarLessonDetailDto> {
    const current = await this.getActiveOrThrow(id);
    if (
      dto.grammarCategoryId &&
      dto.grammarCategoryId !== current.grammarCategoryId
    ) {
      await this.categories.assertExists(dto.grammarCategoryId);
    }
    if (dto.code !== undefined && dto.code !== current.code) {
      await this.assertCodeAvailable(dto.code, id);
    }
    this.assertCefrRange(
      dto.levelFrom ?? current.levelFrom,
      dto.levelTo ?? current.levelTo,
    );
    await this.assertLevelExists(dto.levelId);

    const { highlights, ...rest } = dto;
    const row = await this.prisma.grammarLesson.update({
      where: { id },
      data: {
        ...rest,
        ...(highlights === undefined ? {} : { highlights: toJson(highlights) }),
        updatedBy: actorId,
      },
      include: LESSON_DETAIL_INCLUDE,
    });
    return toGrammarLessonDetailDto(row);
  }

  async remove(id: string, actorId: string): Promise<GrammarLessonDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.grammarLesson.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
      include: LESSON_INCLUDE,
    });
    return toGrammarLessonDto(row);
  }

  async restore(id: string, actorId: string): Promise<GrammarLessonDto> {
    const deleted = await this.prisma.grammarLesson.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy bài đã xoá');
    }
    const row = await this.prisma.grammarLesson.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
      include: LESSON_INCLUDE,
    });
    return toGrammarLessonDto(row);
  }

  /** Chỉ phát hành được bài đã có ít nhất một section. */
  async publish(id: string, actorId: string): Promise<GrammarLessonDto> {
    const current = await this.getActiveOrThrow(id);
    if (current._count.sections === 0) {
      throw new BadRequestException(
        'Bài chưa có nội dung, hãy thêm section trước khi phát hành',
      );
    }
    const row = await this.prisma.grammarLesson.update({
      where: { id },
      data: {
        status: LessonStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
        updatedBy: actorId,
      },
      include: LESSON_INCLUDE,
    });
    return toGrammarLessonDto(row);
  }

  async unpublish(id: string, actorId: string): Promise<GrammarLessonDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.grammarLesson.update({
      where: { id },
      data: { status: LessonStatus.DRAFT, updatedBy: actorId },
      include: LESSON_INCLUDE,
    });
    return toGrammarLessonDto(row);
  }

  /**
   * Thay toàn bộ section của bài trong một transaction: có id thì cập nhật,
   * không id thì tạo, id không còn trong mảng thì xoá. Thứ tự mảng = sortOrder.
   */
  async replaceSections(
    id: string,
    dto: ReplaceGrammarSectionsDto,
    actorId: string,
  ): Promise<GrammarLessonDetailDto> {
    await this.getActiveOrThrow(id);

    const codes = new Set<string>();
    for (const section of dto.sections) {
      if (codes.has(section.code)) {
        throw new BadRequestException(
          `Mã section "${section.code}" bị trùng trong bài`,
        );
      }
      codes.add(section.code);
    }

    const existing = await this.prisma.grammarSection.findMany({
      where: { grammarLessonId: id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((section) => section.id));
    const incomingIds = new Set<string>();
    for (const section of dto.sections) {
      if (section.id) {
        if (!existingIds.has(section.id)) {
          throw new BadRequestException(
            `Section ${section.id} không thuộc bài này`,
          );
        }
        incomingIds.add(section.id);
      }
    }

    const prepared = dto.sections.map((section, index) => ({
      ...section,
      sortOrder: index,
      content: validateSectionContent(
        section.type,
        section.content,
        `sections[${index}] (code ${section.code})`,
      ),
    }));

    const toDelete = [...existingIds].filter(
      (existingId) => !incomingIds.has(existingId),
    );

    await this.prisma.$transaction([
      ...(toDelete.length > 0
        ? [
            this.prisma.grammarSection.deleteMany({
              where: { id: { in: toDelete } },
            }),
          ]
        : []),
      // Đặt code tạm để tránh vi phạm unique (lessonId, code) khi hai section đổi chỗ code cho nhau.
      ...prepared
        .filter((section) => section.id)
        .map((section) =>
          this.prisma.grammarSection.update({
            where: { id: section.id },
            data: { code: `__tmp__${section.id}` },
          }),
        ),
      ...prepared.map((section) =>
        section.id
          ? this.prisma.grammarSection.update({
              where: { id: section.id },
              data: {
                type: section.type,
                code: section.code,
                title: section.title,
                subtitle: section.subtitle ?? null,
                content: toJson(section.content),
                sortOrder: section.sortOrder,
              },
            })
          : this.prisma.grammarSection.create({
              data: {
                grammarLessonId: id,
                type: section.type,
                code: section.code,
                title: section.title,
                subtitle: section.subtitle ?? null,
                content: toJson(section.content),
                sortOrder: section.sortOrder,
              },
            }),
      ),
      this.prisma.grammarLesson.update({
        where: { id },
        data: { updatedBy: actorId },
      }),
    ]);

    return this.findOne(id);
  }

  private async getActiveOrThrow(id: string): Promise<GrammarLessonRow> {
    const row = await this.prisma.grammarLesson.findFirst({
      where: { id, deletedAt: null },
      include: LESSON_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }
    return row;
  }

  private async assertCodeAvailable(code: string, excludeId?: string) {
    const existing = await this.prisma.grammarLesson.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `Mã ${code} thuộc một bài đã xoá, hãy khôi phục hoặc dùng mã khác`
          : `Mã ${code} đã tồn tại`,
      );
    }
  }

  private assertCefrRange(from: CefrLevel, to: CefrLevel): void {
    if (!isCefrRangeValid(from, to)) {
      throw new BadRequestException('levelFrom phải nhỏ hơn hoặc bằng levelTo');
    }
  }

  private async assertLevelExists(levelId?: string | null): Promise<void> {
    if (!levelId) return;
    const level = await this.prisma.level.findUnique({
      where: { id: levelId },
      select: { id: true },
    });
    if (!level) {
      throw new BadRequestException('levelId không tồn tại');
    }
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
