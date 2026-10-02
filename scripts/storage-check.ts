/**
 * Kiểm tra storage trong .env chạy được với luồng upload của app.
 *
 *   pnpm storage:check
 */
import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  validateEnv,
  type AppConfigService,
} from '../src/config/env.validation';
import type { StorageBucket } from '../src/modules/storage/object-storage';
import { S3ObjectStorage } from '../src/modules/storage/s3-object-storage';

const env = validateEnv(process.env);
const storage = new S3ObjectStorage({
  get: (key: keyof typeof env) => env[key],
} as unknown as AppConfigService);
const origins = env.ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const BODY = 'theenglishjourney storage check';

let failures = 0;
let corsFailed = false;

function report(ok: boolean, label: string, detail = ''): boolean {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
  return ok;
}

async function preflight(url: string, origin: string): Promise<string> {
  const response = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  return response.headers.get('access-control-allow-origin') ?? '';
}

async function check(bucket: StorageBucket, name: string): Promise<void> {
  console.log(`\n[${bucket}] ${name}`);
  const key = `healthcheck/${randomUUID()}.txt`;
  const upload = await storage.presignPut(bucket, key, 'text/plain');

  for (const origin of origins) {
    const allowed = await preflight(upload.url, origin);
    if (
      !report(
        allowed === origin || allowed === '*',
        `CORS PUT từ ${origin}`,
        allowed || 'không có Access-Control-Allow-Origin',
      )
    )
      corsFailed = true;
  }

  const put = await fetch(upload.url, {
    method: 'PUT',
    headers: upload.headers,
    body: BODY,
  });
  if (!report(put.ok, 'Upload bằng link ký sẵn', `HTTP ${put.status}`)) {
    console.log(`  ${(await put.text()).slice(0, 300)}`);
    return;
  }

  const head = await storage.head(bucket, key);
  report(
    head?.sizeBytes === BODY.length && head.contentType === 'text/plain',
    'Đọc thông tin file',
    head ? `${head.sizeBytes} B, ${head.contentType}` : 'không thấy file',
  );

  if (bucket === 'PUBLIC') {
    const url = storage.publicUrl(key);
    const response = await fetch(url);
    report(
      response.ok && (await response.text()) === BODY,
      `Đọc công khai qua ${env.S3_PUBLIC_BASE_URL}`,
      `HTTP ${response.status}`,
    );
  } else {
    const signed = await fetch(await storage.presignGet(bucket, key));
    report(
      signed.ok && (await signed.text()) === BODY,
      'Đọc qua link ký sẵn',
      `HTTP ${signed.status}`,
    );
    const unsigned = await fetch(
      new URL(upload.url).origin + new URL(upload.url).pathname,
    );
    report(
      !unsigned.ok,
      'Không đọc được khi thiếu chữ ký',
      `HTTP ${unsigned.status}`,
    );
  }

  await storage.delete(bucket, key);
  report((await storage.head(bucket, key)) === null, 'Xoá file');
}

async function main(): Promise<void> {
  console.log(
    `Endpoint: ${env.S3_ENDPOINT || 'AWS S3'} · region ${env.S3_REGION}`,
  );
  await check('PUBLIC', env.S3_PUBLIC_BUCKET);
  await check('PRIVATE', env.S3_PRIVATE_BUCKET);

  if (corsFailed) {
    console.log(
      '\nDán CORS policy này vào cả hai bucket (R2: Settings → CORS Policy):',
    );
    console.log(
      JSON.stringify(
        [
          {
            AllowedOrigins: origins,
            AllowedMethods: ['GET', 'PUT', 'HEAD'],
            AllowedHeaders: ['content-type'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
        null,
        2,
      ),
    );
  }
  console.log(failures ? `\n${failures} bước lỗi` : '\nStorage sẵn sàng');
  process.exitCode = failures ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
