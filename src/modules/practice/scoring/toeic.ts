/**
 * Quy đổi điểm thô TOEIC Listening & Reading (0-100 câu mỗi phần) sang thang 5-495.
 * ETS không công bố bảng quy đổi chính thức và mỗi đề quy đổi khác nhau, nên đây chỉ là ước tính
 * tuyến tính bám theo các bảng quy đổi được chia sẻ phổ biến. Giao diện phải ghi là điểm ước tính.
 */

export type ToeicSection = 'LISTENING' | 'READING';

export const TOEIC_SECTION_QUESTIONS = 100;
export const TOEIC_MIN_SCALED = 5;
export const TOEIC_MAX_SCALED = 495;
export const TOEIC_TABLE_VERSION = 'estimate-2026-09';

export function toeicScaledScore(section: ToeicSection, raw: number): number {
  if (!Number.isInteger(raw) || raw < 0 || raw > TOEIC_SECTION_QUESTIONS) {
    throw new RangeError(
      `Điểm thô TOEIC phải là số nguyên từ 0 đến ${TOEIC_SECTION_QUESTIONS}`,
    );
  }
  // Listening thường được quy đổi cao hơn Reading khoảng 20 điểm ở cùng số câu đúng.
  const estimate = section === 'LISTENING' ? 5 * raw + 15 : 5 * raw - 5;
  if (raw === 0) {
    return TOEIC_MIN_SCALED;
  }
  return Math.min(TOEIC_MAX_SCALED, Math.max(TOEIC_MIN_SCALED, estimate));
}
