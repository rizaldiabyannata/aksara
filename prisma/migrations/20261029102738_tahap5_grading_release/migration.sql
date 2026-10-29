-- AlterTable
ALTER TABLE "AttemptAnswer" ADD COLUMN     "gradedAt" TIMESTAMPTZ(3),
ADD COLUMN     "gradedById" TEXT,
ADD COLUMN     "manualPoints" DECIMAL(5,2),
ADD COLUMN     "teacherFeedback" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "resultsReleasedById" TEXT;

-- CreateIndex
CREATE INDEX "AttemptAnswer_gradedById_idx" ON "AttemptAnswer"("gradedById");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_resultsReleasedById_fkey" FOREIGN KEY ("resultsReleasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
