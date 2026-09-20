-- DropIndex
DROP INDEX "vocabularies_word_pattern_idx";

-- CreateIndex
CREATE INDEX "vocabularies_word_pattern_idx" ON "vocabularies"("word" text_pattern_ops);
