import type { AnswerKind } from '../scoring/answer.types';
import { Exam, ExamSkill } from '../../../generated/prisma/enums';

/** Hình dạng `content` của nhóm câu. */
export type GroupShape = 'MEDIA' | 'OPTIONS' | 'COMPLETION';
/** Hình dạng `content` của từng câu. */
export type QuestionShape = 'NONE' | 'CHOICES' | 'PARAGRAPH' | 'MARKER';
/**
 * Bố cục của nhóm điền từ:
 * TEMPLATE = đoạn văn có chỗ trống, TABLE = bảng, STEPS = sơ đồ các bước, IMAGE = hình có nhãn,
 * NONE = mỗi câu một dòng, ANY = tuỳ chọn một trong các bố cục trên.
 */
export type CompletionLayout =
  'TEMPLATE' | 'TABLE' | 'STEPS' | 'IMAGE' | 'NONE' | 'ANY';

export interface FixedOption {
  key: string;
  text: string;
}

export interface QuestionTypeSpec {
  code: string;
  exam: Exam;
  skills: readonly ExamSkill[];
  /** Part được phép. Bỏ trống = mọi part của kỹ năng. */
  parts?: readonly number[];
  name: string;
  nameVi: string;
  answerKinds: readonly AnswerKind[];
  groupShape: GroupShape;
  questionShape: QuestionShape;
  layout?: CompletionLayout;
  /** Lựa chọn cố định, vd TRUE/FALSE/NOT GIVEN hay A-D của TOEIC. */
  fixedOptions?: readonly FixedOption[];
  /** TOEIC Part 1, 2: lựa chọn chỉ đọc trong audio, đề không in chữ. */
  optionsAudioOnly?: boolean;
  /** Nhóm bắt buộc có ảnh, vd TOEIC Part 1. */
  requiresImage?: boolean;
  /** Đáp án điền từ bắt buộc có giới hạn số từ, như đề IELTS. */
  requiresWordLimit?: boolean;
  /** Mặc định một lựa chọn được dùng cho nhiều câu. */
  defaultAllowReuse?: boolean;
}

const letters = (keys: string[]): FixedOption[] =>
  keys.map((key) => ({ key, text: key }));

const TFNG: FixedOption[] = [
  { key: 'TRUE', text: 'TRUE' },
  { key: 'FALSE', text: 'FALSE' },
  { key: 'NOT_GIVEN', text: 'NOT GIVEN' },
];
const YNNG: FixedOption[] = [
  { key: 'YES', text: 'YES' },
  { key: 'NO', text: 'NO' },
  { key: 'NOT_GIVEN', text: 'NOT GIVEN' },
];
const TRUE_FALSE: FixedOption[] = [
  { key: 'TRUE', text: 'True' },
  { key: 'FALSE', text: 'False' },
];

const L = ExamSkill.LISTENING;
const R = ExamSkill.READING;
const ALL_OBJECTIVE_SKILLS = [
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.GRAMMAR,
  ExamSkill.VOCABULARY,
];

const ielts = (spec: Omit<QuestionTypeSpec, 'exam'>): QuestionTypeSpec => ({
  exam: Exam.IELTS,
  ...spec,
});
const toeic = (spec: Omit<QuestionTypeSpec, 'exam'>): QuestionTypeSpec => ({
  exam: Exam.TOEIC,
  ...spec,
});
const general = (
  spec: Omit<QuestionTypeSpec, 'exam' | 'skills'>,
): QuestionTypeSpec => ({
  exam: Exam.GENERAL,
  skills: ALL_OBJECTIVE_SKILLS,
  ...spec,
});

const completion = {
  answerKinds: ['TEXT', 'OPTION'] as AnswerKind[],
  groupShape: 'COMPLETION' as const,
  questionShape: 'NONE' as const,
  requiresWordLimit: true,
  defaultAllowReuse: false,
};

/** Bảng đăng ký mọi dạng câu. Thêm dạng mới chỉ cần thêm một dòng, không cần migration. */
export const QUESTION_TYPE_LIST: readonly QuestionTypeSpec[] = [
  // ---- IELTS ----
  ielts({
    code: 'IELTS_MULTIPLE_CHOICE',
    skills: [L, R],
    name: 'Multiple choice',
    nameVi: 'Trắc nghiệm một đáp án',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  ielts({
    code: 'IELTS_MULTIPLE_CHOICE_MULTI',
    skills: [L, R],
    name: 'Multiple choice (choose more than one)',
    nameVi: 'Trắc nghiệm chọn nhiều đáp án',
    answerKinds: ['OPTION_SET'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  ielts({
    code: 'IELTS_TRUE_FALSE_NOT_GIVEN',
    skills: [R],
    name: 'True / False / Not Given',
    nameVi: 'True / False / Not Given',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'NONE',
    fixedOptions: TFNG,
  }),
  ielts({
    code: 'IELTS_YES_NO_NOT_GIVEN',
    skills: [R],
    name: 'Yes / No / Not Given',
    nameVi: 'Yes / No / Not Given',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'NONE',
    fixedOptions: YNNG,
  }),
  ielts({
    code: 'IELTS_MATCHING_HEADINGS',
    skills: [R],
    name: 'Matching headings',
    nameVi: 'Nối tiêu đề với đoạn văn',
    answerKinds: ['OPTION'],
    groupShape: 'OPTIONS',
    questionShape: 'PARAGRAPH',
    defaultAllowReuse: false,
  }),
  ielts({
    code: 'IELTS_MATCHING_INFORMATION',
    skills: [R],
    name: 'Matching information',
    nameVi: 'Tìm đoạn văn chứa thông tin',
    answerKinds: ['OPTION'],
    groupShape: 'OPTIONS',
    questionShape: 'NONE',
    defaultAllowReuse: true,
  }),
  ielts({
    code: 'IELTS_MATCHING_FEATURES',
    skills: [L, R],
    name: 'Matching features',
    nameVi: 'Nối đặc điểm',
    answerKinds: ['OPTION'],
    groupShape: 'OPTIONS',
    questionShape: 'NONE',
    defaultAllowReuse: true,
  }),
  ielts({
    code: 'IELTS_MATCHING_SENTENCE_ENDINGS',
    skills: [R],
    name: 'Matching sentence endings',
    nameVi: 'Nối vế câu',
    answerKinds: ['OPTION'],
    groupShape: 'OPTIONS',
    questionShape: 'NONE',
    defaultAllowReuse: false,
  }),
  ielts({
    code: 'IELTS_SENTENCE_COMPLETION',
    skills: [L, R],
    name: 'Sentence completion',
    nameVi: 'Hoàn thành câu',
    ...completion,
    layout: 'NONE',
  }),
  ielts({
    code: 'IELTS_SUMMARY_COMPLETION',
    skills: [L, R],
    name: 'Summary completion',
    nameVi: 'Hoàn thành đoạn tóm tắt',
    ...completion,
    layout: 'TEMPLATE',
  }),
  ielts({
    code: 'IELTS_NOTE_COMPLETION',
    skills: [L, R],
    name: 'Note / form completion',
    nameVi: 'Hoàn thành ghi chú, biểu mẫu',
    ...completion,
    layout: 'TEMPLATE',
  }),
  ielts({
    code: 'IELTS_TABLE_COMPLETION',
    skills: [L, R],
    name: 'Table completion',
    nameVi: 'Hoàn thành bảng',
    ...completion,
    layout: 'TABLE',
  }),
  ielts({
    code: 'IELTS_FLOW_CHART_COMPLETION',
    skills: [L, R],
    name: 'Flow-chart completion',
    nameVi: 'Hoàn thành sơ đồ quy trình',
    ...completion,
    layout: 'STEPS',
  }),
  ielts({
    code: 'IELTS_DIAGRAM_LABELLING',
    skills: [L, R],
    name: 'Diagram / map / plan labelling',
    nameVi: 'Điền nhãn sơ đồ, bản đồ',
    ...completion,
    questionShape: 'MARKER',
    layout: 'IMAGE',
  }),
  ielts({
    code: 'IELTS_SHORT_ANSWER',
    skills: [L, R],
    name: 'Short-answer questions',
    nameVi: 'Trả lời ngắn',
    ...completion,
    answerKinds: ['TEXT', 'TEXT_SET'],
    layout: 'NONE',
  }),
  // ---- TOEIC Listening & Reading ----
  toeic({
    code: 'TOEIC_PHOTOGRAPH',
    skills: [L],
    parts: [1],
    name: 'Photographs',
    nameVi: 'Mô tả tranh',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'NONE',
    fixedOptions: letters(['A', 'B', 'C', 'D']),
    optionsAudioOnly: true,
    requiresImage: true,
  }),
  toeic({
    code: 'TOEIC_QUESTION_RESPONSE',
    skills: [L],
    parts: [2],
    name: 'Question-Response',
    nameVi: 'Hỏi - đáp',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'NONE',
    fixedOptions: letters(['A', 'B', 'C']),
    optionsAudioOnly: true,
  }),
  toeic({
    code: 'TOEIC_CONVERSATION',
    skills: [L],
    parts: [3],
    name: 'Conversations',
    nameVi: 'Đoạn hội thoại',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  toeic({
    code: 'TOEIC_TALK',
    skills: [L],
    parts: [4],
    name: 'Talks',
    nameVi: 'Bài nói ngắn',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  toeic({
    code: 'TOEIC_INCOMPLETE_SENTENCE',
    skills: [R],
    parts: [5],
    name: 'Incomplete Sentences',
    nameVi: 'Hoàn thành câu',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  toeic({
    code: 'TOEIC_TEXT_COMPLETION',
    skills: [R],
    parts: [6],
    name: 'Text Completion',
    nameVi: 'Hoàn thành đoạn văn',
    answerKinds: ['OPTION'],
    groupShape: 'COMPLETION',
    questionShape: 'CHOICES',
    layout: 'TEMPLATE',
  }),
  toeic({
    code: 'TOEIC_READING_COMPREHENSION',
    skills: [R],
    parts: [7],
    name: 'Reading Comprehension',
    nameVi: 'Đọc hiểu',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  // ---- Bài tập tự do ----
  general({
    code: 'GENERAL_MULTIPLE_CHOICE',
    name: 'Multiple choice',
    nameVi: 'Trắc nghiệm một đáp án',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  general({
    code: 'GENERAL_MULTI_SELECT',
    name: 'Multiple select',
    nameVi: 'Chọn nhiều đáp án',
    answerKinds: ['OPTION_SET'],
    groupShape: 'MEDIA',
    questionShape: 'CHOICES',
  }),
  general({
    code: 'GENERAL_TRUE_FALSE',
    name: 'True / False',
    nameVi: 'Đúng / Sai',
    answerKinds: ['OPTION'],
    groupShape: 'MEDIA',
    questionShape: 'NONE',
    fixedOptions: TRUE_FALSE,
  }),
  general({
    code: 'GENERAL_MATCHING',
    name: 'Matching',
    nameVi: 'Nối',
    answerKinds: ['OPTION'],
    groupShape: 'OPTIONS',
    questionShape: 'NONE',
    defaultAllowReuse: true,
  }),
  general({
    code: 'GENERAL_FILL_BLANK',
    name: 'Fill in the blanks',
    nameVi: 'Điền vào chỗ trống',
    answerKinds: ['TEXT', 'TEXT_SET', 'OPTION'],
    groupShape: 'COMPLETION',
    questionShape: 'NONE',
    layout: 'ANY',
    defaultAllowReuse: false,
  }),
];

export const QUESTION_TYPES: ReadonlyMap<string, QuestionTypeSpec> = new Map(
  QUESTION_TYPE_LIST.map((spec) => [spec.code, spec]),
);

export function getQuestionType(code: string): QuestionTypeSpec | undefined {
  return QUESTION_TYPES.get(code);
}
