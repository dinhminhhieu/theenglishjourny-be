import { Injectable } from '@nestjs/common';
import {
  Exam,
  IeltsModule,
  LessonStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { findSection, getExamFormat } from '../formats/exam-formats';
import { getQuestionType } from '../formats/question-types';
import { SKILL_TITLES } from '../test/test-structure';
import type { PracticeCatalogDto } from './dto/attempt.dto';

/** Những gì có thể luyện theo part hoặc dạng câu, để FE dựng menu "Luyện Part 5", "Luyện Matching Headings". */
@Injectable()
export class PracticeCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async catalog(exam: Exam, module?: IeltsModule): Promise<PracticeCatalogDto> {
    const pool: Prisma.ItemSetWhereInput = {
      exam,
      deletedAt: null,
      status: LessonStatus.PUBLISHED,
      practiceEnabled: true,
      currentReleaseId: { not: null },
      ...(module ? { OR: [{ module }, { module: null }] } : {}),
    };
    const [byPart, byType] = await Promise.all([
      this.prisma.itemSet.groupBy({
        by: ['skill', 'part'],
        where: pool,
        _count: { _all: true },
        _sum: { totalMarks: true },
        orderBy: [{ skill: 'asc' }, { part: 'asc' }],
      }),
      this.prisma.questionGroup.groupBy({
        by: ['type'],
        where: { itemSet: pool },
        _count: { _all: true },
        orderBy: { type: 'asc' },
      }),
    ]);
    const format = getExamFormat(exam, module ?? null);
    return {
      exam,
      parts: byPart.map((row) => {
        const part = findSection(format, row.skill)?.parts.find(
          (spec) => spec.part === row.part,
        );
        return {
          skill: row.skill,
          part: row.part,
          name: part?.nameVi ?? SKILL_TITLES[row.skill],
          itemSets: row._count._all,
          questions: row._sum.totalMarks ?? 0,
        };
      }),
      questionTypes: byType.map((row) => {
        const spec = getQuestionType(row.type);
        return {
          code: row.type,
          name: spec?.nameVi ?? row.type,
          skills: spec ? [...spec.skills] : [],
          groups: row._count._all,
        };
      }),
    };
  }
}
