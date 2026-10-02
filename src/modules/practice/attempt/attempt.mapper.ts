import { decimalToNumber } from '../../../common/utils/decimal.util';
import type { Attempt } from '../../../generated/prisma/client';
import type { AttemptSummaryDto, AttemptTimerDto } from './dto/attempt.dto';
import type { AttemptResultData } from './grade-attempt';

export function toAttemptSummary(row: Attempt): AttemptSummaryDto {
  const result = row.result as AttemptResultData | null;
  return {
    id: row.id,
    title: row.title,
    exam: row.exam,
    mode: row.mode,
    source: row.source,
    status: row.status,
    testId: row.testId,
    lessonBlockId: row.lessonBlockId,
    questionCount: row.questionCount,
    maxScore: row.maxScore,
    rawScore: row.rawScore,
    percent: row.percent,
    score: decimalToNumber(row.score),
    overall: result?.overall ?? null,
    startedAt: row.startedAt,
    deadlineAt: row.deadlineAt,
    submittedAt: row.submittedAt,
    submitReason: row.submitReason,
    gradedAt: row.gradedAt,
  };
}

export function toTimer(
  deadlineAt: Date | null,
  graceSeconds: number,
  now = new Date(),
): AttemptTimerDto {
  return {
    serverNow: now,
    deadlineAt,
    remainingSeconds: deadlineAt
      ? Math.max(0, Math.ceil((deadlineAt.getTime() - now.getTime()) / 1000))
      : null,
    graceSeconds,
  };
}
