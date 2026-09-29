import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toBoolean } from '../../../common/transforms/query.transforms';

export class SkillQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'true = gồm cả kỹ năng đã tắt',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeInactive?: boolean;
}
