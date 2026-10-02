import type {
  CefrLevel,
  Exam,
  ExamSkill,
  IeltsModule,
} from '../../../generated/prisma/enums';
import { getQuestionType } from '../formats/question-types';
import type { AnswerSpec, WordLimit } from '../scoring/answer.types';
import { describeWordLimit } from '../scoring/word-limit';
import type {
  AnswerKeyEntry,
  ItemSetAnswerKey,
  PublicGroup,
  PublicItemSetContent,
  PublicOption,
  QuestionInput,
  Stimulus,
  TranscriptSegment,
} from './content.types';

export interface ReleaseSourceQuestion {
  id: string;
  number: number;
  marks: number;
  prompt: string | null;
  content: unknown;
  answer: unknown;
  explanation: string | null;
  evidence: unknown;
  tags: string[];
  grammarLessonId: string | null;
}

export interface ReleaseSourceGroup {
  id: string;
  type: string;
  instructions: string;
  content: unknown;
  passageKey: string | null;
  questions: ReleaseSourceQuestion[];
}

export interface ReleaseSource {
  id: string;
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
  stimulus: unknown;
  transcript: unknown;
  audio: { durationSeconds: number | null } | null;
  groups: ReleaseSourceGroup[];
}

export interface BuiltRelease {
  content: PublicItemSetContent;
  answerKey: ItemSetAnswerKey;
  questionCount: number;
  totalMarks: number;
}

/**
 * Tách bộ câu hỏi thành hai phần: nội dung cho người học và phần bí mật (đáp án, giải thích, transcript).
 * Hàm thuần, dùng cho phát hành, xem trước và seed. Dữ liệu đầu vào phải đã qua validateItemSetTree.
 */
export function buildItemSetRelease(source: ReleaseSource): BuiltRelease {
  const stimulus = asStimulus(source.stimulus);
  const answerKeyQuestions: Record<string, AnswerKeyEntry> = {};
  let totalMarks = 0;
  let questionCount = 0;

  const groups: PublicGroup[] = source.groups.map((group) => {
    const spec = getQuestionType(group.type);
    const groupContent = asRecord(group.content);
    const wordLimit = readWordLimit(groupContent.wordLimit);
    return {
      id: group.id,
      type: group.type,
      typeName: spec?.nameVi ?? group.type,
      instructions: group.instructions,
      content: groupContent,
      passageKey: group.passageKey,
      questions: group.questions.map((question) => {
        const answer = question.answer as AnswerSpec;
        const content = asRecord(question.content);
        totalMarks += question.marks;
        questionCount += 1;
        answerKeyQuestions[question.id] = {
          number: question.number,
          marks: question.marks,
          type: group.type,
          answer,
          wordLimit,
          explanation: question.explanation,
          evidence: question.evidence ? asRecord(question.evidence) : null,
          tags: question.tags,
          grammarLessonId: question.grammarLessonId,
        };
        return {
          id: question.id,
          number: question.number,
          marks: question.marks,
          prompt: question.prompt,
          content,
          input: buildInput(
            group.type,
            groupContent,
            content,
            answer,
            question.marks,
            wordLimit,
          ),
        };
      }),
    };
  });

  return {
    content: {
      itemSetId: source.id,
      code: source.code,
      title: source.title,
      description: source.description,
      exam: source.exam,
      skill: source.skill,
      module: source.module,
      part: source.part,
      difficulty: source.difficulty,
      levelFrom: source.levelFrom,
      levelTo: source.levelTo,
      stimulus,
      hasAudio: source.audio !== null,
      audioDurationSeconds: source.audio?.durationSeconds ?? null,
      groups,
      questionCount,
      totalMarks,
    },
    answerKey: {
      transcript: Array.isArray(source.transcript)
        ? (source.transcript as TranscriptSegment[])
        : [],
      questions: answerKeyQuestions,
    },
    questionCount,
    totalMarks,
  };
}

function buildInput(
  type: string,
  groupContent: Record<string, unknown>,
  questionContent: Record<string, unknown>,
  answer: AnswerSpec,
  marks: number,
  wordLimit: WordLimit | null,
): QuestionInput {
  const spec = getQuestionType(type);
  if (answer.kind === 'OPTION' || answer.kind === 'OPTION_SET') {
    const options: PublicOption[] = spec?.fixedOptions
      ? spec.fixedOptions.map((option) =>
          spec.optionsAudioOnly ? { key: option.key } : { ...option },
        )
      : readOptions(
          spec?.questionShape === 'CHOICES'
            ? questionContent.options
            : groupContent.options,
        );
    return {
      kind: 'CHOICE',
      options,
      multiple: answer.kind === 'OPTION_SET',
      maxChoices: answer.kind === 'OPTION_SET' ? marks : 1,
      audioOnly: spec?.optionsAudioOnly === true,
    };
  }
  return {
    kind: 'TEXT',
    blanks: marks,
    wordLimit,
    wordLimitText: wordLimit ? safeDescribe(wordLimit) : null,
  };
}

function safeDescribe(limit: WordLimit): string | null {
  try {
    return describeWordLimit(limit);
  } catch {
    return null;
  }
}

function readOptions(value: unknown): PublicOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((option: unknown) => {
    const { key, text, imageUrl } = option as PublicOption;
    return {
      key,
      ...(text !== undefined ? { text } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    };
  });
}

function readWordLimit(value: unknown): WordLimit | null {
  const limit = value as WordLimit | undefined;
  return limit &&
    typeof limit.maxWords === 'number' &&
    typeof limit.allowNumber === 'boolean'
    ? { maxWords: limit.maxWords, allowNumber: limit.allowNumber }
    : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStimulus(value: unknown): Stimulus {
  const record = asRecord(value);
  return {
    passages: Array.isArray(record.passages)
      ? (record.passages as Stimulus['passages'])
      : [],
    images: Array.isArray(record.images)
      ? (record.images as Stimulus['images'])
      : [],
  };
}
