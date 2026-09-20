import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { Prisma, Topic } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicAdminQueryDto, TopicQueryDto } from './dto/topic-query.dto';
import { TopicDto } from './dto/topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { toTopicDto } from './topic.mapper';

const TOPIC_NOT_FOUND = 'Không tìm thấy chủ đề';

@Injectable()
export class TopicService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách công khai: chỉ topic đang bật và chưa xoá. */
  findPublic(query: TopicQueryDto): Promise<PaginatedResult<TopicDto>> {
    return this.paginate(
      { deletedAt: null, isActive: true, ...this.searchFilter(query.search) },
      query,
    );
  }

  /** Danh sách cho admin: lọc theo trạng thái, có thể xem cả topic đã xoá. */
  findAll(query: TopicAdminQueryDto): Promise<PaginatedResult<TopicDto>> {
    return this.paginate(
      {
        ...(query.includeDeleted ? {} : { deletedAt: null }),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...this.searchFilter(query.search),
      },
      query,
    );
  }

  async findOne(id: string): Promise<TopicDto> {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
    if (!topic) {
      throw new NotFoundException(TOPIC_NOT_FOUND);
    }
    return toTopicDto(topic);
  }

  async create(dto: CreateTopicDto, actorId: string): Promise<TopicDto> {
    await this.assertNameAvailable(dto.name);
    const topic = await this.prisma.topic.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return toTopicDto(topic);
  }

  async update(
    id: string,
    dto: UpdateTopicDto,
    actorId: string,
  ): Promise<TopicDto> {
    const topic = await this.getActiveOrThrow(id);
    if (dto.name !== undefined && dto.name !== topic.name) {
      await this.assertNameAvailable(dto.name, id);
    }
    const updated = await this.prisma.topic.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
    });
    return toTopicDto(updated);
  }

  /** Xoá mềm: giữ lại dữ liệu, ẩn khỏi mọi danh sách công khai. */
  async remove(id: string, actorId: string): Promise<TopicDto> {
    await this.getActiveOrThrow(id);
    const removed = await this.prisma.topic.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });
    return toTopicDto(removed);
  }

  async restore(id: string, actorId: string): Promise<TopicDto> {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ đề đã xoá');
    }
    const restored = await this.prisma.topic.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actorId },
    });
    return toTopicDto(restored);
  }

  private async paginate(
    where: Prisma.TopicWhereInput,
    { pageIndex, pageLimit }: PaginationQueryDto,
  ): Promise<PaginatedResult<TopicDto>> {
    // Promise.all thay vì $transaction: hai query chạy song song, tiết kiệm 3 round-trip tới DB.
    const [totalResults, topics] = await Promise.all([
      this.prisma.topic.count({ where }),
      this.prisma.topic.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: topics.map(toTopicDto),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  private searchFilter(search?: string): Prisma.TopicWhereInput {
    return search ? { name: { contains: search, mode: 'insensitive' } } : {};
  }

  /** Topic chưa bị xoá mềm, bất kể đang bật hay tắt. Dùng cho thao tác admin. */
  private async getActiveOrThrow(id: string): Promise<Topic> {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
    });
    if (!topic) {
      throw new NotFoundException(TOPIC_NOT_FOUND);
    }
    return topic;
  }

  /**
   * Tên là unique trong DB (phân biệt hoa thường) nhưng ở đây kiểm tra không phân biệt
   * để tránh "Travel" và "travel" cùng tồn tại. Topic đã xoá mềm vẫn giữ tên.
   */
  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.topic.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { deletedAt: true },
    });
    if (!existing) {
      return;
    }
    throw new ConflictException(
      existing.deletedAt
        ? 'Tên chủ đề trùng với một chủ đề đã xoá, hãy khôi phục chủ đề đó hoặc dùng tên khác'
        : 'Tên chủ đề đã tồn tại',
    );
  }
}
