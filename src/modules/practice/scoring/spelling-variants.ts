/**
 * Chính tả Mỹ thành chính tả Anh. Cả đáp án lẫn bài làm đều được quy về cùng một dạng,
 * nên người học viết kiểu nào cũng được chấm đúng, đúng như quy định của IELTS.
 */
const US_TO_UK = new Map<string, string>([
  // -or / -our
  ['behavior', 'behaviour'],
  ['color', 'colour'],
  ['favor', 'favour'],
  ['favorite', 'favourite'],
  ['flavor', 'flavour'],
  ['harbor', 'harbour'],
  ['honor', 'honour'],
  ['humor', 'humour'],
  ['labor', 'labour'],
  ['neighbor', 'neighbour'],
  ['neighborhood', 'neighbourhood'],
  ['odor', 'odour'],
  ['rumor', 'rumour'],
  ['vapor', 'vapour'],
  // -er / -re
  ['center', 'centre'],
  ['centimeter', 'centimetre'],
  ['fiber', 'fibre'],
  ['kilometer', 'kilometre'],
  ['liter', 'litre'],
  ['meter', 'metre'],
  ['millimeter', 'millimetre'],
  ['theater', 'theatre'],
  // -se / -ce
  ['defense', 'defence'],
  ['license', 'licence'],
  ['offense', 'offence'],
  ['practice', 'practise'],
  // -l / -ll
  ['canceled', 'cancelled'],
  ['canceling', 'cancelling'],
  ['counselor', 'counsellor'],
  ['enroll', 'enrol'],
  ['enrollment', 'enrolment'],
  ['fueled', 'fuelled'],
  ['fulfill', 'fulfil'],
  ['jewelry', 'jewellery'],
  ['labeled', 'labelled'],
  ['labeling', 'labelling'],
  ['modeled', 'modelled'],
  ['modeling', 'modelling'],
  ['skillful', 'skilful'],
  ['traveled', 'travelled'],
  ['traveler', 'traveller'],
  ['traveling', 'travelling'],
  // -og / -ogue
  ['analog', 'analogue'],
  ['catalog', 'catalogue'],
  ['dialog', 'dialogue'],
  // ae / oe
  ['anemia', 'anaemia'],
  ['archeology', 'archaeology'],
  ['encyclopedia', 'encyclopaedia'],
  ['esthetic', 'aesthetic'],
  ['fetus', 'foetus'],
  ['maneuver', 'manoeuvre'],
  ['pediatric', 'paediatric'],
  // khác
  ['acknowledgment', 'acknowledgement'],
  ['aging', 'ageing'],
  ['airplane', 'aeroplane'],
  ['aluminum', 'aluminium'],
  ['cozy', 'cosy'],
  ['donut', 'doughnut'],
  ['gray', 'grey'],
  ['judgment', 'judgement'],
  ['mold', 'mould'],
  ['mustache', 'moustache'],
  ['pajamas', 'pyjamas'],
  ['plow', 'plough'],
  ['program', 'programme'],
  ['sulfur', 'sulphur'],
  ['tire', 'tyre'],
  ['yogurt', 'yoghurt'],
]);

/** Hậu tố thử bóc khi tra bảng, vd "colors" -> "color" + "s" -> "colours". */
const SUFFIXES = ['s', 'ed', 'ing', 'ful', 'less'];

/** -ize/-yze thành -ise/-yse, vd "organization" -> "organisation". Chỉ áp dụng cho từ đủ dài. */
const IZE_ENDING = /iz(e|ed|es|ing|ation|ations|er|ers)$/;
const YZE_ENDING = /yz(e|ed|es|ing|er|ers)$/;
const MIN_FOLD_LENGTH = 6;

export function canonSpelling(token: string): string {
  const direct = US_TO_UK.get(token);
  if (direct !== undefined) {
    return direct;
  }
  for (const suffix of SUFFIXES) {
    if (token.length > suffix.length && token.endsWith(suffix)) {
      const base = US_TO_UK.get(token.slice(0, -suffix.length));
      if (base !== undefined) {
        return base + suffix;
      }
    }
  }
  if (token.length >= MIN_FOLD_LENGTH) {
    return token.replace(IZE_ENDING, 'is$1').replace(YZE_ENDING, 'ys$1');
  }
  return token;
}
