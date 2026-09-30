import {
  BAND_TABLES,
  BandTableKey,
  FULL_TEST_MARKS,
  isBand,
  overallBand,
  rawToBand,
} from './band';

const TABLES = Object.keys(BAND_TABLES) as BandTableKey[];

describe('rawToBand', () => {
  describe.each(TABLES)('%s', (table) => {
    it('điểm thô tăng thì band không giảm, phủ đủ 0 đến 40', () => {
      let previous = -1;
      for (let raw = 0; raw <= FULL_TEST_MARKS; raw++) {
        const band = rawToBand(table, raw);
        expect(isBand(band)).toBe(true);
        expect(band).toBeGreaterThanOrEqual(previous);
        previous = band;
      }
      expect(rawToBand(table, 0)).toBe(0);
      expect(rawToBand(table, FULL_TEST_MARKS)).toBe(9);
    });

    it.each([-1, 41, 12.5, Number.NaN])('điểm %p không hợp lệ', (raw) => {
      expect(() => rawToBand(table, raw)).toThrow(RangeError);
    });
  });

  // Các mốc ielts.org công bố.
  it.each<[BandTableKey, number, number]>([
    ['LISTENING', 16, 5],
    ['LISTENING', 23, 6],
    ['LISTENING', 30, 7],
    ['LISTENING', 35, 8],
    ['ACADEMIC_READING', 15, 5],
    ['ACADEMIC_READING', 23, 6],
    ['ACADEMIC_READING', 30, 7],
    ['ACADEMIC_READING', 35, 8],
    ['GENERAL_TRAINING_READING', 15, 4],
    ['GENERAL_TRAINING_READING', 23, 5],
    ['GENERAL_TRAINING_READING', 30, 6],
    ['GENERAL_TRAINING_READING', 34, 7],
    ['GENERAL_TRAINING_READING', 38, 8],
  ])('%s: %i câu đúng là band %d', (table, raw, band) => {
    expect(rawToBand(table, raw)).toBe(band);
  });

  it.each<[BandTableKey, number, number]>([
    ['LISTENING', 29, 6.5],
    ['LISTENING', 22, 5.5],
    ['ACADEMIC_READING', 32, 7],
    ['ACADEMIC_READING', 26, 6],
    ['GENERAL_TRAINING_READING', 36, 7.5],
  ])('%s: %i câu đúng là band %d (cận trên của khoảng)', (table, raw, band) => {
    expect(rawToBand(table, raw)).toBe(band);
  });
});

describe('overallBand', () => {
  it.each<[number[], number]>([
    [[6, 6, 6, 6], 6],
    [[6.5, 6.5, 5.5, 6.5], 6.5], // 6.25 lên 6.5
    [[7, 7, 6.5, 6.5], 7], // 6.75 lên 7.0
    [[6, 6, 6, 6.5], 6], // 6.125 xuống 6.0
    [[6.5, 6.5, 6, 6.5], 6.5], // 6.375 lên 6.5
    [[4, 5, 6, 7], 5.5],
  ])('%j -> %d', (bands, expected) => {
    expect(overallBand(bands)).toBe(expected);
  });

  it.each([[[]], [[6, 9.5]], [[6, 6.3]], [[-1]]])(
    'đầu vào không hợp lệ %j',
    (bands) => {
      expect(() => overallBand(bands)).toThrow(RangeError);
    },
  );
});
