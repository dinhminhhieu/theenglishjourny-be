import { decimalToNumber } from '../../common/utils/decimal.util';
import { Level } from '../../generated/prisma/client';
import { LevelDto } from './dto/level.dto';

export function toLevelDto(level: Level): LevelDto {
  return {
    id: level.id,
    cefrLevel: level.cefrLevel,
    name: level.name,
    description: level.description,
    toeicScoreMin: level.toeicScoreMin,
    toeicScoreMax: level.toeicScoreMax,
    ieltsMin: decimalToNumber(level.ieltsMin),
    ieltsMax: decimalToNumber(level.ieltsMax),
    sortOrder: level.sortOrder,
    isActive: level.isActive,
    createdAt: level.createdAt,
    updatedAt: level.updatedAt,
  };
}
