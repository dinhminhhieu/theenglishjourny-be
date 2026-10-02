-- CreateEnum
CREATE TYPE "AssetPurpose" AS ENUM ('AUDIO', 'IMAGE', 'RECORDING');

-- CreateEnum
CREATE TYPE "AssetVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY');

-- DropIndex
DROP INDEX "vocabularies_word_pattern_idx";

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "purpose" "AssetPurpose" NOT NULL,
    "visibility" "AssetVisibility" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "durationSeconds" INTEGER,
    "originalName" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedById" UUID,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_key_key" ON "assets"("key");

-- CreateIndex
CREATE INDEX "assets_status_createdAt_idx" ON "assets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "assets_purpose_createdAt_idx" ON "assets"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "vocabularies_word_pattern_idx" ON "vocabularies"("word" text_pattern_ops);

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
