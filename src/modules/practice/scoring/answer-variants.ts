import type { WordLimit } from './answer.types';
import { comparisonKeys, normalizeTokens } from './normalize';
import { withinLimit } from './word-limit';

const OPTIONAL_GROUP = /\(([^()]*)\)/g;

/** Số nhóm tuỳ chọn tối đa được mở rộng. Nhóm dư được giữ nguyên chữ, bỏ dấu ngoặc. */
export const MAX_OPTIONAL_GROUPS = 3;

/**
 * Mở rộng phần trong ngoặc thành các cách viết cụ thể.
 * "(the) river bank" -> ["the river bank", "river bank"], "(£)25" -> ["£25", "25"].
 */
export function expandOptional(value: string): string[] {
  const literals: string[] = [];
  const optional: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  OPTIONAL_GROUP.lastIndex = 0;
  while ((match = OPTIONAL_GROUP.exec(value)) !== null) {
    literals.push(value.slice(cursor, match.index));
    optional.push(match[1]);
    cursor = match.index + match[0].length;
  }
  literals.push(value.slice(cursor));

  const expandable = Math.min(optional.length, MAX_OPTIONAL_GROUPS);
  const variants = new Set<string>();
  for (let mask = 0; mask < 1 << expandable; mask++) {
    let text = literals[0];
    optional.forEach((group, index) => {
      const included = index >= expandable || (mask & (1 << index)) !== 0;
      text += (included ? group : '') + literals[index + 1];
    });
    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (collapsed !== '') {
      variants.add(collapsed);
    }
  }
  return [...variants];
}

/** Tập khoá so sánh của mọi cách viết được chấp nhận, dùng để chấm một ô điền từ. */
export function compileText(accepted: readonly string[]): Set<string> {
  const keys = new Set<string>();
  for (const value of accepted) {
    for (const variant of expandOptional(value)) {
      const tokens = normalizeTokens(variant);
      if (tokens.length === 0) {
        continue;
      }
      for (const key of comparisonKeys(tokens)) {
        keys.add(key);
      }
    }
  }
  return keys;
}

/**
 * Các cách viết trong đáp án vượt giới hạn số từ của đề.
 * Validator của admin dùng hàm này để đáp án và hướng dẫn không mâu thuẫn nhau.
 */
export function findVariantsOverLimit(
  accepted: readonly string[],
  limit: WordLimit,
): string[] {
  return accepted
    .flatMap(expandOptional)
    .filter((variant) => !withinLimit(normalizeTokens(variant), limit));
}
