import { Prisma, Vocabulary } from '../../generated/prisma/client';
import {
  AcademicSectionDto,
  DefinitionSectionDto,
} from './dto/vocabulary-section.dto';
import { VocabularyDto, VocabularySummaryDto } from './dto/vocabulary.dto';

const SHORT_MEANING_MAX_LENGTH = 160;

/** Chỉ lấy các cột cần cho danh sách, tránh kéo toàn bộ JSON của mỗi từ. */
export const VOCABULARY_SUMMARY_SELECT = {
  id: true,
  word: true,
  pronunciation: true,
  audioUrl: true,
  imageUrl: true,
  definitions: true,
  academic: true,
} satisfies Prisma.VocabularySelect;

type VocabularySummaryRow = Prisma.VocabularyGetPayload<{
  select: typeof VOCABULARY_SUMMARY_SELECT;
}>;

export function toVocabularySummary(
  row: VocabularySummaryRow,
): VocabularySummaryDto {
  const definitions = asArray<DefinitionSectionDto>(row.definitions);
  const academic = asArray<AcademicSectionDto>(row.academic);
  return {
    id: row.id,
    word: row.word,
    pronunciation: row.pronunciation,
    audioUrl: row.audioUrl,
    imageUrl: row.imageUrl,
    wordTypes: uniqueWordTypes(definitions, academic),
    shortMeaning: firstMeaning(definitions, academic),
  };
}

export function toVocabularyDto(row: Vocabulary): VocabularyDto {
  return {
    ...toVocabularySummary(row),
    academic: asArray(row.academic),
    academicIdioms: asArray(row.academicIdioms),
    definitions: asArray(row.definitions),
    usageExamples: asArray(row.usageExamples),
    advancedUsage: asArray(row.advancedUsage),
    variants: asArray(row.variants),
    synonyms: asArray(row.synonyms),
    antonyms: asArray(row.antonyms),
    idioms: asArray(row.idioms),
    phrases: asArray(row.phrases),
    otherSections: asArray(row.otherSections),
    relations: asRecord(row.relations),
    createdAt: row.createdAt,
  };
}

/** Dữ liệu JSON đến từ dataset, không qua validate: luôn phòng trường hợp sai kiểu. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, string[]> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string[]>)
    : {};
}

function uniqueWordTypes(
  definitions: DefinitionSectionDto[],
  academic: AcademicSectionDto[],
): string[] {
  const types = [
    ...definitions.map((section) => section?.word_type),
    ...academic.map((section) => section?.word_type),
  ].filter(
    (type): type is string => typeof type === 'string' && type.length > 0,
  );
  return [...new Set(types)];
}

function firstMeaning(
  definitions: DefinitionSectionDto[],
  academic: AcademicSectionDto[],
): string | null {
  for (const section of definitions) {
    const sense = section?.senses?.[0];
    if (typeof sense === 'string' && sense.trim()) {
      return truncate(sense);
    }
  }
  for (const section of academic) {
    const meaning = section?.meanings?.[0]?.meaning;
    if (typeof meaning === 'string' && meaning.trim()) {
      return truncate(meaning);
    }
  }
  return null;
}

function truncate(text: string, max = SHORT_MEANING_MAX_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}
