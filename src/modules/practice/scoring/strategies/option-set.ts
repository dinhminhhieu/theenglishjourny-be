import type {
  OptionSetAnswer,
  ResponseValue,
  SlotResult,
} from '../answer.types';
import {
  asList,
  BLANK,
  CORRECT,
  INVALID,
  repeat,
  WRONG,
} from './response-shape';

/**
 * "Choose TWO letters": mỗi key đúng được một điểm, không tính thứ tự, chọn trùng chỉ tính một lần.
 * Chọn nhiều hơn số được phép thì cả câu 0 điểm, như thi thật.
 */
export function scoreOptionSet(
  answer: OptionSetAnswer,
  response: ResponseValue,
  marks: number,
): SlotResult[] {
  const values = asList(response);
  if (values === null) {
    return repeat(INVALID, marks);
  }
  const chosen = [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ];
  if (chosen.length > marks) {
    return repeat(INVALID, marks);
  }
  const slots = chosen.map((key) =>
    answer.keys.includes(key) ? CORRECT : WRONG,
  );
  return [...slots, ...repeat(BLANK, marks - slots.length)];
}
