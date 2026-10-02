/**
 * Nội dung mẫu cho ngân hàng câu hỏi: tự soạn, không lấy từ sách hay đề thi có bản quyền.
 * Dùng để dev và demo luồng làm bài. Nội dung thật do đội học thuật soạn qua trang admin.
 */
import {
  Exam,
  ExamSkill,
  IeltsModule,
  TestKind,
} from '../../src/generated/prisma/client';
import type { GroupDraft } from '../../src/modules/practice/content/item-set.validator';

export interface SeedItemSet {
  code: string;
  title: string;
  exam: Exam;
  skill: ExamSkill;
  module: IeltsModule | null;
  part: number | null;
  description?: string;
  difficulty: number;
  tags: string[];
  stimulus?: unknown;
  transcript?: unknown;
  audioAssetId?: string;
  groups: GroupDraft[];
}

export interface SeedTest {
  code: string;
  title: string;
  description: string;
  exam: Exam;
  module: IeltsModule | null;
  kind: TestKind;
  skill: ExamSkill | null;
  xpCost: number;
  itemSetCodes: string[];
}

export const choices = (texts: string[]) => ({
  options: texts.map((text, index) => ({
    key: String.fromCharCode(65 + index),
    text,
  })),
});

export const SEED_ITEM_SETS: SeedItemSet[] = [
  {
    code: 'SAMPLE-IELTS-AC-R-001',
    title: 'Rooftop beekeeping in modern cities',
    exam: Exam.IELTS,
    skill: ExamSkill.READING,
    module: IeltsModule.ACADEMIC,
    part: 1,
    difficulty: 2,
    tags: ['environment', 'urban-life'],
    stimulus: {
      passages: [
        {
          key: 'main',
          title: 'Rooftop beekeeping in modern cities',
          paragraphs: [
            {
              label: 'A',
              markdown:
                'Twenty years ago, keeping bees was seen as a rural hobby. Today, hives can be found on the roofs of hotels, office towers and even railway stations. Supporters say the trend reconnects city dwellers with the way food is produced.',
            },
            {
              label: 'B',
              markdown:
                'Surprisingly, urban colonies are often more productive than their country cousins. Parks, gardens and tree-lined streets offer a long flowering season, and cities are usually a few degrees warmer, so bees can forage for more weeks each year.',
            },
            {
              label: 'C',
              markdown:
                'Not everyone is enthusiastic. Ecologists warn that too many honeybee hives in one district may leave less nectar for wild bees, many of which are already in decline. Some councils now ask beekeepers to register their hives.',
            },
            {
              label: 'D',
              markdown:
                'For companies, a rooftop hive can be an attractive symbol of environmental responsibility. However, experts stress that planting flowers is a more effective way to support pollinators than simply installing boxes of bees.',
            },
          ],
        },
      ],
    },
    groups: [
      {
        type: 'IELTS_TRUE_FALSE_NOT_GIVEN',
        instructions:
          'Do the following statements agree with the information given in the passage?',
        questions: [
          {
            prompt:
              'Beekeeping used to be regarded mainly as a countryside activity.',
            answer: { kind: 'OPTION', keys: ['TRUE'] },
            explanation: 'Đoạn A: "keeping bees was seen as a rural hobby".',
            evidence: {
              paragraph: 'A',
              quote: 'keeping bees was seen as a rural hobby',
            },
          },
          {
            prompt:
              'City bees usually produce less honey than bees in the country.',
            answer: { kind: 'OPTION', keys: ['FALSE'] },
            explanation:
              'Đoạn B nói ong thành phố thường cho năng suất cao hơn.',
            evidence: {
              paragraph: 'B',
              quote: 'more productive than their country cousins',
            },
          },
          {
            prompt: 'Most rooftop hives are owned by hotels.',
            answer: { kind: 'OPTION', keys: ['NOT_GIVEN'] },
            explanation:
              'Bài chỉ liệt kê khách sạn là một nơi có tổ ong, không nói tỉ lệ.',
          },
          {
            prompt:
              'Some local authorities require beekeepers to record their hives.',
            answer: { kind: 'OPTION', keys: ['TRUE'] },
            explanation:
              'Đoạn C: "Some councils now ask beekeepers to register their hives".',
            evidence: {
              paragraph: 'C',
              quote: 'ask beekeepers to register their hives',
            },
          },
        ],
      },
      {
        type: 'IELTS_MATCHING_HEADINGS',
        instructions:
          'Choose the correct heading for paragraphs B–D from the list of headings.',
        content: {
          title: 'List of Headings',
          options: [
            { key: 'i', text: 'An unexpected advantage' },
            { key: 'ii', text: 'A threat to other species' },
            { key: 'iii', text: 'A better way to help' },
            { key: 'iv', text: 'The cost of equipment' },
            { key: 'v', text: 'From farm to rooftop' },
          ],
          example: { paragraph: 'A', key: 'v' },
        },
        questions: [
          {
            content: { paragraph: 'B' },
            answer: { kind: 'OPTION', keys: ['i'] },
          },
          {
            content: { paragraph: 'C' },
            answer: { kind: 'OPTION', keys: ['ii'] },
          },
          {
            content: { paragraph: 'D' },
            answer: { kind: 'OPTION', keys: ['iii'] },
          },
        ],
      },
      {
        type: 'IELTS_SUMMARY_COMPLETION',
        instructions:
          'Complete the summary. Choose ONE WORD ONLY from the passage for each answer.',
        content: {
          title: 'Why city bees do well',
          template:
            'Urban areas provide a longer {{1}} season, and because cities are {{2}} than the countryside, bees can collect food for more weeks. Experts say planting {{3}} helps pollinators more than adding hives.',
          wordLimit: { maxWords: 1, allowNumber: false },
        },
        questions: [
          { answer: { kind: 'TEXT', accepted: ['flowering'] } },
          { answer: { kind: 'TEXT', accepted: ['warmer'] } },
          { answer: { kind: 'TEXT', accepted: ['flowers'] } },
        ],
      },
      {
        type: 'IELTS_MULTIPLE_CHOICE_MULTI',
        instructions: 'Choose TWO letters, A–E.',
        questions: [
          {
            prompt:
              'Which TWO concerns or criticisms are mentioned in the passage?',
            content: choices([
              'Hives may reduce food for wild bees',
              'Honey from cities is unsafe to eat',
              'Hives on roofs are dangerous for workers',
              'Installing hives is less useful than planting flowers',
              'Urban bees live shorter lives',
            ]),
            answer: { kind: 'OPTION_SET', keys: ['A', 'D'] },
          },
        ],
      },
    ],
  },
  {
    code: 'SAMPLE-TOEIC-P5-001',
    title: 'Incomplete Sentences: office life',
    exam: Exam.TOEIC,
    skill: ExamSkill.READING,
    module: null,
    part: 5,
    difficulty: 2,
    tags: ['office'],
    groups: [
      {
        type: 'TOEIC_INCOMPLETE_SENTENCE',
        instructions: 'Select the best answer to complete the sentence.',
        questions: [
          {
            prompt:
              'All employees are required to ------- their timesheets by Friday afternoon.',
            content: choices(['submit', 'submits', 'submitting', 'submission']),
            answer: { kind: 'OPTION', keys: ['A'] },
            explanation: 'Sau "are required to" cần động từ nguyên mẫu.',
            tags: ['verb-form'],
          },
          {
            prompt:
              'The new printer is ------- faster than the one we used last year.',
            content: choices(['very', 'much', 'more', 'most']),
            answer: { kind: 'OPTION', keys: ['B'] },
            explanation: '"much" dùng để nhấn mạnh so sánh hơn "faster".',
            tags: ['comparison'],
          },
          {
            prompt:
              'Ms. Tran will be out of the office ------- the end of the month.',
            content: choices(['until', 'during', 'while', 'since']),
            answer: { kind: 'OPTION', keys: ['A'] },
            explanation: '"until the end of the month": cho tới cuối tháng.',
            tags: ['preposition'],
          },
          {
            prompt:
              'The marketing team presented its results ------- at the quarterly meeting.',
            content: choices([
              'confident',
              'confidence',
              'confidently',
              'confide',
            ]),
            answer: { kind: 'OPTION', keys: ['C'] },
            explanation: 'Cần trạng từ bổ nghĩa cho động từ "presented".',
            tags: ['word-form'],
          },
          {
            prompt:
              'Applicants ------- résumés arrive after the deadline will not be considered.',
            content: choices(['who', 'whose', 'which', 'whom']),
            answer: { kind: 'OPTION', keys: ['B'] },
            explanation: '"whose" chỉ sở hữu: hồ sơ của ứng viên.',
            tags: ['relative-clause'],
          },
        ],
      },
    ],
  },
  {
    code: 'SAMPLE-TOEIC-P6-001',
    title: 'Text Completion: a staff notice',
    exam: Exam.TOEIC,
    skill: ExamSkill.READING,
    module: null,
    part: 6,
    difficulty: 3,
    tags: ['office', 'email'],
    groups: [
      {
        type: 'TOEIC_TEXT_COMPLETION',
        instructions: 'Read the text. Select the best answer for each blank.',
        content: {
          title: 'Notice to all staff',
          template:
            'Please note that the main elevator will be {{1}} for maintenance on Saturday. {{2}}, staff who need to access the fifth floor should use the east stairway. We {{3}} for any inconvenience this may cause. {{4}}',
        },
        questions: [
          {
            content: choices(['close', 'closing', 'closed', 'closes']),
            answer: { kind: 'OPTION', keys: ['C'] },
            explanation: 'Bị động "will be closed".',
          },
          {
            content: choices(['However', 'Therefore', 'Instead', 'Meanwhile']),
            answer: { kind: 'OPTION', keys: ['B'] },
            explanation:
              'Quan hệ nguyên nhân kết quả: thang máy đóng nên phải đi cầu thang.',
          },
          {
            content: choices([
              'apologize',
              'apology',
              'apologetic',
              'apologizing',
            ]),
            answer: { kind: 'OPTION', keys: ['A'] },
            explanation: 'Sau chủ ngữ "We" cần động từ chia thì hiện tại.',
          },
          {
            content: choices([
              'The work is expected to finish by 5 p.m.',
              'The cafeteria menu has also changed.',
              'Parking fees will increase next year.',
              'Please welcome our new manager.',
            ]),
            answer: { kind: 'OPTION', keys: ['A'] },
            explanation:
              'Câu kết hợp lý nhất bổ sung thông tin về việc bảo trì.',
          },
        ],
      },
    ],
  },
  {
    code: 'SAMPLE-GEN-GRAMMAR-001',
    title: 'Present simple: quick check',
    exam: Exam.GENERAL,
    skill: ExamSkill.GRAMMAR,
    module: null,
    part: null,
    difficulty: 1,
    tags: ['present-simple'],
    groups: [
      {
        type: 'GENERAL_MULTIPLE_CHOICE',
        instructions: 'Chọn đáp án đúng.',
        questions: [
          {
            prompt: 'She ______ to work by bus every day.',
            content: choices(['go', 'goes', 'going', 'is go']),
            answer: { kind: 'OPTION', keys: ['B'] },
            explanation: 'Chủ ngữ số ít ngôi thứ ba, động từ thêm -es.',
          },
          {
            prompt: 'Water ______ at 100 degrees Celsius.',
            content: choices(['boil', 'boils', 'is boiling', 'boiled']),
            answer: { kind: 'OPTION', keys: ['B'] },
            explanation: 'Chân lý khoa học dùng hiện tại đơn.',
          },
        ],
      },
      {
        type: 'GENERAL_FILL_BLANK',
        instructions: 'Điền dạng đúng của động từ trong ngoặc.',
        content: {
          template:
            'My brother {{1}} (not like) coffee, but he {{2}} (drink) tea every morning.',
        },
        questions: [
          {
            answer: {
              kind: 'TEXT',
              accepted: ["doesn't like", 'does not like'],
            },
          },
          { answer: { kind: 'TEXT', accepted: ['drinks'] } },
        ],
      },
      {
        type: 'GENERAL_TRUE_FALSE',
        instructions: 'Câu sau đúng hay sai ngữ pháp?',
        questions: [
          {
            prompt: 'They doesn’t live in Hanoi.',
            answer: { kind: 'OPTION', keys: ['FALSE'] },
            explanation: 'Chủ ngữ "They" dùng "don’t".',
          },
        ],
      },
    ],
  },
];

export const SEED_TESTS: SeedTest[] = [
  {
    code: 'SAMPLE-IELTS-READING-PRACTICE-01',
    title: 'IELTS Reading luyện tập: Rooftop beekeeping',
    description: 'Một bài đọc Academic với 4 dạng câu hỏi.',
    exam: Exam.IELTS,
    module: IeltsModule.ACADEMIC,
    kind: TestKind.PRACTICE,
    skill: ExamSkill.READING,
    xpCost: 0,
    itemSetCodes: ['SAMPLE-IELTS-AC-R-001'],
  },
  {
    code: 'SAMPLE-TOEIC-READING-PRACTICE-01',
    title: 'TOEIC Reading luyện tập: Part 5 và 6',
    description: 'Câu hỏi mẫu Part 5, Part 6 chủ đề văn phòng.',
    exam: Exam.TOEIC,
    module: null,
    kind: TestKind.PRACTICE,
    skill: ExamSkill.READING,
    xpCost: 20,
    itemSetCodes: ['SAMPLE-TOEIC-P5-001', 'SAMPLE-TOEIC-P6-001'],
  },
  {
    code: 'SAMPLE-GRAMMAR-QUIZ-01',
    title: 'Kiểm tra nhanh thì hiện tại đơn',
    description: 'Bài tập tự do, 5 câu.',
    exam: Exam.GENERAL,
    module: null,
    kind: TestKind.PRACTICE,
    skill: ExamSkill.GRAMMAR,
    xpCost: 0,
    itemSetCodes: ['SAMPLE-GEN-GRAMMAR-001'],
  },
];
