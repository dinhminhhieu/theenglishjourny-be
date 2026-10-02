-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('EXAM', 'PRACTICE');

-- CreateEnum
CREATE TYPE "AttemptSource" AS ENUM ('TEST', 'LESSON_BLOCK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SubmitReason" AS ENUM ('USER', 'TIMEOUT');

-- AlterEnum
ALTER TYPE "XpReason" ADD VALUE 'TEST_COMPLETED';

-- DropIndex
DROP INDEX "vocabularies_word_pattern_idx";

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "source" "AttemptSource" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "activeKey" TEXT,
    "exam" "Exam" NOT NULL,
    "title" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "questionIndex" JSONB NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "draft" JSONB NOT NULL DEFAULT '{}',
    "draftSeq" INTEGER NOT NULL DEFAULT 0,
    "checkedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "lastSavedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submitReason" "SubmitReason",
    "gradedAt" TIMESTAMP(3),
    "rawScore" INTEGER,
    "percent" INTEGER,
    "result" JSONB,
    "score" DECIMAL(6,1),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "testId" UUID,
    "testReleaseId" UUID,
    "lessonBlockId" UUID,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "questionId" UUID NOT NULL,
    "itemSetId" UUID NOT NULL,
    "itemSetReleaseId" UUID NOT NULL,
    "displayNumber" INTEGER NOT NULL,
    "marks" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "skill" "ExamSkill" NOT NULL,
    "part" INTEGER,
    "response" JSONB,
    "score" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "slots" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptId" UUID NOT NULL,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("attemptId","questionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "attempts_activeKey_key" ON "attempts"("activeKey");

-- CreateIndex
CREATE INDEX "attempts_userId_createdAt_idx" ON "attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "attempts_userId_testId_idx" ON "attempts"("userId", "testId");

-- CreateIndex
CREATE INDEX "attempts_status_deadlineAt_idx" ON "attempts"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "attempt_answers_questionId_idx" ON "attempt_answers"("questionId");

-- CreateIndex
CREATE INDEX "attempt_answers_itemSetId_idx" ON "attempt_answers"("itemSetId");

-- CreateIndex
CREATE INDEX "attempt_answers_questionType_idx" ON "attempt_answers"("questionType");

-- CreateIndex
CREATE INDEX "vocabularies_word_pattern_idx" ON "vocabularies"("word" text_pattern_ops);

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_testReleaseId_fkey" FOREIGN KEY ("testReleaseId") REFERENCES "test_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_lessonBlockId_fkey" FOREIGN KEY ("lessonBlockId") REFERENCES "lesson_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
