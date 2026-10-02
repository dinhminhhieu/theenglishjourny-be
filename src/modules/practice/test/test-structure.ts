import {
  Exam,
  ExamSkill,
  IeltsModule,
  TestKind,
} from '../../../generated/prisma/enums';
import {
  ExamFormat,
  findSection,
  getExamFormat,
  SectionSpec,
} from '../formats/exam-formats';
import type {
  AttemptStructure,
  StructureItem,
  StructureSection,
} from '../content/structure.types';

export const SKILL_TITLES: Record<ExamSkill, string> = {
  LISTENING: 'Nghe',
  READING: 'Đọc',
  WRITING: 'Viết',
  SPEAKING: 'Nói',
  GRAMMAR: 'Ngữ pháp',
  VOCABULARY: 'Từ vựng',
};

/** Thông tin một bộ câu hỏi khi ghép đề. */
export interface TestItemInfo {
  itemSetId: string;
  code: string;
  exam: Exam;
  skill: ExamSkill;
  module: IeltsModule | null;
  part: number | null;
  totalMarks: number;
  questionCount: number;
  /** Bản phát hành hiện tại, null nếu bộ chưa phát hành. */
  releaseId: string | null;
}

export interface TestShape {
  exam: Exam;
  module: IeltsModule | null;
  kind: TestKind | 'CUSTOM';
  skill: ExamSkill | null;
}

export interface PartReport {
  part: number;
  name: string;
  minQuestions: number;
  maxQuestions: number;
  actualQuestions: number;
  itemSets: number;
}

export interface SectionReport {
  skill: ExamSkill;
  name: string;
  requiredQuestions: number | null;
  actualQuestions: number;
  parts: PartReport[];
}

export interface BlueprintReport {
  ok: boolean;
  errors: string[];
  sections: SectionReport[];
}

/** Các kỹ năng một đề phải có theo loại đề. PRACTICE không bắt buộc gì. */
export function requiredSections(
  format: ExamFormat,
  shape: TestShape,
): SectionSpec[] {
  if (shape.kind === TestKind.FULL) {
    return [...format.sections];
  }
  if (shape.kind === TestKind.SECTION) {
    const section = shape.skill ? findSection(format, shape.skill) : undefined;
    return section ? [section] : [];
  }
  return [];
}

/**
 * So đề với định dạng kỳ thi: đủ phần, đủ số câu mỗi part, đúng kỳ thi và module.
 * Trả báo cáo chi tiết để giao diện admin hiện tiến độ, vd "Part 5: 28/30".
 */
export function validateTestBlueprint(
  shape: TestShape,
  items: TestItemInfo[],
  options: { requireReleases: boolean },
): BlueprintReport {
  const format = getExamFormat(shape.exam, shape.module);
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Đề chưa có bộ câu hỏi nào');
  }
  if (shape.exam === Exam.GENERAL && shape.kind !== TestKind.PRACTICE) {
    errors.push('Bài tập tự do chỉ có loại PRACTICE');
  }
  if (shape.exam === Exam.IELTS && !shape.module) {
    errors.push('Đề IELTS cần chọn module ACADEMIC hoặc GENERAL_TRAINING');
  }
  if (shape.exam !== Exam.IELTS && shape.module) {
    errors.push('Chỉ đề IELTS mới có module');
  }
  if (shape.kind === TestKind.SECTION) {
    if (!shape.skill) {
      errors.push('Đề SECTION cần chọn kỹ năng');
    } else if (!findSection(format, shape.skill)) {
      errors.push(`${format.name} không có phần ${shape.skill}`);
    }
  }

  for (const item of items) {
    if (item.exam !== shape.exam) {
      errors.push(
        `${item.code}: thuộc kỳ thi ${item.exam}, không dùng cho đề ${shape.exam}`,
      );
    }
    if (item.module && shape.module && item.module !== shape.module) {
      errors.push(
        `${item.code}: là bài ${item.module}, đề này là ${shape.module}`,
      );
    }
    if (shape.skill && item.skill !== shape.skill) {
      errors.push(
        `${item.code}: kỹ năng ${item.skill}, đề chỉ gồm ${shape.skill}`,
      );
    }
    if (options.requireReleases && !item.releaseId) {
      errors.push(`${item.code}: chưa phát hành`);
    }
  }

  const required = requiredSections(format, shape);
  const sections: SectionReport[] = required.map((section) =>
    reportSection(section, items, errors),
  );
  if (required.length > 0) {
    const allowed = new Set(required.map((section) => section.skill));
    for (const item of items) {
      if (!allowed.has(item.skill)) {
        errors.push(`${item.code}: đề không có phần ${item.skill}`);
      }
    }
  } else {
    for (const skill of new Set(items.map((item) => item.skill))) {
      const inSkill = items.filter((item) => item.skill === skill);
      sections.push({
        skill,
        name: SKILL_TITLES[skill],
        requiredQuestions: null,
        actualQuestions: sum(inSkill.map((item) => item.totalMarks)),
        parts: [],
      });
    }
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)], sections };
}

function reportSection(
  section: SectionSpec,
  items: TestItemInfo[],
  errors: string[],
): SectionReport {
  const inSection = items.filter((item) => item.skill === section.skill);
  const parts: PartReport[] = section.parts.map((part) => {
    const inPart = inSection.filter((item) => item.part === part.part);
    const actual = sum(inPart.map((item) => item.totalMarks));
    const label = `${section.name} ${part.name}`;
    if (actual < part.minQuestions || actual > part.maxQuestions) {
      const range =
        part.minQuestions === part.maxQuestions
          ? `${part.minQuestions}`
          : `${part.minQuestions}-${part.maxQuestions}`;
      errors.push(`${label}: cần ${range} câu, hiện có ${actual}`);
    }
    if (part.itemSets === 'ONE' && inPart.length !== 1) {
      errors.push(
        `${label}: cần đúng một bộ câu hỏi, hiện có ${inPart.length}`,
      );
    }
    return {
      part: part.part,
      name: part.nameVi,
      minQuestions: part.minQuestions,
      maxQuestions: part.maxQuestions,
      actualQuestions: actual,
      itemSets: inPart.length,
    };
  });
  const actual = sum(inSection.map((item) => item.totalMarks));
  if (actual !== section.questions) {
    errors.push(
      `${section.name}: cần đủ ${section.questions} câu, hiện có ${actual}`,
    );
  }
  return {
    skill: section.skill,
    name: section.nameVi,
    requiredQuestions: section.questions,
    actualQuestions: actual,
    parts,
  };
}

/**
 * Sắp xếp và đánh số đề. Đề FULL, SECTION theo thứ tự phần và part của kỳ thi; bài luyện giữ thứ tự admin xếp.
 * IELTS đánh số lại từ 1 ở mỗi kỹ năng, TOEIC và bài tập tự do đánh số liên tục.
 */
export function buildStructure(
  shape: TestShape,
  items: Array<
    Pick<
      TestItemInfo,
      'itemSetId' | 'skill' | 'part' | 'totalMarks' | 'questionCount'
    > & { releaseId: string }
  >,
): AttemptStructure {
  const format = getExamFormat(shape.exam, shape.module);
  const strict =
    shape.kind === TestKind.FULL || shape.kind === TestKind.SECTION;

  const skillOrder = strict
    ? format.sections.map((section) => section.skill)
    : [...new Set(items.map((item) => item.skill))];

  let counter = 1;
  const sections: StructureSection[] = [];
  for (const skill of skillOrder) {
    const inSkill = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.skill === skill)
      .sort((a, b) =>
        strict
          ? (a.item.part ?? 0) - (b.item.part ?? 0) || a.index - b.index
          : a.index - b.index,
      )
      .map(({ item }) => item);
    if (inSkill.length === 0) {
      continue;
    }
    if (format.numbering === 'PER_SECTION') {
      counter = 1;
    }
    const spec = findSection(format, skill);
    const sectionItems: StructureItem[] = inSkill.map((item) => {
      const entry: StructureItem = {
        itemSetReleaseId: item.releaseId,
        itemSetId: item.itemSetId,
        part: item.part,
        firstNumber: counter,
        questionCount: item.questionCount,
        totalMarks: item.totalMarks,
      };
      counter += item.totalMarks;
      return entry;
    });
    sections.push({
      skill,
      title: spec?.nameVi ?? SKILL_TITLES[skill],
      durationMinutes: strict && spec ? spec.durationMinutes : null,
      items: sectionItems,
    });
  }
  return { formatKey: format.key, kind: shape.kind, sections };
}

/** Thời gian thi thử mặc định: tổng thời gian các phần của đề FULL hoặc SECTION. */
export function defaultDuration(structure: AttemptStructure): number | null {
  const minutes = structure.sections.map((section) => section.durationMinutes);
  return minutes.every((value): value is number => value !== null) &&
    minutes.length > 0
    ? sum(minutes)
    : null;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
