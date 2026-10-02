/** Việt Nam dùng UTC+7 quanh năm, không có giờ mùa hè. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày theo giờ Việt Nam, dạng "YYYY-MM-DD". */
export function vnDateString(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Ngày hôm trước theo giờ Việt Nam. */
export function vnYesterdayString(date: Date): string {
  return vnDateString(new Date(date.getTime() - DAY_MS));
}

/** Giá trị để lưu vào cột @db.Date: nửa đêm UTC của ngày Việt Nam. */
export function vnDateOnly(date: Date): Date {
  return new Date(`${vnDateString(date)}T00:00:00.000Z`);
}

/** Đọc cột @db.Date (Prisma trả Date lúc nửa đêm UTC) thành "YYYY-MM-DD". */
export function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
