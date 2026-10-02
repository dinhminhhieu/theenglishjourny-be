import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import { Prisma, XpKind, XpReason } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  XpSummaryDto,
  XpTransactionDto,
  XpTransactionQueryDto,
} from './dto/xp.dto';
import {
  dateOnlyString,
  vnDateOnly,
  vnDateString,
  vnYesterdayString,
} from './vn-date';
import { STREAK_DAILY_XP } from './xp.constants';

type Tx = Prisma.TransactionClient;

export interface XpChange {
  userId: string;
  reason: XpReason;
  amount: number;
  /** Bắt buộc để chống cộng hoặc trừ hai lần: unique (userId, reason, refId). */
  refId: string;
}

/**
 * Sổ cái XP. Mọi thay đổi số dư đi qua đây, trong transaction của nghiệp vụ gọi tới,
 * và khoá dòng user trước khi đọc để hai request song song không cộng trùng hay tiêu âm.
 */
@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cộng XP. Đã cộng cho cùng (reason, refId) thì bỏ qua và trả awarded = false. */
  async earn(tx: Tx, change: XpChange): Promise<{ awarded: boolean }> {
    if (change.amount <= 0) {
      return { awarded: false };
    }
    await this.lockUser(tx, change.userId);
    if (await this.exists(tx, change)) {
      return { awarded: false };
    }
    const user = await tx.user.update({
      where: { id: change.userId },
      data: {
        xpBalance: { increment: change.amount },
        xpTotal: { increment: change.amount },
      },
      select: { xpBalance: true },
    });
    await tx.xpTransaction.create({
      data: {
        userId: change.userId,
        kind: XpKind.EARN,
        reason: change.reason,
        amount: change.amount,
        refId: change.refId,
        balanceAfter: user.xpBalance,
      },
    });
    return { awarded: true };
  }

  /** Tiêu XP. Đã tiêu cho cùng (reason, refId) thì không trừ lần nữa. Thiếu XP trả 402. */
  async spend(
    tx: Tx,
    change: XpChange,
  ): Promise<{ spent: boolean; balance: number }> {
    await this.lockUser(tx, change.userId);
    const user = await tx.user.findUniqueOrThrow({
      where: { id: change.userId },
      select: { xpBalance: true },
    });
    if (change.amount <= 0 || (await this.exists(tx, change))) {
      return { spent: false, balance: user.xpBalance };
    }
    if (user.xpBalance < change.amount) {
      throw new HttpException(
        `Cần ${change.amount} XP, bạn đang có ${user.xpBalance} XP`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const updated = await tx.user.update({
      where: { id: change.userId },
      data: { xpBalance: { decrement: change.amount } },
      select: { xpBalance: true },
    });
    await tx.xpTransaction.create({
      data: {
        userId: change.userId,
        kind: XpKind.SPEND,
        reason: change.reason,
        amount: -change.amount,
        refId: change.refId,
        balanceAfter: updated.xpBalance,
      },
    });
    return { spent: true, balance: updated.xpBalance };
  }

  hasTransaction(
    userId: string,
    reason: XpReason,
    refId: string,
  ): Promise<boolean> {
    return this.exists(this.prisma, { userId, reason, refId, amount: 0 });
  }

  /** Những refId người dùng đã có giao dịch với lý do này, vd các đề đã mở khoá. */
  async refIdsWith(
    userId: string,
    reason: XpReason,
    refIds: string[],
  ): Promise<Set<string>> {
    if (refIds.length === 0) {
      return new Set();
    }
    const rows = await this.prisma.xpTransaction.findMany({
      where: { userId, reason, refId: { in: refIds } },
      select: { refId: true },
    });
    return new Set(rows.map((row) => row.refId as string));
  }

  /**
   * Ghi nhận một ngày học: tăng streak nếu hôm qua có học, về 1 nếu bỏ ngày,
   * và cộng XP điểm danh một lần mỗi ngày theo giờ Việt Nam.
   */
  async recordActivity(
    tx: Tx,
    userId: string,
    now = new Date(),
  ): Promise<void> {
    await this.lockUser(tx, userId);
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { streakDays: true, lastActiveDate: true },
    });
    const today = vnDateString(now);
    const last = user.lastActiveDate
      ? dateOnlyString(user.lastActiveDate)
      : null;
    if (last === today) {
      return;
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        streakDays: last === vnYesterdayString(now) ? user.streakDays + 1 : 1,
        lastActiveDate: vnDateOnly(now),
      },
    });
    await this.earn(tx, {
      userId,
      reason: XpReason.STREAK,
      amount: STREAK_DAILY_XP,
      refId: today,
    });
  }

  async summary(userId: string, now = new Date()): Promise<XpSummaryDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        xpBalance: true,
        xpTotal: true,
        streakDays: true,
        lastActiveDate: true,
      },
    });
    const last = user.lastActiveDate
      ? dateOnlyString(user.lastActiveDate)
      : null;
    // Bỏ lỡ hơn một ngày thì streak hiển thị là 0 dù DB chưa cập nhật.
    const alive = last === vnDateString(now) || last === vnYesterdayString(now);
    return {
      xpBalance: user.xpBalance,
      xpTotal: user.xpTotal,
      streakDays: alive ? user.streakDays : 0,
      lastActiveDate: last,
      activeToday: last === vnDateString(now),
    };
  }

  async transactions(
    userId: string,
    query: XpTransactionQueryDto,
  ): Promise<PaginatedResult<XpTransactionDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.XpTransactionWhereInput = {
      userId,
      ...(query.reason ? { reason: query.reason } : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.xpTransaction.count({ where }),
      this.prisma.xpTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        reason: row.reason,
        amount: row.amount,
        refId: row.refId,
        balanceAfter: row.balanceAfter,
        createdAt: row.createdAt,
      })),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  private async lockUser(tx: Tx, userId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
  }

  private async exists(
    client: Tx | PrismaService,
    change: XpChange,
  ): Promise<boolean> {
    const row = await client.xpTransaction.findUnique({
      where: {
        userId_reason_refId: {
          userId: change.userId,
          reason: change.reason,
          refId: change.refId,
        },
      },
      select: { id: true },
    });
    return row !== null;
  }
}
