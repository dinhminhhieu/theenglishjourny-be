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
