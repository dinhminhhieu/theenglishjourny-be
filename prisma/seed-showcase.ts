import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  AssetPurpose,
  AssetStatus,
  AssetVisibility,
  PrismaClient,
} from '../src/generated/prisma/client';
import { validateEnv } from '../src/config/env.validation';
import { createS3Client } from '../src/modules/storage/s3-client';
import { seedItemSet, seedTest } from './seeds/practice-seeder';
import {
  SHOWCASE_AUDIO,
  SHOWCASE_IMAGES,
  SHOWCASE_TESTS,
  showcaseItemSets,
  type ShowcaseAsset,
} from './seeds/showcase-content';

const ASSET_DIR = join(__dirname, 'seeds', 'assets');

const prisma = new PrismaClient();
const env = validateEnv(process.env);
const s3 = createS3Client(env);

/** Đưa file lên storage và ghi bản ghi Asset. Chạy lại chỉ ghi đè cùng key. */
async function uploadAsset(
  asset: ShowcaseAsset,
  purpose: AssetPurpose,
): Promise<string> {
  const body = readFileSync(join(ASSET_DIR, asset.file));
  const visibility =
    purpose === AssetPurpose.IMAGE
      ? AssetVisibility.PUBLIC
      : AssetVisibility.PRIVATE;
  await s3.send(
    new PutObjectCommand({
      Bucket:
        visibility === AssetVisibility.PUBLIC
          ? env.S3_PUBLIC_BUCKET
          : env.S3_PRIVATE_BUCKET,
      Key: asset.key,
      Body: body,
      ContentType: asset.contentType,
    }),
  );
  const data = {
    purpose,
    visibility,
    status: AssetStatus.READY,
    contentType: asset.contentType,
    sizeBytes: body.length,
    durationSeconds: asset.durationSeconds ?? null,
    originalName: asset.file,
    confirmedAt: new Date(),
  };
  const row = await prisma.asset.upsert({
    where: { key: asset.key },
    create: { key: asset.key, ...data },
    update: data,
  });
  return row.id;
}

async function main(): Promise<void> {
  const publicBaseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/+$/, '');
  for (const image of Object.values(SHOWCASE_IMAGES)) {
    await uploadAsset(image, AssetPurpose.IMAGE);
  }
  const audioIds = new Map<string, string>();
  for (const [name, audio] of Object.entries(SHOWCASE_AUDIO)) {
    audioIds.set(name, await uploadAsset(audio, AssetPurpose.AUDIO));
  }

  const itemSets = showcaseItemSets({
    imageUrl: (name) => `${publicBaseUrl}/${SHOWCASE_IMAGES[name].key}`,
    audioAssetId: (name) => audioIds.get(name) as string,
  });
  let createdSets = 0;
  for (const itemSet of itemSets) {
    if (await seedItemSet(prisma, itemSet)) {
      createdSets++;
    }
  }
  let createdTests = 0;
  for (const test of SHOWCASE_TESTS) {
    if (await seedTest(prisma, test)) {
      createdTests++;
    }
  }
  console.log(
    `Showcase xong: tạo mới ${createdSets}/${itemSets.length} bộ câu hỏi, ${createdTests}/${SHOWCASE_TESTS.length} đề.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
