import type { WordLimit } from './answer.types';
import { normalizeTokens } from './normalize';
import { describeWordLimit, withinLimit } from './word-limit';

const ONE_WORD: WordLimit = { maxWords: 1, allowNumber: false };
const TWO_AND_NUMBER: WordLimit = { maxWords: 2, allowNumber: true };
const NUMBER_ONLY: WordLimit = { maxWords: 0, allowNumber: true };
const ONE_AND_NUMBER: WordLimit = { maxWords: 1, allowNumber: true };

describe('withinLimit', () => {
  it.each<[string, string, WordLimit, boolean]>([
    ['một từ với ONE WORD ONLY', 'river', ONE_WORD, true],
    ['hai từ với ONE WORD ONLY', 'the river', ONE_WORD, false],
    ['từ có gạch nối tính là một từ', 'part-time', ONE_WORD, true],
    ['số tính như từ khi không cho phép số', '25', ONE_WORD, true],
    ['số với A NUMBER', '£25', NUMBER_ONLY, true],
    ['số viết bằng chữ với A NUMBER', 'twenty-five', NUMBER_ONLY, true],
    ['có chữ với A NUMBER', '25 people', NUMBER_ONLY, false],
    [
      'ngày tháng với ONE WORD AND/OR A NUMBER',
      '15th March',
      ONE_AND_NUMBER,
      true,
    ],
    ['hai từ và một số', 'about 25 people', TWO_AND_NUMBER, true],
    ['ba từ và một số', 'about 25 more people', TWO_AND_NUMBER, false],
    ['số thứ hai tính như từ', '10 to 25', TWO_AND_NUMBER, true],
  ])('%s', (_label, response, limit, expected) => {
    expect(withinLimit(normalizeTokens(response), limit)).toBe(expected);
  });
});

describe('describeWordLimit', () => {
  it.each<[WordLimit, string]>([
    [NUMBER_ONLY, 'A NUMBER'],
    [ONE_WORD, 'ONE WORD ONLY'],
    [ONE_AND_NUMBER, 'ONE WORD AND/OR A NUMBER'],
    [{ maxWords: 2, allowNumber: false }, 'NO MORE THAN TWO WORDS'],
    [TWO_AND_NUMBER, 'NO MORE THAN TWO WORDS AND/OR A NUMBER'],
    [
      { maxWords: 3, allowNumber: true },
      'NO MORE THAN THREE WORDS AND/OR A NUMBER',
    ],
  ])('%j -> %s', (limit, expected) => {
    expect(describeWordLimit(limit)).toBe(expected);
  });

  it.each<WordLimit>([
    { maxWords: 0, allowNumber: false },
    { maxWords: 6, allowNumber: false },
    { maxWords: 1.5, allowNumber: true },
  ])('giới hạn không hợp lệ %j thì báo lỗi', (limit) => {
    expect(() => describeWordLimit(limit)).toThrow(RangeError);
  });
});
