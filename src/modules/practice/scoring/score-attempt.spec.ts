import { scoreAttempt } from './score-attempt';

describe('scoreAttempt', () => {
  const questions = [
    { id: 'q1', marks: 1, answer: { kind: 'OPTION' as const, keys: ['A'] } },
    {
      id: 'q2',
      marks: 2,
      answer: { kind: 'OPTION_SET' as const, keys: ['B', 'D'] },
    },
    {
      id: 'q3',
      marks: 1,
      answer: { kind: 'TEXT' as const, accepted: ['river'] },
      wordLimit: { maxWords: 1, allowNumber: false },
    },
  ];

  it('cộng điểm, tính phần trăm và giữ thứ tự câu', () => {
    const result = scoreAttempt(questions, {
      q1: 'A',
      q2: ['B', 'C'],
      q3: 'River',
    });

    expect(result).toMatchObject({ rawScore: 3, maxScore: 4, percent: 75 });
    expect(result.results.map((item) => [item.questionId, item.score])).toEqual(
      [
        ['q1', 1],
        ['q2', 1],
        ['q3', 1],
      ],
    );
  });

  it('câu không có câu trả lời tính là bỏ trống', () => {
    const result = scoreAttempt(questions, {});

    expect(result.rawScore).toBe(0);
    expect(result.results[1].slots.map((slot) => slot.reason)).toEqual([
      'BLANK',
      'BLANK',
    ]);
  });

  it('bài không có câu nào thì phần trăm là 0', () => {
    expect(scoreAttempt([], {})).toEqual({
      rawScore: 0,
      maxScore: 0,
      percent: 0,
      results: [],
    });
  });
});
