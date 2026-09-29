import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toBoolean } from '../../../common/transforms/query.transforms';

export class LevelQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'true = gồm cả level đã tắt',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeInactive?: boolean;
}
