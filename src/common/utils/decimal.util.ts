/** Prisma Decimal (hoặc null) thành number để trả ra API. */
export function decimalToNumber(
  value: { toString(): string } | null,
): number | null {
  return value === null ? null : Number(value.toString());
}
