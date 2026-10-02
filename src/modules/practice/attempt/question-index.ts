import type { PublicItemSetContent } from '../content/content.types';
import type { AttemptStructure } from '../content/structure.types';
import type { ResponseValue } from '../scoring/answer.types';

export const MAX_RESPONSE_LENGTH = 300;

export interface QuestionIndexEntry {
  /** Số hiển thị trong bài. */
  number: number;
  /** SINGLE: gửi một chuỗi. MULTI: gửi mảng chuỗi. */
  shape: 'SINGLE' | 'MULTI';
  /** Số phần tử tối đa khi MULTI. */
  max: number;
  itemSetReleaseId: string;
}

export type QuestionIndex = Record<string, QuestionIndexEntry>;

/** Bảng tra câu hỏi của bài làm, lưu lúc bắt đầu để kiểm tra bài nháp mà không phải đọc lại cả đề. */
export function buildQuestionIndex(
  structure: AttemptStructure,
  contents: ReadonlyMap<string, PublicItemSetContent>,
): QuestionIndex {
  const index: QuestionIndex = {};
  for (const section of structure.sections) {
    for (const item of section.items) {
      const content = contents.get(item.itemSetReleaseId);
      if (!content) {
        throw new Error(
          `Thiếu nội dung của bản phát hành ${item.itemSetReleaseId}`,
        );
      }
      for (const group of content.groups) {
        for (const question of group.questions) {
          const multiple =
            question.input.kind === 'CHOICE'
              ? question.input.multiple
              : question.input.blanks > 1;
          index[question.id] = {
            number: item.firstNumber + question.number - 1,
            shape: multiple ? 'MULTI' : 'SINGLE',
            max:
              question.input.kind === 'CHOICE'
                ? question.input.maxChoices
                : question.input.blanks,
            itemSetReleaseId: item.itemSetReleaseId,
          };
        }
      }
    }
  }
  return index;
}

/** Kiểm tra câu trả lời gửi lên đúng câu của bài và đúng kiểu dữ liệu. Trả danh sách lỗi. */
export function validateResponses(
  index: QuestionIndex,
  answers: Readonly<Record<string, unknown>>,
): string[] {
  const errors: string[] = [];
  for (const [questionId, value] of Object.entries(answers)) {
    const entry = index[questionId];
    if (!entry) {
      errors.push(`Câu ${questionId} không thuộc bài làm này`);
      continue;
    }
    if (value === null) {
      continue;
    }
    if (entry.shape === 'SINGLE') {
      if (typeof value !== 'string' || value.length > MAX_RESPONSE_LENGTH) {
        errors.push(
          `Câu ${entry.number}: cần một chuỗi tối đa ${MAX_RESPONSE_LENGTH} ký tự`,
        );
      }
      continue;
    }
    if (
      !Array.isArray(value) ||
      value.length > entry.max ||
      value.some(
        (item) => typeof item !== 'string' || item.length > MAX_RESPONSE_LENGTH,
      )
    ) {
      errors.push(`Câu ${entry.number}: cần mảng tối đa ${entry.max} chuỗi`);
    }
  }
  return errors;
}

/** Chỉ giữ câu trả lời có nội dung, bỏ null và chuỗi rỗng để bài nháp gọn. */
export function compactResponses(
  answers: Readonly<Record<string, unknown>>,
): Record<string, ResponseValue> {
  const result: Record<string, ResponseValue> = {};
  for (const [questionId, value] of Object.entries(answers)) {
    if (typeof value === 'string' && value.trim() !== '') {
      result[questionId] = value;
    } else if (
      Array.isArray(value) &&
      value.some((item) => typeof item === 'string' && item.trim() !== '')
    ) {
      result[questionId] = value as string[];
    }
  }
  return result;
}
