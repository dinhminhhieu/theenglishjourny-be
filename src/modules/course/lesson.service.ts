import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import type { AppUser } from '../../common/types/app-user.type';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import {
  LessonBlockKind,
  LessonStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseAccessService } from './course-access.service';
import { CourseService } from './course.service';
import {
  LESSON_DETAIL_INCLUDE,
  LESSON_INCLUDE,
  LessonRow,
  PUBLIC_LESSON_DETAIL_INCLUDE,
  PUBLISHED_COURSE_WHERE,
  PUBLISHED_LESSON_WHERE,
  toLessonDetailDto,
  toLessonDto,
  toPublicLessonDetailDto,
} from './course.mapper';
import { ReplaceLessonBlocksDto } from './dto/lesson-block.dto';
import {
  CreateLessonDto,
  LessonDetailDto,
  LessonDto,
  LessonQueryDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { PublicLessonDetailDto } from './dto/public-course.dto';

const LESSON_NOT_FOUND = 'Không tìm thấy unit';

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CourseService,
    private readonly access: CourseAccessService,
  ) {}

  async findAll(query: LessonQueryDto): Promise<PaginatedResult<LessonDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.LessonWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.courseId ? { courseId: query.courseId } : {}),
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
      this.prisma.lesson.count({ where }),
      this.prisma.lesson.findMany({
        where,
        include: LESSON_INCLUDE,
        orderBy: [
          { courseId: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toLessonDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  /**
   * Nội dung unit cho người học. Unit và khoá chứa nó đều phải đã phát hành;
   * khoá bị khoá thì cần quyền học còn hiệu lực.
   */
  async findPublishedById(
    id: string,
    user?: AppUser,
  ): Promise<PublicLessonDetailDto> {
    const row = await this.prisma.lesson.findFirst({
      where: { ...PUBLISHED_LESSON_WHERE, id, course: PUBLISHED_COURSE_WHERE },
      include: PUBLIC_LESSON_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }
    await this.access.assertCanLearn(row.course, user);
    const progress = user
      ? await this.prisma.userLessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: row.id } },
          select: { status: true, completedBlockIds: true, completedAt: true },
        })
      : null;
    return toPublicLessonDetailDto(row, progress);
  }

  async findOne(id: string): Promise<LessonDetailDto> {
    const row = await this.prisma.lesson.findUnique({
      where: { id },
      include: LESSON_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }
    return toLessonDetailDto(row);
  }

  async create(
    dto: CreateLessonDto,
    actorId: string,
  ): Promise<LessonDetailDto> {
    await this.courses.assertExists(dto.courseId);
    await this.assertCodeAvailable(dto.courseId, dto.code);
    await this.assertTopicExists(dto.topicId);
    const row = await this.prisma.lesson.create({
      data: {
        courseId: dto.courseId,
        code: dto.code,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        description: dto.description ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        topicId: dto.topicId ?? null,
        xpReward: dto.xpReward ?? 50,
        estimatedMinutes: dto.estimatedMinutes ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: LESSON_DETAIL_INCLUDE,
    });
    return toLessonDetailDto(row);
  }

  async update(
    id: string,
    dto: UpdateLessonDto,
    actorId: string,
  ): Promise<LessonDetailDto> {
    const current = await this.getActiveOrThrow(id);
    const courseId = dto.courseId ?? current.courseId;
    if (dto.courseId && dto.courseId !== current.courseId) {
      await this.courses.assertExists(dto.courseId);
    }
    const code = dto.code ?? current.code;
    if (courseId !== current.courseId || code !== current.code) {
      await this.assertCodeAvailable(courseId, code, id);
    }
    await this.assertTopicExists(dto.topicId);
    const row = await this.prisma.lesson.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
      include: LESSON_DETAIL_INCLUDE,
    });
    return toLessonDetailDto(row);
  }

  async remove(id: string, actorId: string): Promise<LessonDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
      include: LESSON_INCLUDE,
    });
    return toLessonDto(row);
  }

  async restore(id: string, actorId: string): Promise<LessonDto> {
    const deleted = await this.prisma.lesson.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy unit đã xoá');
    }
    const row = await this.prisma.lesson.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
      include: LESSON_INCLUDE,
    });
    return toLessonDto(row);
  }

  /** Chỉ phát hành unit đã có ít nhất một block. */
  async publish(id: string, actorId: string): Promise<LessonDto> {
    const current = await this.getActiveOrThrow(id);
    if (current._count.blocks === 0) {
      throw new BadRequestException(
        'Unit chưa có block nào, hãy thêm nội dung trước khi phát hành',
      );
    }
    const row = await this.prisma.lesson.update({
      where: { id },
      data: {
        status: LessonStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
        updatedBy: actorId,
      },
      include: LESSON_INCLUDE,
    });
    return toLessonDto(row);
  }

  async unpublish(id: string, actorId: string): Promise<LessonDto> {
    await this.getActiveOrThrow(id);
    const row = await this.prisma.lesson.update({
      where: { id },
      data: { status: LessonStatus.DRAFT, updatedBy: actorId },
      include: LESSON_INCLUDE,
    });
    return toLessonDto(row);
  }

  /**
   * Thay toàn bộ block của unit trong một transaction. Có id = cập nhật, không id = tạo,
   * id không còn trong mảng = xoá. Thứ tự mảng = sortOrder.
   */
  async replaceBlocks(
    id: string,
    dto: ReplaceLessonBlocksDto,
    actorId: string,
  ): Promise<LessonDetailDto> {
    await this.getActiveOrThrow(id);

    dto.blocks.forEach((block, index) => {
      const label = `blocks[${index}]`;
      if (block.kind === LessonBlockKind.GRAMMAR && !block.grammarLessonId) {
        throw new BadRequestException(
          `${label}: block GRAMMAR phải có grammarLessonId`,
        );
      }
      if (block.kind !== LessonBlockKind.GRAMMAR && block.grammarLessonId) {
        throw new BadRequestException(
          `${label}: chỉ block GRAMMAR mới có grammarLessonId`,
        );
      }
    });

    const skillIds = [...new Set(dto.blocks.map((block) => block.skillId))];
    const grammarLessonIds = [
      ...new Set(
        dto.blocks.flatMap((block) =>
          block.grammarLessonId ? [block.grammarLessonId] : [],
        ),
      ),
    ];
    const testIds = [
      ...new Set(
        dto.blocks.flatMap((block) => (block.testId ? [block.testId] : [])),
      ),
    ];
    const tests = await this.prisma.test.findMany({
      where: { id: { in: testIds }, deletedAt: null },
      select: { id: true, skill: true },
    });
    const testSkill = new Map(tests.map((test) => [test.id, test.skill]));
    dto.blocks.forEach((block, index) => {
      if (!block.testId) {
        return;
      }
      if (!testSkill.has(block.testId)) {
        throw new BadRequestException(
          `blocks[${index}]: đề ${block.testId} không tồn tại`,
        );
      }
      const skill = testSkill.get(block.testId);
      if (skill && skill !== (block.kind as string)) {
        throw new BadRequestException(
          `blocks[${index}]: đề ${block.testId} là đề ${skill}, không dùng cho block ${block.kind}`,
        );
      }
    });
    const [skills, grammarLessons, existing] = await Promise.all([
      this.prisma.skill.findMany({
        where: { id: { in: skillIds }, isActive: true },
        select: { id: true },
      }),
      this.prisma.grammarLesson.findMany({
        where: { id: { in: grammarLessonIds }, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.lessonBlock.findMany({
        where: { lessonId: id },
        select: { id: true },
      }),
    ]);
    const foundSkills = new Set(skills.map((skill) => skill.id));
    const missingSkill = skillIds.find((skillId) => !foundSkills.has(skillId));
    if (missingSkill) {
      throw new BadRequestException(
        `Kỹ năng ${missingSkill} không tồn tại hoặc đã tắt`,
      );
    }
    const foundGrammar = new Set(grammarLessons.map((lesson) => lesson.id));
    const missingGrammar = grammarLessonIds.find(
      (lessonId) => !foundGrammar.has(lessonId),
    );
    if (missingGrammar) {
      throw new BadRequestException(
        `Bài ngữ pháp ${missingGrammar} không tồn tại`,
      );
    }

    const existingIds = new Set(existing.map((block) => block.id));
    const incomingIds = new Set<string>();
    for (const block of dto.blocks) {
      if (block.id) {
        if (!existingIds.has(block.id)) {
          throw new BadRequestException(
            `Block ${block.id} không thuộc unit này`,
          );
        }
        incomingIds.add(block.id);
      }
    }
    const toDelete = [...existingIds].filter(
      (blockId) => !incomingIds.has(blockId),
    );

    await this.prisma.$transaction([
      ...(toDelete.length > 0
        ? [
            this.prisma.lessonBlock.deleteMany({
              where: { id: { in: toDelete } },
            }),
          ]
        : []),
      ...dto.blocks.map((block, index) => {
        const data = {
          kind: block.kind,
          skillId: block.skillId,
          title: block.title,
          instructions: block.instructions ?? null,
          xpReward: block.xpReward ?? 20,
          grammarLessonId: block.grammarLessonId ?? null,
          testId: block.testId ?? null,
          sortOrder: index,
        };
        return block.id
          ? this.prisma.lessonBlock.update({ where: { id: block.id }, data })
          : this.prisma.lessonBlock.create({ data: { ...data, lessonId: id } });
      }),
      this.prisma.lesson.update({
        where: { id },
        data: { updatedBy: actorId },
      }),
    ]);

    return this.findOne(id);
  }

  private async getActiveOrThrow(id: string): Promise<LessonRow> {
    const row = await this.prisma.lesson.findFirst({
      where: { id, deletedAt: null },
      include: LESSON_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }
    return row;
  }

  private async assertCodeAvailable(
    courseId: string,
    code: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.lesson.findFirst({
      where: {
        courseId,
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `Mã ${code} thuộc một unit đã xoá trong khoá này, hãy khôi phục hoặc dùng mã khác`
          : `Mã ${code} đã tồn tại trong khoá này`,
      );
    }
  }

  private async assertTopicExists(topicId?: string | null): Promise<void> {
    if (!topicId) return;
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, deletedAt: null },
      select: { id: true },
    });
    if (!topic) {
      throw new BadRequestException('topicId không tồn tại');
    }
  }
}
