import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VocabularyQueryDto } from '../vocabulary/dto/vocabulary-query.dto';
import { VocabularySummaryDto } from '../vocabulary/dto/vocabulary.dto';
import {
  toVocabularySummary,
  VOCABULARY_SUMMARY_SELECT,
} from '../vocabulary/vocabulary.mapper';
import {
  AddTopicWordsResultDto,
  TopicWordCheckDto,
} from './dto/topic-word.dto';

const TOPIC_NOT_FOUND = 'Không tìm thấy chủ đề';

export function normalizeWord(word: string): string {
  return word.replace(/\s+/g, ' ').trim().toLowerCase();
}

@Injectable()
export class TopicWordService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    topicId: string,
    query: VocabularyQueryDto,
    scope: 'public' | 'admin',
  ): Promise<PaginatedResult<VocabularySummaryDto>> {
    await this.assertTopic(topicId, scope);
    const { pageIndex, pageLimit, search } = query;
    const where: Prisma.VocabularyWhereInput = {
      topics: { some: { topicId } },
      ...(search ? { word: { startsWith: search } } : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.vocabulary.count({ where }),
      this.prisma.vocabulary.findMany({
        where,
        orderBy: { word: 'asc' },
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
        select: VOCABULARY_SUMMARY_SELECT,
      }),
    ]);
    return {
      items: rows.map(toVocabularySummary),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async check(topicId: string, words: string[]): Promise<TopicWordCheckDto> {
    await this.assertTopic(topicId, 'admin');
    const normalized = [
      ...new Set(words.map(normalizeWord).filter((word) => word.length > 0)),
    ];
    const rows = await this.prisma.vocabulary.findMany({
      where: { word: { in: normalized } },
      select: {
        ...VOCABULARY_SUMMARY_SELECT,
        topics: { where: { topicId }, select: { topicId: true } },
      },
    });
    const byWord = new Map(rows.map((row) => [row.word, row]));
    return {
      items: normalized.map((word) => {
        const row = byWord.get(word);
        if (!row) {
          return {
            word,
            vocabularyId: null,
            pronunciation: null,
            shortMeaning: null,
            inTopic: false,
          };
        }
        const summary = toVocabularySummary(row);
        return {
          word,
          vocabularyId: row.id,
          pronunciation: summary.pronunciation,
          shortMeaning: summary.shortMeaning,
          inTopic: row.topics.length > 0,
        };
      }),
    };
  }

  async add(
    topicId: string,
    vocabularyIds: string[],
  ): Promise<AddTopicWordsResultDto> {
    await this.assertTopic(topicId, 'admin');
    const unique = [...new Set(vocabularyIds)];
    const existing = await this.prisma.vocabulary.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    const { count } = await this.prisma.topicWord.createMany({
      data: existing.map(({ id }) => ({ topicId, vocabularyId: id })),
      skipDuplicates: true,
    });
    return { added: count, skipped: vocabularyIds.length - count };
  }

  async remove(topicId: string, vocabularyId: string): Promise<void> {
    await this.assertTopic(topicId, 'admin');
    const { count } = await this.prisma.topicWord.deleteMany({
      where: { topicId, vocabularyId },
    });
    if (count === 0) {
      throw new NotFoundException('Từ này không nằm trong chủ đề');
    }
  }

  private async assertTopic(
    topicId: string,
    scope: 'public' | 'admin',
  ): Promise<void> {
    const topic = await this.prisma.topic.findFirst({
      where: {
        id: topicId,
        deletedAt: null,
        ...(scope === 'public' ? { isActive: true } : {}),
      },
      select: { id: true },
    });
    if (!topic) {
      throw new NotFoundException(TOPIC_NOT_FOUND);
    }
  }
}
