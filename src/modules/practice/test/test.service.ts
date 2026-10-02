import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../../common/dto/pagination-meta.dto';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import { LessonStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { toJson } from '../item-set/item-set.mapper';
import {
  BlueprintReportDto,
  CreateTestDto,
  ReplaceTestItemsDto,
  TestDetailDto,
  TestDto,
  TestQueryDto,
  UpdateTestDto,
} from './dto/test.dto';
import {
  releasedStructure,
  TEST_DETAIL_INCLUDE,
  TEST_LIST_INCLUDE,
  TestDetailRow,
  toItemInfos,
  toTestDto,
  toTestItems,
} from './test.mapper';
import {
  buildStructure,
  defaultDuration,
  TestShape,
  validateTestBlueprint,
} from './test-structure';

const NOT_FOUND = 'Không tìm thấy đề';

/** Quản lý đề cho admin: ghép bộ câu hỏi, kiểm tra theo định dạng kỳ thi, phát hành. */
@Injectable()
export class TestService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TestQueryDto): Promise<PaginatedResult<TestDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.TestWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.exam ? { exam: query.exam } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.skill ? { skill: query.skill } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isListed === undefined ? {} : { isListed: query.isListed }),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.test.count({ where }),
      this.prisma.test.findMany({
        where,
        include: TEST_LIST_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toTestDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async findOne(id: string): Promise<TestDetailDto> {
    const row = await this.getDetail(id, true);
    return {
      ...toTestDto(row),
      items: toTestItems(row),
      blueprint: validateTestBlueprint(this.shapeOf(row), toItemInfos(row), {
        requireReleases: true,
      }),
    };
  }

  async create(dto: CreateTestDto, actorId: string): Promise<TestDetailDto> {
    await this.assertCodeAvailable(dto.code);
    const created = await this.prisma.test.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        exam: dto.exam,
        module: dto.module ?? null,
        kind: dto.kind,
        skill: dto.skill ?? null,
        durationMinutes: dto.durationMinutes ?? null,
        isListed: dto.isListed ?? true,
        xpCost: dto.xpCost ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: { id: true },
    });
    if (dto.itemSetIds?.length) {
      await this.replaceItems(
        created.id,
        { itemSetIds: dto.itemSetIds },
        actorId,
      );
    }
    return this.findOne(created.id);
  }

  async update(
    id: string,
    dto: UpdateTestDto,
    actorId: string,
  ): Promise<TestDetailDto> {
    const current = await this.getDetail(id);
    if (dto.code !== undefined && dto.code !== current.code) {
      await this.assertCodeAvailable(dto.code, id);
    }
    await this.prisma.test.update({
      where: { id },
      data: { ...dto, revision: { increment: 1 }, updatedBy: actorId },
    });
    return this.findOne(id);
  }

  /** Thay danh sách bộ câu hỏi. Bộ phải còn tồn tại và cùng kỳ thi; điều kiện đủ câu kiểm tra khi phát hành. */
  async replaceItems(
    id: string,
    dto: ReplaceTestItemsDto,
    actorId: string,
  ): Promise<TestDetailDto> {
    const test = await this.getDetail(id);
    const itemSets = await this.prisma.itemSet.findMany({
      where: { id: { in: dto.itemSetIds }, deletedAt: null },
      select: { id: true, code: true, exam: true },
    });
    const found = new Map(itemSets.map((itemSet) => [itemSet.id, itemSet]));
    const errors: string[] = [];
    dto.itemSetIds.forEach((itemSetId, index) => {
      const itemSet = found.get(itemSetId);
      if (!itemSet) {
        errors.push(
          `itemSetIds[${index}]: bộ câu hỏi không tồn tại hoặc đã xoá`,
        );
      } else if (itemSet.exam !== test.exam) {
        errors.push(
          `itemSetIds[${index}]: ${itemSet.code} thuộc ${itemSet.exam}, đề là ${test.exam}`,
        );
      }
    });
    if (errors.length > 0) {
      throw new BadRequestException({ message: errors });
    }
    await this.prisma.$transaction([
      this.prisma.testItem.deleteMany({ where: { testId: id } }),
      this.prisma.testItem.createMany({
        data: dto.itemSetIds.map((itemSetId, sortOrder) => ({
          testId: id,
          itemSetId,
          sortOrder,
        })),
      }),
      this.prisma.test.update({
        where: { id },
        data: { revision: { increment: 1 }, updatedBy: actorId },
      }),
    ]);
    return this.findOne(id);
  }

  async validate(id: string): Promise<BlueprintReportDto> {
    const row = await this.getDetail(id, true);
    return validateTestBlueprint(this.shapeOf(row), toItemInfos(row), {
      requireReleases: true,
    });
  }

  /**
   * Phát hành: chụp cấu trúc đề với bản phát hành hiện tại của từng bộ câu hỏi.
   * Không có gì thay đổi so với bản đang chạy thì không tạo bản mới.
   */
  async publish(id: string, actorId: string): Promise<TestDetailDto> {
    const row = await this.getDetail(id);
    const shape = this.shapeOf(row);
    const infos = toItemInfos(row);
    const report = validateTestBlueprint(shape, infos, {
      requireReleases: true,
    });
    if (!report.ok) {
      throw new BadRequestException({ message: report.errors });
    }
    const structure = buildStructure(
      shape,
      infos.map((info) => ({ ...info, releaseId: info.releaseId as string })),
    );
    const durationMinutes = row.durationMinutes ?? defaultDuration(structure);
    const current = row.currentRelease;
    const unchanged =
      current !== null &&
      JSON.stringify(releasedStructure(current.structure)) ===
        JSON.stringify(structure) &&
      row.publishedRevision === row.revision;
    if (unchanged) {
      if (row.status !== LessonStatus.PUBLISHED) {
        await this.prisma.test.update({
          where: { id },
          data: { status: LessonStatus.PUBLISHED, updatedBy: actorId },
        });
      }
      return this.findOne(id);
    }
    const questionCount = infos.reduce(
      (total, info) => total + info.questionCount,
      0,
    );
    const totalMarks = infos.reduce(
      (total, info) => total + info.totalMarks,
      0,
    );
    await this.prisma.$transaction(async (tx) => {
      const latest = await tx.testRelease.aggregate({
        where: { testId: id },
        _max: { version: true },
      });
      const release = await tx.testRelease.create({
        data: {
          testId: id,
          version: (latest._max.version ?? 0) + 1,
          structure: toJson(structure),
          durationMinutes,
          questionCount,
          totalMarks,
          createdBy: actorId,
        },
        select: { id: true },
      });
      await tx.test.update({
        where: { id },
        data: {
          currentReleaseId: release.id,
          status: LessonStatus.PUBLISHED,
          publishedAt: row.publishedAt ?? new Date(),
          publishedRevision: row.revision,
          updatedBy: actorId,
        },
      });
    });
    return this.findOne(id);
  }

  async unpublish(id: string, actorId: string): Promise<TestDetailDto> {
    await this.getDetail(id);
    await this.prisma.test.update({
      where: { id },
      data: { status: LessonStatus.DRAFT, updatedBy: actorId },
    });
    return this.findOne(id);
  }

  async remove(id: string, actorId: string): Promise<TestDto> {
    await this.getDetail(id);
    const row = await this.prisma.test.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: LessonStatus.DRAFT,
        updatedBy: actorId,
      },
      include: TEST_LIST_INCLUDE,
    });
    return toTestDto(row);
  }

  async restore(id: string, actorId: string): Promise<TestDto> {
    const deleted = await this.prisma.test.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy đề đã xoá');
    }
    const row = await this.prisma.test.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
      include: TEST_LIST_INCLUDE,
    });
    return toTestDto(row);
  }

  private shapeOf(row: TestDetailRow): TestShape {
    return {
      exam: row.exam,
      module: row.module,
      kind: row.kind,
      skill: row.skill,
    };
  }

  private async getDetail(
    id: string,
    allowDeleted = false,
  ): Promise<TestDetailRow> {
    const row = await this.prisma.test.findFirst({
      where: { id, ...(allowDeleted ? {} : { deletedAt: null }) },
      include: TEST_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(NOT_FOUND);
    }
    return row;
  }

  private async assertCodeAvailable(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.test.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `Mã ${code} thuộc một đề đã xoá, hãy khôi phục hoặc dùng mã khác`
          : `Mã ${code} đã tồn tại`,
      );
    }
  }
}
