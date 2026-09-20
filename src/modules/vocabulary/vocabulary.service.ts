import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VocabularyQueryDto } from './dto/vocabulary-query.dto';
import { VocabularyDto, VocabularySummaryDto } from './dto/vocabulary.dto';
import {
  toVocabularyDto,
  toVocabularySummary,
  VOCABULARY_SUMMARY_SELECT,
} from './vocabulary.mapper';

const VOCABULARY_NOT_FOUND = 'Không tìm thấy từ';

/** Từ điển chỉ đọc: dữ liệu được nạp bằng script import, không có API ghi. */
@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: VocabularyQueryDto,
  ): Promise<PaginatedResult<VocabularySummaryDto>> {
    const { pageIndex, pageLimit, search } = query;
    // Cột word luôn lowercase; startsWith dùng được index text_pattern_ops.
    const where: Prisma.VocabularyWhereInput = search
      ? { word: { startsWith: search } }
      : {};

    // Promise.all thay vì $transaction: hai query chạy song song, tiết kiệm 3 round-trip tới DB.
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

  async findById(id: string): Promise<VocabularyDto> {
    const row = await this.prisma.vocabulary.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(VOCABULARY_NOT_FOUND);
    }
    return toVocabularyDto(row);
  }

  async findByWord(word: string): Promise<VocabularyDto> {
    const row = await this.prisma.vocabulary.findUnique({
      where: { word: word.trim().toLowerCase() },
    });
    if (!row) {
      throw new NotFoundException(VOCABULARY_NOT_FOUND);
    }
    return toVocabularyDto(row);
  }
}
