-- Xuất toàn bộ từ vựng từ DB nguồn (Postgres) ra JSONL, mỗi dòng một từ,
-- đúng format mà `pnpm vocab:import` đọc.
--
-- Chạy trên máy có psql và truy cập được DB nguồn:
--   psql "$SOURCE_DATABASE_URL" -Atq -v ON_ERROR_STOP=1 -v FETCH_COUNT=1000 \
--        -f scripts/export-vocabulary.sql > vocab-export.jsonl
--
-- -A -t : in giá trị thô, không header/footer, không escape (COPY sẽ làm hỏng JSON)
-- FETCH_COUNT : đọc theo cursor, không nạp cả bảng vào RAM của psql
--
-- Nếu tên bảng/cột ở DB nguồn khác thì sửa bên dưới (xem bằng: \d vocabularies).
-- Cột nào DB nguồn không có thì xoá dòng đó, script import sẽ dùng [] hoặc {}.
-- Nếu cột JSON đang là kiểu text thay vì jsonb thì thêm ::jsonb, vd: academic::jsonb.

SELECT json_build_object(
  'id',              id,
  'word',            word,
  'pronunciation',   pronunciation,
  'audio_url',       audio_url,
  'image',           image,
  'academic',        academic,
  'academic_idioms', academic_idioms,
  'definitions',     definitions,
  'usage_examples',  usage_examples,
  'advanced_usage',  advanced_usage,
  'variants',        variants,
  'synonyms',        synonyms,
  'antonyms',        antonyms,
  'idioms',          idioms,
  'phrases',         phrases,
  'other_sections',  other_sections,
  'relations',       relations
)::text
FROM vocabularies
ORDER BY word;
