import {
  AttemptMode,
  ExamSkill,
  TestKind,
} from '../../../generated/prisma/enums';
import type { ItemSetAnswerKey } from '../content/content.types';
import type { AttemptStructure } from '../content/structure.types';
import { EXAM_FORMATS, findSection } from '../formats/exam-formats';
import { BAND_TABLE_VERSION, rawToBand } from '../scoring/band';
import type { ResponseValue, SlotResult } from '../scoring/answer.types';
import { scoreQuestion } from '../scoring/score-question';
import { TOEIC_TABLE_VERSION, toeicScaledScore } from '../scoring/toeic';

export interface GradedAnswer {
  questionId: string;
  itemSetId: string;
  itemSetReleaseId: string;
  displayNumber: number;
  marks: number;
  questionType: string;
  skill: ExamSkill;
  part: number | null;
  response: ResponseValue;
  score: number;
  isCorrect: boolean;
  slots: SlotResult[];
}

export type ScaledKind = 'IELTS_BAND' | 'TOEIC_SCALED';

export interface SectionResult {
  skill: ExamSkill;
  title: string;
  raw: number;
  max: number;
  percent: number;
  scaled: { kind: ScaledKind; value: number; table: string } | null;
}

export interface AttemptResultData {
  sections: SectionResult[];
  overall: {
    kind: ScaledKind | 'TOEIC_TOTAL' | 'PERCENT';
    value: number;
  };
  /** Band và điểm TOEIC luôn là ước tính, không phải điểm thi thật. */
  estimated: boolean;
}

export interface GradeOutput {
  answers: GradedAnswer[];
  rawScore: number;
  maxScore: number;
  percent: number;
  result: AttemptResultData;
  /** Điểm tổng để sắp xếp: band, điểm TOEIC hoặc phần trăm. */
  score: number;
}

/**
 * Chấm cả bài làm từ cấu trúc, đáp án các bộ câu hỏi và bài nháp.
 * Chỉ quy đổi band hay điểm TOEIC khi thi thử một đề FULL hoặc SECTION đủ số câu của định dạng.
 */
export function gradeAttempt(input: {
  structure: AttemptStructure;
  answerKeys: ReadonlyMap<string, ItemSetAnswerKey>;
  responses: Readonly<Record<string, ResponseValue>>;
  mode: AttemptMode;
}): GradeOutput {
  const { structure, answerKeys, responses, mode } = input;
  const format = EXAM_FORMATS[structure.formatKey];
  const canScale =
    mode === AttemptMode.EXAM &&
    (structure.kind === TestKind.FULL || structure.kind === TestKind.SECTION);

  const answers: GradedAnswer[] = [];
  const sections: SectionResult[] = structure.sections.map((section) => {
    let raw = 0;
    let max = 0;
    for (const item of section.items) {
      const key = answerKeys.get(item.itemSetReleaseId);
      if (!key) {
        throw new Error(
          `Thiếu đáp án của bản phát hành ${item.itemSetReleaseId}`,
        );
      }
      const entries = Object.entries(key.questions).sort(
        ([, a], [, b]) => a.number - b.number,
      );
      for (const [questionId, entry] of entries) {
        const response = responses[questionId] ?? null;
        const scored = scoreQuestion(
          {
            marks: entry.marks,
            answer: entry.answer,
            wordLimit: entry.wordLimit,
          },
          response,
        );
        raw += scored.score;
        max += scored.maxScore;
        answers.push({
          questionId,
          itemSetId: item.itemSetId,
          itemSetReleaseId: item.itemSetReleaseId,
          displayNumber: item.firstNumber + entry.number - 1,
          marks: entry.marks,
          questionType: entry.type,
          skill: section.skill,
          part: item.part,
          response,
          score: scored.score,
          isCorrect: scored.isCorrect,
          slots: scored.slots,
        });
      }
    }
    const spec = canScale ? findSection(format, section.skill) : undefined;
    let scaled: SectionResult['scaled'] = null;
    if (spec && max === spec.questions) {
      scaled =
        spec.scoring.kind === 'IELTS_BAND'
          ? {
              kind: 'IELTS_BAND',
              value: rawToBand(spec.scoring.table, raw),
              table: `${spec.scoring.table}@${BAND_TABLE_VERSION}`,
            }
          : {
              kind: 'TOEIC_SCALED',
              value: toeicScaledScore(spec.scoring.section, raw),
              table: `TOEIC_${spec.scoring.section}@${TOEIC_TABLE_VERSION}`,
            };
    }
    return {
      skill: section.skill,
      title: section.title,
      raw,
      max,
      percent: percentOf(raw, max),
      scaled,
    };
  });

  const rawScore = sections.reduce((total, section) => total + section.raw, 0);
  const maxScore = sections.reduce((total, section) => total + section.max, 0);
  const percent = percentOf(rawScore, maxScore);
  const scaledSections = sections.filter((section) => section.scaled);

  let overall: AttemptResultData['overall'] = {
    kind: 'PERCENT',
    value: percent,
  };
  if (
    format.overall === 'TOEIC_TOTAL' &&
    scaledSections.length === format.sections.length &&
    scaledSections.length > 1
  ) {
    overall = {
      kind: 'TOEIC_TOTAL',
      value: scaledSections.reduce(
        (total, section) => total + (section.scaled?.value ?? 0),
        0,
      ),
    };
  } else if (scaledSections.length === 1 && sections.length === 1) {
    const only = scaledSections[0].scaled as NonNullable<
      SectionResult['scaled']
    >;
    overall = { kind: only.kind, value: only.value };
  }

  return {
    answers,
    rawScore,
    maxScore,
    percent,
    result: { sections, overall, estimated: scaledSections.length > 0 },
    score: overall.value,
  };
}

function percentOf(raw: number, max: number): number {
  return max > 0 ? Math.round((raw * 100) / max) : 0;
}
