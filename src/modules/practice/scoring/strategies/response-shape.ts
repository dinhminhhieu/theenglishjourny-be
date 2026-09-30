import type { ResponseValue, SlotResult } from '../answer.types';

export const BLANK: SlotResult = { correct: false, reason: 'BLANK' };
export const INVALID: SlotResult = { correct: false, reason: 'INVALID' };
export const CORRECT: SlotResult = { correct: true, reason: 'CORRECT' };
export const WRONG: SlotResult = { correct: false, reason: 'WRONG' };

/** Câu một ô: chuỗi hợp lệ, '' nếu bỏ trống, null nếu sai kiểu. */
export function asSingle(response: ResponseValue): string | null {
  if (response === null || response === undefined) {
    return '';
  }
  return typeof response === 'string' ? response : null;
}

/** Câu nhiều ô: mảng chuỗi, [] nếu bỏ trống, null nếu sai kiểu. */
export function asList(response: ResponseValue): string[] | null {
  if (response === null || response === undefined) {
    return [];
  }
  if (!Array.isArray(response)) {
    return null;
  }
  return response.every((item) => typeof item === 'string') ? response : null;
}

export function repeat(slot: SlotResult, count: number): SlotResult[] {
  return Array.from({ length: Math.max(0, count) }, () => slot);
}
