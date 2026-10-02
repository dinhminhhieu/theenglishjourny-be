import { Exam, ExamSkill, IeltsModule } from '../../../generated/prisma/enums';
import {
  IELTS_READING_META,
  ieltsReadingGroups,
  READING_STIMULUS,
  TOEIC_PHOTO_META,
  toeicPhotoGroups,
} from './fixtures';
import {
  GroupDraft,
  validateForPublish,
  validateItemSetMeta,
  validateItemSetTree,
} from './item-set.validator';

function validReading(groups: GroupDraft[] = ieltsReadingGroups()) {
  return validateItemSetTree({
    meta: IELTS_READING_META,
    stimulus: READING_STIMULUS,
    groups,
  });
}

function errorsFor(mutate: (groups: GroupDraft[]) => void): string[] {
  const groups = ieltsReadingGroups();
  mutate(groups);
  return validReading(groups).errors;
}

describe('validateItemSetMeta', () => {
  it.each([
    [
      'IELTS Reading thiếu module',
      { ...IELTS_READING_META, module: null },
      'module',
    ],
    [
      'IELTS Listening có module',
      { ...IELTS_READING_META, skill: ExamSkill.LISTENING },
      'Chỉ IELTS Reading',
    ],
    ['IELTS Reading part 4', { ...IELTS_READING_META, part: 4 }, 'part'],
    [
      'TOEIC Reading part 2',
      { exam: Exam.TOEIC, skill: ExamSkill.READING, module: null, part: 2 },
      '5, 6, 7',
    ],
    [
      'bài tập tự do có part',
      { exam: Exam.GENERAL, skill: ExamSkill.GRAMMAR, module: null, part: 1 },
      'không chia part',
    ],
    [
      'Writing chưa hỗ trợ',
      {
        exam: Exam.IELTS,
        skill: ExamSkill.WRITING,
        module: IeltsModule.ACADEMIC,
        part: 1,
      },
      'AI',
    ],
    [
      'TOEIC không có kỹ năng Grammar',
      { exam: Exam.TOEIC, skill: ExamSkill.GRAMMAR, module: null, part: 5 },
      'không có kỹ năng',
    ],
  ])('%s', (_label, meta, fragment) => {
    const errors = validateItemSetMeta(meta);
    expect(errors.join(' | ')).toContain(fragment);
  });

  it('bài tập tự do không cần part', () => {
    expect(
      validateItemSetMeta({
        exam: Exam.GENERAL,
        skill: ExamSkill.VOCABULARY,
        module: null,
        part: null,
      }),
    ).toEqual([]);
  });
});

describe('validateItemSetTree', () => {
  it('bộ hợp lệ: không lỗi, tự đánh số theo marks', () => {
    const result = validReading();
    expect(result.errors).toEqual([]);
    const numbers = result.groups.flatMap((group) =>
      group.questions.map((question) => [question.number, question.marks]),
    );
    // TFNG 2 câu, headings 2 câu, summary 2 câu, Choose TWO chiếm câu 7-8.
    expect(numbers).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 2],
    ]);
    expect(result.questionCount).toBe(7);
    expect(result.totalMarks).toBe(8);
  });

  it('lược bỏ key lạ trong JSON', () => {
    const groups = ieltsReadingGroups();
    (groups[1].content as Record<string, unknown>).hacker = 'x';
    const result = validReading(groups);
    expect(result.errors.join(' ')).toContain('hacker');
  });

  it.each<[string, (groups: GroupDraft[]) => void, string]>([
    [
      'dạng câu không tồn tại',
      (groups) => (groups[0].type = 'IELTS_ESSAY'),
      'không tồn tại',
    ],
    [
      'dạng TOEIC trong đề IELTS',
      (groups) => (groups[0].type = 'TOEIC_INCOMPLETE_SENTENCE'),
      'không dùng cho kỳ thi IELTS',
    ],
    [
      'đáp án TFNG ngoài TRUE/FALSE/NOT_GIVEN',
      (groups) =>
        (groups[0].questions[0].answer = { kind: 'OPTION', keys: ['MAYBE'] }),
      'key MAYBE không có',
    ],
    [
      'loại đáp án không hợp với dạng câu',
      (groups) =>
        (groups[0].questions[0].answer = { kind: 'TEXT', accepted: ['false'] }),
      'chỉ nhận đáp án OPTION',
    ],
    [
      'heading trùng khi không cho dùng lại',
      (groups) =>
        (groups[1].questions[1].answer = { kind: 'OPTION', keys: ['ii'] }),
      'dùng cho nhiều câu',
    ],
    [
      'đoạn văn không có trong bài đọc',
      (groups) => (groups[1].questions[0].content = { paragraph: 'Z' }),
      'đoạn Z không có',
    ],
    [
      'thiếu chỗ trống trong template',
      (groups) => {
        (groups[2].content as Record<string, unknown>).template =
          'Bees kept on {{1}}.';
      },
      'thiếu chỗ trống {{2}}',
    ],
    [
      'chỗ trống thừa',
      (groups) => {
        (groups[2].content as Record<string, unknown>).template =
          '{{1}} {{2}} {{3}}';
      },
      'không ứng với câu nào',
    ],
    [
      'đáp án vượt giới hạn số từ',
      (groups) =>
        (groups[2].questions[0].answer = {
          kind: 'TEXT',
          accepted: ['city rooftops'],
        }),
      'vượt giới hạn số từ',
    ],
    [
      'IELTS điền từ thiếu wordLimit',
      (groups) => {
        delete (groups[2].content as Record<string, unknown>).wordLimit;
      },
      'cần content.wordLimit',
    ],
    [
      'Choose TWO có số đáp án bằng số lựa chọn',
      (groups) =>
        (groups[3].questions[0].answer = {
          kind: 'OPTION_SET',
          keys: ['A', 'B', 'C', 'D'],
        }),
      'ít hơn số lựa chọn',
    ],
    [
      'ngoặc không khớp',
      (groups) =>
        (groups[2].questions[0].answer = {
          kind: 'TEXT',
          accepted: ['(the roofs'],
        }),
      'dấu ngoặc không khớp',
    ],
    [
      'nhóm không có câu',
      (groups) => (groups[0].questions = []),
      'ít nhất một câu',
    ],
  ])('%s', (_label, mutate, fragment) => {
    expect(errorsFor(mutate).join(' | ')).toContain(fragment);
  });

  it('word bank thì đáp án phải là key lựa chọn', () => {
    const errors = errorsFor((groups) => {
      groups[2].content = {
        template: 'Bees kept on {{1}} can make more {{2}}.',
        options: [
          { key: 'A', text: 'rooftops' },
          { key: 'B', text: 'honey' },
          { key: 'C', text: 'wax' },
        ],
      };
    });
    expect(errors.join(' | ')).toContain('word bank thì đáp án phải là OPTION');
  });

  it('TOEIC Part 1 hợp lệ và bắt buộc có ảnh', () => {
    const ok = validateItemSetTree({
      meta: TOEIC_PHOTO_META,
      groups: toeicPhotoGroups(),
    });
    expect(ok.errors).toEqual([]);

    const groups = toeicPhotoGroups();
    groups[0].content = {};
    const missing = validateItemSetTree({ meta: TOEIC_PHOTO_META, groups });
    expect(missing.errors.join(' | ')).toContain('cần có imageUrl');
  });

  it('nhận URL ảnh của storage local, từ chối URL không có giao thức', () => {
    const withImage = (imageUrl: string) => {
      const groups = toeicPhotoGroups();
      groups[0].content = { imageUrl };
      return validateItemSetTree({ meta: TOEIC_PHOTO_META, groups }).errors;
    };
    expect(
      withImage('http://localhost:9000/theenglishjourney-public/photo.png'),
    ).toEqual([]);
    expect(withImage('localhost/photo.png').join(' | ')).toContain('imageUrl');
  });
});

describe('validateForPublish', () => {
  it('Listening cần audio đã upload xong', () => {
    const tree = validateItemSetTree({
      meta: TOEIC_PHOTO_META,
      groups: toeicPhotoGroups(),
    });
    expect(validateForPublish(TOEIC_PHOTO_META, tree, null)).toEqual([
      'Bộ Listening cần có audio',
    ]);
    expect(
      validateForPublish(TOEIC_PHOTO_META, tree, { ready: false }),
    ).toEqual(['Audio chưa upload xong']);
    expect(validateForPublish(TOEIC_PHOTO_META, tree, { ready: true })).toEqual(
      [],
    );
  });

  it('IELTS Reading cần bài đọc', () => {
    const tree = validateItemSetTree({
      meta: IELTS_READING_META,
      groups: ieltsReadingGroups().slice(3),
    });
    expect(validateForPublish(IELTS_READING_META, tree, null)).toContain(
      'Bộ câu hỏi đọc hiểu cần có ít nhất một bài đọc',
    );
  });
});

describe('nội dung câu hỏi của dạng không có content', () => {
  it('key lạ trong content bị báo là thừa', () => {
    const errors = errorsFor((groups) => {
      groups[0].questions[0].content = { options: [] };
    });
    expect(errors.join(' | ')).toContain('options');
  });
});
