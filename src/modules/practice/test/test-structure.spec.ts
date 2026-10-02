import {
  Exam,
  ExamSkill,
  IeltsModule,
  TestKind,
} from '../../../generated/prisma/enums';
import {
  buildStructure,
  defaultDuration,
  TestItemInfo,
  TestShape,
  validateTestBlueprint,
} from './test-structure';

let seq = 0;
function item(
  exam: Exam,
  skill: ExamSkill,
  part: number | null,
  marks: number,
  module: IeltsModule | null = null,
): TestItemInfo {
  seq += 1;
  return {
    itemSetId: `set-${seq}`,
    code: `SET-${seq}`,
    exam,
    skill,
    module,
    part,
    totalMarks: marks,
    questionCount: marks,
    releaseId: `rel-${seq}`,
  };
}

const L = ExamSkill.LISTENING;
const R = ExamSkill.READING;

export function toeicFullItems(): TestItemInfo[] {
  return [
    item(Exam.TOEIC, L, 1, 6),
    item(Exam.TOEIC, L, 2, 25),
    ...Array.from({ length: 13 }, () => item(Exam.TOEIC, L, 3, 3)),
    ...Array.from({ length: 10 }, () => item(Exam.TOEIC, L, 4, 3)),
    item(Exam.TOEIC, R, 5, 30),
    ...Array.from({ length: 4 }, () => item(Exam.TOEIC, R, 6, 4)),
    item(Exam.TOEIC, R, 7, 54),
  ];
}

export function ieltsAcademicItems(): TestItemInfo[] {
  return [
    ...[1, 2, 3, 4].map((part) => item(Exam.IELTS, L, part, 10)),
    item(Exam.IELTS, R, 1, 13, IeltsModule.ACADEMIC),
    item(Exam.IELTS, R, 2, 13, IeltsModule.ACADEMIC),
    item(Exam.IELTS, R, 3, 14, IeltsModule.ACADEMIC),
  ];
}

const TOEIC_FULL: TestShape = {
  exam: Exam.TOEIC,
  module: null,
  kind: TestKind.FULL,
  skill: null,
};
const IELTS_FULL: TestShape = {
  exam: Exam.IELTS,
  module: IeltsModule.ACADEMIC,
  kind: TestKind.FULL,
  skill: null,
};

describe('validateTestBlueprint', () => {
  it('đề TOEIC đủ 200 câu thì hợp lệ', () => {
    const report = validateTestBlueprint(TOEIC_FULL, toeicFullItems(), {
      requireReleases: true,
    });
    expect(report.errors).toEqual([]);
    expect(
      report.sections.map((section) => [
        section.skill,
        section.actualQuestions,
      ]),
    ).toEqual([
      [L, 100],
      [R, 100],
    ]);
  });

  it('thiếu câu thì báo cụ thể part nào', () => {
    const items = toeicFullItems().filter((entry) => entry.part !== 5);
    items.push(item(Exam.TOEIC, R, 5, 28));
    const report = validateTestBlueprint(TOEIC_FULL, items, {
      requireReleases: true,
    });
    expect(report.ok).toBe(false);
    expect(report.errors).toContain(
      'Reading Incomplete Sentences: cần 30 câu, hiện có 28',
    );
    expect(report.errors).toContain('Reading: cần đủ 100 câu, hiện có 98');
    const part5 = report.sections[1].parts.find((part) => part.part === 5);
    expect(part5).toMatchObject({ actualQuestions: 28, minQuestions: 30 });
  });

  it('IELTS: mỗi bài đọc đúng một bộ, module phải khớp', () => {
    const items = ieltsAcademicItems();
    expect(
      validateTestBlueprint(IELTS_FULL, items, { requireReleases: true })
        .errors,
    ).toEqual([]);

    items[4] = item(Exam.IELTS, R, 1, 13, IeltsModule.GENERAL_TRAINING);
    const report = validateTestBlueprint(IELTS_FULL, items, {
      requireReleases: true,
    });
    expect(report.errors.join(' | ')).toContain('là bài GENERAL_TRAINING');
  });

  it('bộ chưa phát hành bị chặn khi phát hành đề', () => {
    const items = ieltsAcademicItems();
    items[0] = { ...items[0], releaseId: null };
    expect(
      validateTestBlueprint(IELTS_FULL, items, {
        requireReleases: true,
      }).errors.join(' | '),
    ).toContain('chưa phát hành');
    expect(
      validateTestBlueprint(IELTS_FULL, items, { requireReleases: false }).ok,
    ).toBe(true);
  });

  it('đề SECTION chỉ gồm đúng kỹ năng', () => {
    const shape: TestShape = {
      ...TOEIC_FULL,
      kind: TestKind.SECTION,
      skill: R,
    };
    const report = validateTestBlueprint(shape, toeicFullItems(), {
      requireReleases: true,
    });
    expect(report.errors.join(' | ')).toContain('đề chỉ gồm READING');
  });

  it('bài luyện không bắt buộc số câu nhưng phải cùng kỳ thi', () => {
    const shape: TestShape = {
      exam: Exam.TOEIC,
      module: null,
      kind: TestKind.PRACTICE,
      skill: null,
    };
    expect(
      validateTestBlueprint(shape, [item(Exam.TOEIC, R, 5, 3)], {
        requireReleases: true,
      }).ok,
    ).toBe(true);
    const mixed = validateTestBlueprint(
      shape,
      [item(Exam.IELTS, R, 1, 13, IeltsModule.ACADEMIC)],
      { requireReleases: true },
    );
    expect(mixed.errors.join(' | ')).toContain('không dùng cho đề TOEIC');
  });

  it('bài tập tự do chỉ có loại PRACTICE', () => {
    const shape: TestShape = {
      exam: Exam.GENERAL,
      module: null,
      kind: TestKind.FULL,
      skill: null,
    };
    expect(
      validateTestBlueprint(
        shape,
        [item(Exam.GENERAL, ExamSkill.GRAMMAR, null, 5)],
        {
          requireReleases: true,
        },
      ).errors,
    ).toContain('Bài tập tự do chỉ có loại PRACTICE');
  });
});

describe('buildStructure', () => {
  const withRelease = (items: TestItemInfo[]) =>
    items.map((entry) => ({ ...entry, releaseId: entry.releaseId as string }));

  it('TOEIC đánh số liên tục 1-200 và xếp theo part dù admin xếp lộn', () => {
    const items = withRelease(toeicFullItems()).reverse();
    const structure = buildStructure(TOEIC_FULL, items);
    const firstItems = structure.sections.map((section) => section.items[0]);
    expect(firstItems.map((entry) => [entry.part, entry.firstNumber])).toEqual([
      [1, 1],
      [5, 101],
    ]);
    const lastReading = structure.sections[1].items.at(-1);
    expect(lastReading).toMatchObject({ part: 7, firstNumber: 147 });
    expect(defaultDuration(structure)).toBe(120);
  });

  it('IELTS đánh số lại từ 1 ở mỗi kỹ năng', () => {
    const structure = buildStructure(
      IELTS_FULL,
      withRelease(ieltsAcademicItems()),
    );
    expect(
      structure.sections.map((section) =>
        section.items.map((entry) => entry.firstNumber),
      ),
    ).toEqual([
      [1, 11, 21, 31],
      [1, 14, 27],
    ]);
    expect(
      structure.sections.map((section) => section.durationMinutes),
    ).toEqual([30, 60]);
  });

  it('bài luyện giữ thứ tự admin xếp và không có thời gian mặc định', () => {
    const shape: TestShape = {
      exam: Exam.TOEIC,
      module: null,
      kind: TestKind.PRACTICE,
      skill: null,
    };
    const items = withRelease([
      item(Exam.TOEIC, R, 7, 5),
      item(Exam.TOEIC, R, 5, 3),
    ]);
    const structure = buildStructure(shape, items);
    expect(
      structure.sections[0].items.map((entry) => [
        entry.part,
        entry.firstNumber,
      ]),
    ).toEqual([
      [7, 1],
      [5, 6],
    ]);
    expect(defaultDuration(structure)).toBeNull();
  });
});
