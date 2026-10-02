import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import type { PaginatedResult } from '../../common/types/paginated-result.type';
import {
  Asset,
  AssetPurpose,
  AssetStatus,
  AssetVisibility,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssetDto,
  AssetQueryDto,
  CompleteUploadDto,
  CreateUploadDto,
  UploadTicketDto,
} from './dto/upload.dto';
import { OBJECT_STORAGE, type ObjectStorage } from './object-storage';
import { bucketOf, buildObjectKey, UPLOAD_POLICIES } from './upload-policy';

const ASSET_NOT_FOUND = 'Không tìm thấy file';

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  /** Bước 1: kiểm tra loại và dung lượng, tạo bản ghi PENDING và cấp link upload thẳng lên storage. */
  async createUpload(
    dto: CreateUploadDto,
    actorId: string,
  ): Promise<UploadTicketDto> {
    const policy = UPLOAD_POLICIES[dto.purpose];
    const contentType = dto.contentType.toLowerCase();
    if (!(contentType in policy.contentTypes)) {
      throw new BadRequestException(
        `${dto.purpose} chỉ nhận ${Object.keys(policy.contentTypes).join(', ')}`,
      );
    }
    if (dto.sizeBytes > policy.maxBytes) {
      throw new BadRequestException(
        `File tối đa ${Math.floor(policy.maxBytes / 1024 / 1024)} MB`,
      );
    }
    const asset = await this.prisma.asset.create({
      data: {
        key: buildObjectKey(dto.purpose, contentType),
        purpose: dto.purpose,
        visibility: policy.visibility,
        contentType,
        sizeBytes: dto.sizeBytes,
        originalName: dto.fileName,
        uploadedById: actorId,
      },
    });
    const upload = await this.storage.presignPut(
      bucketOf(asset.visibility),
      asset.key,
      contentType,
    );
    return {
      asset: await this.toDto(asset),
      uploadUrl: upload.url,
      method: upload.method,
      headers: upload.headers,
      expiresAt: upload.expiresAt,
    };
  }

  /** Bước 3: sau khi trình duyệt upload xong, kiểm tra file thật trên storage rồi đánh dấu READY. */
  async complete(id: string, dto: CompleteUploadDto): Promise<AssetDto> {
    const asset = await this.getOrThrow(id);
    if (asset.status === AssetStatus.READY) {
      return this.toDto(asset);
    }
    const bucket = bucketOf(asset.visibility);
    const head = await this.storage.head(bucket, asset.key);
    if (!head) {
      throw new BadRequestException(
        'File chưa được upload lên storage, hãy upload rồi gọi lại',
      );
    }
    const policy = UPLOAD_POLICIES[asset.purpose];
    const actualType = head.contentType?.split(';')[0].trim().toLowerCase();
    if (head.sizeBytes > policy.maxBytes || actualType !== asset.contentType) {
      await this.storage.delete(bucket, asset.key);
      throw new BadRequestException(
        'File upload không đúng loại hoặc vượt dung lượng cho phép, đã xoá file',
      );
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        status: AssetStatus.READY,
        sizeBytes: head.sizeBytes,
        durationSeconds: dto.durationSeconds ?? asset.durationSeconds,
        confirmedAt: new Date(),
      },
    });
    return this.toDto(updated);
  }

  async findAll(query: AssetQueryDto): Promise<PaginatedResult<AssetDto>> {
    const { pageIndex, pageLimit } = query;
    const where: Prisma.AssetWhereInput = {
      ...(query.purpose ? { purpose: query.purpose } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [totalResults, rows] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageIndex - 1) * pageLimit,
        take: pageLimit,
      }),
    ]);
    return {
      items: await Promise.all(rows.map((row) => this.toDto(row))),
      meta: buildPaginationMeta(totalResults, pageIndex, pageLimit),
    };
  }

  async findOne(id: string): Promise<AssetDto> {
    return this.toDto(await this.getOrThrow(id));
  }

  /** Xoá file chưa được dùng ở đâu. File đang gắn với bộ câu hỏi hay bản phát hành thì báo 409. */
  async remove(id: string): Promise<AssetDto> {
    const asset = await this.getOrThrow(id);
    const [itemSets, releases] = await Promise.all([
      this.prisma.itemSet.count({ where: { audioAssetId: id } }),
      this.prisma.itemSetRelease.count({ where: { audioAssetId: id } }),
    ]);
    if (itemSets + releases > 0) {
      throw new ConflictException(
        'File đang được dùng trong ngân hàng câu hỏi, hãy gỡ khỏi bộ câu hỏi trước',
      );
    }
    await this.prisma.asset.delete({ where: { id } });
    await this.storage.delete(bucketOf(asset.visibility), asset.key);
    return this.toDto({ ...asset, status: AssetStatus.PENDING });
  }

  /** Kiểm tra file dùng làm audio cho bộ câu hỏi. Trả null nếu hợp lệ, ngược lại là thông báo lỗi. */
  async checkAudio(id: string): Promise<{ ready: boolean } | null> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      select: { purpose: true, status: true },
    });
    if (!asset || asset.purpose !== AssetPurpose.AUDIO) {
      return null;
    }
    return { ready: asset.status === AssetStatus.READY };
  }

  /** Link nghe audio cho người học. TTL đủ dài để làm hết bài, tối đa 7 ngày. */
  async playbackUrls(
    assetIds: string[],
    ttlSeconds: number,
  ): Promise<Map<string, string>> {
    const unique = [...new Set(assetIds)];
    if (unique.length === 0) {
      return new Map();
    }
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: unique }, status: AssetStatus.READY },
      select: { id: true, key: true, visibility: true },
    });
    const entries = await Promise.all(
      assets.map(
        async (asset) =>
          [
            asset.id,
            asset.visibility === AssetVisibility.PUBLIC
              ? this.storage.publicUrl(asset.key)
              : await this.storage.presignGet('PRIVATE', asset.key, ttlSeconds),
          ] as const,
      ),
    );
    return new Map(entries);
  }

  private async getOrThrow(id: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(ASSET_NOT_FOUND);
    }
    return asset;
  }

  private async toDto(asset: Asset): Promise<AssetDto> {
    let url: string | null = null;
    if (asset.status === AssetStatus.READY) {
      url =
        asset.visibility === AssetVisibility.PUBLIC
          ? this.storage.publicUrl(asset.key)
          : await this.storage.presignGet('PRIVATE', asset.key);
    }
    return {
      id: asset.id,
      key: asset.key,
      purpose: asset.purpose,
      visibility: asset.visibility,
      status: asset.status,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      durationSeconds: asset.durationSeconds,
      originalName: asset.originalName,
      url,
      createdAt: asset.createdAt,
    };
  }
}
