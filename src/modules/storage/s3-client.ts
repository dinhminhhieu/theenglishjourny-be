import { S3Client } from '@aws-sdk/client-s3';
import type { EnvironmentVariables } from '../../config/env.validation';

export type S3ConnectionSettings = Pick<
  EnvironmentVariables,
  | 'S3_ENDPOINT'
  | 'S3_REGION'
  | 'S3_FORCE_PATH_STYLE'
  | 'S3_ACCESS_KEY_ID'
  | 'S3_SECRET_ACCESS_KEY'
>;

export function createS3Client(settings: S3ConnectionSettings): S3Client {
  const endpoint = settings.S3_ENDPOINT.trim();
  return new S3Client({
    region: settings.S3_REGION,
    endpoint: endpoint === '' ? undefined : endpoint,
    forcePathStyle: settings.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: settings.S3_ACCESS_KEY_ID,
      secretAccessKey: settings.S3_SECRET_ACCESS_KEY,
    },
    // Mặc định SDK ký checksum của body rỗng vào link upload, R2 và S3 sẽ từ chối file thật.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}
