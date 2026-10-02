/** Dữ liệu mẫu cho test: một bài đọc IELTS Academic và một câu TOEIC Part 1. */
import { Exam, ExamSkill, IeltsModule } from '../../../generated/prisma/enums';
import type { GroupDraft, ItemSetMeta } from './item-set.validator';

export const IELTS_READING_META: ItemSetMeta = {
  exam: Exam.IELTS,
  skill: ExamSkill.READING,
  module: IeltsModule.ACADEMIC,
  part: 1,
};

export const READING_STIMULUS = {
  passages: [
    {
      key: 'main',
      title: 'Urban beekeeping',
      paragraphs: [
        {
          label: 'A',
          markdown: 'Beekeeping has moved from farms to rooftops.',
        },
        {
          label: 'B',
          markdown: 'City bees often produce more honey than rural bees.',
        },
        {
          label: 'C',
          markdown: 'Critics worry about competition with wild pollinators.',
        },
      ],
    },
  ],
};

export function ieltsReadingGroups(): GroupDraft[] {
  return [
    {
      type: 'IELTS_TRUE_FALSE_NOT_GIVEN',
      instructions:
        'Do the following statements agree with the information in the passage?',
      questions: [
        {
          prompt: 'Urban bees produce less honey than rural bees.',
          answer: { kind: 'OPTION', keys: ['FALSE'] },
          explanation: 'Đoạn B nói ong thành phố cho nhiều mật hơn.',
          evidence: { paragraph: 'B', quote: 'produce more honey' },
        },
        {
          prompt: 'Rooftop hives are expensive to maintain.',
          answer: { kind: 'OPTION', keys: ['NOT_GIVEN'] },
        },
      ],
    },
    {
      type: 'IELTS_MATCHING_HEADINGS',
      instructions: 'Choose the correct heading for each paragraph.',
      content: {
        title: 'List of Headings',
        options: [
          { key: 'i', text: 'A move to the city' },
          { key: 'ii', text: 'Surprising productivity' },
          { key: 'iii', text: 'Concerns about nature' },
          { key: 'iv', text: 'The cost of equipment' },
        ],
      },
      questions: [
        {
          content: { paragraph: 'B' },
          answer: { kind: 'OPTION', keys: ['ii'] },
        },
        {
          content: { paragraph: 'C' },
          answer: { kind: 'OPTION', keys: ['iii'] },
        },
      ],
    },
    {
      type: 'IELTS_SUMMARY_COMPLETION',
      instructions: 'Complete the summary.',
      content: {
        template:
          'Bees kept on {{1}} can make more {{2}} than bees in the countryside.',
        wordLimit: { maxWords: 1, allowNumber: false },
      },
      questions: [
        { answer: { kind: 'TEXT', accepted: ['rooftops', 'roofs'] } },
        { answer: { kind: 'TEXT', accepted: ['honey'] } },
      ],
    },
    {
      type: 'IELTS_MULTIPLE_CHOICE_MULTI',
      instructions: 'Choose TWO letters.',
      questions: [
        {
          prompt: 'Which TWO points are made about urban beekeeping?',
          content: {
            options: [
              { key: 'A', text: 'It started on farms' },
              { key: 'B', text: 'It is banned in most cities' },
              { key: 'C', text: 'It may harm wild pollinators' },
              { key: 'D', text: 'It needs no equipment' },
            ],
          },
          answer: { kind: 'OPTION_SET', keys: ['A', 'C'] },
        },
      ],
    },
  ];
}

export const TOEIC_PHOTO_META: ItemSetMeta = {
  exam: Exam.TOEIC,
  skill: ExamSkill.LISTENING,
  module: null,
  part: 1,
};

export function toeicPhotoGroups(): GroupDraft[] {
  return [
    {
      type: 'TOEIC_PHOTOGRAPH',
      content: { imageUrl: 'https://cdn.example.com/p1.jpg' },
      questions: [{ answer: { kind: 'OPTION', keys: ['C'] } }],
    },
  ];
}
