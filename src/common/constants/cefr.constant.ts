import { CefrLevel } from '../../generated/prisma/enums';

export const CEFR_ORDER: CefrLevel[] = [
  CefrLevel.A1,
  CefrLevel.A2,
  CefrLevel.B1,
  CefrLevel.B2,
  CefrLevel.C1,
  CefrLevel.C2,
];

/** from phải đứng trước hoặc bằng to trên thang CEFR. */
export function isCefrRangeValid(from: CefrLevel, to: CefrLevel): boolean {
  return CEFR_ORDER.indexOf(from) <= CEFR_ORDER.indexOf(to);
}

/** Các mức từ A1 tới `level`, gồm cả `level`. */
export function cefrLevelsUpTo(level: CefrLevel): CefrLevel[] {
  return CEFR_ORDER.slice(0, CEFR_ORDER.indexOf(level) + 1);
}

/** Các mức từ `level` tới C2, gồm cả `level`. */
export function cefrLevelsFrom(level: CefrLevel): CefrLevel[] {
  return CEFR_ORDER.slice(CEFR_ORDER.indexOf(level));
}
