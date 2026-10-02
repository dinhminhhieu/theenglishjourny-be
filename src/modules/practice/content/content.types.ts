import type { AnswerSpec, WordLimit } from '../scoring/answer.types';
import type {
  CefrLevel,
  Exam,
  ExamSkill,
  IeltsModule,
} from '../../../generated/prisma/enums';

export interface Paragraph {
  label?: string;
  markdown: string;
}

export interface Passage {
  key: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  paragraphs: Paragraph[];
  footnote?: string;
}

export interface StimulusImage {
  url: string;
  alt?: string;
}

export interface Stimulus {
  passages: Passage[];
  images: StimulusImage[];
}

export interface TranscriptSegment {
  startSec: number;
  endSec?: number;
  speaker?: string;
  text: string;
}

export interface PublicOption {
  key: string;
  text?: string;
  imageUrl?: string;
}

/** Cách người học trả lời một câu, FE dựa vào đây để vẽ ô chọn hay ô nhập. */
export type QuestionInput =
  | {
      kind: 'CHOICE';
      options: PublicOption[];
      /** true = chọn nhiều, gửi mảng key. */
      multiple: boolean;
      maxChoices: number;
      /** TOEIC Part 1, 2: lựa chọn chỉ có trong audio, không hiện chữ. */
      audioOnly: boolean;
    }
  | {
      kind: 'TEXT';
      /** Số ô nhập. Lớn hơn 1 thì gửi mảng chuỗi. */
      blanks: number;
      wordLimit: WordLimit | null;
      /** Câu hướng dẫn chuẩn, vd "NO MORE THAN TWO WORDS AND/OR A NUMBER". */
      wordLimitText: string | null;
    };

export interface PublicQuestion {
  id: string;
  /** Số thứ tự trong bộ câu hỏi. Số hiển thị trong đề = số câu đầu tiên của bộ + number - 1. */
  number: number;
  marks: number;
  prompt: string | null;
  content: Record<string, unknown>;
  input: QuestionInput;
}

export interface PublicGroup {
  id: string;
  type: string;
  typeName: string;
  instructions: string;
  content: Record<string, unknown>;
  passageKey: string | null;
  questions: PublicQuestion[];
}

/** Nội dung bản phát hành dành cho người học. Không có đáp án, giải thích, transcript hay nguồn. */
export interface PublicItemSetContent {
  itemSetId: string;
  code: string;
  title: string;
  description: string | null;
  exam: Exam;
  skill: ExamSkill;
  module: IeltsModule | null;
  part: number | null;
  difficulty: number | null;
  levelFrom: CefrLevel | null;
  levelTo: CefrLevel | null;
  stimulus: Stimulus;
  hasAudio: boolean;
  audioDurationSeconds: number | null;
  groups: PublicGroup[];
  questionCount: number;
  totalMarks: number;
}

export interface AnswerKeyEntry {
  number: number;
  marks: number;
  type: string;
  answer: AnswerSpec;
  wordLimit: WordLimit | null;
  explanation: string | null;
  evidence: Record<string, unknown> | null;
  tags: string[];
  grammarLessonId: string | null;
}

/** Phần bí mật của bản phát hành. Chỉ đọc khi chấm và xem lại bài. */
export interface ItemSetAnswerKey {
  transcript: TranscriptSegment[];
  questions: Record<string, AnswerKeyEntry>;
}
