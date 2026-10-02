/**
 * Bộ đề trình diễn đủ mọi dạng câu hỏi đang hỗ trợ, mỗi kỳ thi một đề vì một đề chỉ gồm bộ câu hỏi cùng kỳ thi.
 * Nội dung tự soạn; ảnh và audio (giọng đọc máy) nằm trong thư mục assets.
 */
import {
  Exam,
  ExamSkill,
  IeltsModule,
  TestKind,
} from '../../src/generated/prisma/client';
import { choices, type SeedItemSet, type SeedTest } from './practice-content';

export type ShowcaseImage = 'toeicPhoto' | 'streetDiagram';
export type ShowcaseAudio =
  'toeicPart1' | 'toeicPart2' | 'toeicPart3' | 'toeicPart4';

export interface ShowcaseAsset {
  file: string;
  key: string;
  contentType: string;
  durationSeconds?: number;
}

export const SHOWCASE_IMAGES: Record<ShowcaseImage, ShowcaseAsset> = {
  toeicPhoto: {
    file: 'toeic-part1-photo.png',
    key: 'images/seed/showcase-toeic-part1-photo.png',
    contentType: 'image/png',
  },
  streetDiagram: {
    file: 'ielts-street-diagram.png',
    key: 'images/seed/showcase-ielts-street-diagram.png',
    contentType: 'image/png',
  },
};

export const SHOWCASE_AUDIO: Record<ShowcaseAudio, ShowcaseAsset> = {
  toeicPart1: {
    file: 'toeic-part1.m4a',
    key: 'audio/seed/showcase-toeic-part1.m4a',
    contentType: 'audio/mp4',
    durationSeconds: 17,
  },
  toeicPart2: {
    file: 'toeic-part2.m4a',
    key: 'audio/seed/showcase-toeic-part2.m4a',
    contentType: 'audio/mp4',
    durationSeconds: 39,
  },
  toeicPart3: {
    file: 'toeic-part3.m4a',
    key: 'audio/seed/showcase-toeic-part3.m4a',
    contentType: 'audio/mp4',
    durationSeconds: 31,
  },
  toeicPart4: {
    file: 'toeic-part4.m4a',
    key: 'audio/seed/showcase-toeic-part4.m4a',
    contentType: 'audio/mp4',
    durationSeconds: 30,
  },
};

export interface ShowcaseMedia {
  imageUrl: (name: ShowcaseImage) => string;
  audioAssetId: (name: ShowcaseAudio) => string;
}

const letterOptions = (keys: string) => keys.split('').map((key) => ({ key }));

const ielts = (
  part: number,
  seed: Omit<SeedItemSet, 'exam' | 'skill' | 'module' | 'part'>,
): SeedItemSet => ({
  exam: Exam.IELTS,
  skill: ExamSkill.READING,
  module: IeltsModule.ACADEMIC,
  part,
  ...seed,
});

const toeic = (
  part: number,
  seed: Omit<SeedItemSet, 'exam' | 'skill' | 'module' | 'part'>,
): SeedItemSet => ({
  exam: Exam.TOEIC,
  skill: part <= 4 ? ExamSkill.LISTENING : ExamSkill.READING,
  module: null,
  part,
  ...seed,
});

function ieltsItemSets(media: ShowcaseMedia): SeedItemSet[] {
  return [
    ielts(1, {
      code: 'SHOWCASE-IELTS-R1',
      title: 'The rise of the bicycle',
      description:
        'Showcase IELTS Reading Passage 1: headings, TFNG, note, table, flow-chart completion.',
      difficulty: 2,
      tags: ['showcase', 'history', 'transport'],
      stimulus: {
        passages: [
          {
            key: 'bicycle',
            title: 'The rise of the bicycle',
            subtitle:
              'How a toy for rich young men became transport for everyone',
            paragraphs: [
              {
                label: 'A',
                markdown:
                  'The first machine that resembled a bicycle appeared in Germany in 1817. Invented by Karl von Drais, the *running machine* had two wheels but no pedals: riders pushed themselves along with their feet. It was popular for a short time among wealthy young men, but poor roads and a series of accidents meant that several cities soon banned it from pavements.',
              },
              {
                label: 'B',
                markdown:
                  "In the 1860s, French mechanics attached pedals directly to the front wheel. These *velocipedes* were heavy, made mostly of wood and iron, and so uncomfortable on cobbled streets that they earned the nickname 'boneshakers'. Even so, riding schools opened in Paris and London, and the machines became a fashionable way to exercise.",
              },
              {
                label: 'C',
                markdown:
                  'Because each turn of the pedals moved the bicycle only as far as the circumference of the front wheel, manufacturers made that wheel larger and larger. The resulting *high-wheeler* of the 1870s could reach impressive speeds, but the rider sat almost 1.5 metres above the ground. A sudden stop often threw riders over the handlebars.',
              },
              {
                label: 'D',
                markdown:
                  "The real breakthrough came in 1885, when John Kemp Starley produced the *safety bicycle*. It had two wheels of equal size and a chain that drove the rear wheel, so speed no longer depended on wheel size. Three years later, John Dunlop's air-filled tyre made riding far smoother, and sales rose dramatically.",
              },
              {
                label: 'E',
                markdown:
                  "The safety bicycle had important social effects. It offered cheap, independent transport to people who could not afford a horse, and it was particularly significant for women. Many historians argue that it encouraged changes in women's clothing, as long skirts were replaced by more practical outfits.",
              },
              {
                label: 'F',
                markdown:
                  'Today, the bicycle is enjoying another revival. City governments are building separate lanes, and bike-sharing schemes allow people to rent a bicycle for a single journey. Electric bicycles, which use a small motor to assist the rider, are the fastest-growing part of the market.',
              },
            ],
          },
        ],
      },
      groups: [
        {
          type: 'IELTS_MATCHING_HEADINGS',
          instructions:
            'Reading Passage 1 has six paragraphs, **A–F**. Choose the correct heading for paragraphs **B–F** from the list of headings below.',
          content: {
            title: 'List of Headings',
            options: [
              { key: 'i', text: 'A design that changed everything' },
              { key: 'ii', text: 'Speed at the cost of safety' },
              { key: 'iii', text: 'An invention ahead of its roads' },
              { key: 'iv', text: 'Freedom for new groups of riders' },
              { key: 'v', text: 'Rough rides but growing interest' },
              { key: 'vi', text: 'Competition between manufacturers' },
              { key: 'vii', text: 'A return to popularity' },
            ],
            allowReuse: false,
            example: { paragraph: 'A', key: 'iii' },
          },
          questions: [
            {
              content: { paragraph: 'B' },
              answer: { kind: 'OPTION', keys: ['v'] },
              explanation:
                'Đoạn B: xe "boneshaker" rất xóc nhưng trường dạy đạp xe vẫn mở, ngày càng thịnh hành.',
            },
            {
              content: { paragraph: 'C' },
              answer: { kind: 'OPTION', keys: ['ii'] },
              explanation:
                'Đoạn C: xe bánh lớn chạy nhanh nhưng người lái dễ ngã qua ghi đông.',
            },
            {
              content: { paragraph: 'D' },
              answer: { kind: 'OPTION', keys: ['i'] },
              explanation: 'Đoạn D: "The real breakthrough came in 1885".',
            },
            {
              content: { paragraph: 'E' },
              answer: { kind: 'OPTION', keys: ['iv'] },
              explanation:
                'Đoạn E: xe đạp mang lại phương tiện cho người không có ngựa và cho phụ nữ.',
            },
            {
              content: { paragraph: 'F' },
              answer: { kind: 'OPTION', keys: ['vii'] },
              explanation: 'Đoạn F: "the bicycle is enjoying another revival".',
            },
          ],
        },
        {
          type: 'IELTS_TRUE_FALSE_NOT_GIVEN',
          instructions:
            'Do the following statements agree with the information given in Reading Passage 1?',
          questions: [
            {
              prompt: 'The running machine was banned in some cities.',
              answer: { kind: 'OPTION', keys: ['TRUE'] },
              explanation:
                'Đoạn A: "several cities soon banned it from pavements".',
              evidence: {
                paragraph: 'A',
                quote: 'several cities soon banned it from pavements',
              },
            },
            {
              prompt: 'Velocipedes were made mainly of steel.',
              answer: { kind: 'OPTION', keys: ['FALSE'] },
              explanation: 'Đoạn B: velocipede làm chủ yếu từ gỗ và sắt.',
              evidence: {
                paragraph: 'B',
                quote: 'made mostly of wood and iron',
              },
            },
            {
              prompt: 'Riding schools in Paris charged high fees.',
              answer: { kind: 'OPTION', keys: ['NOT_GIVEN'] },
              explanation:
                'Bài có nhắc trường dạy đạp xe nhưng không nói học phí.',
            },
          ],
        },
        {
          type: 'IELTS_NOTE_COMPLETION',
          instructions:
            'Complete the notes below. Choose **ONE WORD AND/OR A NUMBER** from the passage for each answer.',
          content: {
            title: 'The safety bicycle',
            style: 'NOTES',
            template:
              '- invented by John Kemp Starley in {{1}}\n- wheels of the same size; a {{2}} turned the back wheel\n- air-filled tyre added three years later by John {{3}}',
            wordLimit: { maxWords: 1, allowNumber: true },
          },
          questions: [
            {
              answer: { kind: 'TEXT', accepted: ['1885'] },
              evidence: { paragraph: 'D', quote: 'in 1885' },
            },
            {
              answer: { kind: 'TEXT', accepted: ['chain'] },
              evidence: {
                paragraph: 'D',
                quote: 'a chain that drove the rear wheel',
              },
            },
            {
              answer: { kind: 'TEXT', accepted: ['Dunlop'] },
              evidence: {
                paragraph: 'D',
                quote: "John Dunlop's air-filled tyre",
              },
            },
          ],
        },
        {
          type: 'IELTS_TABLE_COMPLETION',
          instructions:
            'Complete the table below. Choose **ONE WORD ONLY** from the passage for each answer.',
          content: {
            title: 'Early bicycles',
            columns: ['Machine', 'Decade', 'Main problem'],
            rows: [
              ['Running machine', '1810s', 'had no {{1}}'],
              ['Boneshaker', '1860s', 'uncomfortable on {{2}} streets'],
              ['High-wheeler', '1870s', 'riders thrown over the {{3}}'],
            ],
            wordLimit: { maxWords: 1, allowNumber: false },
          },
          questions: [
            { answer: { kind: 'TEXT', accepted: ['pedals'] } },
            { answer: { kind: 'TEXT', accepted: ['cobbled'] } },
            { answer: { kind: 'TEXT', accepted: ['handlebars'] } },
          ],
        },
        {
          type: 'IELTS_FLOW_CHART_COMPLETION',
          instructions:
            'Complete the flow-chart below. Choose **ONE WORD ONLY** from the passage for each answer.',
          content: {
            title: 'How the bicycle developed',
            steps: [
              'Riders push the machine along with their {{1}}',
              'Pedals are fixed to the {{2}} wheel',
              'A chain drives the rear wheel, so speed no longer depends on wheel {{3}}',
            ],
            wordLimit: { maxWords: 1, allowNumber: false },
          },
          questions: [
            { answer: { kind: 'TEXT', accepted: ['feet'] } },
            { answer: { kind: 'TEXT', accepted: ['front'] } },
            { answer: { kind: 'TEXT', accepted: ['size'] } },
          ],
        },
      ],
    }),
    ielts(2, {
      code: 'SHOWCASE-IELTS-R2',
      title: 'Sleep and memory',
      description:
        'Showcase IELTS Reading Passage 2: matching information, matching features, multiple choice, sentence completion, short answer.',
      difficulty: 3,
      tags: ['showcase', 'science', 'health'],
      stimulus: {
        passages: [
          {
            key: 'sleep',
            title: 'Sleep and memory',
            paragraphs: [
              {
                label: 'A',
                markdown:
                  'For centuries, sleep was regarded as a passive state in which the brain simply rested. Modern research has overturned this view. Using recordings of electrical activity, scientists have shown that the sleeping brain is highly active, cycling through several distinct stages every ninety minutes or so.',
              },
              {
                label: 'B',
                markdown:
                  'One of the most important functions of sleep appears to be the strengthening of memories. In a well-known experiment, Professor Jan Born asked volunteers to learn pairs of words in the evening. Those who slept before being tested remembered significantly more pairs than those who stayed awake, even when the total time between learning and testing was the same.',
              },
              {
                label: 'C',
                markdown:
                  'Different stages of sleep seem to support different kinds of memory. Dr Sara Mednick has found that deep, slow-wave sleep helps us retain facts, while the lighter stage known as REM sleep is linked to creativity and problem solving. In her studies, volunteers who took an afternoon nap containing REM sleep were better at finding hidden connections between ideas.',
              },
              {
                label: 'D',
                markdown:
                  'Sleep may also help the brain to forget. According to the neuroscientist Giulio Tononi, connections between brain cells grow stronger during the day as we learn. During sleep, he argues, most of these connections are weakened again, which saves energy and leaves only the most useful memories in place.',
              },
              {
                label: 'E',
                markdown:
                  'These findings have practical implications for students. Staying up all night before an exam is likely to be counter-productive, because the information learned may never be properly stored. Several universities now include short sessions on sleep in their study-skills courses.',
              },
              {
                label: 'F',
                markdown:
                  'Many questions remain unanswered. Researchers still do not know exactly how memories are moved from short-term to long-term storage, and it is unclear whether the same processes occur in children and older adults. Nevertheless, the message is clear: sleep is not wasted time.',
              },
            ],
          },
        ],
      },
      groups: [
        {
          type: 'IELTS_MATCHING_INFORMATION',
          instructions:
            'Reading Passage 2 has six paragraphs, **A–F**. Which paragraph contains the following information? *You may use any letter more than once.*',
          content: { options: letterOptions('ABCDEF'), allowReuse: true },
          questions: [
            {
              prompt: 'advice about how learners should prepare for tests',
              answer: { kind: 'OPTION', keys: ['E'] },
              explanation: 'Đoạn E khuyên không thức trắng trước kỳ thi.',
            },
            {
              prompt:
                'a description of an experiment comparing two groups of people',
              answer: { kind: 'OPTION', keys: ['B'] },
              explanation: 'Đoạn B so sánh nhóm được ngủ và nhóm thức.',
            },
            {
              prompt: 'a mention of areas that still need investigation',
              answer: { kind: 'OPTION', keys: ['F'] },
              explanation: 'Đoạn F: "Many questions remain unanswered".',
            },
          ],
        },
        {
          type: 'IELTS_MATCHING_FEATURES',
          instructions:
            'Match each finding with the correct researcher, **A–C**. *You may use any letter more than once.*',
          content: {
            title: 'List of Researchers',
            options: [
              { key: 'A', text: 'Jan Born' },
              { key: 'B', text: 'Sara Mednick' },
              { key: 'C', text: 'Giulio Tononi' },
            ],
            allowReuse: true,
          },
          questions: [
            {
              prompt:
                'Sleep weakens many of the links formed between brain cells.',
              answer: { kind: 'OPTION', keys: ['C'] },
              evidence: {
                paragraph: 'D',
                quote: 'most of these connections are weakened again',
              },
            },
            {
              prompt: 'Sleeping after learning improves recall of word pairs.',
              answer: { kind: 'OPTION', keys: ['A'] },
              evidence: {
                paragraph: 'B',
                quote: 'remembered significantly more pairs',
              },
            },
            {
              prompt: 'A short daytime sleep can make people more creative.',
              answer: { kind: 'OPTION', keys: ['B'] },
              evidence: {
                paragraph: 'C',
                quote: 'an afternoon nap containing REM sleep',
              },
            },
          ],
        },
        {
          type: 'IELTS_MULTIPLE_CHOICE',
          instructions: 'Choose the correct letter, **A, B, C or D**.',
          questions: [
            {
              prompt:
                'According to paragraph A, what did people traditionally believe about sleep?',
              content: choices([
                'It happened in regular cycles.',
                'The brain was inactive during it.',
                'It was mainly needed by children.',
                'It could be measured electrically.',
              ]),
              answer: { kind: 'OPTION', keys: ['B'] },
              explanation:
                'Đoạn A: "sleep was regarded as a passive state in which the brain simply rested".',
            },
            {
              prompt: "What is the writer's main point in paragraph E?",
              content: choices([
                'Universities should shorten their exams.',
                'Students often sleep too much.',
                'Studying all night may harm learning.',
                'Study-skills courses are unpopular.',
              ]),
              answer: { kind: 'OPTION', keys: ['C'] },
              explanation:
                'Đoạn E: thức trắng "is likely to be counter-productive".',
            },
          ],
        },
        {
          type: 'IELTS_SENTENCE_COMPLETION',
          instructions:
            'Complete the sentences below. Choose **NO MORE THAN TWO WORDS** from the passage for each answer.',
          content: { wordLimit: { maxWords: 2, allowNumber: false } },
          questions: [
            {
              prompt:
                'The sleeping brain passes through several stages roughly every ______ minutes.',
              answer: { kind: 'TEXT', accepted: ['ninety'] },
              explanation: 'Viết "ninety" hay "90" đều được chấm đúng.',
            },
            {
              prompt:
                'REM sleep has been connected with creativity and ______.',
              answer: { kind: 'TEXT', accepted: ['problem solving'] },
            },
          ],
        },
        {
          type: 'IELTS_SHORT_ANSWER',
          instructions:
            'Answer the questions below. Choose **NO MORE THAN THREE WORDS** from the passage for each answer.',
          content: { wordLimit: { maxWords: 3, allowNumber: false } },
          questions: [
            {
              prompt:
                'What did scientists record in order to study the sleeping brain?',
              answer: { kind: 'TEXT', accepted: ['electrical activity'] },
            },
            {
              prompt:
                'Which **TWO** groups of people may process memories differently, according to paragraph F?',
              answer: {
                kind: 'TEXT_SET',
                items: [
                  { accepted: ['children'] },
                  { accepted: ['older adults'] },
                ],
              },
              explanation: 'Câu có hai ô, viết theo thứ tự nào cũng được.',
            },
          ],
        },
      ],
    }),
    ielts(3, {
      code: 'SHOWCASE-IELTS-R3',
      title: 'Streets without cars',
      description:
        'Showcase IELTS Reading Passage 3: Yes/No/Not Given, sentence endings, choose two, summary with word bank, diagram labelling.',
      difficulty: 3,
      tags: ['showcase', 'city', 'opinion'],
      stimulus: {
        passages: [
          {
            key: 'streets',
            title: 'Streets without cars',
            paragraphs: [
              {
                label: 'A',
                markdown:
                  'Across Europe, a growing number of cities are closing central streets to private cars. Supporters of these schemes claim that they make town centres cleaner, quieter and safer. Critics, on the other hand, warn that shops will lose customers if people cannot drive to them. In my view, the evidence so far suggests that the critics are largely mistaken.',
              },
              {
                label: 'B',
                markdown:
                  'When the Spanish city of Pontevedra removed most traffic from its centre in 1999, local businesses predicted disaster. Instead, the number of residents in the centre rose, and many shops reported higher sales, because people who walk tend to visit shops more often than those who drive. I believe that other cities could achieve similar results, although not overnight.',
              },
              {
                label: 'C',
                markdown:
                  'This is not to say that car-free schemes are simple to introduce. Deliveries still need to reach shops, and people with disabilities must be able to travel easily. The most successful projects allow delivery vans in at fixed times of day and provide frequent, accessible public transport.',
              },
              {
                label: 'D',
                markdown:
                  'Good street design is equally important. The best examples replace parking spaces with trees, benches and planted areas that absorb rainwater. A separate lane for cyclists keeps them away from pedestrians, and a tram running along the centre of the street carries passengers quickly from one end to the other.',
              },
              {
                label: 'E',
                markdown:
                  'Ultimately, the success of a car-free street depends less on the rules than on the quality of the space that replaces the traffic. A road closed with nothing more than a few plastic barriers will remain empty; a street that people enjoy spending time in will not.',
              },
            ],
          },
        ],
      },
      groups: [
        {
          type: 'IELTS_YES_NO_NOT_GIVEN',
          instructions:
            'Do the following statements agree with the claims of the writer in Reading Passage 3?',
          questions: [
            {
              prompt: 'People who object to car-free schemes are mostly wrong.',
              answer: { kind: 'OPTION', keys: ['YES'] },
              evidence: {
                paragraph: 'A',
                quote: 'the critics are largely mistaken',
              },
            },
            {
              prompt:
                'Car-free schemes bring immediate benefits to every city.',
              answer: { kind: 'OPTION', keys: ['NO'] },
              explanation: 'Đoạn B: tác giả nói "although not overnight".',
              evidence: { paragraph: 'B', quote: 'although not overnight' },
            },
            {
              prompt: "Pontevedra's scheme was copied by other Spanish cities.",
              answer: { kind: 'OPTION', keys: ['NOT_GIVEN'] },
            },
          ],
        },
        {
          type: 'IELTS_MATCHING_SENTENCE_ENDINGS',
          instructions:
            'Complete each sentence with the correct ending, **A–E**, below.',
          content: {
            options: [
              { key: 'A', text: 'visit shops more often than drivers.' },
              { key: 'B', text: 'are allowed in at certain times.' },
              { key: 'C', text: 'was largely unsuccessful.' },
              { key: 'D', text: 'depends on what replaces the traffic.' },
              { key: 'E', text: 'are paid for by local businesses.' },
            ],
            allowReuse: false,
          },
          questions: [
            {
              prompt: 'People who travel on foot',
              answer: { kind: 'OPTION', keys: ['A'] },
            },
            {
              prompt: 'In successful schemes, delivery vans',
              answer: { kind: 'OPTION', keys: ['B'] },
            },
            {
              prompt: 'Whether a car-free street works',
              answer: { kind: 'OPTION', keys: ['D'] },
            },
          ],
        },
        {
          type: 'IELTS_MULTIPLE_CHOICE_MULTI',
          instructions: 'Choose **TWO** letters, **A–E**.',
          questions: [
            {
              prompt:
                'Which **TWO** features of good street design does the writer mention?',
              content: choices([
                'wider roads for buses',
                'planted areas that absorb rainwater',
                'underground car parks',
                'a separate lane for cyclists',
                'brighter street lighting',
              ]),
              answer: { kind: 'OPTION_SET', keys: ['B', 'D'] },
              explanation:
                'Đoạn D nhắc bồn cây thấm nước mưa và làn riêng cho xe đạp.',
            },
          ],
        },
        {
          type: 'IELTS_SUMMARY_COMPLETION',
          instructions:
            'Complete the summary using the list of words, **A–F**, below.',
          content: {
            title: 'Car-free streets',
            template:
              'Critics of car-free schemes fear that {{1}} will suffer. However, in Pontevedra the number of people living in the centre {{2}}. The writer argues that the {{3}} of the new space matters more than the rules.',
            options: [
              { key: 'A', text: 'businesses' },
              { key: 'B', text: 'increased' },
              { key: 'C', text: 'quality' },
              { key: 'D', text: 'traffic' },
              { key: 'E', text: 'decreased' },
              { key: 'F', text: 'cost' },
            ],
            allowReuse: false,
          },
          questions: [
            { answer: { kind: 'OPTION', keys: ['A'] } },
            { answer: { kind: 'OPTION', keys: ['B'] } },
            { answer: { kind: 'OPTION', keys: ['C'] } },
          ],
        },
        {
          type: 'IELTS_DIAGRAM_LABELLING',
          instructions:
            'Label the diagram below. Choose **ONE WORD ONLY** from the passage for each answer.',
          content: {
            title: 'A well-designed car-free street',
            imageUrl: media.imageUrl('streetDiagram'),
            imageAlt:
              'Mặt cắt một con phố không ô tô: vỉa hè, ghế, bồn cây, làn xe đạp, tàu điện ở giữa',
            wordLimit: { maxWords: 1, allowNumber: false },
          },
          questions: [
            {
              prompt: '______ running along the centre of the street',
              content: { marker: { x: 50, y: 60 } },
              answer: { kind: 'TEXT', accepted: ['tram'] },
            },
            {
              prompt: 'separate lane for ______',
              content: { marker: { x: 33.5, y: 73 } },
              answer: { kind: 'TEXT', accepted: ['cyclists'] },
            },
            {
              prompt: 'planted areas that absorb ______',
              content: { marker: { x: 24, y: 77 } },
              answer: { kind: 'TEXT', accepted: ['rainwater'] },
            },
          ],
        },
      ],
    }),
  ];
}

function toeicItemSets(media: ShowcaseMedia): SeedItemSet[] {
  return [
    toeic(1, {
      code: 'SHOWCASE-TOEIC-P1',
      title: 'Photographs: in the office',
      difficulty: 1,
      tags: ['showcase', 'office'],
      audioAssetId: media.audioAssetId('toeicPart1'),
      transcript: [
        {
          startSec: 0.5,
          endSec: 4.6,
          speaker: 'Narrator',
          text: 'Number 1. Look at the picture marked number 1 in your test book.',
        },
        { startSec: 5.8, endSec: 7.7, text: "(A) She's watering some plants." },
        {
          startSec: 8.5,
          endSec: 10.3,
          text: "(B) She's typing on a keyboard.",
        },
        { startSec: 11.1, endSec: 12.8, text: "(C) She's opening a window." },
        { startSec: 13.6, endSec: 15.2, text: "(D) She's carrying a box." },
      ],
      groups: [
        {
          type: 'TOEIC_PHOTOGRAPH',
          instructions:
            'Look at the picture and listen to the four statements. Select the one statement that best describes what you see in the picture.',
          content: {
            imageUrl: media.imageUrl('toeicPhoto'),
            imageAlt:
              'A woman waters plants on a shelf in an office. A computer is on the desk and a box is on the floor.',
          },
          questions: [
            {
              answer: { kind: 'OPTION', keys: ['A'] },
              explanation:
                'Người phụ nữ đang tưới cây. Máy tính, cửa sổ và thùng giấy có trong tranh nhưng không ai đang dùng.',
              evidence: { startSec: 5.8, endSec: 7.7 },
            },
          ],
        },
      ],
    }),
    toeic(2, {
      code: 'SHOWCASE-TOEIC-P2',
      title: 'Question-Response: at work',
      difficulty: 2,
      tags: ['showcase', 'office'],
      audioAssetId: media.audioAssetId('toeicPart2'),
      transcript: [
        { startSec: 0.5, endSec: 1.4, speaker: 'Narrator', text: 'Number 2.' },
        {
          startSec: 2,
          endSec: 4,
          speaker: 'Man',
          text: 'Where should I put these boxes?',
        },
        {
          startSec: 4.8,
          endSec: 12.2,
          speaker: 'Woman',
          text: '(A) Next to the front desk, please. (B) Yes, I bought them yesterday. (C) About twenty dollars.',
        },
        {
          startSec: 13.6,
          endSec: 14.5,
          speaker: 'Narrator',
          text: 'Number 3.',
        },
        {
          startSec: 15.1,
          endSec: 17.3,
          speaker: 'Man',
          text: 'When does the training session start?',
        },
        {
          startSec: 18.1,
          endSec: 24.7,
          speaker: 'Woman',
          text: '(A) In the main conference room. (B) At nine thirty tomorrow morning. (C) Mr. Lee is leading it.',
        },
        { startSec: 26.1, endSec: 27, speaker: 'Narrator', text: 'Number 4.' },
        {
          startSec: 27.6,
          endSec: 30.2,
          speaker: 'Man',
          text: "Why don't we order lunch for the whole team?",
        },
        {
          startSec: 31,
          endSec: 37.2,
          speaker: 'Woman',
          text: "(A) The lunch menu is on the wall. (B) That's a great idea. (C) He's on the sales team.",
        },
      ],
      groups: [
        {
          type: 'TOEIC_QUESTION_RESPONSE',
          instructions:
            'Listen to a question or statement and three responses. Select the best response.',
          questions: [
            {
              answer: { kind: 'OPTION', keys: ['A'] },
              explanation: 'Hỏi "Where" nên trả lời bằng vị trí.',
              evidence: { startSec: 2, endSec: 7.2 },
            },
            {
              answer: { kind: 'OPTION', keys: ['B'] },
              explanation: 'Hỏi "When" nên trả lời bằng thời gian.',
              evidence: { startSec: 15.1, endSec: 22.5 },
            },
            {
              answer: { kind: 'OPTION', keys: ['B'] },
              explanation:
                '"Why don\'t we...?" là lời đề nghị, đáp lại bằng đồng ý.',
              evidence: { startSec: 27.6, endSec: 34.9 },
            },
          ],
        },
      ],
    }),
    toeic(3, {
      code: 'SHOWCASE-TOEIC-P3',
      title: 'Conversation: preparing for a client meeting',
      difficulty: 2,
      tags: ['showcase', 'office', 'meeting'],
      audioAssetId: media.audioAssetId('toeicPart3'),
      transcript: [
        {
          startSec: 0.5,
          endSec: 4.2,
          speaker: 'Narrator',
          text: 'Questions 5 through 7 refer to the following conversation.',
        },
        {
          startSec: 5.2,
          endSec: 9.1,
          speaker: 'Woman',
          text: "Hi Tom, have you finished the slides for Thursday's client meeting?",
        },
        {
          startSec: 9.6,
          endSec: 15.9,
          speaker: 'Man',
          text: "Almost. I still need the sales figures from last quarter, but the finance team hasn't sent them yet.",
        },
        {
          startSec: 16.4,
          endSec: 20.4,
          speaker: 'Woman',
          text: 'I can call Maria in finance. She usually replies quickly.',
        },
        {
          startSec: 20.9,
          endSec: 26.6,
          speaker: 'Man',
          text: 'That would be great. And could you book the small meeting room? The big one is being painted this week.',
        },
        {
          startSec: 27.1,
          endSec: 29.6,
          speaker: 'Woman',
          text: "Sure, I'll do that right after lunch.",
        },
      ],
      groups: [
        {
          type: 'TOEIC_CONVERSATION',
          instructions:
            'Listen to the conversation and answer the three questions.',
          questions: [
            {
              prompt: 'What are the speakers mainly discussing?',
              content: choices([
                'A new office layout',
                'Preparations for a meeting',
                'A training schedule',
                'Travel arrangements',
              ]),
              answer: { kind: 'OPTION', keys: ['B'] },
              evidence: { startSec: 5.2, endSec: 9.1 },
            },
            {
              prompt: 'What is the man waiting for?',
              content: choices([
                'Some sales figures',
                "A client's approval",
                'New equipment',
                'A room key',
              ]),
              answer: { kind: 'OPTION', keys: ['A'] },
              evidence: { startSec: 9.6, endSec: 15.9 },
            },
            {
              prompt: "Why can't the speakers use the big meeting room?",
              content: choices([
                'It is too expensive.',
                'It is already booked.',
                'It is being painted.',
                'It is too far away.',
              ]),
              answer: { kind: 'OPTION', keys: ['C'] },
              evidence: { startSec: 20.9, endSec: 26.6 },
            },
          ],
        },
      ],
    }),
    toeic(4, {
      code: 'SHOWCASE-TOEIC-P4',
      title: 'Talk: a library tour',
      difficulty: 2,
      tags: ['showcase', 'announcement'],
      audioAssetId: media.audioAssetId('toeicPart4'),
      transcript: [
        {
          startSec: 0.5,
          endSec: 3.9,
          speaker: 'Narrator',
          text: 'Questions 8 through 10 refer to the following announcement.',
        },
        {
          startSec: 4.9,
          endSec: 12.1,
          speaker: 'Guide',
          text: "Good morning, everyone, and welcome to the Riverside Library. Before we begin today's tour, here are a few quick notes.",
        },
        {
          startSec: 12.5,
          endSec: 18.4,
          speaker: 'Guide',
          text: "The tour will last about forty minutes, and it will finish at the new children's reading area on the second floor.",
        },
        {
          startSec: 18.8,
          endSec: 22.3,
          speaker: 'Guide',
          text: 'Please keep your phones on silent while we are in the study rooms.',
        },
        {
          startSec: 22.7,
          endSec: 28.8,
          speaker: 'Guide',
          text: 'And if you would like to borrow books today, you can register for a free library card at the front desk after the tour.',
        },
      ],
      groups: [
        {
          type: 'TOEIC_TALK',
          instructions: 'Listen to the talk and answer the three questions.',
          questions: [
            {
              prompt: 'Where is the talk taking place?',
              content: choices([
                'At a bookstore',
                'At a library',
                'At a school',
                'At a museum',
              ]),
              answer: { kind: 'OPTION', keys: ['B'] },
              evidence: { startSec: 4.9, endSec: 12.1 },
            },
            {
              prompt: 'How long will the tour last?',
              content: choices([
                'About 15 minutes',
                'About 30 minutes',
                'About 40 minutes',
                'About an hour',
              ]),
              answer: { kind: 'OPTION', keys: ['C'] },
              evidence: { startSec: 12.5, endSec: 18.4 },
            },
            {
              prompt: 'What can listeners do at the front desk?',
              content: choices([
                'Buy a guidebook',
                'Join another tour',
                'Register for a library card',
                'Leave their bags',
              ]),
              answer: { kind: 'OPTION', keys: ['C'] },
              evidence: { startSec: 22.7, endSec: 28.8 },
            },
          ],
        },
      ],
    }),
    toeic(5, {
      code: 'SHOWCASE-TOEIC-P5',
      title: 'Incomplete Sentences: company news',
      difficulty: 2,
      tags: ['showcase', 'grammar'],
      groups: [
        {
          type: 'TOEIC_INCOMPLETE_SENTENCE',
          instructions:
            'A word or phrase is missing in each of the sentences below. Select the best answer to complete the sentence.',
          questions: [
            {
              prompt:
                'The company has ------- a new policy on working from home.',
              content: choices([
                'introduce',
                'introduced',
                'introducing',
                'introduction',
              ]),
              answer: { kind: 'OPTION', keys: ['B'] },
              explanation: 'Hiện tại hoàn thành: has + V3.',
            },
            {
              prompt:
                'Please send the invoice to Mr. Park ------- Friday at the latest.',
              content: choices(['by', 'until', 'since', 'during']),
              answer: { kind: 'OPTION', keys: ['A'] },
              explanation: '"by Friday" là hạn chót, chậm nhất thứ Sáu.',
            },
            {
              prompt:
                'The new branch is ------- located near the central station.',
              content: choices([
                'convenience',
                'convenient',
                'conveniently',
                'convene',
              ]),
              answer: { kind: 'OPTION', keys: ['C'] },
              explanation: 'Cần trạng từ bổ nghĩa cho "located".',
            },
          ],
        },
      ],
    }),
    toeic(6, {
      code: 'SHOWCASE-TOEIC-P6',
      title: 'Text Completion: a customer e-mail',
      difficulty: 3,
      tags: ['showcase', 'email'],
      groups: [
        {
          type: 'TOEIC_TEXT_COMPLETION',
          instructions:
            'Read the text below. A word, phrase or sentence is missing in parts of the text. Select the best answer to complete the text.',
          content: {
            title: 'To: Linh Nguyen · Subject: Your order #4821',
            template:
              'Dear Ms. Nguyen,\n\nThank you for your recent order. Unfortunately, the desk lamp you selected is {{1}} out of stock. We expect to receive new stock {{2}} two weeks. {{3}}\n\nIf you would prefer a full refund, simply reply to this e-mail and we will {{4}} the payment immediately.\n\nKind regards,\nBright Home Customer Service',
          },
          questions: [
            {
              content: choices(['currently', 'recently', 'finally', 'rarely']),
              answer: { kind: 'OPTION', keys: ['A'] },
            },
            {
              content: choices(['within', 'among', 'along', 'beside']),
              answer: { kind: 'OPTION', keys: ['A'] },
            },
            {
              content: choices([
                'In the meantime, you may choose a similar model at no extra cost.',
                'Our store opened in 2015.',
                'Lamps are our most popular product.',
                'Please pay the remaining balance today.',
              ]),
              answer: { kind: 'OPTION', keys: ['A'] },
              explanation:
                'Câu nối tiếp hợp lý: đề nghị phương án thay thế trong lúc chờ hàng.',
            },
            {
              content: choices(['return', 'refund', 'receive', 'reserve']),
              answer: { kind: 'OPTION', keys: ['B'] },
            },
          ],
        },
      ],
    }),
    toeic(7, {
      code: 'SHOWCASE-TOEIC-P7',
      title: 'Reading Comprehension: a notice',
      difficulty: 2,
      tags: ['showcase', 'notice'],
      stimulus: {
        passages: [
          {
            key: 'notice',
            title: 'Greenfield Apartments: Notice to Residents',
            paragraphs: [
              {
                markdown:
                  'Please be advised that the water supply to Building B will be **turned off on Tuesday, 14 May, from 9:00 a.m. to 3:00 p.m.** while workers replace the main pipes.',
              },
              {
                markdown:
                  'Residents are encouraged to store drinking water in advance. Bottled water will also be available free of charge in the lobby of Building A throughout the day.',
              },
              {
                markdown:
                  'We apologize for any inconvenience. Questions may be directed to the building manager, Mr. Diaz, at extension 210.',
              },
            ],
          },
        ],
      },
      groups: [
        {
          type: 'TOEIC_READING_COMPREHENSION',
          instructions: 'Read the notice and answer the questions.',
          passageKey: 'notice',
          questions: [
            {
              prompt: 'What is the purpose of the notice?',
              content: choices([
                'To announce a temporary service interruption',
                'To introduce a new building manager',
                'To advertise a bottled water brand',
                'To invite residents to a meeting',
              ]),
              answer: { kind: 'OPTION', keys: ['A'] },
            },
            {
              prompt: 'Where can residents get free water?',
              content: choices([
                'In Building B',
                'At the building office',
                'In the lobby of Building A',
                'At a nearby store',
              ]),
              answer: { kind: 'OPTION', keys: ['C'] },
              evidence: {
                passageKey: 'notice',
                quote: 'in the lobby of Building A',
              },
            },
            {
              prompt: 'How long will the water be turned off?',
              content: choices([
                'Three hours',
                'Six hours',
                'Nine hours',
                'All day',
              ]),
              answer: { kind: 'OPTION', keys: ['B'] },
              explanation: 'Từ 9 giờ sáng đến 3 giờ chiều là 6 tiếng.',
            },
          ],
        },
      ],
    }),
  ];
}

const GENERAL_ITEM_SET: SeedItemSet = {
  code: 'SHOWCASE-GENERAL',
  title: 'Past simple and more: mixed practice',
  description:
    'Showcase bài tập tự do: trắc nghiệm, chọn nhiều, đúng/sai, nối, điền từ với mọi bố cục.',
  exam: Exam.GENERAL,
  skill: ExamSkill.GRAMMAR,
  module: null,
  part: null,
  difficulty: 1,
  tags: ['showcase', 'past-simple'],
  groups: [
    {
      type: 'GENERAL_MULTIPLE_CHOICE',
      instructions: 'Chọn đáp án đúng.',
      questions: [
        {
          prompt: 'We ______ a great film last night.',
          content: choices(['see', 'saw', 'seen', 'have seen']),
          answer: { kind: 'OPTION', keys: ['B'] },
          explanation: '"last night" là thời điểm đã qua, dùng quá khứ đơn.',
        },
        {
          prompt: '______ you call your grandmother yesterday?',
          content: choices(['Do', 'Did', 'Were', 'Have']),
          answer: { kind: 'OPTION', keys: ['B'] },
          explanation: 'Câu hỏi quá khứ đơn: Did + chủ ngữ + V nguyên mẫu.',
        },
      ],
    },
    {
      type: 'GENERAL_MULTI_SELECT',
      instructions: 'Chọn **hai** câu đúng ngữ pháp.',
      questions: [
        {
          prompt: 'Which **TWO** sentences are correct?',
          content: choices([
            "He don't like tea.",
            'She has lived here since 2019.',
            'I am knowing the answer.',
            'They were watching TV when I called.',
            'We goes to school by bus.',
          ]),
          answer: { kind: 'OPTION_SET', keys: ['B', 'D'] },
        },
      ],
    },
    {
      type: 'GENERAL_TRUE_FALSE',
      instructions: 'Câu sau đúng hay sai ngữ pháp?',
      questions: [
        {
          prompt: 'If I were you, I would apologise.',
          answer: { kind: 'OPTION', keys: ['TRUE'] },
          explanation: 'Câu điều kiện loại 2 dùng "were" cho mọi ngôi.',
        },
        {
          prompt: 'She suggested me to take a break.',
          answer: { kind: 'OPTION', keys: ['FALSE'] },
          explanation:
            'Đúng là "She suggested (that) I take a break" hoặc "suggested taking a break".',
        },
      ],
    },
    {
      type: 'GENERAL_MATCHING',
      instructions: 'Nối cụm động từ với nghĩa đúng.',
      content: {
        title: 'Meanings',
        options: [
          { key: 'A', text: 'stop doing something' },
          { key: 'B', text: 'discover information' },
          { key: 'C', text: 'take care of' },
          { key: 'D', text: 'arrive late' },
        ],
        allowReuse: false,
      },
      questions: [
        { prompt: 'look after', answer: { kind: 'OPTION', keys: ['C'] } },
        { prompt: 'give up', answer: { kind: 'OPTION', keys: ['A'] } },
        { prompt: 'find out', answer: { kind: 'OPTION', keys: ['B'] } },
      ],
    },
    {
      type: 'GENERAL_FILL_BLANK',
      instructions: 'Điền dạng quá khứ đơn của động từ trong ngoặc.',
      content: {
        title: 'A day at the market',
        template:
          'Yesterday I {{1}} (go) to the market and {{2}} (buy) some fresh fruit.',
      },
      questions: [
        { answer: { kind: 'TEXT', accepted: ['went'] } },
        { answer: { kind: 'TEXT', accepted: ['bought'] } },
      ],
    },
    {
      type: 'GENERAL_FILL_BLANK',
      instructions: 'Chọn giới từ phù hợp trong khung để điền vào chỗ trống.',
      content: {
        template:
          'She is interested {{1}} art, but she is not very good {{2}} drawing.',
        options: [
          { key: 'A', text: 'in' },
          { key: 'B', text: 'at' },
          { key: 'C', text: 'on' },
          { key: 'D', text: 'for' },
        ],
        allowReuse: false,
      },
      questions: [
        { answer: { kind: 'OPTION', keys: ['A'] } },
        { answer: { kind: 'OPTION', keys: ['B'] } },
      ],
    },
    {
      type: 'GENERAL_FILL_BLANK',
      instructions: 'Hoàn thành bảng động từ bất quy tắc.',
      content: {
        title: 'Irregular verbs',
        columns: ['Base form', 'Past simple', 'Past participle'],
        rows: [
          ['write', '{{1}}', 'written'],
          ['take', 'took', '{{2}}'],
          ['begin', '{{3}}', 'begun'],
        ],
      },
      questions: [
        { answer: { kind: 'TEXT', accepted: ['wrote'] } },
        { answer: { kind: 'TEXT', accepted: ['taken'] } },
        { answer: { kind: 'TEXT', accepted: ['began'] } },
      ],
    },
    {
      type: 'GENERAL_FILL_BLANK',
      instructions: 'Hoàn thành các bước của chuyến đi bằng dạng quá khứ đơn.',
      content: {
        title: 'Our trip',
        steps: [
          'First, we {{1}} (pack) our bags.',
          'Then we {{2}} (drive) to the airport.',
        ],
      },
      questions: [
        { answer: { kind: 'TEXT', accepted: ['packed'] } },
        { answer: { kind: 'TEXT', accepted: ['drove'] } },
      ],
    },
    {
      type: 'GENERAL_FILL_BLANK',
      instructions: 'Viết câu trả lời vào ô trống.',
      questions: [
        {
          prompt:
            'Write the past simple forms of **see** and **eat**. *Any order is accepted.*',
          answer: {
            kind: 'TEXT_SET',
            items: [{ accepted: ['saw'] }, { accepted: ['ate'] }],
          },
        },
        {
          prompt: 'What is the past participle of **go**?',
          answer: { kind: 'TEXT', accepted: ['gone'], strict: true },
          explanation: 'Câu này chấm nghiêm: phải đúng chính tả.',
        },
      ],
    },
  ],
};

export function showcaseItemSets(media: ShowcaseMedia): SeedItemSet[] {
  return [...ieltsItemSets(media), ...toeicItemSets(media), GENERAL_ITEM_SET];
}

export const SHOWCASE_TESTS: SeedTest[] = [
  {
    code: 'SHOWCASE-IELTS-ALL-TYPES',
    title: 'Đề mẫu IELTS Reading: đủ 15 dạng câu',
    description:
      'Ba bài đọc Academic, mỗi dạng câu IELTS xuất hiện ít nhất một lần. Dùng để xem thử giao diện làm bài và chấm điểm.',
    exam: Exam.IELTS,
    module: IeltsModule.ACADEMIC,
    kind: TestKind.PRACTICE,
    skill: ExamSkill.READING,
    xpCost: 0,
    itemSetCodes: [
      'SHOWCASE-IELTS-R1',
      'SHOWCASE-IELTS-R2',
      'SHOWCASE-IELTS-R3',
    ],
  },
  {
    code: 'SHOWCASE-TOEIC-ALL-PARTS',
    title: 'Đề mẫu TOEIC: đủ 7 part',
    description:
      'Mỗi part một bộ ngắn, Listening có audio giọng đọc máy và transcript. Dùng để xem thử giao diện làm bài và chấm điểm.',
    exam: Exam.TOEIC,
    module: null,
    kind: TestKind.PRACTICE,
    skill: null,
    xpCost: 0,
    itemSetCodes: [
      'SHOWCASE-TOEIC-P1',
      'SHOWCASE-TOEIC-P2',
      'SHOWCASE-TOEIC-P3',
      'SHOWCASE-TOEIC-P4',
      'SHOWCASE-TOEIC-P5',
      'SHOWCASE-TOEIC-P6',
      'SHOWCASE-TOEIC-P7',
    ],
  },
  {
    code: 'SHOWCASE-GENERAL-ALL-TYPES',
    title: 'Bài tập mẫu: đủ 5 dạng câu tự do',
    description:
      'Trắc nghiệm, chọn nhiều, đúng/sai, nối và điền từ với đủ bố cục: đoạn văn, word bank, bảng, các bước, ô riêng.',
    exam: Exam.GENERAL,
    module: null,
    kind: TestKind.PRACTICE,
    skill: ExamSkill.GRAMMAR,
    xpCost: 0,
    itemSetCodes: ['SHOWCASE-GENERAL'],
  },
];
