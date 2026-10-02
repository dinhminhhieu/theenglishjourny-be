import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../../common/constants/roles.constant';
import { buildPaginationMeta } from '../../../common/dto/pagination-meta.dto';
import type { AppUser } from '../../../common/types/app-user.type';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import type { EnvironmentVariables } from '../../../config/env.validation';
import {
  Attempt,
  AttemptMode,
  AttemptSource,
  AttemptStatus,
  Exam,
  ExamSkill,
  LessonStatus,
  Prisma,
  SubmitReason,
  TestKind,
  XpReason,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CourseAccessService } from '../../course/course-access.service';
import { LessonProgressService } from '../../course/lesson-progress.service';
import { AssetService } from '../../storage/asset.service';
import { TEST_COMPLETED_XP } from '../../xp/xp.constants';
import { XpService } from '../../xp/xp.service';
import type {
  ItemSetAnswerKey,
  PublicItemSetContent,
} from '../content/content.types';
import type { AttemptStructure } from '../content/structure.types';
import { findSection, getExamFormat } from '../formats/exam-formats';
import { getQuestionType } from '../formats/question-types';
import { asRecord, toJson } from '../item-set/item-set.mapper';
import type { ResponseValue } from '../scoring/answer.types';
import { scoreQuestion } from '../scoring/score-question';
import { releasedStructure } from '../test/test.mapper';
import { buildStructure, SKILL_TITLES } from '../test/test-structure';
import {
  AnswerRow,
  buildReviewView,
  buildSectionsView,
  ReleaseData,
  releaseIdsOf,
} from './attempt-view';
import { toAttemptSummary, toTimer } from './attempt.mapper';
import {
  AdminAttemptDto,
  AdminAttemptQueryDto,
  AttemptDetailDto,
  AttemptQueryDto,
  AttemptReviewDto,
  AttemptSummaryDto,
  BlockCompletionDto,
  CheckAnswerDto,
  CheckResultDto,
  CustomPracticeDto,
  SaveDraftDto,
  SaveDraftResultDto,
  SubmitAttemptDto,
} from './dto/attempt.dto';
import { gradeAttempt } from './grade-attempt';
import {
  buildQuestionIndex,
  compactResponses,
  QuestionIndex,
  validateResponses,
} from './question-index';
import type { StartAttemptDto } from '../test/dto/test.dto';

const NOT_FOUND = 'Không tìm thấy bài làm';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Link audio sống ít nhất 2 giờ, đủ cho đề dài nhất cộng thời gian xem lại. */
const MIN_AUDIO_TTL_SECONDS = 2 * 60 * 60;
const MAX_CANDIDATE_ITEM_SETS = 500;

const PLAYABLE_TEST_SELECT = {
  id: true,
  title: true,
  exam: true,
  kind: true,
  isListed: true,
  xpCost: true,
  status: true,
  deletedAt: true,
  durationMinutes: true,
  currentRelease: {
    select: { id: true, structure: true, durationMinutes: true },
  },
} satisfies Prisma.TestSelect;

type PlayableTest = Prisma.TestGetPayload<{
  select: typeof PLAYABLE_TEST_SELECT;
}>;
type Tx = Prisma.TransactionClient;

interface BeginParams {
  user: AppUser;
  mode: AttemptMode;
  source: AttemptSource;
  exam: Exam;
  title: string;
  structure: AttemptStructure;
  durationMinutes: number | null;
  activeKey: string | null;
  testId?: string;
  testReleaseId?: string;
  lessonBlockId?: string;
}

/**
 * Vòng đời bài làm: bắt đầu hoặc tiếp tục, lưu nháp, xem đáp án từng câu (luyện tập), nộp và chấm, xem lại.
 * Mọi bước ghi đều cập nhật có điều kiện theo trạng thái nên bấm đúp, nhiều tab hay nộp trễ đều an toàn.
 */
@Injectable()
export class AttemptService {
  private readonly graceSeconds: number;
  private readonly dailyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
    private readonly access: CourseAccessService,
    private readonly progress: LessonProgressService,
    private readonly xp: XpService,
    private readonly assets: AssetService,
  ) {
    this.graceSeconds = config.get('ATTEMPT_GRACE_SECONDS', { infer: true });
    this.dailyLimit = config.get('ATTEMPT_DAILY_LIMIT', { infer: true });
  }

  // ---------- Bắt đầu ----------

  /** Làm đề trong thư viện. Đề cần XP phải mở khoá trước. */
  async startFromTest(
    testId: string,
    user: AppUser,
    dto: StartAttemptDto,
  ): Promise<AttemptDetailDto> {
    const test = await this.prisma.test.findFirst({
      where: { id: testId },
      select: PLAYABLE_TEST_SELECT,
    });
    const isAdmin = user.role === Role.ADMIN;
    if (!test || !isPlayable(test) || (!test.isListed && !isAdmin)) {
      throw new NotFoundException('Không tìm thấy đề');
    }
    if (test.xpCost > 0 && !isAdmin) {
      const unlocked = await this.xp.hasTransaction(
        user.id,
        XpReason.TEST_UNLOCK,
        test.id,
      );
      if (!unlocked) {
        throw new ForbiddenException(`Đề cần mở khoá bằng ${test.xpCost} XP`);
      }
    }
    return this.beginFromTest(test, user, dto, {
      source: AttemptSource.TEST,
      activeKey: `${user.id}:test:${test.id}`,
    });
  }

  /** Làm bài luyện của một block trong unit. Quyền học theo khoá như khi đọc nội dung unit. */
  async startFromLessonBlock(
    blockId: string,
    user: AppUser,
    dto: StartAttemptDto,
  ): Promise<AttemptDetailDto> {
    const block = await this.loadAccessibleBlock(blockId, user);
    if (!block.test || !isPlayable(block.test)) {
      throw new NotFoundException('Block này chưa có bài luyện tập');
    }
    return this.beginFromTest(block.test, user, dto, {
      source: AttemptSource.LESSON_BLOCK,
      activeKey: `${user.id}:block:${block.id}`,
      lessonBlockId: block.id,
    });
  }

  /** Luyện theo part hoặc dạng câu: bốc các bộ đã phát hành, ưu tiên bộ người học chưa làm. */
  async startCustom(
    dto: CustomPracticeDto,
    user: AppUser,
  ): Promise<AttemptDetailDto> {
    const where: Prisma.ItemSetWhereInput = {
      exam: dto.exam,
      skill: dto.skill,
      deletedAt: null,
      status: LessonStatus.PUBLISHED,
      practiceEnabled: true,
      currentReleaseId: { not: null },
      ...(dto.part ? { part: dto.part } : {}),
      ...(dto.module ? { OR: [{ module: dto.module }, { module: null }] } : {}),
      ...(dto.questionType
        ? { groups: { some: { type: dto.questionType } } }
        : {}),
    };
    const candidates = await this.prisma.itemSet.findMany({
      where,
      select: {
        id: true,
        part: true,
        skill: true,
        currentRelease: {
          select: { id: true, questionCount: true, totalMarks: true },
        },
      },
      take: MAX_CANDIDATE_ITEM_SETS,
    });
    if (candidates.length === 0) {
      throw new NotFoundException('Chưa có câu hỏi phù hợp để luyện');
    }
    const seen = new Set(
      (
        await this.prisma.attemptAnswer.findMany({
          where: {
            attempt: { userId: user.id },
            itemSetId: { in: candidates.map((candidate) => candidate.id) },
          },
          distinct: ['itemSetId'],
          select: { itemSetId: true },
        })
      ).map((row) => row.itemSetId),
    );
    const ordered = [
      ...shuffle(candidates.filter((candidate) => !seen.has(candidate.id))),
      ...shuffle(candidates.filter((candidate) => seen.has(candidate.id))),
    ];
    const target = dto.questionCount ?? 10;
    const picked: typeof candidates = [];
    let marks = 0;
    for (const candidate of ordered) {
      if (marks >= target) {
        break;
      }
      picked.push(candidate);
      marks += candidate.currentRelease?.totalMarks ?? 0;
    }
    const structure = buildStructure(
      {
        exam: dto.exam,
        module: dto.module ?? null,
        kind: 'CUSTOM',
        skill: dto.skill,
      },
      picked.map((candidate) => ({
        itemSetId: candidate.id,
        skill: candidate.skill,
        part: candidate.part,
        releaseId: candidate.currentRelease?.id as string,
        totalMarks: candidate.currentRelease?.totalMarks ?? 0,
        questionCount: candidate.currentRelease?.questionCount ?? 0,
      })),
    );
    const mode = dto.mode ?? AttemptMode.PRACTICE;
    return this.begin({
      user,
      mode,
      source: AttemptSource.CUSTOM,
      exam: dto.exam,
      title: customTitle(dto),
      structure,
      durationMinutes:
        mode === AttemptMode.EXAM ? (dto.timeLimitMinutes ?? null) : null,
      activeKey: null,
    });
  }

  /** Hoàn thành block không có bài luyện, vd block đọc ngữ pháp hay học từ vựng. */
  async completeLessonBlock(
    blockId: string,
    user: AppUser,
  ): Promise<BlockCompletionDto> {
    const block = await this.loadAccessibleBlock(blockId, user);
    if (block.test && isPlayable(block.test)) {
      throw new BadRequestException(
        'Block này hoàn thành khi nộp bài luyện tập',
      );
    }
    return this.prisma.$transaction((tx) =>
      this.progress.completeBlock(tx, user.id, block.id),
    );
  }

  // ---------- Làm bài ----------

  async findMine(
    user: AppUser,
    query: AttemptQueryDto,
  ): Promise<PaginatedResult<AttemptSummaryDto>> {
    await this.expireOverdue(user.id);
    return this.paginate(
      { ...this.filterOf(query), userId: user.id },
      query,
      (row) => toAttemptSummary(row),
    );
  }

  async findOneForUser(id: string, user: AppUser): Promise<AttemptDetailDto> {
    const attempt = await this.getOwned(id, user.id);
    const current =
      (await this.expireIfNeeded(attempt)) ??
      (await this.getOwned(id, user.id));
    return this.detail(current, false);
  }

  async saveDraft(
    id: string,
    user: AppUser,
    dto: SaveDraftDto,
  ): Promise<SaveDraftResultDto> {
    const attempt = await this.getWritable(id, user.id);
    this.assertResponses(attempt, dto.answers);
    const now = new Date();
    const accepted = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.attempt.updateMany({
        where: {
          id,
          userId: user.id,
          status: AttemptStatus.IN_PROGRESS,
          draftSeq: { lt: dto.seq },
          OR: [
            { deadlineAt: null },
            { deadlineAt: { gt: this.graceCutoff(now) } },
          ],
        },
        data: { draftSeq: dto.seq, lastSavedAt: now },
      });
      if (count === 0) {
        return false;
      }
      const row = await tx.attempt.findUniqueOrThrow({
        where: { id },
        select: { draft: true, checkedQuestionIds: true },
      });
      await tx.attempt.update({
        where: { id },
        data: {
          draft: toJson(
            mergeDraft(dto.answers, row.draft, row.checkedQuestionIds),
          ),
        },
      });
      return true;
    });
    const latest = await this.getOwned(id, user.id);
    if (!accepted && latest.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Bài đã nộp, không lưu được nữa');
    }
    return {
      accepted,
      draftSeq: latest.draftSeq,
      lastSavedAt: latest.lastSavedAt,
      timer: toTimer(latest.deadlineAt, this.graceSeconds),
    };
  }

  /** Chế độ luyện tập: xem đáp án một câu. Câu đã xem bị khoá, lần lưu sau không sửa được. */
  async check(
    id: string,
    user: AppUser,
    dto: CheckAnswerDto,
  ): Promise<CheckResultDto> {
    const attempt = await this.getWritable(id, user.id);
    if (attempt.mode !== AttemptMode.PRACTICE) {
      throw new ForbiddenException(
        'Chế độ thi thử chỉ xem đáp án sau khi nộp bài',
      );
    }
    const response = dto.response ?? null;
    this.assertResponses(attempt, { [dto.questionId]: response });
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.attempt.updateMany({
        where: { id, userId: user.id, status: AttemptStatus.IN_PROGRESS },
        data: { lastSavedAt: new Date() },
      });
      if (count === 0) {
        throw new ConflictException('Bài đã nộp');
      }
      const row = await tx.attempt.findUniqueOrThrow({
        where: { id },
        select: { draft: true, checkedQuestionIds: true },
      });
      if (row.checkedQuestionIds.includes(dto.questionId)) {
        return;
      }
      const draft = {
        ...(asRecord(row.draft) as Record<string, ResponseValue>),
      };
      const value = compactResponses({ [dto.questionId]: response })[
        dto.questionId
      ];
      if (value === undefined) {
        delete draft[dto.questionId];
      } else {
        draft[dto.questionId] = value;
      }
      await tx.attempt.update({
        where: { id },
        data: {
          draft: toJson(draft),
          checkedQuestionIds: { push: dto.questionId },
        },
      });
    });
    const updated = await this.getOwned(id, user.id);
    const results = await this.checkResults(updated, [dto.questionId]);
    return results[dto.questionId];
  }

  async submit(
    id: string,
    user: AppUser,
    dto: SubmitAttemptDto,
  ): Promise<AttemptDetailDto> {
    const attempt = await this.getOwned(id, user.id);
    if (attempt.status === AttemptStatus.ABANDONED) {
      throw new ConflictException('Bài đã huỷ, không nộp được');
    }
    if (attempt.status === AttemptStatus.IN_PROGRESS && dto.answers) {
      this.assertResponses(attempt, dto.answers);
    }
    await this.finalize(id, user.id, SubmitReason.USER, dto);
    return this.detail(await this.getOwned(id, user.id), false);
  }

  /** Bỏ bài đang làm để làm lại từ đầu. */
  async abandon(id: string, user: AppUser): Promise<AttemptSummaryDto> {
    const { count } = await this.prisma.attempt.updateMany({
      where: { id, userId: user.id, status: AttemptStatus.IN_PROGRESS },
      data: { status: AttemptStatus.ABANDONED, activeKey: null },
    });
    const attempt = await this.getOwned(id, user.id);
    if (count === 0) {
      throw new ConflictException('Chỉ huỷ được bài đang làm');
    }
    return toAttemptSummary(attempt);
  }

  async review(id: string, user: AppUser): Promise<AttemptReviewDto> {
    const attempt = await this.getOwned(id, user.id);
    const current =
      (await this.expireIfNeeded(attempt)) ??
      (await this.getOwned(id, user.id));
    return this.buildReview(current);
  }

  // ---------- Admin ----------

  async adminFindAll(
    query: AdminAttemptQueryDto,
  ): Promise<PaginatedResult<AdminAttemptDto>> {
    const where: Prisma.AttemptWhereInput = {
      ...this.filterOf(query),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const { pageIndex, pageLimit } = query;
    const [totalResults, rows] = await Promise.all([
      this.prisma.attempt.count({ where }),
      this.prisma.attempt.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map((row) => ({ ...toAttemptSummary(row), user: row.user })),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async adminReview(id: string): Promise<AttemptReviewDto> {
    const attempt = await this.prisma.attempt.findUnique({ where: { id } });
    if (!attempt) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.buildReview(attempt);
  }

  // ---------- Nội bộ ----------

  private async beginFromTest(
    test: PlayableTest,
    user: AppUser,
    dto: StartAttemptDto,
    options: {
      source: AttemptSource;
      activeKey: string;
      lessonBlockId?: string;
    },
  ): Promise<AttemptDetailDto> {
    const release = test.currentRelease as NonNullable<
      PlayableTest['currentRelease']
    >;
    const structure = releasedStructure(release.structure);
    const mode =
      dto.mode ??
      (test.kind === TestKind.PRACTICE
        ? AttemptMode.PRACTICE
        : AttemptMode.EXAM);
    return this.begin({
      user,
      mode,
      source: options.source,
      exam: test.exam,
      title: test.title,
      structure,
      durationMinutes:
        mode === AttemptMode.EXAM
          ? (test.durationMinutes ?? release.durationMinutes)
          : null,
      activeKey: options.activeKey,
      testId: test.id,
      testReleaseId: release.id,
      lessonBlockId: options.lessonBlockId,
    });
  }

  private async begin(params: BeginParams): Promise<AttemptDetailDto> {
    if (params.activeKey) {
      const existing = await this.prisma.attempt.findUnique({
        where: { activeKey: params.activeKey },
      });
      const alive = existing ? await this.expireIfNeeded(existing) : null;
      if (alive) {
        return this.detail(alive, true);
      }
    }
    await this.assertDailyLimit(params.user);
    const releases = await this.loadReleases(releaseIdsOf(params.structure));
    const index = buildQuestionIndex(
      params.structure,
      new Map([...releases].map(([id, release]) => [id, release.content])),
    );
    const now = new Date();
    try {
      const attempt = await this.prisma.attempt.create({
        data: {
          userId: params.user.id,
          mode: params.mode,
          source: params.source,
          exam: params.exam,
          title: params.title,
          structure: toJson(params.structure),
          questionIndex: toJson(index),
          questionCount: Object.keys(index).length,
          maxScore: params.structure.sections.reduce(
            (total, section) =>
              total +
              section.items.reduce((sum, item) => sum + item.totalMarks, 0),
            0,
          ),
          activeKey: params.activeKey,
          startedAt: now,
          deadlineAt: params.durationMinutes
            ? new Date(now.getTime() + params.durationMinutes * 60_000)
            : null,
          testId: params.testId ?? null,
          testReleaseId: params.testReleaseId ?? null,
          lessonBlockId: params.lessonBlockId ?? null,
        },
      });
      return this.detail(attempt, false, releases);
    } catch (error) {
      // Bấm "bắt đầu" hai lần cùng lúc: request sau đụng unique activeKey, trả bài request trước vừa tạo.
      if (
        params.activeKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.attempt.findUnique({
          where: { activeKey: params.activeKey },
        });
        if (existing) {
          return this.detail(existing, true);
        }
      }
      throw error;
    }
  }

  /**
   * Chấm bài. Cập nhật có điều kiện status = IN_PROGRESS vừa chuyển trạng thái vừa khoá dòng,
   * nên hai lần nộp, hay nộp cùng lúc với lưu nháp, chỉ chấm đúng một lần.
   */
  private async finalize(
    id: string,
    userId: string,
    reason: SubmitReason,
    dto?: SubmitAttemptDto,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const before = await tx.attempt.findFirst({
          where: { id, userId },
          select: { status: true, deadlineAt: true },
        });
        if (!before || before.status !== AttemptStatus.IN_PROGRESS) {
          return;
        }
        const expired = this.isExpired(before.deadlineAt, now);
        const { count } = await tx.attempt.updateMany({
          where: { id, status: AttemptStatus.IN_PROGRESS },
          data: {
            status: AttemptStatus.SUBMITTED,
            submittedAt: expired ? before.deadlineAt : now,
            submitReason: expired ? SubmitReason.TIMEOUT : reason,
            activeKey: null,
          },
        });
        if (count === 0) {
          return;
        }
        const locked = await tx.attempt.findUniqueOrThrow({ where: { id } });
        let draft = asRecord(locked.draft) as Record<string, ResponseValue>;
        if (
          !expired &&
          dto?.answers &&
          (dto.seq === undefined || dto.seq > locked.draftSeq)
        ) {
          draft = mergeDraft(
            dto.answers,
            locked.draft,
            locked.checkedQuestionIds,
          );
        }
        await this.grade(tx, locked, draft, now);
      },
      { timeout: 30_000 },
    );
  }

  private async grade(
    tx: Tx,
    attempt: Attempt,
    draft: Record<string, ResponseValue>,
    now: Date,
  ): Promise<void> {
    const structure = attempt.structure as unknown as AttemptStructure;
    const keys = await tx.itemSetRelease.findMany({
      where: { id: { in: releaseIdsOf(structure) } },
      select: { id: true, answerKey: true },
    });
    const graded = gradeAttempt({
      structure,
      answerKeys: new Map(
        keys.map((key) => [
          key.id,
          key.answerKey as unknown as ItemSetAnswerKey,
        ]),
      ),
      responses: draft,
      mode: attempt.mode,
    });
    await tx.attemptAnswer.createMany({
      data: graded.answers.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        itemSetId: answer.itemSetId,
        itemSetReleaseId: answer.itemSetReleaseId,
        displayNumber: answer.displayNumber,
        marks: answer.marks,
        questionType: answer.questionType,
        skill: answer.skill,
        part: answer.part,
        response:
          answer.response === null || answer.response === undefined
            ? Prisma.DbNull
            : toJson(answer.response),
        score: answer.score,
        isCorrect: answer.isCorrect,
        slots: toJson(answer.slots),
      })),
    });
    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.GRADED,
        gradedAt: now,
        draft: toJson(draft),
        rawScore: graded.rawScore,
        percent: graded.percent,
        result: toJson(graded.result),
        score: graded.score,
      },
    });

    await this.xp.recordActivity(tx, attempt.userId, now);
    if (attempt.source === AttemptSource.TEST && attempt.testId) {
      await this.xp.earn(tx, {
        userId: attempt.userId,
        reason: XpReason.TEST_COMPLETED,
        amount: TEST_COMPLETED_XP,
        refId: attempt.testId,
      });
    }
    if (
      attempt.source === AttemptSource.LESSON_BLOCK &&
      attempt.lessonBlockId
    ) {
      await this.progress.completeBlock(
        tx,
        attempt.userId,
        attempt.lessonBlockId,
        now,
      );
    }
  }

  private async detail(
    attempt: Attempt,
    resumed: boolean,
    preloaded?: Map<string, ReleaseData>,
  ): Promise<AttemptDetailDto> {
    const base = {
      attempt: toAttemptSummary(attempt),
      resumed,
      timer: toTimer(attempt.deadlineAt, this.graceSeconds),
      draftSeq: attempt.draftSeq,
    };
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return {
        ...base,
        sections: null,
        draft: null,
        checked: null,
        result: attempt.result ? asRecord(attempt.result) : null,
      };
    }
    const structure = attempt.structure as unknown as AttemptStructure;
    const releases =
      preloaded ?? (await this.loadReleases(releaseIdsOf(structure)));
    const audioUrls = await this.audioUrls(releases, attempt.deadlineAt);
    const checked =
      attempt.mode === AttemptMode.PRACTICE &&
      attempt.checkedQuestionIds.length > 0
        ? await this.checkResults(attempt, attempt.checkedQuestionIds)
        : {};
    return {
      ...base,
      sections: buildSectionsView(structure, releases, audioUrls),
      draft: asRecord(attempt.draft),
      checked,
      result: null,
    };
  }

  private async buildReview(attempt: Attempt): Promise<AttemptReviewDto> {
    if (attempt.status !== AttemptStatus.GRADED) {
      throw new ConflictException('Bài chưa nộp nên chưa xem được đáp án');
    }
    const structure = attempt.structure as unknown as AttemptStructure;
    const rows = await this.prisma.itemSetRelease.findMany({
      where: { id: { in: releaseIdsOf(structure) } },
      select: { id: true, content: true, answerKey: true, audioAssetId: true },
    });
    const releases = new Map(
      rows.map((row) => [
        row.id,
        {
          content: row.content as unknown as PublicItemSetContent,
          answerKey: row.answerKey as unknown as ItemSetAnswerKey,
          audioAssetId: row.audioAssetId,
        },
      ]),
    );
    const answers = await this.prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
    });
    const audioUrls = await this.audioUrls(releases, null);
    return {
      attempt: toAttemptSummary(attempt),
      result: attempt.result ? asRecord(attempt.result) : null,
      sections: buildReviewView(
        structure,
        releases,
        new Map(
          answers.map((answer) => [answer.questionId, answer as AnswerRow]),
        ),
        audioUrls,
      ),
    };
  }

  private async checkResults(
    attempt: Attempt,
    questionIds: string[],
  ): Promise<Record<string, CheckResultDto>> {
    const index = attempt.questionIndex as unknown as QuestionIndex;
    const releaseIds = [
      ...new Set(
        questionIds.map((questionId) => index[questionId]?.itemSetReleaseId),
      ),
    ].filter((releaseId): releaseId is string => Boolean(releaseId));
    const keys = await this.prisma.itemSetRelease.findMany({
      where: { id: { in: releaseIds } },
      select: { id: true, answerKey: true },
    });
    const keyMap = new Map(
      keys.map((key) => [key.id, key.answerKey as unknown as ItemSetAnswerKey]),
    );
    const draft = asRecord(attempt.draft) as Record<string, ResponseValue>;
    const results: Record<string, CheckResultDto> = {};
    for (const questionId of questionIds) {
      const entry = index[questionId];
      const key = entry
        ? keyMap.get(entry.itemSetReleaseId)?.questions[questionId]
        : undefined;
      if (!entry || !key) {
        continue;
      }
      const response = draft[questionId] ?? null;
      const scored = scoreQuestion(
        { marks: key.marks, answer: key.answer, wordLimit: key.wordLimit },
        response,
      );
      results[questionId] = {
        questionId,
        displayNumber: entry.number,
        response: response as string | string[] | null,
        score: scored.score,
        maxScore: scored.maxScore,
        isCorrect: scored.isCorrect,
        slots: scored.slots as unknown as Record<string, unknown>[],
        correctAnswer: key.answer as unknown as Record<string, unknown>,
        explanation: key.explanation,
        evidence: key.evidence,
      };
    }
    return results;
  }

  private async loadReleases(ids: string[]): Promise<Map<string, ReleaseData>> {
    const rows = await this.prisma.itemSetRelease.findMany({
      where: { id: { in: ids } },
      select: { id: true, content: true, audioAssetId: true },
    });
    const releases = new Map(
      rows.map((row) => [
        row.id,
        {
          content: row.content as unknown as PublicItemSetContent,
          audioAssetId: row.audioAssetId,
        },
      ]),
    );
    const missing = ids.filter((id) => !releases.has(id));
    if (missing.length > 0) {
      throw new NotFoundException('Đề thiếu nội dung, hãy báo quản trị viên');
    }
    return releases;
  }

  private audioUrls(
    releases: ReadonlyMap<string, { audioAssetId: string | null }>,
    deadlineAt: Date | null,
  ): Promise<Map<string, string>> {
    const ids = [...releases.values()]
      .map((release) => release.audioAssetId)
      .filter((id): id is string => id !== null);
    const remaining = deadlineAt
      ? Math.ceil((deadlineAt.getTime() - Date.now()) / 1000) +
        this.graceSeconds +
        3600
      : 0;
    return this.assets.playbackUrls(
      ids,
      Math.max(MIN_AUDIO_TTL_SECONDS, remaining),
    );
  }

  private async loadAccessibleBlock(blockId: string, user: AppUser) {
    const block = await this.prisma.lessonBlock.findUnique({
      where: { id: blockId },
      select: {
        id: true,
        lesson: {
          select: {
            status: true,
            deletedAt: true,
            course: {
              select: {
                id: true,
                isLocked: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        },
        test: { select: PLAYABLE_TEST_SELECT },
      },
    });
    const lesson = block?.lesson;
    if (
      !block ||
      !lesson ||
      lesson.deletedAt !== null ||
      lesson.status !== LessonStatus.PUBLISHED ||
      lesson.course.deletedAt !== null ||
      lesson.course.status !== LessonStatus.PUBLISHED
    ) {
      throw new NotFoundException('Không tìm thấy block');
    }
    await this.access.assertCanLearn(lesson.course, user);
    return block;
  }

  /** Nộp tự động các bài đã hết giờ của người dùng, gọi trước khi liệt kê để trạng thái luôn đúng. */
  private async expireOverdue(userId: string): Promise<void> {
    const overdue = await this.prisma.attempt.findMany({
      where: {
        userId,
        status: AttemptStatus.IN_PROGRESS,
        deadlineAt: { lt: this.graceCutoff(new Date()) },
      },
      select: { id: true },
      take: 20,
    });
    for (const attempt of overdue) {
      await this.finalize(attempt.id, userId, SubmitReason.TIMEOUT);
    }
  }

  /** Trả lại bài nếu còn làm được, null nếu vừa bị nộp tự động vì hết giờ. */
  private async expireIfNeeded(attempt: Attempt): Promise<Attempt | null> {
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return null;
    }
    if (!this.isExpired(attempt.deadlineAt, new Date())) {
      return attempt;
    }
    await this.finalize(attempt.id, attempt.userId, SubmitReason.TIMEOUT);
    return null;
  }

  private async getWritable(id: string, userId: string): Promise<Attempt> {
    const attempt = await this.getOwned(id, userId);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Bài đã nộp, không sửa được nữa');
    }
    if (this.isExpired(attempt.deadlineAt, new Date())) {
      await this.finalize(id, userId, SubmitReason.TIMEOUT);
      throw new ConflictException('Đã hết giờ, bài được nộp tự động');
    }
    return attempt;
  }

  /** Không phải bài của mình thì trả 404 để không lộ bài đó có tồn tại. */
  private async getOwned(id: string, userId: string): Promise<Attempt> {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id, userId },
    });
    if (!attempt) {
      throw new NotFoundException(NOT_FOUND);
    }
    return attempt;
  }

  private assertResponses(
    attempt: Attempt,
    answers: Record<string, unknown>,
  ): void {
    const errors = validateResponses(
      attempt.questionIndex as unknown as QuestionIndex,
      answers,
    );
    if (errors.length > 0) {
      throw new BadRequestException({ message: errors });
    }
  }

  private async assertDailyLimit(user: AppUser): Promise<void> {
    if (user.role === Role.ADMIN) {
      return;
    }
    const started = await this.prisma.attempt.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - DAY_MS) },
      },
    });
    if (started >= this.dailyLimit) {
      throw new HttpException(
        'Bạn đã bắt đầu quá nhiều bài trong 24 giờ qua, hãy thử lại sau',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private isExpired(deadlineAt: Date | null, now: Date): boolean {
    return (
      deadlineAt !== null &&
      now.getTime() > deadlineAt.getTime() + this.graceSeconds * 1000
    );
  }

  private graceCutoff(now: Date): Date {
    return new Date(now.getTime() - this.graceSeconds * 1000);
  }

  private filterOf(query: AttemptQueryDto): Prisma.AttemptWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.exam ? { exam: query.exam } : {}),
      ...(query.testId ? { testId: query.testId } : {}),
    };
  }

  private async paginate<T>(
    where: Prisma.AttemptWhereInput,
    query: AttemptQueryDto,
    map: (row: Attempt) => T,
  ): Promise<PaginatedResult<T>> {
    const { pageIndex, pageLimit } = query;
    const [totalResults, rows] = await Promise.all([
      this.prisma.attempt.count({ where }),
      this.prisma.attempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map(map),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }
}

function isPlayable(test: {
  status: LessonStatus;
  deletedAt: Date | null;
  currentRelease: unknown;
}): boolean {
  return (
    test.status === LessonStatus.PUBLISHED &&
    test.deletedAt === null &&
    test.currentRelease !== null
  );
}

/** Câu trả lời mới thay toàn bộ bài nháp, trừ những câu đã xem đáp án thì giữ nguyên. */
function mergeDraft(
  incoming: Record<string, unknown>,
  previous: unknown,
  checkedIds: string[],
): Record<string, ResponseValue> {
  const locked = new Set(checkedIds);
  const old = asRecord(previous) as Record<string, ResponseValue>;
  const next = compactResponses(
    Object.fromEntries(
      Object.entries(incoming).filter(
        ([questionId]) => !locked.has(questionId),
      ),
    ),
  );
  for (const questionId of locked) {
    if (old[questionId] !== undefined) {
      next[questionId] = old[questionId];
    }
  }
  return next;
}

function customTitle(dto: CustomPracticeDto): string {
  const format = getExamFormat(dto.exam, dto.module ?? null);
  const prefix =
    dto.exam === Exam.GENERAL ? 'Luyện tập' : `Luyện ${format.name}`;
  if (dto.questionType) {
    return `${prefix}: ${getQuestionType(dto.questionType)?.nameVi ?? dto.questionType}`;
  }
  const section = findSection(format, dto.skill);
  const part = section?.parts.find((spec) => spec.part === dto.part);
  if (part) {
    return `${prefix} ${section?.name} ${part.name}`;
  }
  return `${prefix}: ${SKILL_TITLES[dto.skill as ExamSkill]}`;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
