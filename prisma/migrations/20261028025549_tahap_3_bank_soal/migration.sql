-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'ESSAY');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "questionId" TEXT,
ALTER COLUMN "materialId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "subchapterId" TEXT,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answerKey" JSONB NOT NULL,
    "explanation" TEXT,
    "defaultPoints" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceReference" TEXT,
    "verificationNote" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_chapterId_status_idx" ON "Question"("chapterId", "status");

-- CreateIndex
CREATE INDEX "Question_type_idx" ON "Question"("type");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "Question_subchapterId_chapterId_idx" ON "Question"("subchapterId", "chapterId");

-- CreateIndex
CREATE INDEX "Question_createdById_idx" ON "Question"("createdById");

-- CreateIndex
CREATE INDEX "Question_updatedById_idx" ON "Question"("updatedById");

-- CreateIndex
CREATE INDEX "Image_questionId_idx" ON "Image"("questionId");

-- CreateIndex
CREATE INDEX "Image_createdById_idx" ON "Image"("createdById");

-- CreateIndex
CREATE INDEX "Material_subchapterId_chapterId_idx" ON "Material"("subchapterId", "chapterId");

-- CreateIndex
CREATE INDEX "Material_createdById_idx" ON "Material"("createdById");

-- CreateIndex
CREATE INDEX "Material_updatedById_idx" ON "Material"("updatedById");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subchapterId_chapterId_fkey" FOREIGN KEY ("subchapterId", "chapterId") REFERENCES "Subchapter"("id", "chapterId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK: exactly one owner per image
ALTER TABLE "Image" ADD CONSTRAINT "Image_one_owner" CHECK (num_nonnulls("materialId", "questionId") = 1);
