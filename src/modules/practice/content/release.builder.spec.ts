import {
  IELTS_READING_META,
  ieltsReadingGroups,
  READING_STIMULUS,
  TOEIC_PHOTO_META,
  toeicPhotoGroups,
} from './fixtures';
import { validateItemSetTree } from './item-set.validator';
import type { GroupDraft, ItemSetMeta } from './item-set.validator';
import { buildItemSetRelease } from './release.builder';

/** Các key chỉ được phép nằm trong answerKey, không bao giờ trong nội dung cho người học. */
export const SECRET_KEYS = [
  'answer',
  'accepted',
  'explanation',
  'evidence',
  'transcript',
  'source',
];

export function collectKeys(
  value: unknown,
  keys = new Set<string>(),
): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function build(
  meta: ItemSetMeta,
  groups: GroupDraft[],
  stimulus: unknown = {},
) {
  const tree = validateItemSetTree({ meta, stimulus, groups, transcript: [] });
  expect(tree.errors).toEqual([]);
  let id = 0;
  return buildItemSetRelease({
    id: 'set-1',
    code: 'SET-1',
    title: 'Set',
    description: null,
    ...meta,
    difficulty: null,
    levelFrom: null,
    levelTo: null,
    stimulus: tree.stimulus,
    transcript: [{ startSec: 0, text: 'secret transcript' }],
    audio: meta.skill === 'LISTENING' ? { durationSeconds: 30 } : null,
    groups: tree.groups.map((group) => ({
      id: `g${++id}`,
      type: group.type,
      instructions: group.instructions,
      content: group.content,
      passageKey: group.passageKey,
      questions: group.questions.map((question) => ({
        ...question,
        id: `q${++id}`,
      })),
    })),
  });
}

describe('buildItemSetRelease', () => {
  const release = build(
    IELTS_READING_META,
    ieltsReadingGroups(),
    READING_STIMULUS,
  );

  it('nội dung cho người học không chứa đáp án, giải thích, transcript', () => {
    const keys = collectKeys(release.content);
    for (const secret of SECRET_KEYS) {
      expect(keys.has(secret)).toBe(false);
    }
    const text = JSON.stringify(release.content);
    expect(text).not.toContain('Đoạn B nói');
    expect(text).not.toContain('secret transcript');
    // "roofs" chỉ có trong đáp án, "rooftops" thì có sẵn trong bài đọc.
    expect(text).not.toContain('roofs');
  });

  it('answerKey giữ đáp án và dữ liệu chấm của từng câu', () => {
    const entries = Object.values(release.answerKey.questions);
    expect(entries).toHaveLength(7);
    expect(entries[0]).toMatchObject({
      number: 1,
      type: 'IELTS_TRUE_FALSE_NOT_GIVEN',
      answer: { kind: 'OPTION', keys: ['FALSE'] },
    });
    expect(entries[4]).toMatchObject({
      wordLimit: { maxWords: 1, allowNumber: false },
    });
    expect(release.answerKey.transcript).toEqual([
      { startSec: 0, text: 'secret transcript' },
    ]);
    expect(release).toMatchObject({ questionCount: 7, totalMarks: 8 });
  });

  it('mô tả cách trả lời cho FE', () => {
    const [tfng, headings, summary, multi] = release.content.groups;
    expect(tfng.questions[0].input).toEqual({
      kind: 'CHOICE',
      options: [
        { key: 'TRUE', text: 'TRUE' },
        { key: 'FALSE', text: 'FALSE' },
        { key: 'NOT_GIVEN', text: 'NOT GIVEN' },
      ],
      multiple: false,
      maxChoices: 1,
      audioOnly: false,
    });
    expect(headings.questions[0].input).toMatchObject({
      kind: 'CHOICE',
      multiple: false,
    });
    expect(summary.questions[0].input).toEqual({
      kind: 'TEXT',
      blanks: 1,
      wordLimit: { maxWords: 1, allowNumber: false },
      wordLimitText: 'ONE WORD ONLY',
    });
    expect(multi.questions[0].input).toMatchObject({
      kind: 'CHOICE',
      multiple: true,
      maxChoices: 2,
    });
    expect(tfng.typeName).toBe('True / False / Not Given');
  });

  it('TOEIC Part 1: lựa chọn chỉ có trong audio nên không kèm chữ', () => {
    const toeic = build(TOEIC_PHOTO_META, toeicPhotoGroups());
    expect(toeic.content.groups[0].questions[0].input).toEqual({
      kind: 'CHOICE',
      options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }],
      multiple: false,
      maxChoices: 1,
      audioOnly: true,
    });
    expect(toeic.content.hasAudio).toBe(true);
  });
});
