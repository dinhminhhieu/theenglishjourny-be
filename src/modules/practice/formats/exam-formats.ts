import type { BandTableKey } from '../scoring/band';
import type { ToeicSection } from '../scoring/toeic';
import { Exam, ExamSkill, IeltsModule } from '../../../generated/prisma/enums';

export type FormatKey =
  'IELTS_ACADEMIC' | 'IELTS_GENERAL' | 'TOEIC_LR' | 'GENERAL';

export type SectionScoring =
  | { kind: 'IELTS_BAND'; table: BandTableKey }
  | { kind: 'TOEIC_SCALED'; section: ToeicSection };

export interface PartSpec {
  part: number;
  name: string;
  nameVi: string;
  /** Tổng số câu (tính theo marks) của part trong một đề đầy đủ. */
  minQuestions: number;
  maxQuestions: number;
  /** ONE: part là đúng một bộ câu hỏi, như một bài đọc IELTS. MANY: ghép nhiều bộ, như TOEIC Part 5. */
  itemSets: 'ONE' | 'MANY';
  questionTypes: readonly string[];
}

export interface SectionSpec {
  skill: ExamSkill;
  name: string;
  nameVi: string;
  durationMinutes: number;
  /** Tổng số câu của kỹ năng trong một đề đầy đủ. */
  questions: number;
  parts: readonly PartSpec[];
  scoring: SectionScoring;
  requiresAudio: boolean;
}

export interface ExamFormat {
  key: FormatKey;
  exam: Exam;
  module: IeltsModule | null;
  name: string;
  nameVi: string;
  /** Phiên bản cấu trúc đề. Kỳ thi đổi cấu trúc thì thêm version mới, đề cũ giữ nguyên. */
  version: string;
  /** PER_SECTION: mỗi kỹ năng đánh số lại từ 1 (IELTS). CONTINUOUS: đánh số liên tục cả đề (TOEIC). */
  numbering: 'PER_SECTION' | 'CONTINUOUS';
  sections: readonly SectionSpec[];
  /** TOEIC_TOTAL: cộng điểm các phần. IELTS cần đủ 4 kỹ năng mới có band tổng nên chưa tính. */
  overall: 'TOEIC_TOTAL' | 'NONE';
}

const IELTS_LISTENING_TYPES = [
  'IELTS_MULTIPLE_CHOICE',
  'IELTS_MULTIPLE_CHOICE_MULTI',
  'IELTS_MATCHING_FEATURES',
  'IELTS_SENTENCE_COMPLETION',
  'IELTS_SUMMARY_COMPLETION',
  'IELTS_NOTE_COMPLETION',
  'IELTS_TABLE_COMPLETION',
  'IELTS_FLOW_CHART_COMPLETION',
  'IELTS_DIAGRAM_LABELLING',
  'IELTS_SHORT_ANSWER',
];
const IELTS_READING_TYPES = [
  ...IELTS_LISTENING_TYPES,
  'IELTS_TRUE_FALSE_NOT_GIVEN',
  'IELTS_YES_NO_NOT_GIVEN',
  'IELTS_MATCHING_HEADINGS',
  'IELTS_MATCHING_INFORMATION',
  'IELTS_MATCHING_SENTENCE_ENDINGS',
];

const IELTS_LISTENING: SectionSpec = {
  skill: ExamSkill.LISTENING,
  name: 'Listening',
  nameVi: 'Nghe',
  durationMinutes: 30,
  questions: 40,
  requiresAudio: true,
  scoring: { kind: 'IELTS_BAND', table: 'LISTENING' },
  parts: [1, 2, 3, 4].map((part) => ({
    part,
    name: `Part ${part}`,
    nameVi: `Phần ${part}`,
    minQuestions: 10,
    maxQuestions: 10,
    itemSets: 'ONE' as const,
    questionTypes: IELTS_LISTENING_TYPES,
  })),
};

const ieltsReading = (
  table: BandTableKey,
  minQuestions: number,
  maxQuestions: number,
): SectionSpec => ({
  skill: ExamSkill.READING,
  name: 'Reading',
  nameVi: 'Đọc',
  durationMinutes: 60,
  questions: 40,
  requiresAudio: false,
  scoring: { kind: 'IELTS_BAND', table },
  parts: [1, 2, 3].map((part) => ({
    part,
    name: `Passage ${part}`,
    nameVi: `Bài đọc ${part}`,
    minQuestions,
    maxQuestions,
    itemSets: 'ONE' as const,
    questionTypes: IELTS_READING_TYPES,
  })),
});

const toeicPart = (
  part: number,
  name: string,
  nameVi: string,
  questions: number,
  type: string,
): PartSpec => ({
  part,
  name,
  nameVi,
  minQuestions: questions,
  maxQuestions: questions,
  itemSets: 'MANY',
  questionTypes: [type],
});

export const EXAM_FORMATS: Readonly<Record<FormatKey, ExamFormat>> = {
  IELTS_ACADEMIC: {
    key: 'IELTS_ACADEMIC',
    exam: Exam.IELTS,
    module: IeltsModule.ACADEMIC,
    name: 'IELTS Academic',
    nameVi: 'IELTS Academic',
    version: '2020',
    numbering: 'PER_SECTION',
    sections: [IELTS_LISTENING, ieltsReading('ACADEMIC_READING', 12, 15)],
    overall: 'NONE',
  },
  IELTS_GENERAL: {
    key: 'IELTS_GENERAL',
    exam: Exam.IELTS,
    module: IeltsModule.GENERAL_TRAINING,
    name: 'IELTS General Training',
    nameVi: 'IELTS General Training',
    version: '2020',
    numbering: 'PER_SECTION',
    sections: [
      IELTS_LISTENING,
      ieltsReading('GENERAL_TRAINING_READING', 10, 16),
    ],
    overall: 'NONE',
  },
  TOEIC_LR: {
    key: 'TOEIC_LR',
    exam: Exam.TOEIC,
    module: null,
    name: 'TOEIC Listening & Reading',
    nameVi: 'TOEIC Nghe & Đọc',
    version: '2018',
    numbering: 'CONTINUOUS',
    overall: 'TOEIC_TOTAL',
    sections: [
      {
        skill: ExamSkill.LISTENING,
        name: 'Listening',
        nameVi: 'Nghe',
        durationMinutes: 45,
        questions: 100,
        requiresAudio: true,
        scoring: { kind: 'TOEIC_SCALED', section: 'LISTENING' },
        parts: [
          toeicPart(1, 'Photographs', 'Mô tả tranh', 6, 'TOEIC_PHOTOGRAPH'),
          toeicPart(
            2,
            'Question-Response',
            'Hỏi - đáp',
            25,
            'TOEIC_QUESTION_RESPONSE',
          ),
          toeicPart(
            3,
            'Conversations',
            'Đoạn hội thoại',
            39,
            'TOEIC_CONVERSATION',
          ),
          toeicPart(4, 'Talks', 'Bài nói ngắn', 30, 'TOEIC_TALK'),
        ],
      },
      {
        skill: ExamSkill.READING,
        name: 'Reading',
        nameVi: 'Đọc',
        durationMinutes: 75,
        questions: 100,
        requiresAudio: false,
        scoring: { kind: 'TOEIC_SCALED', section: 'READING' },
        parts: [
          toeicPart(
            5,
            'Incomplete Sentences',
            'Hoàn thành câu',
            30,
            'TOEIC_INCOMPLETE_SENTENCE',
          ),
          toeicPart(
            6,
            'Text Completion',
            'Hoàn thành đoạn văn',
            16,
            'TOEIC_TEXT_COMPLETION',
          ),
          toeicPart(
            7,
            'Reading Comprehension',
            'Đọc hiểu',
            54,
            'TOEIC_READING_COMPREHENSION',
          ),
        ],
      },
    ],
  },
  GENERAL: {
    key: 'GENERAL',
    exam: Exam.GENERAL,
    module: null,
    name: 'General practice',
    nameVi: 'Bài tập tự do',
    version: '1',
    numbering: 'CONTINUOUS',
    sections: [],
    overall: 'NONE',
  },
};

/** Định dạng của một đề. IELTS thiếu module thì coi như Academic. */
export function getExamFormat(
  exam: Exam,
  module: IeltsModule | null,
): ExamFormat {
  if (exam === Exam.IELTS) {
    return module === IeltsModule.GENERAL_TRAINING
      ? EXAM_FORMATS.IELTS_GENERAL
      : EXAM_FORMATS.IELTS_ACADEMIC;
  }
  return exam === Exam.TOEIC ? EXAM_FORMATS.TOEIC_LR : EXAM_FORMATS.GENERAL;
}

export function findSection(
  format: ExamFormat,
  skill: ExamSkill,
): SectionSpec | undefined {
  return format.sections.find((section) => section.skill === skill);
}

/** Part hợp lệ cho bộ câu hỏi theo kỳ thi và kỹ năng. undefined = kỳ thi không chia part (bài tập tự do). */
export function allowedParts(
  exam: Exam,
  skill: ExamSkill,
): number[] | undefined {
  if (exam === Exam.GENERAL) {
    return undefined;
  }
  const section = findSection(getExamFormat(exam, null), skill);
  return section ? section.parts.map((part) => part.part) : [];
}

/** Kỹ năng được hỗ trợ chấm tự động. Writing, Speaking cần AI nên chưa mở. */
export const AUTO_GRADED_SKILLS: readonly ExamSkill[] = [
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.GRAMMAR,
  ExamSkill.VOCABULARY,
];
