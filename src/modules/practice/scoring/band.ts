/**
 * Quy đổi điểm thô (trên 40) sang band cho Listening và Reading.
 * Đây là các bảng được công bố rộng rãi, khớp mọi mốc trên ielts.org, nhưng không phải bảng chính thức:
 * mỗi bộ đề thật có thể lệch khoảng 0,5 band. Giao diện nên ghi là band ước tính.
 * Mức 2.0 trở xuống là ngoại suy.
 */

export type BandTableKey =
  'LISTENING' | 'ACADEMIC_READING' | 'GENERAL_TRAINING_READING';

/** Lưu cùng kết quả để biết bài được quy đổi bằng bảng nào khi bảng thay đổi sau này. */
export const BAND_TABLE_VERSION = '2026-09';

export const FULL_TEST_MARKS = 40;

type BandRow = readonly [minRaw: number, band: number];

/** Mỗi dòng là [điểm thô tối thiểu, band], xếp giảm dần. */
export const BAND_TABLES: Readonly<Record<BandTableKey, readonly BandRow[]>> = {
  LISTENING: [
    [39, 9],
    [37, 8.5],
    [35, 8],
    [32, 7.5],
    [30, 7],
    [26, 6.5],
    [23, 6],
    [18, 5.5],
    [16, 5],
    [13, 4.5],
    [10, 4],
    [8, 3.5],
    [6, 3],
    [4, 2.5],
    [3, 2],
    [2, 1.5],
    [1, 1],
    [0, 0],
  ],
  ACADEMIC_READING: [
    [39, 9],
    [37, 8.5],
    [35, 8],
    [33, 7.5],
    [30, 7],
    [27, 6.5],
    [23, 6],
    [19, 5.5],
    [15, 5],
    [13, 4.5],
    [10, 4],
    [8, 3.5],
    [6, 3],
    [4, 2.5],
    [3, 2],
    [2, 1.5],
    [1, 1],
    [0, 0],
  ],
  GENERAL_TRAINING_READING: [
    [40, 9],
    [39, 8.5],
    [37, 8],
    [36, 7.5],
    [34, 7],
    [32, 6.5],
    [30, 6],
    [27, 5.5],
    [23, 5],
    [19, 4.5],
    [15, 4],
    [12, 3.5],
    [9, 3],
    [6, 2.5],
    [4, 2],
    [2, 1.5],
    [1, 1],
    [0, 0],
  ],
};

/** Chỉ dùng cho bài đủ 40 câu. Bài luyện một phần đề chỉ nên hiện điểm thô và phần trăm. */
export function rawToBand(table: BandTableKey, raw: number): number {
  if (!Number.isInteger(raw) || raw < 0 || raw > FULL_TEST_MARKS) {
    throw new RangeError(
      `Điểm thô phải là số nguyên từ 0 đến ${FULL_TEST_MARKS}`,
    );
  }
  const row = BAND_TABLES[table].find(([minRaw]) => raw >= minRaw);
  return row ? row[1] : 0;
}

/**
 * Band tổng từ band của bốn kỹ năng: trung bình rồi làm tròn tới 0,5 gần nhất,
 * .25 làm tròn lên .5 và .75 làm tròn lên số nguyên kế tiếp.
 * Trung bình của các bội 0,5 luôn là bội của 0,125 nên phép tính không bị sai số dấu phẩy động.
 */
export function overallBand(bands: readonly number[]): number {
  if (bands.length === 0) {
    throw new RangeError('Cần ít nhất một band');
  }
  for (const band of bands) {
    if (!isBand(band)) {
      throw new RangeError(`Band không hợp lệ: ${band}`);
    }
  }
  const average = bands.reduce((sum, band) => sum + band, 0) / bands.length;
  return Math.floor(average * 2 + 0.5) / 2;
}

/** Số từ 0 đến 9, bước 0,5. */
export function isBand(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9 &&
    Number.isInteger(value * 2)
  );
}
