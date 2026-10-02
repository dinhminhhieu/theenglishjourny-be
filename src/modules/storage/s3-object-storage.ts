import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfigService } from '../../config/env.validation';
import type {
  ObjectHead,
  ObjectStorage,
  PresignedUpload,
  StorageBucket,
} from './object-storage';
import { createS3Client } from './s3-client';

/** Giới hạn của chữ ký SigV4: tối đa 7 ngày. */
const MAX_PRESIGN_SECONDS = 604800;

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly buckets: Record<StorageBucket, string>;
  private readonly publicBaseUrl: string;
  private readonly putTtl: number;
  private readonly getTtl: number;

  constructor(config: AppConfigService) {
    this.client = createS3Client({
      S3_ENDPOINT: config.get('S3_ENDPOINT', { infer: true }),
      S3_REGION: config.get('S3_REGION', { infer: true }),
      S3_FORCE_PATH_STYLE: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      S3_ACCESS_KEY_ID: config.get('S3_ACCESS_KEY_ID', { infer: true }),
      S3_SECRET_ACCESS_KEY: config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
    });
    this.buckets = {
      PUBLIC: config.get('S3_PUBLIC_BUCKET', { infer: true }),
      PRIVATE: config.get('S3_PRIVATE_BUCKET', { infer: true }),
    };
    this.publicBaseUrl = config
      .get('S3_PUBLIC_BASE_URL', { infer: true })
      .replace(/\/+$/, '');
    this.putTtl = config.get('S3_PRESIGN_PUT_TTL_SECONDS', { infer: true });
    this.getTtl = config.get('S3_PRESIGN_GET_TTL_SECONDS', { infer: true });
  }

  async presignPut(
    bucket: StorageBucket,
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.buckets[bucket],
        Key: key,
        ContentType: contentType,
      }),
      // Ký cả Content-Type: client PUT với loại file khác loại đã khai báo sẽ bị storage từ chối.
      { expiresIn: this.putTtl, signableHeaders: new Set(['content-type']) },
    );
    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + this.putTtl * 1000),
    };
  }

  presignGet(
    bucket: StorageBucket,
    key: string,
    ttlSeconds = this.getTtl,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
      { expiresIn: Math.min(Math.max(60, ttlSeconds), MAX_PRESIGN_SECONDS) },
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  async head(bucket: StorageBucket, key: string): Promise<ObjectHead | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
      );
      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  async delete(bucket: StorageBucket, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
    );
  }
}
