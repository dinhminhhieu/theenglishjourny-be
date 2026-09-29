import { BadRequestException } from '@nestjs/common';
import {
  ClassConstructor,
  instanceToPlain,
  plainToInstance,
} from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
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
  const dto = CONTENT_DTO_BY_TYPE[type];
  const instance = plainToInstance(dto, content ?? {});
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new BadRequestException({
      message: flattenErrors(errors).map((error) => `${label}: ${error}`),
    });
  }
  return instanceToPlain(instance) as Record<string, unknown>;
}

function flattenErrors(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map(
      (message) => `${path}: ${message}`,
    );
    return [...own, ...flattenErrors(error.children ?? [], path)];
  });
}
