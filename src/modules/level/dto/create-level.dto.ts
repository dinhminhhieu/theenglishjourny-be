import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from '../../../common/transforms/query.transforms';
import { IsBandScore } from '../../../common/validators/is-band-score.validator';
import { CefrLevel } from '../../../generated/prisma/enums';

export class CreateLevelDto {
  @ApiProperty({
    enum: CefrLevel,
    enumName: 'CefrLevel',
    example: 'B1',
    description: 'Mỗi mức CEFR chỉ có một level',
  })
  @IsEnum(CefrLevel, {
    message: 'cefrLevel phải là A1, A2, B1, B2, C1 hoặc C2',
  })
  cefrLevel: CefrLevel;

  @ApiProperty({ example: 'Intermediate', maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên level không được để trống' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    example: 550,
    minimum: 0,
    maximum: 990,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(990)
  toeicScoreMin?: number | null;

  @ApiPropertyOptional({
    example: 784,
    minimum: 0,
    maximum: 990,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(990)
  toeicScoreMax?: number | null;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Band 0 đến 9, bước 0.5',
    nullable: true,
  })
  @IsOptional()
  @IsBandScore()
  ieltsMin?: number | null;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Band 0 đến 9, bước 0.5',
    nullable: true,
  })
  @IsOptional()
  @IsBandScore()
  ieltsMax?: number | null;

  @ApiPropertyOptional({ example: 3, default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
