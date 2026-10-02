import { BadRequestException } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { validateJsonByDto } from '../../common/validators/validate-json-by-dto';
import { SectionType } from '../../generated/prisma/enums';
import {
  CalloutContentDto,
  CommonMistakesContentDto,
  ComparisonContentDto,
  FormulaMatrixContentDto,
  PronunciationContentDto,
  RichTextContentDto,
  RulesTableContentDto,
  UseCasesContentDto,
} from './dto/section-content.dto';

const CONTENT_DTO_BY_TYPE: Record<SectionType, ClassConstructor<object>> = {
  [SectionType.USE_CASES]: UseCasesContentDto,
  [SectionType.FORMULA_MATRIX]: FormulaMatrixContentDto,
  [SectionType.RULES_TABLE]: RulesTableContentDto,
  [SectionType.PRONUNCIATION]: PronunciationContentDto,
  [SectionType.COMPARISON]: ComparisonContentDto,
  [SectionType.COMMON_MISTAKES]: CommonMistakesContentDto,
  [SectionType.CALLOUT]: CalloutContentDto,
  [SectionType.RICH_TEXT]: RichTextContentDto,
};

/**
 * Validate `content` theo `type` và trả về bản đã lược bỏ key lạ để lưu.
 * `label` dùng để báo lỗi biết section nào sai (vd "sections[2] (code 03)").
 */
export function validateSectionContent(
  type: SectionType,
  content: unknown,
  label: string,
): Record<string, unknown> {
  const { value, errors } = validateJsonByDto(
    CONTENT_DTO_BY_TYPE[type],
    content ?? {},
  );
  if (errors.length > 0) {
    throw new BadRequestException({
      message: errors.map((error) => `${label}: ${error}`),
    });
  }
  return value;
}
