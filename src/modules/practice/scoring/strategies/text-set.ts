import type {
  ResponseValue,
  SlotResult,
  TextSetAnswer,
  WordLimit,
} from '../answer.types';
import { compileText } from '../answer-variants';
import { asList, INVALID, repeat } from './response-shape';
import { scoreTextSlot } from './text';

/**
 * Nhiều ô "IN EITHER ORDER": ghép ô trả lời với đáp án theo cách được nhiều điểm nhất,
 * mỗi đáp án chỉ dùng một lần nên viết trùng một đáp án hai lần chỉ được một điểm.
 */
export function scoreTextSet(
  answer: TextSetAnswer,
  response: ResponseValue,
  wordLimit?: WordLimit | null,
): SlotResult[] {
  const size = answer.items.length;
  const values = asList(response);
  if (values === null || values.length > size) {
    return repeat(INVALID, size);
  }
  const padded = [
    ...values,
    ...Array.from({ length: size - values.length }, () => ''),
  ];
  const strict = answer.strict === true;
  const compiled = answer.items.map((item) =>
    compileText(item.accepted, strict),
  );
  const matrix = padded.map((value) =>
    compiled.map((keys) => scoreTextSlot(value, keys, wordLimit, strict)),
  );

  let best: SlotResult[] = matrix.map((row) => row[0]);
  let bestScore = -1;
  for (const order of permutations(size)) {
    const slots = order.map((item, slot) => matrix[slot][item]);
    const score = slots.filter((slot) => slot.correct).length;
    if (score > bestScore) {
      best = slots;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Mọi hoán vị của 0..n-1, hoán vị giữ nguyên thứ tự đứng đầu để khi hai cách ghép bằng điểm
 * thì kết quả từng ô theo đúng thứ tự người học viết. n nhỏ (tối đa 3 theo validator) nên sinh hết là đủ nhanh.
 */
function permutations(n: number): number[][] {
  if (n <= 1) {
    return [Array.from({ length: n }, (_, index) => index)];
  }
  return permutations(n - 1).flatMap((rest) =>
    Array.from({ length: n }, (_, step) => {
      const at = n - 1 - step;
      return [...rest.slice(0, at), n - 1, ...rest.slice(at)];
    }),
  );
}
