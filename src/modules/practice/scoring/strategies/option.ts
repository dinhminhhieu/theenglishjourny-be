import type { OptionAnswer, ResponseValue, SlotResult } from '../answer.types';
import { asSingle, BLANK, CORRECT, INVALID, WRONG } from './response-shape';

/** Key lựa chọn là mã hệ thống do FE gửi lên, so khớp chính xác sau khi trim. */
export function scoreOption(
  answer: OptionAnswer,
  response: ResponseValue,
): SlotResult[] {
  const value = asSingle(response);
  if (value === null) {
    return [INVALID];
  }
  const chosen = value.trim();
  if (chosen === '') {
    return [BLANK];
  }
  return [answer.keys.includes(chosen) ? CORRECT : WRONG];
}
