/**
 * Chạy trước mọi file *.db-spec.ts: trỏ app tới database test và từ chối nếu tên database
 * không kết thúc bằng _test, vì các test này xoá dữ liệu.
 */
const url =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/theenglishjourney_test';
const databaseName = new URL(url).pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Từ chối chạy: database "${databaseName}" không kết thúc bằng _test, test sẽ xoá dữ liệu`,
  );
}
process.env.DATABASE_URL = url;
