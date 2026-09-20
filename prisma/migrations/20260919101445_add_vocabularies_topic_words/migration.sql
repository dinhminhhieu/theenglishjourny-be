-- CreateTable
CREATE TABLE "vocabularies" (
    "id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "pronunciation" TEXT,
    "audioUrl" TEXT,
    "imageUrl" TEXT,
    "academic" JSONB NOT NULL DEFAULT '[]',
    "academicIdioms" JSONB NOT NULL DEFAULT '[]',
    "definitions" JSONB NOT NULL DEFAULT '[]',
    "usageExamples" JSONB NOT NULL DEFAULT '[]',
    "advancedUsage" JSONB NOT NULL DEFAULT '[]',
    "variants" JSONB NOT NULL DEFAULT '[]',
    "synonyms" JSONB NOT NULL DEFAULT '[]',
    "antonyms" JSONB NOT NULL DEFAULT '[]',
    "idioms" JSONB NOT NULL DEFAULT '[]',
    "phrases" JSONB NOT NULL DEFAULT '[]',
    "otherSections" JSONB NOT NULL DEFAULT '[]',
    "relations" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabularies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_words" (
    "topicId" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,

    CONSTRAINT "topic_words_pkey" PRIMARY KEY ("topicId","vocabularyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "vocabularies_word_key" ON "vocabularies"("word");

-- CreateIndex
CREATE INDEX "vocabularies_word_pattern_idx" ON "vocabularies"("word" text_pattern_ops);

-- CreateIndex
CREATE INDEX "topic_words_vocabularyId_idx" ON "topic_words"("vocabularyId");

-- AddForeignKey
ALTER TABLE "topic_words" ADD CONSTRAINT "topic_words_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_words" ADD CONSTRAINT "topic_words_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabularies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
