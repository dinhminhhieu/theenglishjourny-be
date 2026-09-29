import { ApiProperty } from '@nestjs/swagger';

export class SkillDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Listening' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: 'Kỹ năng nghe' })
  description: string | null;

  @ApiProperty({ example: 1 })
  sortOrder: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
