import {
  compileText,
  expandOptional,
  findVariantsOverLimit,
} from './answer-variants';

describe('expandOptional', () => {
  it.each([
    ['không có ngoặc', 'river bank', ['river bank']],
    ['mạo từ tuỳ chọn', '(the) river bank', ['river bank', 'the river bank']],
    ['ký hiệu tiền tuỳ chọn', '(£)25', ['25', '£25']],
    [
      'hai nhóm tuỳ chọn',
      '(a) (large) box',
      ['box', 'a box', 'large box', 'a large box'],
    ],
    ['cả chuỗi là tuỳ chọn thì bỏ bản rỗng', '(the)', ['the']],
  ])('%s', (_label, input, expected) => {
    expect(expandOptional(input).sort()).toEqual([...expected].sort());
  });

  it('chỉ mở rộng tối đa 3 nhóm, nhóm dư giữ nguyên chữ', () => {
    const variants = expandOptional('(a) (b) (c) (d) e');
    expect(variants).toHaveLength(8);
    expect(variants.every((variant) => variant.includes('d e'))).toBe(true);
  });
});

describe('compileText', () => {
  it('gộp khoá của mọi cách viết đã chuẩn hoá', () => {
    const keys = compileText(['(the) river-bank', 'shore']);
    expect([...keys].sort()).toEqual(
      [
        'river bank',
        'riverbank',
        'the river bank',
        'the riverbank',
        'shore',
      ].sort(),
    );
  });
});

describe('findVariantsOverLimit', () => {
  it('báo cách viết vượt giới hạn để admin sửa đáp án hoặc hướng dẫn', () => {
    expect(
      findVariantsOverLimit(['(the) river bank', 'shore'], {
        maxWords: 2,
        allowNumber: false,
      }),
    ).toEqual(['the river bank']);
  });
});
