import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class VocabularyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'che',
    description: 'Tìm theo tiền tố của từ, không phân biệt hoa thường',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;
}
