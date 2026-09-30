import { comparisonKeys, isNumberToken, normalizeTokens } from './normalize';

describe('normalizeTokens', () => {
  it.each([
    [
      'bỏ hoa thường và khoảng trắng thừa',
      '  River   BANK ',
      ['river', 'bank'],
    ],
    ['bỏ dấu câu ở hai đầu từ', '"river bank."', ['river', 'bank']],
    ['token chỉ có dấu câu bị loại', 'river , bank', ['river', 'bank']],
    ['bỏ dấu thanh', 'Café', ['cafe']],
    ['dấu nháy cong thành nháy thẳng', 'children\u2019s', ["children's"]],
    ['gạch ngang dài thành gạch nối', 'part\u2013time', ['part-time']],
    [
      '& thành and',
      'research & development',
      ['research', 'and', 'development'],
    ],
    ['số viết bằng chữ thành chữ số', 'three days', ['3', 'days']],
    ['số ghép có gạch nối', 'twenty-five', ['25']],
    ['dấu phẩy phân cách nghìn', '£1,500,000', ['£1500000']],
    ['hậu tố thứ tự', '15th March', ['15', 'march']],
    ['giờ dạng 7:30', '7:30pm', ['7.30pm']],
    ['chính tả Mỹ thành Anh', 'color', ['colour']],
    ['chính tả Mỹ số nhiều', 'centers', ['centres']],
    ['đuôi -ization', 'organization', ['organisation']],
    ['đuôi -yze', 'analyzed', ['analysed']],
    ['không bỏ mạo từ', 'the river', ['the', 'river']],
    ['không sửa lỗi chính tả', 'enviroment', ['enviroment']],
    ['từ ngắn không bị đổi đuôi -ize', 'size', ['size']],
    ['"constructor" không bị coi là số', 'constructor', ['constructor']],
    ['chuỗi rỗng', '   ', []],
  ])('%s', (_label, input, expected) => {
    expect(normalizeTokens(input)).toEqual(expected);
  });
});

describe('isNumberToken', () => {
  it.each(['25', '£25', '1500', '7.30', '50%', '7am', '7.30pm'])(
    '%s là số',
    (token) => expect(isNumberToken(token)).toBe(true),
  );

  it.each(['march', '1500s', 'b12'])('%s không phải số', (token) =>
    expect(isNumberToken(token)).toBe(false),
  );
});

describe('comparisonKeys', () => {
  it('gạch nối cho ra cả dạng cách và dạng liền', () => {
    expect(comparisonKeys(['part-time'])).toEqual(['part time', 'parttime']);
  });

  it('không có gạch nối thì chỉ có một khoá', () => {
    expect(comparisonKeys(['part', 'time'])).toEqual(['part time']);
  });
});
