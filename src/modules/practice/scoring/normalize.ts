import { parseNumberWord } from './number-words';
import { canonSpelling } from './spelling-variants';

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const SINGLE_QUOTES = /[\u2018\u2019\u02BC`\u00B4]/g;
const DOUBLE_QUOTES = /[\u201C\u201D]/g;
const DASHES = /[\u2010-\u2014\u2212]/g;
/** Ký tự đầu từ không phải chữ, số hay ký hiệu tiền tệ thì bỏ. */
const LEADING_JUNK = /^[^\p{L}\p{N}£$€]+/u;
/** Ký tự cuối từ không phải chữ, số hay % thì bỏ. */
const TRAILING_JUNK = /[^\p{L}\p{N}%]+$/u;
const NUMBER_TOKEN = /^[£$€]?\d+(?:\.\d+)?(?:%|am|pm)?$/;

/**
 * Tách câu trả lời thành các từ đã chuẩn hoá để so sánh.
 * Bỏ qua: hoa thường, dấu thanh, dấu câu ở hai đầu từ, khoảng trắng thừa.
 * Quy đổi: số viết bằng chữ thành chữ số, "1,500" thành "1500", "15th" thành "15",
 * "7:30" thành "7.30", chính tả Mỹ thành chính tả Anh.
 * Không bỏ mạo từ và không sửa lỗi chính tả: đáp án muốn cho phép thì ghi "(the)".
 */
export function normalizeTokens(
  raw: string,
  options: NormalizeOptions = {},
): string[] {
  const strict = options.strict === true;
  const decomposed = strict
    ? raw.normalize('NFC')
    : raw.normalize('NFKD').replace(/\p{M}/gu, '');
  const text = decomposed
    .replace(ZERO_WIDTH, '')
    .toLowerCase()
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (text === '') {
    return [];
  }
  return text
    .split(' ')
    .map((token) => (strict ? trimToken(token) : canonToken(token)))
    .filter((token) => token !== '');
}

export interface NormalizeOptions {
  /** Chỉ bỏ qua hoa thường, dấu câu ở hai đầu và khoảng trắng. Không đổi số, chính tả, dấu thanh. */
  strict?: boolean;
}

function trimToken(raw: string): string {
  return raw.replace(LEADING_JUNK, '').replace(TRAILING_JUNK, '');
}

export function canonToken(raw: string): string {
  if (raw === '&') {
    return 'and';
  }
  let token = raw.replace(LEADING_JUNK, '').replace(TRAILING_JUNK, '');
  if (token === '') {
    return '';
  }
  if (/\d/.test(token)) {
    token = token
      .replace(/(\d),(?=\d{3}\b)/g, '$1')
      .replace(/(\d):(\d)/g, '$1.$2')
      .replace(/^(\d+)(?:st|nd|rd|th)$/, '$1');
  }
  const number = parseNumberWord(token);
  if (number !== null) {
    return String(number);
  }
  return canonSpelling(token);
}

/** Từ có phải là số không, tính cả "£25", "50%", "7.30am". Dùng để đếm giới hạn "AND/OR A NUMBER". */
export function isNumberToken(token: string): boolean {
  return NUMBER_TOKEN.test(token);
}

/**
 * Các khoá so sánh của một câu trả lời. Gạch nối được coi như dấu cách hoặc viết liền,
 * nên "part-time", "part time" và "parttime" khớp nhau.
 */
export function comparisonKeys(
  tokens: readonly string[],
  strict = false,
): string[] {
  const joined = tokens.join(' ');
  if (strict) {
    return [joined];
  }
  const spaced = joined.replace(/-/g, ' ');
  const closed = joined.replace(/-/g, '');
  return spaced === closed ? [spaced] : [spaced, closed];
}
