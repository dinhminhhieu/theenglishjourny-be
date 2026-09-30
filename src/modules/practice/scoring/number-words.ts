const UNITS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

// Dùng Map thay object để "constructor", "toString"... không bị coi là số.
const UNIT_VALUES = new Map(UNITS.map((word, value) => [word, value]));

const TENS = new Map<string, number>([
  ['twenty', 20],
  ['thirty', 30],
  ['forty', 40],
  ['fifty', 50],
  ['sixty', 60],
  ['seventy', 70],
  ['eighty', 80],
  ['ninety', 90],
]);

/**
 * Số viết bằng chữ (0 đến 99, gồm dạng "twenty-five") thành giá trị số.
 * Không phải số thì trả null. Đầu vào đã là chữ thường.
 */
export function parseNumberWord(token: string): number | null {
  const unit = UNIT_VALUES.get(token);
  if (unit !== undefined) {
    return unit;
  }
  const tens = TENS.get(token);
  if (tens !== undefined) {
    return tens;
  }
  const compound = /^([a-z]+)-([a-z]+)$/.exec(token);
  if (compound) {
    const head = TENS.get(compound[1]);
    const tail = UNIT_VALUES.get(compound[2]);
    if (head !== undefined && tail !== undefined && tail >= 1 && tail <= 9) {
      return head + tail;
    }
  }
  return null;
}
