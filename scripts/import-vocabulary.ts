/**
 * Nạp từ điển từ file JSONL (mỗi dòng một từ) vào bảng `vocabularies`.
 *
 *   pnpm vocab:import data-part-01.jsonl data-part-02.jsonl ...
 *
 * - Bỏ qua các key không dùng: url, word_id, found.
 * - Có `id` dạng UUID thì giữ nguyên, không có thì DB tự sinh.
 * - Từ đã có (trùng `word`) thì bỏ qua, không ghi đè. Chạy lại an toàn.
 * - Đọc theo stream nên file lớn cũng không tốn RAM.
 */
import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const BATCH_SIZE = 500;

interface RawRecord {
  id?: unknown;
  word?: unknown;
  pronunciation?: unknown;
  audio_url?: unknown;
  image?: unknown;
  academic?: unknown;
  academic_idioms?: unknown;
  definitions?: unknown;
  usage_examples?: unknown;
  advanced_usage?: unknown;
  variants?: unknown;
  synonyms?: unknown;
  antonyms?: unknown;
  idioms?: unknown;
  phrases?: unknown;
  other_sections?: unknown;
  relations?: unknown;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Giữ id gốc từ DB nguồn nếu là UUID hợp lệ, không thì để DB tự sinh. */
function optionalUuid(value: unknown): string | undefined {
  return typeof value === 'string' && UUID_PATTERN.test(value)
    ? value.toLowerCase()
    : undefined;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function jsonArray(value: unknown): Prisma.InputJsonValue {
  return Array.isArray(value) ? (value as Prisma.InputJsonValue) : [];
}

function jsonObject(value: unknown): Prisma.InputJsonValue {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Prisma.InputJsonValue)
    : {};
}

function toRow(line: string): Prisma.VocabularyCreateManyInput | null {
  let raw: RawRecord;
  try {
    raw = JSON.parse(line) as RawRecord;
  } catch {
    return null;
  }
  const word =
    typeof raw.word === 'string' ? raw.word.trim().toLowerCase() : '';
  if (!word) {
    return null;
  }
  return {
    id: optionalUuid(raw.id),
    word,
    pronunciation: optionalString(raw.pronunciation),
    audioUrl: optionalString(raw.audio_url),
    imageUrl: optionalString(raw.image),
    academic: jsonArray(raw.academic),
    academicIdioms: jsonArray(raw.academic_idioms),
    definitions: jsonArray(raw.definitions),
    usageExamples: jsonArray(raw.usage_examples),
    advancedUsage: jsonArray(raw.advanced_usage),
    variants: jsonArray(raw.variants),
    synonyms: jsonArray(raw.synonyms),
    antonyms: jsonArray(raw.antonyms),
    idioms: jsonArray(raw.idioms),
    phrases: jsonArray(raw.phrases),
    otherSections: jsonArray(raw.other_sections),
    relations: jsonObject(raw.relations),
  };
}

async function importFile(prisma: PrismaClient, file: string) {
  const stats = { lines: 0, inserted: 0, skipped: 0, invalid: 0 };
  let batch: Prisma.VocabularyCreateManyInput[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const { count } = await prisma.vocabulary.createMany({
      data: batch,
      skipDuplicates: true,
    });
    stats.inserted += count;
    stats.skipped += batch.length - count;
    batch = [];
    process.stdout.write(
      `\r  ${file}: ${stats.lines} dòng | thêm ${stats.inserted} | bỏ qua ${stats.skipped} | lỗi ${stats.invalid}`,
    );
  };

  const reader = createInterface({
    input: createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of reader) {
    if (!line.trim()) continue;
    stats.lines++;
    const row = toRow(line);
    if (!row) {
      stats.invalid++;
      continue;
    }
    batch.push(row);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  process.stdout.write('\n');
  return stats;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Cách dùng: pnpm vocab:import <file.jsonl> [file2.jsonl ...]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const started = Date.now();
  try {
    let inserted = 0;
    for (const file of files) {
      const stats = await importFile(prisma, file);
      inserted += stats.inserted;
    }
    const total = await prisma.vocabulary.count();
    console.log(
      `Xong trong ${((Date.now() - started) / 1000).toFixed(1)}s: thêm mới ${inserted}, bảng hiện có ${total} từ.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
