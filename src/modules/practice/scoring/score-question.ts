import type {
  QuestionScore,
  ResponseValue,
  ScorableQuestion,
  SlotResult,
} from './answer.types';
import { scoreOption } from './strategies/option';
import { scoreOptionSet } from './strategies/option-set';
import { scoreText } from './strategies/text';
import { scoreTextSet } from './strategies/text-set';

/** Chấm một câu. Không bao giờ ném lỗi với câu trả lời sai kiểu, chỉ trả ô INVALID. */
export function scoreQuestion(
  question: ScorableQuestion,
  response: ResponseValue,
): QuestionScore {
  const slots = scoreSlots(question, response);
  const maxScore = question.marks;
  const score = Math.min(slots.filter((slot) => slot.correct).length, maxScore);
  return { score, maxScore, isCorrect: score === maxScore, slots };
}

function scoreSlots(
  question: ScorableQuestion,
  response: ResponseValue,
): SlotResult[] {
  const { answer } = question;
  switch (answer.kind) {
    case 'OPTION':
      return scoreOption(answer, response);
    case 'OPTION_SET':
      return scoreOptionSet(answer, response, question.marks);
    case 'TEXT':
      return scoreText(answer, response, question.wordLimit);
    case 'TEXT_SET':
      return scoreTextSet(answer, response, question.wordLimit);
    default:
      return assertNever(answer);
  }
}

function assertNever(value: never): never {
  throw new Error(`Loại đáp án không hỗ trợ: ${JSON.stringify(value)}`);
}
