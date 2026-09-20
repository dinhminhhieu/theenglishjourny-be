import { PaginationMetaDto } from '../dto/pagination-meta.dto';

/** Shape `data` của endpoint phân trang, khớp với @ApiPaginatedResponse. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMetaDto;
}
