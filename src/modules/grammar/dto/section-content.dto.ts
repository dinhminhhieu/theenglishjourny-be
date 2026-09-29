/**
 * Hình dạng `content` của từng SectionType. Chỉ dùng để validate và mô tả Swagger,
 * dữ liệu lưu dưới dạng JSON trong GrammarSection.content.
 * Phần cần tô đậm trong câu tiếng Anh viết kiểu **word**, FE tự render.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ExampleDto {
  @ApiProperty({ example: 'Water **boils** at 100 degrees Celsius.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  en: string;

  @ApiProperty({ example: 'Nước sôi ở 100 độ C.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  vi: string;
}

// ---- USE_CASES ----

export class UseCaseItemDto {
  @ApiPropertyOptional({ example: 'Universal Truths' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @ApiProperty({ example: 'Chân lý vĩnh cửu & Định luật khoa học' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ type: ExampleDto })
  @ValidateNested()
  @Type(() => ExampleDto)
  example: ExampleDto;
}

export class UseCasesContentDto {
  @ApiProperty({ type: [UseCaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UseCaseItemDto)
  items: UseCaseItemDto[];
}

// ---- FORMULA_MATRIX ----

export class FormulaRowDto {
  @ApiProperty({ enum: ['+', '-', '?'], example: '+' })
  @IsIn(['+', '-', '?'])
  sign: '+' | '-' | '?';

  @ApiProperty({ example: 'S + am / is / are + Complement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  pattern: string;

  @ApiProperty({ type: ExampleDto })
  @ValidateNested()
  @Type(() => ExampleDto)
  example: ExampleDto;
}

export class FormulaColumnDto {
  @ApiProperty({ example: 'Động từ Trạng thái: To Be' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'S + BE + ADJ/NOUN' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  badge?: string;

  @ApiProperty({ type: [FormulaRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormulaRowDto)
  rows: FormulaRowDto[];
}

export class FormulaNoteDto {
  @ApiProperty({ example: 'Quy tắc vàng về vị trí trạng từ tần suất' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({ example: 'S + [always / never] + V' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  formula?: string;
}

export class FormulaMatrixContentDto {
  @ApiProperty({ type: [FormulaColumnDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormulaColumnDto)
  columns: FormulaColumnDto[];

  @ApiPropertyOptional({ type: FormulaNoteDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormulaNoteDto)
  note?: FormulaNoteDto;
}

// ---- RULES_TABLE ----

export class RuleExampleDto {
  @ApiProperty({ example: 'watch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  from: string;

  @ApiProperty({ example: 'watches' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  to: string;
}

export class RuleDto {
  @ApiProperty({ example: 'Tận cùng: -s, -ss, -sh, -ch, -x, -z, -o' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  condition: string;

  @ApiProperty({ example: 'Thêm hậu tố -es trực tiếp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  action: string;

  @ApiProperty({ type: [RuleExampleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleExampleDto)
  examples: RuleExampleDto[];
}

export class RulesTableContentDto {
  @ApiProperty({ type: [RuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules: RuleDto[];
}

// ---- PRONUNCIATION ----

export class PronunciationVariantDto {
  @ApiProperty({ example: '/s/' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @ApiProperty({ example: 'Âm vô thanh (Voiceless)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: [String], example: ['/p/', '/t/', '/k/'] })
  @IsArray()
  @IsString({ each: true })
  phonemes: string[];

  @ApiProperty({ type: [String], example: ['develops', 'impacts'] })
  @IsArray()
  @IsString({ each: true })
  words: string[];
}

export class PronunciationContentDto {
  @ApiProperty({ type: [PronunciationVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PronunciationVariantDto)
  variants: PronunciationVariantDto[];

  @ApiPropertyOptional({
    example: 'Đặt tay lên thanh quản: rung là /z/, không rung là /s/.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tip?: string;
}

// ---- COMPARISON ----

export class ComparisonItemDto {
  @ApiProperty({ example: 'Band 6.0 (Generic)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiProperty({ enum: ['bad', 'good'], example: 'good' })
  @IsIn(['bad', 'good'])
  tone: 'bad' | 'good';

  @ApiProperty({ type: ExampleDto })
  @ValidateNested()
  @Type(() => ExampleDto)
  example: ExampleDto;

  @ApiPropertyOptional({ description: 'Nhận xét vì sao tốt hoặc chưa tốt' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ComparisonTipDto {
  @ApiProperty({ example: '01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({ example: 'Objective stance' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}

export class ComparisonContentDto {
  @ApiProperty({ type: [ComparisonItemDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ComparisonItemDto)
  items: ComparisonItemDto[];

  @ApiPropertyOptional({ type: [ComparisonTipDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComparisonTipDto)
  tips?: ComparisonTipDto[];
}

// ---- COMMON_MISTAKES ----

export class CommonMistakeItemDto {
  @ApiProperty({ example: 'Chủ ngữ danh từ phức dài' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Câu sai',
    example: 'The implementation of advanced policies **require** capital.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  wrong: string;

  @ApiProperty({ type: ExampleDto, description: 'Câu đúng kèm dịch' })
  @ValidateNested()
  @Type(() => ExampleDto)
  right: ExampleDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  explanation: string;
}

export class CommonMistakesContentDto {
  @ApiProperty({ type: [CommonMistakeItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommonMistakeItemDto)
  items: CommonMistakeItemDto[];
}

// ---- CALLOUT ----

export class CalloutContentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  formula?: string;
}

// ---- RICH_TEXT ----

export class RichTextContentDto {
  @ApiProperty({ description: 'Markdown' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  markdown: string;
}
