import {
  TOEIC_MAX_SCALED,
  TOEIC_MIN_SCALED,
  TOEIC_SECTION_QUESTIONS,
  toeicScaledScore,
  ToeicSection,
} from './toeic';

describe('toeicScaledScore', () => {
  describe.each<ToeicSection>(['LISTENING', 'READING'])('%s', (section) => {
    it('đơn điệu, bội của 5, nằm trong 5-495', () => {
      let previous = 0;
      for (let raw = 0; raw <= TOEIC_SECTION_QUESTIONS; raw++) {
        const score = toeicScaledScore(section, raw);
        expect(score % 5).toBe(0);
        expect(score).toBeGreaterThanOrEqual(TOEIC_MIN_SCALED);
        expect(score).toBeLessThanOrEqual(TOEIC_MAX_SCALED);
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
      expect(toeicScaledScore(section, 0)).toBe(TOEIC_MIN_SCALED);
      expect(toeicScaledScore(section, 100)).toBe(TOEIC_MAX_SCALED);
    });

    it.each([-1, 101, 2.5])('điểm %p không hợp lệ', (raw) => {
      expect(() => toeicScaledScore(section, raw)).toThrow(RangeError);
    });
  });

  it('Listening quy đổi cao hơn Reading ở cùng số câu đúng', () => {
    expect(toeicScaledScore('LISTENING', 50)).toBe(265);
    expect(toeicScaledScore('READING', 50)).toBe(245);
  });
});
