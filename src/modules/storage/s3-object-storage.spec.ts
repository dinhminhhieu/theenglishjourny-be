import type { AppConfigService } from '../../config/env.validation';
import { S3ObjectStorage } from './s3-object-storage';

const SETTINGS: Record<string, unknown> = {
  S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  S3_REGION: 'auto',
  S3_FORCE_PATH_STYLE: true,
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  S3_PUBLIC_BUCKET: 'public-bucket',
  S3_PRIVATE_BUCKET: 'private-bucket',
  S3_PUBLIC_BASE_URL: 'https://cdn.example.com/',
  S3_PRESIGN_PUT_TTL_SECONDS: 900,
  S3_PRESIGN_GET_TTL_SECONDS: 7200,
};

const storage = new S3ObjectStorage({
  get: (key: string) => SETTINGS[key],
} as unknown as AppConfigService);

describe('S3ObjectStorage', () => {
  it('ký link upload không kèm checksum để R2 nhận file thật', async () => {
    const upload = await storage.presignPut(
      'PUBLIC',
      'images/a.png',
      'image/png',
    );
    const url = new URL(upload.url);

    expect(url.host).toBe('account.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/public-bucket/images/a.png');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe(
      'content-type;host',
    );
    expect(
      [...url.searchParams.keys()].filter((key) =>
        key.toLowerCase().includes('checksum'),
      ),
    ).toEqual([]);
    expect(upload.headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it('đọc audio qua bucket private, ảnh qua địa chỉ public', async () => {
    const url = new URL(await storage.presignGet('PRIVATE', 'audio/a.m4a'));

    expect(url.pathname).toBe('/private-bucket/audio/a.m4a');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('7200');
    expect(storage.publicUrl('images/a.png')).toBe(
      'https://cdn.example.com/images/a.png',
    );
  });
});
