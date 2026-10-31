ALTER TABLE "Quiz" ADD COLUMN "importKey" TEXT, ADD COLUMN "importFingerprint" TEXT;
CREATE UNIQUE INDEX "Quiz_createdById_importKey_key" ON "Quiz"("createdById", "importKey");
