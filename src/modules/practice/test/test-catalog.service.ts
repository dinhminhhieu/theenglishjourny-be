import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../../common/constants/roles.constant';
import { buildPaginationMeta } from '../../../common/dto/pagination-meta.dto';
import type { AppUser } from '../../../common/types/app-user.type';
import type { PaginatedResult } from '../../../common/types/paginated-result.type';
import {
  AttemptSource,
  AttemptStatus,
  LessonStatus,
  Prisma,
  XpReason,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { decimalToNumber } from '../../../common/utils/decimal.util';
import { XpService } from '../../xp/xp.service';
import {
  MyTestStatsDto,
  PublicTestDetailDto,
  PublicTestDto,
  PublicTestQueryDto,
  UnlockResultDto,
} from './dto/test.dto';
import { releasedStructure, toPublicSections } from './test.mapper';

/** Đề người học thấy trong thư viện: đã phát hành, chưa xoá, có bản phát hành và được đưa lên thư viện. */
export const LISTED_TEST_WHERE = {
  deletedAt: null,
  status: LessonStatus.PUBLISHED,
  isListed: true,
  currentReleaseId: { not: null },
} satisfies Prisma.TestWhereInput;

const PUBLIC_TEST_SELECT = {
  id: true,
  code: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  exam: true,
  module: true,
  kind: true,
  skill: true,
  xpCost: true,
  durationMinutes: true,
  currentRelease: {
    select: { questionCount: true, durationMinutes: true, structure: true },
  },
} satisfies Prisma.TestSelect;

type PublicTestRow = Prisma.TestGetPayload<{
  select: typeof PUBLIC_TEST_SELECT;
}>;

/** Thư viện đề cho người học và mở khoá đề bằng XP. */
@Injectable()
export class TestCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
  ) {}

  async findPublished(
    query: PublicTestQueryDto,
    user?: AppUser,
  ): Promise<PaginatedResult<PublicTestDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.TestWhereInput = {
      ...LISTED_TEST_WHERE,
      ...(query.exam ? { exam: query.exam } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.skill ? { skill: query.skill } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.test.count({ where }),
      this.prisma.test.findMany({
        where,
        select: PUBLIC_TEST_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    const extras = await this.userExtras(rows, user);
    return {
      items: rows.map((row) => this.toPublicDto(row, extras, user)),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async findPublishedByCode(
    code: string,
    user?: AppUser,
  ): Promise<PublicTestDetailDto> {
    const row = await this.prisma.test.findFirst({
      where: { ...LISTED_TEST_WHERE, code: code.trim().toUpperCase() },
      select: PUBLIC_TEST_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Không tìm thấy đề');
    }
    const extras = await this.userExtras([row], user);
    return {
      ...this.toPublicDto(row, extras, user),
      sections: toPublicSections(
        releasedStructure(row.currentRelease?.structure),
      ),
    };
  }

  /** Trừ XP để mở đề, mở một lần dùng mãi. Gọi lại không trừ lần nữa. */
  async unlock(testId: string, user: AppUser): Promise<UnlockResultDto> {
    const test = await this.prisma.test.findFirst({
      where: { ...LISTED_TEST_WHERE, id: testId },
      select: { id: true, xpCost: true },
    });
    if (!test) {
      throw new NotFoundException('Không tìm thấy đề');
    }
    return this.prisma.$transaction(async (tx) => {
      if (test.xpCost === 0 || user.role === Role.ADMIN) {
        const me = await tx.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { xpBalance: true },
        });
        return { unlocked: true, xpSpent: 0, xpBalance: me.xpBalance };
      }
      const result = await this.xp.spend(tx, {
        userId: user.id,
        reason: XpReason.TEST_UNLOCK,
        amount: test.xpCost,
        refId: test.id,
      });
      return {
        unlocked: true,
        xpSpent: result.spent ? test.xpCost : 0,
        xpBalance: result.balance,
      };
    });
  }

  private toPublicDto(
    row: PublicTestRow,
    extras: UserExtras,
    user?: AppUser,
  ): PublicTestDto {
    const isFree = row.xpCost === 0 || user?.role === Role.ADMIN;
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      exam: row.exam,
      module: row.module,
      kind: row.kind,
      skill: row.skill,
      questionCount: row.currentRelease?.questionCount ?? 0,
      durationMinutes:
        row.durationMinutes ?? row.currentRelease?.durationMinutes ?? null,
      xpCost: row.xpCost,
      isUnlocked: isFree ? true : extras.unlocked.has(row.id),
      me: user ? (extras.stats.get(row.id) ?? emptyStats()) : null,
    };
  }

  private async userExtras(
    rows: PublicTestRow[],
    user?: AppUser,
  ): Promise<UserExtras> {
    const extras: UserExtras = { unlocked: new Set(), stats: new Map() };
    if (!user || rows.length === 0) {
      return extras;
    }
    const ids = rows.map((row) => row.id);
    const [unlocked, graded, active] = await Promise.all([
      this.xp.refIdsWith(user.id, XpReason.TEST_UNLOCK, ids),
      this.prisma.attempt.groupBy({
        by: ['testId'],
        where: {
          userId: user.id,
          testId: { in: ids },
          status: AttemptStatus.GRADED,
        },
        _count: { _all: true },
        _max: { score: true },
      }),
      this.prisma.attempt.findMany({
        where: {
          userId: user.id,
          testId: { in: ids },
          source: AttemptSource.TEST,
          status: AttemptStatus.IN_PROGRESS,
        },
        select: { id: true, testId: true },
      }),
    ]);
    extras.unlocked = unlocked;
    for (const row of graded) {
      extras.stats.set(row.testId as string, {
        activeAttemptId: null,
        attempts: row._count._all,
        bestScore: decimalToNumber(row._max.score),
      });
    }
    for (const attempt of active) {
      const stats = extras.stats.get(attempt.testId as string) ?? emptyStats();
      extras.stats.set(attempt.testId as string, {
        ...stats,
        activeAttemptId: attempt.id,
      });
    }
    return extras;
  }
}

interface UserExtras {
  unlocked: Set<string>;
  stats: Map<string, MyTestStatsDto>;
}

function emptyStats(): MyTestStatsDto {
  return { activeAttemptId: null, attempts: 0, bestScore: null };
}
