import { randomUUID } from 'node:crypto';
import { AssetPurpose, AssetVisibility } from '../../generated/prisma/enums';
import type { StorageBucket } from './object-storage';

export interface UploadPolicy {
  visibility: AssetVisibility;
  maxBytes: number;
  /** Loại file được phép và đuôi file tương ứng. */
  contentTypes: Readonly<Record<string, string>>;
  prefix: string;
}

const MB = 1024 * 1024;

export const UPLOAD_POLICIES: Readonly<Record<AssetPurpose, UploadPolicy>> = {
  // Audio đề thi: một đề TOEIC Listening 45 phút ở 128 kbps khoảng 45 MB.
  AUDIO: {
    visibility: AssetVisibility.PRIVATE,
    maxBytes: 150 * MB,
    prefix: 'audio',
    contentTypes: {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
    },
  },
  // Không nhận SVG vì có thể chứa script.
  IMAGE: {
    visibility: AssetVisibility.PUBLIC,
    maxBytes: 10 * MB,
    prefix: 'images',
    contentTypes: {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    },
  },
  // Bài nói của học viên, dùng khi mở chấm Speaking.
  RECORDING: {
    visibility: AssetVisibility.PRIVATE,
    maxBytes: 20 * MB,
    prefix: 'recordings',
    contentTypes: {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
    },
  },
};

export function bucketOf(visibility: AssetVisibility): StorageBucket {
  return visibility === AssetVisibility.PUBLIC ? 'PUBLIC' : 'PRIVATE';
}

/** "audio/2026/09/<uuid>.mp3". Tên gốc không nằm trong key để tránh lộ thông tin và ký tự lạ. */
export function buildObjectKey(
  purpose: AssetPurpose,
  contentType: string,
  now = new Date(),
): string {
  const policy = UPLOAD_POLICIES[purpose];
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const extension = policy.contentTypes[contentType] ?? 'bin';
  return `${policy.prefix}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${extension}`;
}
