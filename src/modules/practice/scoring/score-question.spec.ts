import type {
  ResponseValue,
  ScorableQuestion,
  SlotReason,
  WordLimit,
} from './answer.types';
import { scoreQuestion } from './score-question';

type Case = [
  label: string,
  response: ResponseValue,
  score: number,
  reasons: SlotReason[],
];

function check(question: ScorableQuestion, cases: Case[]) {
  it.each(cases)('%s', (_label, response, score, reasons) => {
    const result = scoreQuestion(question, response);
    expect(result.score).toBe(score);
    expect(result.maxScore).toBe(question.marks);
    expect(result.isCorrect).toBe(score === question.marks);
    expect(result.slots.map((slot) => slot.reason)).toEqual(reasons);
  });
}

const ONE_WORD: WordLimit = { maxWords: 1, allowNumber: false };
const THREE_WORDS: WordLimit = { maxWords: 3, allowNumber: false };
const NUMBER_ONLY: WordLimit = { maxWords: 0, allowNumber: true };
const ONE_AND_NUMBER: WordLimit = { maxWords: 1, allowNumber: true };
const TWO_WORDS: WordLimit = { maxWords: 2, allowNumber: false };

describe('scoreQuestion', () => {
  describe('OPTION', () => {
    check({ marks: 1, answer: { kind: 'OPTION', keys: ['B'] } }, [
      ['đúng', 'B', 1, ['CORRECT']],
      ['có khoảng trắng vẫn đúng', ' B ', 1, ['CORRECT']],
      ['sai', 'C', 0, ['WRONG']],
      ['bỏ trống', '', 0, ['BLANK']],
      ['null là bỏ trống', null, 0, ['BLANK']],
      ['sai kiểu', ['B'], 0, ['INVALID']],
    ]);

    describe('nhiều key đều đúng', () => {
      check({ marks: 1, answer: { kind: 'OPTION', keys: ['A', 'C'] } }, [
        ['key thứ nhất', 'A', 1, ['CORRECT']],
        ['key thứ hai', 'C', 1, ['CORRECT']],
      ]);
    });

    describe('True/False/Not Given', () => {
      check({ marks: 1, answer: { kind: 'OPTION', keys: ['NOT_GIVEN'] } }, [
        ['đúng', 'NOT_GIVEN', 1, ['CORRECT']],
        ['sai', 'FALSE', 0, ['WRONG']],
      ]);
    });
  });

  describe('OPTION_SET (Choose TWO)', () => {
    check({ marks: 2, answer: { kind: 'OPTION_SET', keys: ['B', 'E'] } }, [
      ['đúng cả hai', ['B', 'E'], 2, ['CORRECT', 'CORRECT']],
      ['không tính thứ tự', ['E', 'B'], 2, ['CORRECT', 'CORRECT']],
      ['đúng một', ['B', 'C'], 1, ['CORRECT', 'WRONG']],
      ['chỉ chọn một', ['B'], 1, ['CORRECT', 'BLANK']],
      ['chọn trùng chỉ tính một lần', ['B', 'B'], 1, ['CORRECT', 'BLANK']],
      [
        'chọn quá số lượng thì 0 điểm',
        ['A', 'B', 'E'],
        0,
        ['INVALID', 'INVALID'],
      ],
      ['bỏ trống', [], 0, ['BLANK', 'BLANK']],
      ['sai kiểu', 'B', 0, ['INVALID', 'INVALID']],
    ]);
  });

  describe('TEXT', () => {
    describe('mạo từ tuỳ chọn', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['(the) river bank'] },
          wordLimit: THREE_WORDS,
        },
        [
          ['không mạo từ', 'river bank', 1, ['CORRECT']],
          ['có mạo từ', 'the river bank', 1, ['CORRECT']],
          ['hoa thường và dấu chấm', 'River Bank.', 1, ['CORRECT']],
          ['mạo từ khác thì sai', 'a river bank', 0, ['WRONG']],
          ['thiếu từ', 'river', 0, ['WRONG']],
          ['bỏ trống', '   ', 0, ['BLANK']],
          ['sai kiểu', ['river bank'], 0, ['INVALID']],
        ],
      );
    });

    describe('giới hạn từ kiểm tra trước khi so đáp án', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['river'] },
          wordLimit: ONE_WORD,
        },
        [
          ['đúng', 'river', 1, ['CORRECT']],
          [
            'thêm mạo từ thì vượt giới hạn',
            'the river',
            0,
            ['OVER_WORD_LIMIT'],
          ],
        ],
      );
    });

    describe('số', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['(£)1500'] },
          wordLimit: NUMBER_ONLY,
        },
        [
          ['có dấu phẩy', '£1,500', 1, ['CORRECT']],
          ['không ký hiệu tiền', '1500', 1, ['CORRECT']],
          ['số khác', '1,050', 0, ['WRONG']],
        ],
      );
    });

    describe('số viết bằng chữ', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['3'] },
          wordLimit: NUMBER_ONLY,
        },
        [['three', 'three', 1, ['CORRECT']]],
      );
    });

    describe('ngày tháng', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['15 March', 'March 15'] },
          wordLimit: ONE_AND_NUMBER,
        },
        [
          ['hậu tố thứ tự', '15th March', 1, ['CORRECT']],
          ['thứ tự kiểu Mỹ có trong đáp án', 'March 15th', 1, ['CORRECT']],
          ['sai ngày', '16 March', 0, ['WRONG']],
        ],
      );
    });

    describe('gạch nối', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['part-time'] },
          wordLimit: TWO_WORDS,
        },
        [
          ['viết cách', 'part time', 1, ['CORRECT']],
          ['có gạch nối', 'part-time', 1, ['CORRECT']],
        ],
      );
    });

    describe('chính tả Anh và Mỹ', () => {
      check(
        {
          marks: 1,
          answer: { kind: 'TEXT', accepted: ['colour'] },
          wordLimit: ONE_WORD,
        },
        [
          ['kiểu Mỹ', 'color', 1, ['CORRECT']],
          ['lỗi chính tả thì sai', 'colur', 0, ['WRONG']],
        ],
      );
    });

    describe('không có giới hạn từ', () => {
      check({ marks: 1, answer: { kind: 'TEXT', accepted: ['river'] } }, [
        ['vẫn so đáp án bình thường', 'the river', 0, ['WRONG']],
      ]);
    });
  });

  describe('TEXT_SET (IN EITHER ORDER)', () => {
    check(
      {
        marks: 2,
        answer: {
          kind: 'TEXT_SET',
          items: [{ accepted: ['wool'] }, { accepted: ['cotton'] }],
        },
        wordLimit: ONE_WORD,
      },
      [
        ['đúng thứ tự', ['wool', 'cotton'], 2, ['CORRECT', 'CORRECT']],
        ['đảo thứ tự', ['cotton', 'wool'], 2, ['CORRECT', 'CORRECT']],
        [
          'viết trùng chỉ được một điểm',
          ['wool', 'wool'],
          1,
          ['CORRECT', 'WRONG'],
        ],
        ['đúng một ô', ['silk', 'cotton'], 1, ['WRONG', 'CORRECT']],
        ['thiếu ô', ['cotton'], 1, ['CORRECT', 'BLANK']],
        [
          'vượt giới hạn từ',
          ['the wool', 'cotton'],
          1,
          ['OVER_WORD_LIMIT', 'CORRECT'],
        ],
        ['quá số ô', ['wool', 'cotton', 'silk'], 0, ['INVALID', 'INVALID']],
        ['sai kiểu', 'wool', 0, ['INVALID', 'INVALID']],
      ],
    );

    describe('ba ô', () => {
      check(
        {
          marks: 3,
          answer: {
            kind: 'TEXT_SET',
            items: [
              { accepted: ['salt'] },
              { accepted: ['sugar'] },
              { accepted: ['flour'] },
            ],
          },
          wordLimit: ONE_WORD,
        },
        [
          [
            'mọi thứ tự',
            ['flour', 'salt', 'sugar'],
            3,
            ['CORRECT', 'CORRECT', 'CORRECT'],
          ],
        ],
      );
    });
  });
});

describe('TEXT_SET: hai cách ghép bằng điểm thì giữ thứ tự người học viết', () => {
  it('hoán vị giữ nguyên thứ tự được thử trước', () => {
    const result = scoreQuestion(
      {
        marks: 3,
        answer: {
          kind: 'TEXT_SET',
          items: [
            { accepted: ['salt'] },
            { accepted: ['sugar'] },
            { accepted: ['flour'] },
          ],
        },
      },
      ['salt', 'rice', 'flour'],
    );
    expect(result.score).toBe(2);
    expect(result.slots.map((slot) => slot.reason)).toEqual([
      'CORRECT',
      'WRONG',
      'CORRECT',
    ]);
  });
});

describe('TEXT strict: so khớp nghiêm cho bài chính tả và viết số bằng chữ', () => {
  it.each<[string, ResponseValue, number]>([
    ['đúng chính tả', 'Three', 1],
    ['viết bằng số thì sai', '3', 0],
    ['vẫn bỏ qua dấu câu', 'three.', 1],
  ])('%s', (_label, response, score) => {
    const result = scoreQuestion(
      { marks: 1, answer: { kind: 'TEXT', accepted: ['three'], strict: true } },
      response,
    );
    expect(result.score).toBe(score);
  });

  it('không quy chính tả Mỹ về chính tả Anh', () => {
    const result = scoreQuestion(
      {
        marks: 1,
        answer: { kind: 'TEXT', accepted: ['colour'], strict: true },
      },
      'color',
    );
    expect(result.score).toBe(0);
  });
});
