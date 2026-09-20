import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Query cho danh sách công khai. */
export class TopicQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Tìm theo tên, không phân biệt hoa thường',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** Query cho admin: lọc thêm theo trạng thái và xem cả topic đã xoá. */
export class TopicAdminQueryDto extends TopicQueryDto {
  @ApiPropertyOptional({ description: 'true/false. Bỏ trống = tất cả' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'true = gồm cả topic đã xoá mềm',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}
