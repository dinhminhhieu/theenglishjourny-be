export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export type StorageBucket = 'PUBLIC' | 'PRIVATE';

export interface PresignedUpload {
  url: string;
  method: 'PUT';
  /** Header client phải gửi kèm khi upload, Content-Type nằm trong chữ ký. */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface ObjectHead {
  sizeBytes: number;
  contentType: string | null;
}

/** Lớp trừu tượng trên S3 API để code không phụ thuộc nhà cung cấp (AWS S3, Cloudflare R2, MinIO). */
export interface ObjectStorage {
  presignPut(
    bucket: StorageBucket,
    key: string,
    contentType: string,
  ): Promise<PresignedUpload>;
  presignGet(
    bucket: StorageBucket,
    key: string,
    ttlSeconds?: number,
  ): Promise<string>;
  publicUrl(key: string): string;
  head(bucket: StorageBucket, key: string): Promise<ObjectHead | null>;
  delete(bucket: StorageBucket, key: string): Promise<void>;
}
