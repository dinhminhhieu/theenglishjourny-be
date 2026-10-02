import {
  AttemptMode,
  Exam,
  ExamSkill,
  IeltsModule,
  TestKind,
} from '../../../generated/prisma/enums';
import type { ItemSetAnswerKey } from '../content/content.types';
import type { AttemptStructure } from '../content/structure.types';
import { buildStructure } from '../test/test-structure';
import { gradeAttempt } from './grade-attempt';

/** Mỗi bộ gồm các câu một điểm, đáp án đều là "A". */
function keysFor(structure: AttemptStructure): Map<string, ItemSetAnswerKey> {
  const keys = new Map<string, ItemSetAnswerKey>();
  for (const section of structure.sections) {
    for (const item of section.items) {
      const questions: ItemSetAnswerKey['questions'] = {};
      for (let n = 1; n <= item.totalMarks; n++) {
        questions[`${item.itemSetReleaseId}-q${n}`] = {
          number: n,
          marks: 1,
          type: 'TOEIC_INCOMPLETE_SENTENCE',
          answer: { kind: 'OPTION', keys: ['A'] },
          wordLimit: null,
          explanation: null,
          evidence: null,
          tags: [],
          grammarLessonId: null,
        };
      }
      keys.set(item.itemSetReleaseId, { transcript: [], questions });
    }
  }
  return keys;
}

/** Trả lời đúng `correct` câu đầu tiên của mỗi kỹ năng, còn lại chọn B. */
function responsesFor(
  structure: AttemptStructure,
  correct: Partial<Record<ExamSkill, number>>,
) {
  const responses: Record<string, string> = {};
  for (const section of structure.sections) {
    let left = correct[section.skill] ?? 0;
    for (const item of section.items) {
      for (let n = 1; n <= item.totalMarks; n++) {
        responses[`${item.itemSetReleaseId}-q${n}`] = left-- > 0 ? 'A' : 'B';
      }
    }
  }
  return responses;
}

function toeicStructure(
  kind: TestKind,
  skill: ExamSkill | null = null,
): AttemptStructure {
  const items = [
    { skill: ExamSkill.LISTENING, part: 1, totalMarks: 6 },
    { skill: ExamSkill.LISTENING, part: 2, totalMarks: 25 },
    { skill: ExamSkill.LISTENING, part: 3, totalMarks: 39 },
    { skill: ExamSkill.LISTENING, part: 4, totalMarks: 30 },
    { skill: ExamSkill.READING, part: 5, totalMarks: 30 },
    { skill: ExamSkill.READING, part: 6, totalMarks: 16 },
    { skill: ExamSkill.READING, part: 7, totalMarks: 54 },
  ]
    .filter((entry) => !skill || entry.skill === skill)
    .map((entry, index) => ({
      ...entry,
      itemSetId: `set-${index}`,
      releaseId: `rel-${index}`,
      questionCount: entry.totalMarks,
    }));
  return buildStructure({ exam: Exam.TOEIC, module: null, kind, skill }, items);
}

describe('gradeAttempt', () => {
  it('TOEIC thi thử đủ 200 câu: quy đổi từng phần và cộng tổng', () => {
    const structure = toeicStructure(TestKind.FULL);
    const output = gradeAttempt({
      structure,
      answerKeys: keysFor(structure),
      responses: responsesFor(structure, { LISTENING: 50, READING: 100 }),
      mode: AttemptMode.EXAM,
    });
    expect(output).toMatchObject({ rawScore: 150, maxScore: 200, percent: 75 });
    expect(
      output.result.sections.map((section) => section.scaled?.value),
    ).toEqual([265, 495]);
    expect(output.result.overall).toEqual({ kind: 'TOEIC_TOTAL', value: 760 });
    expect(output.result.estimated).toBe(true);
    expect(output.score).toBe(760);
  });

  it('số hiển thị của câu đầu phần Reading là 101', () => {
    const structure = toeicStructure(TestKind.FULL);
    const output = gradeAttempt({
      structure,
      answerKeys: keysFor(structure),
      responses: {},
      mode: AttemptMode.EXAM,
    });
    const firstReading = output.answers.find(
      (answer) => answer.skill === ExamSkill.READING,
    );
    expect(firstReading).toMatchObject({
      displayNumber: 101,
      part: 5,
      score: 0,
    });
    expect(output.answers).toHaveLength(200);
  });

  it('chế độ luyện tập không quy đổi điểm, chỉ phần trăm', () => {
    const structure = toeicStructure(TestKind.FULL);
    const output = gradeAttempt({
      structure,
      answerKeys: keysFor(structure),
      responses: responsesFor(structure, { LISTENING: 100, READING: 100 }),
      mode: AttemptMode.PRACTICE,
    });
    expect(
      output.result.sections.every((section) => section.scaled === null),
    ).toBe(true);
    expect(output.result.overall).toEqual({ kind: 'PERCENT', value: 100 });
    expect(output.result.estimated).toBe(false);
  });

  it('IELTS thi thử một kỹ năng: band theo bảng Academic', () => {
    const structure = buildStructure(
      {
        exam: Exam.IELTS,
        module: IeltsModule.ACADEMIC,
        kind: TestKind.SECTION,
        skill: ExamSkill.READING,
      },
      [1, 2, 3].map((part) => ({
        itemSetId: `set-${part}`,
        releaseId: `rel-${part}`,
        skill: ExamSkill.READING,
        part,
        totalMarks: part === 3 ? 14 : 13,
        questionCount: part === 3 ? 14 : 13,
      })),
    );
    const output = gradeAttempt({
      structure,
      answerKeys: keysFor(structure),
      responses: responsesFor(structure, { READING: 30 }),
      mode: AttemptMode.EXAM,
    });
    expect(output.result.overall).toEqual({ kind: 'IELTS_BAND', value: 7 });
    expect(output.result.sections[0].scaled?.table).toBe(
      'ACADEMIC_READING@2026-09',
    );
  });

  it('đề thiếu câu so với định dạng thì không quy đổi', () => {
    const structure = buildStructure(
      {
        exam: Exam.TOEIC,
        module: null,
        kind: TestKind.SECTION,
        skill: ExamSkill.READING,
      },
      [
        {
          itemSetId: 's',
          releaseId: 'r',
          skill: ExamSkill.READING,
          part: 5,
          totalMarks: 30,
          questionCount: 30,
        },
      ],
    );
    const output = gradeAttempt({
      structure,
      answerKeys: keysFor(structure),
      responses: {},
      mode: AttemptMode.EXAM,
    });
    expect(output.result.sections[0].scaled).toBeNull();
    expect(output.result.overall.kind).toBe('PERCENT');
  });
});
