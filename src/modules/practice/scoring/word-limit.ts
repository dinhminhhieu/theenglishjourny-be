import type { WordLimit } from './answer.types';
import { isNumberToken } from './normalize';

/**
 * Câu trả lời đã chuẩn hoá có nằm trong giới hạn số từ không.
 * Từ có gạch nối tính là một từ. Với `allowNumber`, được thêm đúng một số, số thứ hai trở đi tính như từ.
 */
export function withinLimit(
  tokens: readonly string[],
  limit: WordLimit,
): boolean {
  const numbers = tokens.filter(isNumberToken).length;
  let words = tokens.length - numbers;
  words += limit.allowNumber ? Math.max(0, numbers - 1) : numbers;
  return words <= limit.maxWords;
}

const NUMBER_NAMES = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];

/** Câu hướng dẫn chuẩn IELTS cho một giới hạn, vd "NO MORE THAN TWO WORDS AND/OR A NUMBER". */
export function describeWordLimit(limit: WordLimit): string {
  const { maxWords, allowNumber } = limit;
  if (!Number.isInteger(maxWords) || maxWords < 0 || maxWords > 5) {
    throw new RangeError(`maxWords phải là số nguyên từ 0 đến 5`);
  }
  if (maxWords === 0) {
    if (!allowNumber) {
      throw new RangeError('Giới hạn 0 từ thì phải cho phép một số');
    }
    return 'A NUMBER';
  }
  const number = allowNumber ? ' AND/OR A NUMBER' : '';
  if (maxWords === 1) {
    return allowNumber ? `ONE WORD${number}` : 'ONE WORD ONLY';
  }
  return `NO MORE THAN ${NUMBER_NAMES[maxWords]} WORDS${number}`;
}
