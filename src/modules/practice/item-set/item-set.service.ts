import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../../common/dto/pagination-meta.dto';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import { isCefrRangeValid } from '../../../common/constants/cefr.constant';
import { LessonStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssetService } from '../../storage/asset.service';
import {
  GroupDraft,
  ItemSetMeta,
  NormalizedGroup,
  TreeValidation,
  validateForPublish,
  validateItemSetTree,
} from '../content/item-set.validator';
import { buildItemSetRelease } from '../content/release.builder';
import {
  CreateItemSetDto,
  ImportItemSetsDto,
  ImportResultDto,
  ItemSetDetailDto,
  ItemSetDto,
  ItemSetPreviewDto,
  ItemSetQueryDto,
  ItemSetReleaseDto,
  ReplaceItemSetQuestionsDto,
  UpdateItemSetDto,
} from './dto/item-set.dto';
import {
  ITEM_SET_LIST_INCLUDE,
  ITEM_SET_TREE_INCLUDE,
  ItemSetTreeRow,
  toGroupDrafts,
  toImportShape,
  toItemSetDetailDto,
  toItemSetDto,
  toJson,
  toReleaseSource,
} from './item-set.mapper';

const NOT_FOUND = 'Không tìm thấy bộ câu hỏi';
const TX_OPTIONS = { timeout: 20_000 };

type Tx = Prisma.TransactionClient;

@Injectable()
export class ItemSetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetService,
  ) {}

  async findAll(query: ItemSetQueryDto): Promise<PaginatedResult<ItemSetDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.ItemSetWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.exam ? { exam: query.exam } : {}),
      ...(query.skill ? { skill: query.skill } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.part ? { part: query.part } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.questionType
        ? { groups: { some: { type: query.questionType } } }
        : {}),
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
      this.prisma.itemSet.count({ where }),
      this.prisma.itemSet.findMany({
        where,
        include: ITEM_SET_LIST_INCLUDE,
        orderBy: [
          { exam: 'asc' },
          { skill: 'asc' },
          { part: 'asc' },
          { code: 'asc' },
        ],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(toItemSetDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async findOne(id: string): Promise<ItemSetDetailDto> {
    return toItemSetDetailDto(await this.getTree(id, true));
  }

  async create(
    dto: CreateItemSetDto,
    actorId: string,
  ): Promise<ItemSetDetailDto> {
    await this.assertCodeAvailable(dto.code);
    const meta = this.metaOf(dto);
    const tree = await this.validate(meta, dto, dto.groups ?? []);
    const id = await this.prisma.$transaction(async (tx) => {
      const created = await tx.itemSet.create({
        data: {
          ...this.fieldsData(dto, tree),
          code: dto.code,
          title: dto.title,
          exam: dto.exam,
          skill: dto.skill,
          createdBy: actorId,
          updatedBy: actorId,
        },
        select: { id: true },
      });
      await this.writeTree(tx, created.id, tree.groups, new Set(), new Set());
      await this.writeTotals(tx, created.id, tree, actorId, false);
      return created.id;
    }, TX_OPTIONS);
    return this.findOne(id);
  }

  /** Sửa thông tin chung và ngữ liệu. Câu hỏi hiện có được kiểm tra lại với thông tin mới. */
  async update(
    id: string,
    dto: UpdateItemSetDto,
    actorId: string,
  ): Promise<ItemSetDetailDto> {
    const current = await this.getTree(id);
    if (dto.code !== undefined && dto.code !== current.code) {
      await this.assertCodeAvailable(dto.code, id);
    }
    const meta: ItemSetMeta = {
      exam: dto.exam ?? current.exam,
      skill: dto.skill ?? current.skill,
      module: dto.module === undefined ? current.module : dto.module,
      part: dto.part === undefined ? current.part : dto.part,
    };
    const merged = {
      stimulus: dto.stimulus ?? current.stimulus,
      transcript: dto.transcript ?? current.transcript,
      audioAssetId:
        dto.audioAssetId === undefined
          ? current.audioAssetId
          : dto.audioAssetId,
      levelFrom:
        dto.levelFrom === undefined ? current.levelFrom : dto.levelFrom,
      levelTo: dto.levelTo === undefined ? current.levelTo : dto.levelTo,
    };
    const tree = await this.validate(meta, merged, toGroupDrafts(current));
    await this.prisma.itemSet.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        exam: meta.exam,
        skill: meta.skill,
        module: meta.module,
        part: meta.part,
        stimulus: toJson(tree.stimulus),
        transcript: toJson(tree.transcript),
        audioAssetId: merged.audioAssetId,
        levelFrom: merged.levelFrom,
        levelTo: merged.levelTo,
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.tags !== undefined ? { tags: this.cleanTags(dto.tags) } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.practiceEnabled !== undefined
          ? { practiceEnabled: dto.practiceEnabled }
          : {}),
        revision: { increment: 1 },
        updatedBy: actorId,
      },
    });
    return this.findOne(id);
  }

  /** Thay toàn bộ nhóm và câu hỏi. Có id = sửa (giữ id để thống kê theo câu), không id = tạo, thiếu id = xoá. */
  async replaceQuestions(
    id: string,
    dto: ReplaceItemSetQuestionsDto,
    actorId: string,
  ): Promise<ItemSetDetailDto> {
    const current = await this.getTree(id);
    const tree = await this.validate(this.metaOf(current), current, dto.groups);
    const groupIds = new Set(current.groups.map((group) => group.id));
    const questionIds = new Set(
      current.groups.flatMap((group) =>
        group.questions.map((question) => question.id),
      ),
    );
    await this.prisma.$transaction(async (tx) => {
      // Tăng revision trước để khoá dòng, hai lần lưu cùng lúc không trộn lẫn nhau.
      await tx.itemSet.update({
        where: { id },
        data: { revision: { increment: 1 }, updatedBy: actorId },
      });
      await this.writeTree(tx, id, tree.groups, groupIds, questionIds);
      await this.writeTotals(tx, id, tree, actorId, false);
    }, TX_OPTIONS);
    return this.findOne(id);
  }

  /**
   * Phát hành: chụp bản hiện tại thành bản không sửa được. Chưa sửa gì kể từ lần trước thì không tạo bản mới.
   * Đề đã phát hành vẫn dùng bản cũ cho tới khi đề được phát hành lại.
   */
  async publish(id: string, actorId: string): Promise<ItemSetDetailDto> {
    const current = await this.getTree(id);
    const meta = this.metaOf(current);
    const tree = validateItemSetTree({
      meta,
      stimulus: current.stimulus,
      transcript: current.transcript,
      groups: toGroupDrafts(current),
    });
    const audio = current.audioAsset
      ? { ready: current.audioAsset.status === 'READY' }
      : null;
    const errors = [...tree.errors, ...validateForPublish(meta, tree, audio)];
    if (errors.length > 0) {
      throw new BadRequestException({ message: errors });
    }
    const unchanged =
      current.currentReleaseId !== null &&
      current.publishedRevision === current.revision;
    if (unchanged) {
      if (current.status !== LessonStatus.PUBLISHED) {
        await this.prisma.itemSet.update({
          where: { id },
          data: { status: LessonStatus.PUBLISHED, updatedBy: actorId },
        });
      }
      return this.findOne(id);
    }
    const built = buildItemSetRelease(toReleaseSource(current));
    await this.prisma.$transaction(async (tx) => {
      const latest = await tx.itemSetRelease.aggregate({
        where: { itemSetId: id },
        _max: { version: true },
      });
      const release = await tx.itemSetRelease.create({
        data: {
          itemSetId: id,
          version: (latest._max.version ?? 0) + 1,
          content: toJson(built.content),
          answerKey: toJson(built.answerKey),
          questionCount: built.questionCount,
          totalMarks: built.totalMarks,
          exam: current.exam,
          skill: current.skill,
          module: current.module,
          part: current.part,
          audioAssetId: current.audioAssetId,
          createdBy: actorId,
        },
        select: { id: true },
      });
      await tx.itemSet.update({
        where: { id },
        data: {
          currentReleaseId: release.id,
          status: LessonStatus.PUBLISHED,
          publishedAt: current.publishedAt ?? new Date(),
          publishedRevision: current.revision,
          updatedBy: actorId,
        },
      });
    }, TX_OPTIONS);
    return this.findOne(id);
  }

  /** Gỡ khỏi phần luyện theo part. Đề đã phát hành có bộ này vẫn làm được bằng bản đã chụp. */
  async unpublish(id: string, actorId: string): Promise<ItemSetDetailDto> {
    await this.getTree(id);
    await this.prisma.itemSet.update({
      where: { id },
      data: { status: LessonStatus.DRAFT, updatedBy: actorId },
    });
    return this.findOne(id);
  }

  async remove(id: string, actorId: string): Promise<ItemSetDto> {
    await this.getTree(id);
    const tests = await this.prisma.testItem.findMany({
      where: { itemSetId: id, test: { deletedAt: null } },
      select: { test: { select: { code: true } } },
    });
    if (tests.length > 0) {
      throw new ConflictException(
        `Bộ câu hỏi đang nằm trong đề ${tests.map((item) => item.test.code).join(', ')}, hãy gỡ khỏi đề trước`,
      );
    }
    const row = await this.prisma.itemSet.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: LessonStatus.DRAFT,
        updatedBy: actorId,
      },
      include: ITEM_SET_LIST_INCLUDE,
    });
    return toItemSetDto(row);
  }

  async restore(id: string, actorId: string): Promise<ItemSetDto> {
    const deleted = await this.prisma.itemSet.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!deleted) {
      throw new NotFoundException('Không tìm thấy bộ câu hỏi đã xoá');
    }
    const row = await this.prisma.itemSet.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
      include: ITEM_SET_LIST_INCLUDE,
    });
    return toItemSetDto(row);
  }

  /** Xem bản nháp đúng như người học sẽ thấy, kèm danh sách việc còn thiếu để phát hành. */
  async preview(id: string): Promise<ItemSetPreviewDto> {
    const current = await this.getTree(id, true);
    const meta = this.metaOf(current);
    const tree = validateItemSetTree({
      meta,
      stimulus: current.stimulus,
      transcript: current.transcript,
      groups: toGroupDrafts(current),
    });
    const audio = current.audioAsset
      ? { ready: current.audioAsset.status === 'READY' }
      : null;
    const built = buildItemSetRelease(toReleaseSource(current));
    return {
      content: built.content as unknown as Record<string, unknown>,
      publishIssues: [...tree.errors, ...validateForPublish(meta, tree, audio)],
    };
  }

  async releases(id: string): Promise<ItemSetReleaseDto[]> {
    await this.getTree(id, true);
    return this.prisma.itemSetRelease.findMany({
      where: { itemSetId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        questionCount: true,
        totalMarks: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  async export(id: string): Promise<CreateItemSetDto> {
    return toImportShape(await this.getTree(id, true));
  }

  /**
   * Nhập nhiều bộ một lần, vd từ file Excel đã chuyển sang JSON. Trùng code thì cập nhật bộ cũ.
   * Mỗi bộ xử lý riêng, bộ lỗi không làm hỏng các bộ khác.
   */
  async importMany(
    dto: ImportItemSetsDto,
    actorId: string,
  ): Promise<ImportResultDto> {
    const results: ImportResultDto['results'] = [];
    for (const [index, item] of dto.items.entries()) {
      try {
        const existing = await this.prisma.itemSet.findUnique({
          where: { code: item.code },
          select: { id: true, deletedAt: true },
        });
        if (existing?.deletedAt) {
          throw new ConflictException(
            `Mã ${item.code} thuộc một bộ đã xoá, hãy khôi phục trước`,
          );
        }
        if (existing) {
          const { groups, ...fields } = item;
          await this.update(existing.id, fields, actorId);
          await this.replaceQuestions(
            existing.id,
            { groups: groups ?? [] },
            actorId,
          );
          results.push({
            index,
            code: item.code,
            status: 'UPDATED',
            id: existing.id,
            errors: [],
          });
        } else {
          const created = await this.create(item, actorId);
          results.push({
            index,
            code: item.code,
            status: 'CREATED',
            id: created.id,
            errors: [],
          });
        }
      } catch (error) {
        results.push({
          index,
          code: item.code,
          status: 'FAILED',
          id: null,
          errors: errorMessages(error),
        });
      }
    }
    return {
      created: results.filter((result) => result.status === 'CREATED').length,
      updated: results.filter((result) => result.status === 'UPDATED').length,
      failed: results.filter((result) => result.status === 'FAILED').length,
      results,
    };
  }

  private async validate(
    meta: ItemSetMeta,
    fields: {
      stimulus?: unknown;
      transcript?: unknown;
      audioAssetId?: string | null;
      levelFrom?: ItemSetTreeRow['levelFrom'];
      levelTo?: ItemSetTreeRow['levelTo'];
    },
    groups: GroupDraft[],
  ): Promise<TreeValidation> {
    const tree = validateItemSetTree({
      meta,
      stimulus: fields.stimulus,
      transcript: fields.transcript,
      groups,
    });
    const errors = [...tree.errors];
    if (
      fields.levelFrom &&
      fields.levelTo &&
      !isCefrRangeValid(fields.levelFrom, fields.levelTo)
    ) {
      errors.push('levelFrom phải nhỏ hơn hoặc bằng levelTo');
    }
    if (fields.audioAssetId) {
      const audio = await this.assets.checkAudio(fields.audioAssetId);
      if (!audio) {
        errors.push('audioAssetId không phải file audio đã upload');
      }
    }
    const grammarIds = [
      ...new Set(
        tree.groups.flatMap((group) =>
          group.questions.flatMap((question) =>
            question.grammarLessonId ? [question.grammarLessonId] : [],
          ),
        ),
      ),
    ];
    if (grammarIds.length > 0) {
      const found = await this.prisma.grammarLesson.count({
        where: { id: { in: grammarIds }, deletedAt: null },
      });
      if (found !== grammarIds.length) {
        errors.push('Có grammarLessonId không tồn tại');
      }
    }
    if (errors.length > 0) {
      throw new BadRequestException({ message: errors });
    }
    return tree;
  }

  /**
   * Ghi cây câu hỏi: tạo hoặc sửa nhóm, rồi tạo hoặc sửa câu (câu có thể chuyển nhóm),
   * sau đó mới xoá câu và nhóm thừa để không mất câu vừa chuyển sang nhóm khác.
   */
  private async writeTree(
    tx: Tx,
    itemSetId: string,
    groups: NormalizedGroup[],
    existingGroupIds: Set<string>,
    existingQuestionIds: Set<string>,
  ): Promise<void> {
    for (const group of groups) {
      if (group.id && !existingGroupIds.has(group.id)) {
        throw new BadRequestException(
          `Nhóm ${group.id} không thuộc bộ câu hỏi này`,
        );
      }
      for (const question of group.questions) {
        if (question.id && !existingQuestionIds.has(question.id)) {
          throw new BadRequestException(
            `Câu ${question.id} không thuộc bộ câu hỏi này`,
          );
        }
      }
    }
    const keptGroupIds: string[] = [];
    const keptQuestionIds: string[] = [];
    for (const group of groups) {
      const groupData = {
        type: group.type,
        instructions: group.instructions,
        content: toJson(group.content),
        passageKey: group.passageKey,
        sortOrder: group.sortOrder,
      };
      const groupId = group.id
        ? (
            await tx.questionGroup.update({
              where: { id: group.id },
              data: groupData,
              select: { id: true },
            })
          ).id
        : (
            await tx.questionGroup.create({
              data: { ...groupData, itemSetId },
              select: { id: true },
            })
          ).id;
      keptGroupIds.push(groupId);
      for (const question of group.questions) {
        const questionData = {
          groupId,
          number: question.number,
          marks: question.marks,
          sortOrder: question.sortOrder,
          prompt: question.prompt,
          content: toJson(question.content),
          answer: toJson(question.answer),
          explanation: question.explanation,
          evidence: question.evidence
            ? toJson(question.evidence)
            : Prisma.DbNull,
          tags: question.tags,
          grammarLessonId: question.grammarLessonId,
        };
        const questionId = question.id
          ? (
              await tx.question.update({
                where: { id: question.id },
                data: questionData,
                select: { id: true },
              })
            ).id
          : (
              await tx.question.create({
                data: questionData,
                select: { id: true },
              })
            ).id;
        keptQuestionIds.push(questionId);
      }
    }
    await tx.question.deleteMany({
      where: { group: { itemSetId }, id: { notIn: keptQuestionIds } },
    });
    await tx.questionGroup.deleteMany({
      where: { itemSetId, id: { notIn: keptGroupIds } },
    });
  }

  private async writeTotals(
    tx: Tx,
    id: string,
    tree: TreeValidation,
    actorId: string,
    bumpRevision: boolean,
  ): Promise<void> {
    await tx.itemSet.update({
      where: { id },
      data: {
        questionCount: tree.questionCount,
        totalMarks: tree.totalMarks,
        updatedBy: actorId,
        ...(bumpRevision ? { revision: { increment: 1 } } : {}),
      },
    });
  }

  private fieldsData(dto: CreateItemSetDto, tree: TreeValidation) {
    return {
      description: dto.description ?? null,
      module: dto.module ?? null,
      part: dto.part ?? null,
      stimulus: toJson(tree.stimulus),
      transcript: toJson(tree.transcript),
      audioAssetId: dto.audioAssetId ?? null,
      difficulty: dto.difficulty ?? null,
      levelFrom: dto.levelFrom ?? null,
      levelTo: dto.levelTo ?? null,
      tags: this.cleanTags(dto.tags ?? []),
      source: dto.source ?? null,
      practiceEnabled: dto.practiceEnabled ?? true,
    };
  }

  private metaOf(source: {
    exam: ItemSetMeta['exam'];
    skill: ItemSetMeta['skill'];
    module?: ItemSetMeta['module'];
    part?: ItemSetMeta['part'];
  }): ItemSetMeta {
    return {
      exam: source.exam,
      skill: source.skill,
      module: source.module ?? null,
      part: source.part ?? null,
    };
  }

  private cleanTags(tags: string[]): string[] {
    return [
      ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
    ];
  }

  private async getTree(
    id: string,
    allowDeleted = false,
  ): Promise<ItemSetTreeRow> {
    const row = await this.prisma.itemSet.findFirst({
      where: { id, ...(allowDeleted ? {} : { deletedAt: null }) },
      include: ITEM_SET_TREE_INCLUDE,
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
    const existing = await this.prisma.itemSet.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `Mã ${code} thuộc một bộ đã xoá, hãy khôi phục hoặc dùng mã khác`
          : `Mã ${code} đã tồn tại`,
      );
    }
  }
}

function errorMessages(error: unknown): string[] {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return [response];
    }
    const message = (response as { message?: string | string[] }).message;
    return Array.isArray(message) ? message : [message ?? error.message];
  }
  return [error instanceof Error ? error.message : String(error)];
}
