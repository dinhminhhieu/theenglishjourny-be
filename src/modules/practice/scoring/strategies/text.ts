import type {
  ResponseValue,
  SlotResult,
  TextAnswer,
  WordLimit,
} from '../answer.types';
import { compileText } from '../answer-variants';
import { comparisonKeys, normalizeTokens } from '../normalize';
import { withinLimit } from '../word-limit';
import { asSingle, BLANK, CORRECT, INVALID, WRONG } from './response-shape';

const OVER_WORD_LIMIT: SlotResult = {
  correct: false,
  reason: 'OVER_WORD_LIMIT',
};

/**
 * Chấm một ô điền từ. Giới hạn số từ được kiểm tra trước khi so đáp án, như thi thật:
 * đề ghi ONE WORD ONLY mà viết "the river" thì sai, dù đáp án là "river".
 */
export function scoreTextSlot(
  response: string,
  compiled: ReadonlySet<string>,
  wordLimit?: WordLimit | null,
  strict = false,
): SlotResult {
  const tokens = normalizeTokens(response, { strict });
  if (tokens.length === 0) {
    return BLANK;
  }
  if (wordLimit && !withinLimit(tokens, wordLimit)) {
    return OVER_WORD_LIMIT;
  }
  return comparisonKeys(tokens, strict).some((key) => compiled.has(key))
    ? CORRECT
    : WRONG;
}

export function scoreText(
  answer: TextAnswer,
  response: ResponseValue,
  wordLimit?: WordLimit | null,
): SlotResult[] {
  const value = asSingle(response);
  if (value === null) {
    return [INVALID];
  }
  const strict = answer.strict === true;
  return [
    scoreTextSlot(
      value,
      compileText(answer.accepted, strict),
      wordLimit,
      strict,
    ),
  ];
}
