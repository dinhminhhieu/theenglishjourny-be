import { ApiProperty } from '@nestjs/swagger';
import { CefrLevel } from '../../../generated/prisma/enums';

export class LevelDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: CefrLevel, enumName: 'CefrLevel', example: 'B1' })
  cefrLevel: CefrLevel;

  @ApiProperty({ example: 'Intermediate' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 550 })
  toeicScoreMin: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 784 })
  toeicScoreMax: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.0 })
  ieltsMin: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 5.0 })
  ieltsMax: number | null;

  @ApiProperty({ example: 3 })
  sortOrder: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
