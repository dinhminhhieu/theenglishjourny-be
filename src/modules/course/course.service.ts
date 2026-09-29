import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isCefrRangeValid } from '../../common/constants/cefr.constant';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import type { AppUser } from '../../common/types/app-user.type';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { LessonStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseAccessService, NO_ACCESS } from './course-access.service';
import {
  COURSE_DETAIL_INCLUDE,
  COURSE_INCLUDE,
  CourseRow,
  PUBLIC_COURSE_DETAIL_INCLUDE,
  PUBLIC_COURSE_INCLUDE,
  PUBLISHED_COURSE_WHERE,
  toCourseDetailDto,
  toCourseDto,
  toPublicCourseDetailDto,
  toPublicCourseDto,
} from './course.mapper';
import {
  CourseDetailDto,
  CourseDto,
  CourseQueryDto,
  CreateCourseDto,
  UpdateCourseDto,
} from './dto/course.dto';
import {
  PublicCourseDetailDto,
  PublicCourseDto,
  PublicCourseQueryDto,
} from './dto/public-course.dto';

const COURSE_NOT_FOUND = 'Không tìm thấy khoá học';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
  ) {}

  async findAll(query: CourseQueryDto): Promise<PaginatedResult<CourseDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.CourseWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isLocked === undefined ? {} : { isLocked: query.isLocked }),
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
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: COURSE_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toCourseDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  /** Danh mục cho người học: chỉ khoá đã phát hành, kèm quyền học của người gọi. */
  async findPublished(
    query: PublicCourseQueryDto,
    user?: AppUser,
  ): Promise<PaginatedResult<PublicCourseDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.CourseWhereInput = {
      ...PUBLISHED_COURSE_WHERE,
      ...(query.isLocked === undefined ? {} : { isLocked: query.isLocked }),
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
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: PUBLIC_COURSE_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    const access = await this.access.resolveMany(rows, user);
    return {
      items: rows.map((row) =>
        toPublicCourseDto(row, access.get(row.id) ?? NO_ACCESS),
      ),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  /** Trang giới thiệu khoá: ai cũng xem được, kể cả khoá phải mua. */
  async findPublishedByCode(
    code: string,
    user?: AppUser,
  ): Promise<PublicCourseDetailDto> {
    const row = await this.prisma.course.findFirst({
      where: { ...PUBLISHED_COURSE_WHERE, code: code.trim().toUpperCase() },
      include: PUBLIC_COURSE_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(COURSE_NOT_FOUND);
    }
    return toPublicCourseDetailDto(row, await this.access.resolve(row, user));
  }

  async findOne(id: string): Promise<CourseDetailDto> {
    const row = await this.prisma.course.findUnique({
      where: { id },
      include: COURSE_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(COURSE_NOT_FOUND);
    }
    return toCourseDetailDto(row);
  }

  async create(
    dto: CreateCourseDto,
    actorId: string,
  ): Promise<CourseDetailDto> {
    await this.assertCodeAvailable(dto.code);
    this.assertRanges(dto);
    const row = await this.prisma.course.create({
      data: {
        code: dto.code,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        description: dto.description ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        levelFrom: dto.levelFrom ?? null,
        levelTo: dto.levelTo ?? null,
        targetBandFrom: dto.targetBandFrom ?? null,
        targetBandTo: dto.targetBandTo ?? null,
        isLocked: dto.isLocked ?? true,
        price: dto.price ?? null,
        currency: dto.currency ?? 'VND',
        accessDays: dto.accessDays ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: COURSE_DETAIL_INCLUDE,
    });
    return toCourseDetailDto(row);
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    actorId: string,
  ): Promise<CourseDetailDto> {
    const current = await this.getActiveOrThrow(id);
    if (dto.code !== undefined && dto.code !== current.code) {
      await this.assertCodeAvailable(dto.code, id);
    }
    this.assertRanges({
      levelFrom:
        dto.levelFrom === undefined ? current.levelFrom : dto.levelFrom,
      levelTo: dto.levelTo === undefined ? current.levelTo : dto.levelTo,
      targetBandFrom:
        dto.targetBandFrom === undefined
          ? current.targetBandFrom === null
            ? null
            : Number(current.targetBandFrom)
          : dto.targetBandFrom,
      targetBandTo:
        dto.targetBandTo === undefined
          ? current.targetBandTo === null
            ? null
            : Number(current.targetBandTo)
          : dto.targetBandTo,
    });
    const row = await this.prisma.course.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
      include: COURSE_DETAIL_INCLUDE,
    });
    return toCourseDetailDto(row);
  }

  async remove(id: string, actorId: string): Promise<CourseDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
      include: COURSE_INCLUDE,
    });
    return toCourseDto(row);
  }

  async restore(id: string, actorId: string): Promise<CourseDto> {
    const deleted = await this.prisma.course.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy khoá học đã xoá');
    }
    const row = await this.prisma.course.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
      include: COURSE_INCLUDE,
    });
    return toCourseDto(row);
  }

  /** Chỉ phát hành khoá đã có ít nhất một unit. */
  async publish(id: string, actorId: string): Promise<CourseDto> {
    const current = await this.getActiveOrThrow(id);
    if (current._count.lessons === 0) {
      throw new BadRequestException(
        'Khoá chưa có unit nào, hãy thêm unit trước khi phát hành',
      );
    }
    const row = await this.prisma.course.update({
      where: { id },
      data: {
        status: LessonStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
        updatedBy: actorId,
      },
      include: COURSE_INCLUDE,
    });
    return toCourseDto(row);
  }

  async unpublish(id: string, actorId: string): Promise<CourseDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.course.update({
      where: { id },
      data: { status: LessonStatus.DRAFT, updatedBy: actorId },
      include: COURSE_INCLUDE,
    });
    return toCourseDto(row);
  }

  /** Dùng bởi lesson service. */
  async assertExists(id: string): Promise<void> {
    await this.getActiveOrThrow(id);
  }

  private async getActiveOrThrow(id: string): Promise<CourseRow> {
    const row = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: COURSE_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(COURSE_NOT_FOUND);
    }
    return row;
  }

  private async assertCodeAvailable(code: string, excludeId?: string) {
    const existing = await this.prisma.course.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `Mã ${code} thuộc một khoá đã xoá, hãy khôi phục hoặc dùng mã khác`
          : `Mã ${code} đã tồn tại`,
      );
    }
  }

  private assertRanges(range: {
    levelFrom?: CreateCourseDto['levelFrom'];
    levelTo?: CreateCourseDto['levelTo'];
    targetBandFrom?: number | null;
    targetBandTo?: number | null;
  }): void {
    if (
      range.levelFrom &&
      range.levelTo &&
      !isCefrRangeValid(range.levelFrom, range.levelTo)
    ) {
      throw new BadRequestException('levelFrom phải nhỏ hơn hoặc bằng levelTo');
    }
    if (
      range.targetBandFrom != null &&
      range.targetBandTo != null &&
      range.targetBandFrom > range.targetBandTo
    ) {
      throw new BadRequestException(
        'targetBandFrom phải nhỏ hơn hoặc bằng targetBandTo',
      );
    }
  }
}
