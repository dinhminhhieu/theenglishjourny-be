import type { ClassConstructor } from 'class-transformer';
import { validateJsonByDto } from '../../../common/validators/validate-json-by-dto';
import { Exam, ExamSkill, IeltsModule } from '../../../generated/prisma/enums';
import { allowedParts, AUTO_GRADED_SKILLS } from '../formats/exam-formats';
import {
  getQuestionType,
  GroupShape,
  QuestionShape,
  QuestionTypeSpec,
} from '../formats/question-types';
import { findVariantsOverLimit } from '../scoring/answer-variants';
import type {
  AnswerKind,
  AnswerSpec,
  WordLimit,
} from '../scoring/answer.types';
import {
  ChoicesQuestionContentDto,
  CompletionGroupContentDto,
  EmptyContentDto,
  EvidenceDto,
  MarkerQuestionContentDto,
  MediaGroupContentDto,
  OptionAnswerDto,
  OptionsGroupContentDto,
  OptionSetAnswerDto,
  ParagraphQuestionContentDto,
  StimulusDto,
  TextAnswerDto,
  TextSetAnswerDto,
  TranscriptDto,
} from './content.dto';
import type { Stimulus, TranscriptSegment } from './content.types';

export const MAX_QUESTIONS_PER_GROUP = 60;
export const MAX_MARKS_PER_ITEM_SET = 100;

const GROUP_CONTENT_DTO: Record<GroupShape, ClassConstructor<object>> = {
  MEDIA: MediaGroupContentDto,
  OPTIONS: OptionsGroupContentDto,
  COMPLETION: CompletionGroupContentDto,
};

const QUESTION_CONTENT_DTO: Record<QuestionShape, ClassConstructor<object>> = {
  NONE: EmptyContentDto,
  CHOICES: ChoicesQuestionContentDto,
  PARAGRAPH: ParagraphQuestionContentDto,
  MARKER: MarkerQuestionContentDto,
};

const ANSWER_DTO: Record<AnswerKind, ClassConstructor<object>> = {
  OPTION: OptionAnswerDto,
  OPTION_SET: OptionSetAnswerDto,
  TEXT: TextAnswerDto,
  TEXT_SET: TextSetAnswerDto,
};

const PLACEHOLDER = /\{\{(\d+)\}\}/g;

export interface ItemSetMeta {
  exam: Exam;
  skill: ExamSkill;
  module: IeltsModule | null;
  part: number | null;
}

export interface QuestionDraft {
  id?: string | null;
  prompt?: string | null;
  content?: unknown;
  answer?: unknown;
  explanation?: string | null;
  evidence?: unknown;
  tags?: string[] | null;
  grammarLessonId?: string | null;
}

export interface GroupDraft {
  id?: string | null;
  type: string;
  instructions?: string | null;
  content?: unknown;
  passageKey?: string | null;
  questions: QuestionDraft[];
}

export interface NormalizedQuestion {
  id?: string;
  number: number;
  marks: number;
  sortOrder: number;
  prompt: string | null;
  content: Record<string, unknown>;
  answer: AnswerSpec;
  explanation: string | null;
  evidence: Record<string, unknown> | null;
  tags: string[];
  grammarLessonId: string | null;
}

export interface NormalizedGroup {
  id?: string;
  type: string;
  instructions: string;
  content: Record<string, unknown>;
  passageKey: string | null;
  sortOrder: number;
  questions: NormalizedQuestion[];
}

export interface TreeValidation {
  errors: string[];
  stimulus: Stimulus;
  transcript: TranscriptSegment[];
  groups: NormalizedGroup[];
  questionCount: number;
  totalMarks: number;
}

/** Kiểm tra kỳ thi, kỹ năng, part, module của bộ câu hỏi. */
export function validateItemSetMeta(meta: ItemSetMeta): string[] {
  const errors: string[] = [];
  if (!AUTO_GRADED_SKILLS.includes(meta.skill)) {
    errors.push(
      `Kỹ năng ${meta.skill} chưa hỗ trợ, cần chấm bằng AI nên sẽ mở sau`,
    );
    return errors;
  }
  if (meta.exam !== Exam.GENERAL && !isExamSkill(meta.skill)) {
    errors.push(`${meta.exam} không có kỹ năng ${meta.skill}`);
    return errors;
  }
  const parts = allowedParts(meta.exam, meta.skill);
  if (parts === undefined) {
    if (meta.part !== null) {
      errors.push('Bài tập tự do không chia part, hãy bỏ trống part');
    }
  } else if (meta.part === null || !parts.includes(meta.part)) {
    errors.push(
      `${meta.exam} ${meta.skill} cần part thuộc [${parts.join(', ')}]`,
    );
  }
  if (meta.exam === Exam.IELTS && meta.skill === ExamSkill.READING) {
    if (meta.module === null) {
      errors.push(
        'IELTS Reading cần chọn module ACADEMIC hoặc GENERAL_TRAINING',
      );
    }
  } else if (meta.module !== null) {
    errors.push('Chỉ IELTS Reading mới có module, hãy bỏ trống module');
  }
  return errors;
}

function isExamSkill(skill: ExamSkill): boolean {
  return skill === ExamSkill.LISTENING || skill === ExamSkill.READING;
}

/**
 * Kiểm tra toàn bộ bộ câu hỏi và trả về bản đã chuẩn hoá để lưu: số câu tự tính theo thứ tự và marks,
 * key lạ trong JSON bị lược bỏ. Không ném lỗi, lỗi nằm trong `errors` kèm vị trí để admin sửa.
 */
export function validateItemSetTree(input: {
  meta: ItemSetMeta;
  stimulus?: unknown;
  transcript?: unknown;
  groups: GroupDraft[];
}): TreeValidation {
  const errors = validateItemSetMeta(input.meta);

  const stimulusResult = validateJsonByDto(StimulusDto, input.stimulus ?? {});
  errors.push(...stimulusResult.errors.map((error) => `stimulus.${error}`));
  const stimulus: Stimulus = {
    passages: (stimulusResult.value.passages as Stimulus['passages']) ?? [],
    images: (stimulusResult.value.images as Stimulus['images']) ?? [],
  };
  const passageKeys = stimulus.passages.map((passage) => passage.key);
  if (new Set(passageKeys).size !== passageKeys.length) {
    errors.push('stimulus.passages: key bài đọc bị trùng');
  }

  const transcriptResult = validateJsonByDto(TranscriptDto, {
    segments: input.transcript ?? [],
  });
  errors.push(
    ...transcriptResult.errors.map((error) =>
      error.replace(/^segments/, 'transcript'),
    ),
  );
  const transcript =
    (transcriptResult.value.segments as TranscriptSegment[]) ?? [];

  let nextNumber = 1;
  const groups: NormalizedGroup[] = input.groups.map((group, groupIndex) => {
    const label = `groups[${groupIndex}]`;
    const normalized = validateGroup(
      group,
      groupIndex,
      label,
      input.meta,
      stimulus,
      errors,
    );
    for (const question of normalized.questions) {
      question.number = nextNumber;
      nextNumber += question.marks;
    }
    return normalized;
  });

  const totalMarks = nextNumber - 1;
  if (totalMarks > MAX_MARKS_PER_ITEM_SET) {
    errors.push(
      `Một bộ tối đa ${MAX_MARKS_PER_ITEM_SET} câu, hiện có ${totalMarks}`,
    );
  }
  return {
    errors,
    stimulus,
    transcript,
    groups,
    questionCount: groups.reduce(
      (sum, group) => sum + group.questions.length,
      0,
    ),
    totalMarks,
  };
}

/** Điều kiện thêm khi phát hành: có câu hỏi, Listening có audio, bài đọc có ngữ liệu. */
export function validateForPublish(
  meta: ItemSetMeta,
  tree: TreeValidation,
  audio: { ready: boolean } | null,
): string[] {
  const errors: string[] = [];
  if (tree.questionCount === 0) {
    errors.push('Bộ câu hỏi chưa có câu nào');
  }
  if (meta.exam !== Exam.GENERAL && meta.skill === ExamSkill.LISTENING) {
    if (!audio) {
      errors.push('Bộ Listening cần có audio');
    } else if (!audio.ready) {
      errors.push('Audio chưa upload xong');
    }
  }
  const needsPassage =
    (meta.exam === Exam.IELTS && meta.skill === ExamSkill.READING) ||
    (meta.exam === Exam.TOEIC && meta.part === 7);
  if (needsPassage && tree.stimulus.passages.length === 0) {
    errors.push('Bộ câu hỏi đọc hiểu cần có ít nhất một bài đọc');
  }
  return errors;
}

function validateGroup(
  group: GroupDraft,
  groupIndex: number,
  label: string,
  meta: ItemSetMeta,
  stimulus: Stimulus,
  errors: string[],
): NormalizedGroup {
  const spec = getQuestionType(group.type);
  const empty: NormalizedGroup = {
    id: group.id ?? undefined,
    type: group.type,
    instructions: group.instructions ?? '',
    content: {},
    passageKey: group.passageKey ?? null,
    sortOrder: groupIndex,
    questions: [],
  };
  if (!spec) {
    errors.push(`${label}: dạng câu "${group.type}" không tồn tại`);
    return empty;
  }
  if (spec.exam !== meta.exam) {
    errors.push(
      `${label}: dạng ${spec.code} không dùng cho kỳ thi ${meta.exam}`,
    );
  }
  if (!spec.skills.includes(meta.skill)) {
    errors.push(
      `${label}: dạng ${spec.code} không dùng cho kỹ năng ${meta.skill}`,
    );
  }
  if (spec.parts && (meta.part === null || !spec.parts.includes(meta.part))) {
    errors.push(
      `${label}: dạng ${spec.code} chỉ dùng cho part ${spec.parts.join(', ')}`,
    );
  }

  const contentResult = validateJsonByDto(
    GROUP_CONTENT_DTO[spec.groupShape],
    group.content ?? {},
  );
  errors.push(
    ...contentResult.errors.map((error) => `${label}.content.${error}`),
  );
  const content = contentResult.value;

  if (
    group.passageKey &&
    !stimulus.passages.some((passage) => passage.key === group.passageKey)
  ) {
    errors.push(
      `${label}: passageKey "${group.passageKey}" không có trong stimulus`,
    );
  }
  if (spec.requiresImage && !content.imageUrl) {
    errors.push(`${label}: dạng ${spec.code} cần có imageUrl`);
  }

  const groupOptions = readOptions(content.options);
  checkUniqueKeys(groupOptions, `${label}.content.options`, errors);
  const hasGroupOptions = groupOptions.length > 0;
  const allowReuse =
    typeof content.allowReuse === 'boolean'
      ? content.allowReuse
      : (spec.defaultAllowReuse ?? true);
  const wordLimit = readWordLimit(content.wordLimit);

  if (group.questions.length === 0) {
    errors.push(`${label}: nhóm cần ít nhất một câu hỏi`);
  }
  if (group.questions.length > MAX_QUESTIONS_PER_GROUP) {
    errors.push(`${label}: tối đa ${MAX_QUESTIONS_PER_GROUP} câu mỗi nhóm`);
  }

  const paragraphLabels = collectParagraphLabels(stimulus, group.passageKey);
  const questions = group.questions.map((question, questionIndex) =>
    validateQuestion(question, {
      label: `${label}.questions[${questionIndex}]`,
      questionIndex,
      spec,
      hasGroupOptions,
      groupOptions,
      wordLimit,
      paragraphLabels,
      errors,
    }),
  );

  checkLayout(spec, content, questions, label, errors);
  checkDistinctAnswers(
    spec,
    content,
    questions,
    allowReuse,
    hasGroupOptions,
    label,
    errors,
  );

  return { ...empty, content, questions };
}

interface QuestionContext {
  label: string;
  questionIndex: number;
  spec: QuestionTypeSpec;
  hasGroupOptions: boolean;
  groupOptions: string[];
  wordLimit: WordLimit | null;
  paragraphLabels: Set<string> | null;
  errors: string[];
}

function validateQuestion(
  question: QuestionDraft,
  ctx: QuestionContext,
): NormalizedQuestion {
  const { label, spec, errors } = ctx;
  const contentResult = validateJsonByDto(
    QUESTION_CONTENT_DTO[spec.questionShape],
    question.content ?? {},
  );
  errors.push(
    ...contentResult.errors.map((error) => `${label}.content.${error}`),
  );
  const content = contentResult.value;

  const questionOptions = readOptions(content.options);
  checkUniqueKeys(questionOptions, `${label}.content.options`, errors);

  if (
    spec.questionShape === 'PARAGRAPH' &&
    typeof content.paragraph === 'string' &&
    ctx.paragraphLabels &&
    !ctx.paragraphLabels.has(content.paragraph)
  ) {
    errors.push(`${label}: đoạn ${content.paragraph} không có trong bài đọc`);
  }

  const answer = validateAnswer(question.answer, ctx, questionOptions);

  const evidenceResult =
    question.evidence === undefined || question.evidence === null
      ? null
      : validateJsonByDto(EvidenceDto, question.evidence);
  if (evidenceResult) {
    errors.push(
      ...evidenceResult.errors.map((error) => `${label}.evidence.${error}`),
    );
  }

  return {
    id: question.id ?? undefined,
    number: 0,
    marks: marksOf(answer),
    sortOrder: ctx.questionIndex,
    prompt: question.prompt?.trim() ? question.prompt : null,
    content,
    answer,
    explanation: question.explanation?.trim() ? question.explanation : null,
    evidence: evidenceResult ? evidenceResult.value : null,
    tags: [
      ...new Set(
        (question.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
      ),
    ],
    grammarLessonId: question.grammarLessonId ?? null,
  };
}

function validateAnswer(
  raw: unknown,
  ctx: QuestionContext,
  questionOptions: string[],
): AnswerSpec {
  const { label, spec, errors } = ctx;
  const fallback: AnswerSpec = { kind: 'OPTION', keys: [] };
  const kind = (raw as { kind?: unknown } | null)?.kind;
  if (typeof kind !== 'string' || !(kind in ANSWER_DTO)) {
    errors.push(
      `${label}.answer: kind phải là OPTION, OPTION_SET, TEXT hoặc TEXT_SET`,
    );
    return fallback;
  }
  const answerKind = kind as AnswerKind;
  if (!spec.answerKinds.includes(answerKind)) {
    errors.push(
      `${label}.answer: dạng ${spec.code} chỉ nhận đáp án ${spec.answerKinds.join(', ')}`,
    );
  }
  const result = validateJsonByDto(ANSWER_DTO[answerKind], raw);
  errors.push(...result.errors.map((error) => `${label}.answer.${error}`));
  const answer = result.value as unknown as AnswerSpec;
  if (result.errors.length > 0) {
    return answer;
  }

  const isChoice = answer.kind === 'OPTION' || answer.kind === 'OPTION_SET';
  const optionSource = spec.fixedOptions
    ? spec.fixedOptions.map((option) => option.key)
    : spec.questionShape === 'CHOICES'
      ? questionOptions
      : ctx.groupOptions;

  if (spec.groupShape === 'COMPLETION' && spec.questionShape !== 'CHOICES') {
    if (ctx.hasGroupOptions && !isChoice) {
      errors.push(
        `${label}.answer: nhóm có word bank thì đáp án phải là OPTION`,
      );
    }
    if (!ctx.hasGroupOptions && isChoice) {
      errors.push(
        `${label}.answer: nhóm không có word bank thì đáp án phải là chữ (TEXT)`,
      );
    }
  }

  if (isChoice) {
    const keys = answer.keys.map((key) => key.trim());
    answer.keys = keys;
    if (new Set(keys).size !== keys.length) {
      errors.push(`${label}.answer: key đáp án bị trùng`);
    }
    const missing = keys.filter((key) => !optionSource.includes(key));
    if (optionSource.length === 0) {
      errors.push(`${label}.answer: câu chưa có danh sách lựa chọn`);
    } else if (missing.length > 0) {
      errors.push(
        `${label}.answer: key ${missing.join(', ')} không có trong danh sách lựa chọn`,
      );
    }
    if (answer.kind === 'OPTION_SET' && keys.length >= optionSource.length) {
      errors.push(`${label}.answer: số đáp án phải ít hơn số lựa chọn`);
    }
    return answer;
  }

  const strict = answer.strict === true;
  const acceptedLists =
    answer.kind === 'TEXT'
      ? [answer.accepted]
      : answer.items.map((item) => item.accepted);
  for (const accepted of acceptedLists) {
    for (const value of accepted) {
      if (!hasBalancedParentheses(value)) {
        errors.push(`${label}.answer: "${value}" có dấu ngoặc không khớp`);
      }
    }
  }
  if (ctx.wordLimit) {
    const over = acceptedLists.flatMap((accepted) =>
      findVariantsOverLimit(accepted, ctx.wordLimit as WordLimit, strict),
    );
    if (over.length > 0) {
      errors.push(
        `${label}.answer: "${over.join('", "')}" vượt giới hạn số từ của nhóm`,
      );
    }
  } else if (spec.requiresWordLimit && !ctx.hasGroupOptions) {
    errors.push(
      `${label}: nhóm điền từ của ${spec.exam} cần content.wordLimit`,
    );
  }
  return answer;
}

function marksOf(answer: AnswerSpec): number {
  if (answer.kind === 'OPTION_SET') {
    return Math.max(1, answer.keys?.length ?? 1);
  }
  if (answer.kind === 'TEXT_SET') {
    return Math.max(1, answer.items?.length ?? 1);
  }
  return 1;
}

function checkLayout(
  spec: QuestionTypeSpec,
  content: Record<string, unknown>,
  questions: NormalizedQuestion[],
  label: string,
  errors: string[],
): void {
  if (spec.groupShape !== 'COMPLETION' || !spec.layout) {
    return;
  }
  const template =
    typeof content.template === 'string' ? content.template : null;
  const rows = Array.isArray(content.rows) ? content.rows : null;
  const steps = Array.isArray(content.steps)
    ? (content.steps as string[])
    : null;

  if (rows) {
    rows.forEach((row: unknown, index) => {
      if (!Array.isArray(row) || row.some((cell) => typeof cell !== 'string')) {
        errors.push(`${label}.content.rows[${index}]: mỗi dòng là mảng chuỗi`);
      }
    });
  }

  const required: Record<string, [boolean, string]> = {
    TEMPLATE: [template !== null, 'template'],
    TABLE: [rows !== null && Array.isArray(content.columns), 'columns và rows'],
    STEPS: [steps !== null, 'steps'],
    IMAGE: [typeof content.imageUrl === 'string', 'imageUrl'],
  };
  const need = required[spec.layout];
  if (need && !need[0]) {
    errors.push(`${label}: dạng ${spec.code} cần content.${need[1]}`);
  }
  if (spec.layout === 'NONE' && (template || rows || steps)) {
    errors.push(
      `${label}: dạng ${spec.code} không dùng template, bảng hay sơ đồ`,
    );
  }

  const texts = [
    template ?? '',
    ...(rows ?? []).flatMap((row: unknown) => (Array.isArray(row) ? row : [])),
    ...(steps ?? []),
  ].filter((text): text is string => typeof text === 'string');
  const usesPlaceholders =
    spec.layout === 'TEMPLATE' ||
    spec.layout === 'TABLE' ||
    spec.layout === 'STEPS' ||
    (spec.layout === 'ANY' && texts.some((text) => text.length > 0));
  if (!usesPlaceholders) {
    return;
  }
  if (questions.some((question) => question.marks !== 1)) {
    errors.push(
      `${label}: nhóm có chỗ trống thì mỗi câu chỉ một ô (marks = 1)`,
    );
  }
  const counts = new Map<number, number>();
  for (const text of texts) {
    for (const match of text.matchAll(PLACEHOLDER)) {
      const index = Number(match[1]);
      counts.set(index, (counts.get(index) ?? 0) + 1);
    }
  }
  const expected = questions.map((_, index) => index + 1);
  const missing = expected.filter((index) => !counts.has(index));
  const extra = [...counts.keys()].filter((index) => !expected.includes(index));
  const duplicated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([index]) => index);
  if (missing.length > 0) {
    errors.push(`${label}: thiếu chỗ trống {{${missing.join('}}, {{')}}}`);
  }
  if (extra.length > 0) {
    errors.push(
      `${label}: chỗ trống {{${extra.join('}}, {{')}}} không ứng với câu nào (nhóm có ${questions.length} câu)`,
    );
  }
  if (duplicated.length > 0) {
    errors.push(
      `${label}: chỗ trống {{${duplicated.join('}}, {{')}}} xuất hiện nhiều lần`,
    );
  }
}

function checkDistinctAnswers(
  spec: QuestionTypeSpec,
  content: Record<string, unknown>,
  questions: NormalizedQuestion[],
  allowReuse: boolean,
  hasGroupOptions: boolean,
  label: string,
  errors: string[],
): void {
  if (hasGroupOptions && !allowReuse) {
    const used = questions.flatMap((question) =>
      question.answer.kind === 'OPTION' ? question.answer.keys.slice(0, 1) : [],
    );
    const duplicated = [
      ...new Set(used.filter((key, index) => used.indexOf(key) !== index)),
    ];
    if (duplicated.length > 0) {
      errors.push(
        `${label}: lựa chọn ${duplicated.join(', ')} dùng cho nhiều câu, bật allowReuse nếu đề cho phép`,
      );
    }
  }
  if (spec.questionShape === 'PARAGRAPH') {
    const paragraphs = questions
      .map((question) => question.content.paragraph)
      .filter((value): value is string => typeof value === 'string');
    if (new Set(paragraphs).size !== paragraphs.length) {
      errors.push(`${label}: mỗi đoạn văn chỉ được hỏi một lần`);
    }
    const example = content.example as
      { paragraph?: string; key?: string } | undefined;
    if (example?.key) {
      const usesExampleKey = questions.some(
        (question) =>
          question.answer.kind === 'OPTION' &&
          question.answer.keys.includes(example.key as string),
      );
      if (usesExampleKey) {
        errors.push(
          `${label}: tiêu đề ${example.key} đã dùng làm ví dụ, không được là đáp án`,
        );
      }
      if (example.paragraph && paragraphs.includes(example.paragraph)) {
        errors.push(`${label}: đoạn ${example.paragraph} đã dùng làm ví dụ`);
      }
    }
  }
}

function readOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((option: unknown) => (option as { key?: unknown })?.key)
    .filter((key): key is string => typeof key === 'string');
}

function checkUniqueKeys(
  keys: string[],
  label: string,
  errors: string[],
): void {
  if (new Set(keys).size !== keys.length) {
    errors.push(`${label}: key lựa chọn bị trùng`);
  }
}

function readWordLimit(value: unknown): WordLimit | null {
  const limit = value as WordLimit | undefined;
  return limit &&
    typeof limit.maxWords === 'number' &&
    typeof limit.allowNumber === 'boolean'
    ? { maxWords: limit.maxWords, allowNumber: limit.allowNumber }
    : null;
}

function collectParagraphLabels(
  stimulus: Stimulus,
  passageKey: string | null | undefined,
): Set<string> | null {
  const passages = passageKey
    ? stimulus.passages.filter((passage) => passage.key === passageKey)
    : stimulus.passages;
  const labels = passages.flatMap((passage) =>
    passage.paragraphs.map((paragraph) => paragraph.label).filter(Boolean),
  ) as string[];
  return labels.length > 0 ? new Set(labels) : null;
}

function hasBalancedParentheses(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '(') {
      depth++;
      if (depth > 1) {
        return false;
      }
    } else if (char === ')') {
      depth--;
      if (depth < 0) {
        return false;
      }
    }
  }
  return depth === 0;
}
