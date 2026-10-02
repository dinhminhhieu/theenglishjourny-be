-- CreateEnum
CREATE TYPE "Exam" AS ENUM ('IELTS', 'TOEIC', 'GENERAL');

-- CreateEnum
CREATE TYPE "ExamSkill" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY');

-- CreateEnum
CREATE TYPE "IeltsModule" AS ENUM ('ACADEMIC', 'GENERAL_TRAINING');

-- CreateEnum
CREATE TYPE "TestKind" AS ENUM ('FULL', 'SECTION', 'PRACTICE');

-- DropIndex
DROP INDEX "vocabularies_word_pattern_idx";

-- AlterTable
ALTER TABLE "lesson_blocks" ADD COLUMN     "testId" UUID;

-- CreateTable
CREATE TABLE "item_sets" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "exam" "Exam" NOT NULL,
    "skill" "ExamSkill" NOT NULL,
    "module" "IeltsModule",
    "part" INTEGER,
    "stimulus" JSONB NOT NULL DEFAULT '{}',
    "transcript" JSONB NOT NULL DEFAULT '[]',
    "audioAssetId" UUID,
    "difficulty" INTEGER,
    "levelFrom" "CefrLevel",
    "levelTo" "CefrLevel",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "practiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "currentReleaseId" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "publishedRevision" INTEGER,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_groups" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "content" JSONB NOT NULL DEFAULT '{}',
    "passageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemSetId" UUID NOT NULL,

    CONSTRAINT "question_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "prompt" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "answer" JSONB NOT NULL,
    "explanation" TEXT,
    "evidence" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" UUID NOT NULL,
    "grammarLessonId" UUID,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_set_releases" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "answerKey" JSONB NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "exam" "Exam" NOT NULL,
    "skill" "ExamSkill" NOT NULL,
    "module" "IeltsModule",
    "part" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemSetId" UUID NOT NULL,
    "audioAssetId" UUID,

    CONSTRAINT "item_set_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "exam" "Exam" NOT NULL,
    "module" "IeltsModule",
    "kind" "TestKind" NOT NULL,
    "skill" "ExamSkill",
    "durationMinutes" INTEGER,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "xpCost" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "currentReleaseId" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "publishedRevision" INTEGER,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_items" (
    "sortOrder" INTEGER NOT NULL,
    "testId" UUID NOT NULL,
    "itemSetId" UUID NOT NULL,

    CONSTRAINT "test_items_pkey" PRIMARY KEY ("testId","itemSetId")
);

-- CreateTable
CREATE TABLE "test_releases" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "structure" JSONB NOT NULL,
    "durationMinutes" INTEGER,
    "questionCount" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testId" UUID NOT NULL,

    CONSTRAINT "test_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_sets_code_key" ON "item_sets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "item_sets_currentReleaseId_key" ON "item_sets"("currentReleaseId");

-- CreateIndex
CREATE INDEX "item_sets_exam_skill_part_status_idx" ON "item_sets"("exam", "skill", "part", "status");

-- CreateIndex
CREATE INDEX "question_groups_itemSetId_sortOrder_idx" ON "question_groups"("itemSetId", "sortOrder");

-- CreateIndex
CREATE INDEX "questions_groupId_sortOrder_idx" ON "questions"("groupId", "sortOrder");

-- CreateIndex
CREATE INDEX "item_set_releases_exam_skill_part_idx" ON "item_set_releases"("exam", "skill", "part");

-- CreateIndex
CREATE UNIQUE INDEX "item_set_releases_itemSetId_version_key" ON "item_set_releases"("itemSetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "tests_code_key" ON "tests"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tests_currentReleaseId_key" ON "tests"("currentReleaseId");

-- CreateIndex
CREATE INDEX "tests_exam_kind_status_idx" ON "tests"("exam", "kind", "status");

-- CreateIndex
CREATE INDEX "test_items_itemSetId_idx" ON "test_items"("itemSetId");

-- CreateIndex
CREATE UNIQUE INDEX "test_releases_testId_version_key" ON "test_releases"("testId", "version");

-- CreateIndex
CREATE INDEX "lesson_blocks_testId_idx" ON "lesson_blocks"("testId");

-- CreateIndex
CREATE INDEX "vocabularies_word_pattern_idx" ON "vocabularies"("word" text_pattern_ops);

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_sets" ADD CONSTRAINT "item_sets_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_sets" ADD CONSTRAINT "item_sets_currentReleaseId_fkey" FOREIGN KEY ("currentReleaseId") REFERENCES "item_set_releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_itemSetId_fkey" FOREIGN KEY ("itemSetId") REFERENCES "item_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_grammarLessonId_fkey" FOREIGN KEY ("grammarLessonId") REFERENCES "grammar_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_set_releases" ADD CONSTRAINT "item_set_releases_itemSetId_fkey" FOREIGN KEY ("itemSetId") REFERENCES "item_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_set_releases" ADD CONSTRAINT "item_set_releases_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_currentReleaseId_fkey" FOREIGN KEY ("currentReleaseId") REFERENCES "test_releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_items" ADD CONSTRAINT "test_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_items" ADD CONSTRAINT "test_items_itemSetId_fkey" FOREIGN KEY ("itemSetId") REFERENCES "item_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_releases" ADD CONSTRAINT "test_releases_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
