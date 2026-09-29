/*
  Warnings:

  - You are about to drop the column `country` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `nativeLanguage` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LessonTier" AS ENUM ('CORE', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('USE_CASES', 'FORMULA_MATRIX', 'RULES_TABLE', 'PRONUNCIATION', 'COMPARISON', 'COMMON_MISTAKES', 'CALLOUT', 'RICH_TEXT');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LessonBlockKind" AS ENUM ('VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('PURCHASE', 'GIFT', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('BANK_TRANSFER', 'VNPAY', 'MOMO');

-- CreateEnum
CREATE TYPE "XpKind" AS ENUM ('EARN', 'SPEND');

-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('BLOCK_COMPLETED', 'LESSON_COMPLETED', 'STREAK', 'AI_GRADING', 'TEST_UNLOCK', 'REFUND', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('AI_WRITING', 'AI_SPEAKING');

-- CreateEnum
CREATE TYPE "UsageSource" AS ENUM ('FREE_DAILY', 'XP', 'PLAN');

-- DropIndex
DROP INDEX "vocabularies_word_pattern_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "country",
DROP COLUMN "nativeLanguage",
ADD COLUMN     "lastActiveDate" DATE,
ADD COLUMN     "levelId" UUID,
ADD COLUMN     "streakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpTotal" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "toeicScoreMin" INTEGER,
    "toeicScoreMax" INTEGER,
    "ieltsMin" DECIMAL(2,1),
    "ieltsMax" DECIMAL(2,1),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_categories" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_lessons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "summary" TEXT,
    "tier" "LessonTier" NOT NULL,
    "levelFrom" "CefrLevel" NOT NULL,
    "levelTo" "CefrLevel" NOT NULL,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "estimatedMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "grammarCategoryId" UUID NOT NULL,
    "levelId" UUID,

    CONSTRAINT "grammar_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_sections" (
    "id" UUID NOT NULL,
    "type" "SectionType" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "grammarLessonId" UUID NOT NULL,

    CONSTRAINT "grammar_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_grammar_lesson_progress" (
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastSectionCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "grammarLessonId" UUID NOT NULL,

    CONSTRAINT "user_grammar_lesson_progress_pkey" PRIMARY KEY ("userId","grammarLessonId")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "levelFrom" "CefrLevel",
    "levelTo" "CefrLevel",
    "targetBandFrom" DECIMAL(2,1),
    "targetBandTo" DECIMAL(2,1),
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "accessDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "estimatedMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" UUID NOT NULL,
    "topicId" UUID,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_blocks" (
    "id" UUID NOT NULL,
    "kind" "LessonBlockKind" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 20,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lessonId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "grammarLessonId" UUID,

    CONSTRAINT "lesson_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_progress" (
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedBlockIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "source" "EnrollmentSource" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "orderId" UUID,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("userId","courseId")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL,
    "kind" "XpKind" NOT NULL,
    "reason" "XpReason" NOT NULL,
    "amount" INTEGER NOT NULL,
    "refId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_usages" (
    "id" UUID NOT NULL,
    "feature" "FeatureKey" NOT NULL,
    "source" "UsageSource" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "feature_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "levels_cefrLevel_key" ON "levels"("cefrLevel");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_categories_title_key" ON "grammar_categories"("title");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_lessons_code_key" ON "grammar_lessons"("code");

-- CreateIndex
CREATE INDEX "grammar_lessons_grammarCategoryId_sortOrder_idx" ON "grammar_lessons"("grammarCategoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "grammar_sections_grammarLessonId_sortOrder_idx" ON "grammar_sections"("grammarLessonId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_sections_grammarLessonId_code_key" ON "grammar_sections"("grammarLessonId", "code");

-- CreateIndex
CREATE INDEX "user_grammar_lesson_progress_grammarLessonId_idx" ON "user_grammar_lesson_progress"("grammarLessonId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "lessons_courseId_sortOrder_idx" ON "lessons"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_courseId_code_key" ON "lessons"("courseId", "code");

-- CreateIndex
CREATE INDEX "lesson_blocks_lessonId_sortOrder_idx" ON "lesson_blocks"("lessonId", "sortOrder");

-- CreateIndex
CREATE INDEX "user_lesson_progress_lessonId_idx" ON "user_lesson_progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_orderId_key" ON "enrollments"("orderId");

-- CreateIndex
CREATE INDEX "enrollments_courseId_idx" ON "enrollments"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "xp_transactions_userId_createdAt_idx" ON "xp_transactions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_userId_reason_refId_key" ON "xp_transactions"("userId", "reason", "refId");

-- CreateIndex
CREATE INDEX "feature_usages_userId_feature_createdAt_idx" ON "feature_usages"("userId", "feature", "createdAt");

-- CreateIndex
CREATE INDEX "vocabularies_word_pattern_idx" ON "vocabularies"("word" text_pattern_ops);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_lessons" ADD CONSTRAINT "grammar_lessons_grammarCategoryId_fkey" FOREIGN KEY ("grammarCategoryId") REFERENCES "grammar_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_lessons" ADD CONSTRAINT "grammar_lessons_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_sections" ADD CONSTRAINT "grammar_sections_grammarLessonId_fkey" FOREIGN KEY ("grammarLessonId") REFERENCES "grammar_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_grammar_lesson_progress" ADD CONSTRAINT "user_grammar_lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_grammar_lesson_progress" ADD CONSTRAINT "user_grammar_lesson_progress_grammarLessonId_fkey" FOREIGN KEY ("grammarLessonId") REFERENCES "grammar_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_grammarLessonId_fkey" FOREIGN KEY ("grammarLessonId") REFERENCES "grammar_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_usages" ADD CONSTRAINT "feature_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
