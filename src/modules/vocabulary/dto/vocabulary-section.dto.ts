import { ApiProperty } from '@nestjs/swagger';

/**
 * Các khối JSON của từ điển. Giữ nguyên tên key của dataset (snake_case) vì API
 * trả thẳng dữ liệu, không biến đổi. Các class này chỉ để mô tả Swagger.
 */

export class ExampleDto {
  @ApiProperty({ example: 'She keeps her emotions in check at work.' })
  text: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Cô ấy luôn kiềm chế cảm xúc của mình tại nơi làm việc.',
  })
  translation: string | null;
}

export class TermItemDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'to keep something in check',
  })
  term: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'n',
    description: 'Ghi chú ngắn: từ loại, sắc thái...',
  })
  note: string | null;

  @ApiProperty({ example: 'kiểm soát, kìm hãm cái gì đó.' })
  meaning: string;

  @ApiProperty({ type: [ExampleDto] })
  examples: ExampleDto[];
}

export class AcademicMeaningDto {
  @ApiProperty({ example: 'sự kiểm tra, sự kiểm soát' })
  meaning: string;

  @ApiProperty({ type: [ExampleDto] })
  examples: ExampleDto[];
}

export class AcademicSectionDto {
  @ApiProperty({ example: 'danh từ' })
  word_type: string;

  @ApiProperty({ type: [AcademicMeaningDto] })
  meanings: AcademicMeaningDto[];
}

export class AcademicIdiomDto {
  @ApiProperty({ example: 'to tremble like an aspen leaf' })
  term: string;

  @ApiProperty({ example: 'run như cầy sấy' })
  meaning: string;
}

export class DefinitionSectionDto {
  @ApiProperty({ example: 'Danh từ' })
  word_type: string;

  @ApiProperty({
    type: [String],
    description: 'Mỗi phần tử là một nghĩa, dạng "Tên nghĩa: giải thích"',
  })
  senses: string[];
}

export class UsageExampleGroupDto {
  @ApiProperty({ example: 'Danh từ' })
  context: string;

  @ApiProperty({ type: [ExampleDto] })
  examples: ExampleDto[];
}

export class OtherSectionDto {
  @ApiProperty({ example: 'Lưu ý về cách dùng' })
  title: string;

  @ApiProperty({ type: [TermItemDto] })
  items: TermItemDto[];
}
