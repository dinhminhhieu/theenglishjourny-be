/**
 * Chép file trong bảng assets từ storage cũ sang storage trong .env, rồi đổi link ảnh cũ trong DB sang S3_PUBLIC_BASE_URL.
 * Storage cũ đọc từ FROM_S3_*, mặc định là MinIO trong docker-compose.yml.
 *
 *   pnpm storage:migrate            # chạy thử, chỉ in việc sẽ làm
 *   pnpm storage:migrate --apply    # chép file và cập nhật DB
 */
import 'reflect-metadata';
import 'dotenv/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  AssetStatus,
  AssetVisibility,
  PrismaClient,
} from '../src/generated/prisma/client';
import { validateEnv } from '../src/config/env.validation';
import { createS3Client } from '../src/modules/storage/s3-client';

const apply = process.argv.includes('--apply');
const env = validateEnv(process.env);
const prisma = new PrismaClient();

const source = {
  client: createS3Client({
    S3_ENDPOINT: process.env.FROM_S3_ENDPOINT ?? 'http://localhost:9000',
    S3_REGION: process.env.FROM_S3_REGION ?? 'us-east-1',
    S3_FORCE_PATH_STYLE:
      (process.env.FROM_S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    S3_ACCESS_KEY_ID: process.env.FROM_S3_ACCESS_KEY_ID ?? 'minioadmin',
    S3_SECRET_ACCESS_KEY: process.env.FROM_S3_SECRET_ACCESS_KEY ?? 'minioadmin',
  }),
  endpoint: process.env.FROM_S3_ENDPOINT ?? 'http://localhost:9000',
  buckets: {
    [AssetVisibility.PUBLIC]:
      process.env.FROM_S3_PUBLIC_BUCKET ?? 'theenglishjourney-public',
    [AssetVisibility.PRIVATE]:
      process.env.FROM_S3_PRIVATE_BUCKET ?? 'theenglishjourney-private',
  },
  publicBaseUrl: (
    process.env.FROM_S3_PUBLIC_BASE_URL ??
    'http://localhost:9000/theenglishjourney-public'
  ).replace(/\/+$/, ''),
};

const target = {
  client: createS3Client(env),
  endpoint: env.S3_ENDPOINT,
  buckets: {
    [AssetVisibility.PUBLIC]: env.S3_PUBLIC_BUCKET,
    [AssetVisibility.PRIVATE]: env.S3_PRIVATE_BUCKET,
  },
  publicBaseUrl: env.S3_PUBLIC_BASE_URL.replace(/\/+$/, ''),
};

async function sizeOf(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<number | null> {
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return head.ContentLength ?? 0;
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 404
    )
      return null;
    throw error;
  }
}

async function copyAssets(): Promise<void> {
  const assets = await prisma.asset.findMany({
    where: { status: AssetStatus.READY },
    select: { key: true, visibility: true, contentType: true },
    orderBy: { createdAt: 'asc' },
  });
  const counts = { copy: 0, skip: 0, missing: 0 };

  for (const asset of assets) {
    const from = source.buckets[asset.visibility];
    const to = target.buckets[asset.visibility];
    const sourceSize = await sizeOf(source.client, from, asset.key);
    if (sourceSize === null) {
      counts.missing++;
      console.log(`  thiếu ở storage cũ: ${from}/${asset.key}`);
      continue;
    }
    if ((await sizeOf(target.client, to, asset.key)) === sourceSize) {
      counts.skip++;
      continue;
    }
    counts.copy++;
    console.log(
      `  ${apply ? 'chép' : 'sẽ chép'} ${from}/${asset.key} → ${to} (${sourceSize} B)`,
    );
    if (!apply) continue;

    const object = await source.client.send(
      new GetObjectCommand({ Bucket: from, Key: asset.key }),
    );
    await target.client.send(
      new PutObjectCommand({
        Bucket: to,
        Key: asset.key,
        Body: await object.Body!.transformToByteArray(),
        ContentType: object.ContentType ?? asset.contentType,
      }),
    );
  }
  console.log(
    `File: ${counts.copy} cần chép, ${counts.skip} đã có, ${counts.missing} thiếu ở storage cũ`,
  );
}

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function rewriteUrls(): Promise<void> {
  const from = `${source.publicBaseUrl}/`;
  const to = `${target.publicBaseUrl}/`;
  if (from === to) {
    console.log('Link ảnh: địa chỉ public không đổi, bỏ qua');
    return;
  }
  const columns = await prisma.$queryRaw<
    { table_name: string; column_name: string; data_type: string }[]
  >`
    select table_name, column_name, data_type from information_schema.columns
    where table_schema = 'public'
      and data_type in ('text', 'character varying', 'json', 'jsonb')
      and table_name <> '_prisma_migrations'
    order by table_name, column_name`;

  let total = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const {
        table_name: table,
        column_name: column,
        data_type: type,
      } of columns) {
        const ref = `${quote(table)}.${quote(column)}`;
        const [{ count }] = await tx.$queryRawUnsafe<{ count: number }[]>(
          `select count(*)::int as count from ${quote(table)} where strpos(${ref}::text, $1) > 0`,
          from,
        );
        if (!count) continue;
        total += count;
        console.log(`  ${table}.${column}: ${count} dòng`);
        if (!apply) continue;
        const value =
          type === 'json' || type === 'jsonb'
            ? `replace(${ref}::text, $1, $2)::${type}`
            : `replace(${ref}, $1, $2)`;
        await tx.$executeRawUnsafe(
          `update ${quote(table)} set ${quote(column)} = ${value} where strpos(${ref}::text, $1) > 0`,
          from,
          to,
        );
      }
    },
    { timeout: 120_000 },
  );
  console.log(
    `Link ảnh: ${total} dòng ${apply ? 'đã đổi' : 'sẽ đổi'} ${from} → ${to}`,
  );
}

async function main(): Promise<void> {
  const sameStorage =
    source.endpoint.trim() === target.endpoint.trim() &&
    source.buckets.PUBLIC === target.buckets.PUBLIC &&
    source.buckets.PRIVATE === target.buckets.PRIVATE;
  if (sameStorage)
    throw new Error(
      'Storage trong .env trùng với storage cũ, chưa có gì để chuyển',
    );

  console.log(
    `${apply ? 'Chuyển' : 'Chạy thử'}: ${source.endpoint} → ${target.endpoint || 'AWS S3'}`,
  );
  await copyAssets();
  await rewriteUrls();
  if (!apply)
    console.log('\nChưa thay đổi gì. Chạy lại với --apply để thực hiện.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
