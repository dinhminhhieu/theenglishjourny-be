import type {
  ObjectHead,
  ObjectStorage,
  PresignedUpload,
  StorageBucket,
} from './object-storage';

/** Storage giả trong bộ nhớ cho test. `simulateUpload` đóng vai trình duyệt upload file. */
export class MemoryObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, ObjectHead>();

  presignPut(
    bucket: StorageBucket,
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    return Promise.resolve({
      url: `memory://${bucket}/${key}?signed=put`,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
  }

  presignGet(bucket: StorageBucket, key: string): Promise<string> {
    return Promise.resolve(`memory://${bucket}/${key}?signed=get`);
  }

  publicUrl(key: string): string {
    return `memory://PUBLIC/${key}`;
  }

  head(bucket: StorageBucket, key: string): Promise<ObjectHead | null> {
    return Promise.resolve(this.objects.get(`${bucket}/${key}`) ?? null);
  }

  delete(bucket: StorageBucket, key: string): Promise<void> {
    this.objects.delete(`${bucket}/${key}`);
    return Promise.resolve();
  }

  simulateUpload(
    bucket: StorageBucket,
    key: string,
    sizeBytes: number,
    contentType: string | null,
  ): void {
    this.objects.set(`${bucket}/${key}`, { sizeBytes, contentType });
  }
}
