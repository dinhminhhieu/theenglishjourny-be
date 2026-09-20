import { ApiProperty } from '@nestjs/swagger';
import {
  AcademicIdiomDto,
  AcademicSectionDto,
  DefinitionSectionDto,
  OtherSectionDto,
  TermItemDto,
  UsageExampleGroupDto,
} from './vocabulary-section.dto';

/** Bản rút gọn cho danh sách và kết quả tìm kiếm. */
export class VocabularySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'check' })
  word: string;

  @ApiProperty({ type: String, nullable: true, example: '/tʃek/' })
  pronunciation: string | null;

  @ApiProperty({ type: String, nullable: true })
  audioUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;

  @ApiProperty({
    type: [String],
    example: ['Danh từ', 'Động từ'],
    description: 'Các từ loại, lấy từ definitions rồi academic',
  })
  wordTypes: string[];

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Sự kiểm tra, sự kiểm soát: Hành động xem xét, đánh giá...',
    description:
      'Nghĩa đầu tiên, cắt ngắn khoảng 160 ký tự, để hiển thị trong danh sách',
  })
  shortMeaning: string | null;
}

/** Bản đầy đủ cho trang chi tiết từ. */
export class VocabularyDto extends VocabularySummaryDto {
  @ApiProperty({
    type: [AcademicSectionDto],
    description: 'Nghĩa kiểu từ điển theo từ loại, cho flashcard',
  })
  academic: AcademicSectionDto[];

  @ApiProperty({ type: [AcademicIdiomDto] })
  academicIdioms: AcademicIdiomDto[];

  @ApiProperty({
    type: [DefinitionSectionDto],
    description: 'Giải nghĩa tiếng Việt chi tiết theo từ loại',
  })
  definitions: DefinitionSectionDto[];

  @ApiProperty({ type: [UsageExampleGroupDto] })
  usageExamples: UsageExampleGroupDto[];

  @ApiProperty({ type: [TermItemDto] })
  advancedUsage: TermItemDto[];

  @ApiProperty({ type: [TermItemDto], description: 'Họ từ, biến thể' })
  variants: TermItemDto[];

  @ApiProperty({ type: [TermItemDto] })
  synonyms: TermItemDto[];

  @ApiProperty({ type: [TermItemDto] })
  antonyms: TermItemDto[];

  @ApiProperty({ type: [TermItemDto] })
  idioms: TermItemDto[];

  @ApiProperty({ type: [TermItemDto] })
  phrases: TermItemDto[];

  @ApiProperty({ type: [OtherSectionDto] })
  otherSections: OtherSectionDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    example: {
      synonyms: ['bridle', 'curb'],
      antonyms: ['disagree'],
      'Từ gần giống': ['cheek', 'chick'],
    },
    description:
      'Từ liên quan từ nguồn, key động (synonyms, antonyms, mentioned_in, "Từ gần giống", ...)',
  })
  relations: Record<string, string[]>;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}
