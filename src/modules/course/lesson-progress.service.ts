import { Injectable } from '@nestjs/common';
import {
  LessonProgressStatus,
  Prisma,
  XpReason,
} from '../../generated/prisma/client';
import { XpService } from '../xp/xp.service';

type Tx = Prisma.TransactionClient;

export interface BlockCompletion {
  /** false nếu block đã hoàn thành từ trước. */
  newlyCompleted: boolean;
  lessonCompleted: boolean;
  completedBlocks: number;
  totalBlocks: number;
}

/** Tiến độ unit: đánh dấu block xong, xong đủ block thì xong unit, cộng XP một lần cho mỗi mốc. */
@Injectable()
export class LessonProgressService {
  constructor(private readonly xp: XpService) {}

  /** Chạy trong transaction của nghiệp vụ gọi tới (nộp bài hoặc bấm hoàn thành) để XP và tiến độ luôn khớp nhau. */
  async completeBlock(
    tx: Tx,
    userId: string,
    blockId: string,
    now = new Date(),
  ): Promise<BlockCompletion> {
    const block = await tx.lessonBlock.findUniqueOrThrow({
      where: { id: blockId },
      select: {
        id: true,
        xpReward: true,
        lesson: {
          select: {
            id: true,
            xpReward: true,
            blocks: { select: { id: true } },
          },
        },
      },
    });
    const { lesson } = block;
    const key = { userId_lessonId: { userId, lessonId: lesson.id } };
    // Upsert có update để khoá dòng tiến độ, hai block xong cùng lúc không ghi đè nhau.
    await tx.userLessonProgress.upsert({
      where: key,
      create: {
        userId,
        lessonId: lesson.id,
        status: LessonProgressStatus.IN_PROGRESS,
      },
      update: { updatedAt: now },
    });
    const progress = await tx.userLessonProgress.findUniqueOrThrow({
      where: key,
    });
    const blockIds = lesson.blocks.map((item) => item.id);
    const alreadyDone = progress.completedBlockIds.includes(blockId);
    const completedIds = alreadyDone
      ? progress.completedBlockIds
      : [...progress.completedBlockIds, blockId];
    const lessonCompleted = blockIds.every((id) => completedIds.includes(id));
    const wasCompleted = progress.status === LessonProgressStatus.COMPLETED;

    if (!alreadyDone || (lessonCompleted && !wasCompleted)) {
      await tx.userLessonProgress.update({
        where: key,
        data: {
          completedBlockIds: completedIds,
          status: lessonCompleted
            ? LessonProgressStatus.COMPLETED
            : LessonProgressStatus.IN_PROGRESS,
          completedAt: lessonCompleted ? (progress.completedAt ?? now) : null,
        },
      });
    }

    await this.xp.earn(tx, {
      userId,
      reason: XpReason.BLOCK_COMPLETED,
      amount: block.xpReward,
      refId: block.id,
    });
    if (lessonCompleted) {
      await this.xp.earn(tx, {
        userId,
        reason: XpReason.LESSON_COMPLETED,
        amount: lesson.xpReward,
        refId: lesson.id,
      });
    }
    await this.xp.recordActivity(tx, userId, now);

    return {
      newlyCompleted: !alreadyDone,
      lessonCompleted,
      completedBlocks: blockIds.filter((id) => completedIds.includes(id))
        .length,
      totalBlocks: blockIds.length,
    };
  }
}
