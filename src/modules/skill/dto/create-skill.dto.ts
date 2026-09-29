import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from '../../../common/transforms/query.transforms';

export class CreateSkillDto {
  @ApiProperty({
    example: 'Listening',
    maxLength: 50,
    description: 'Tên kỹ năng, duy nhất và không nên đổi sau khi tạo',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên kỹ năng không được để trống' })
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 'Kỹ năng nghe',
    nullable: true,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ example: 1, default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
