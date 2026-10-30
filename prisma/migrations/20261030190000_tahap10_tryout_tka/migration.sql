-- CreateEnum
CREATE TYPE "CognitiveLevel" AS ENUM ('PEMAHAMAN', 'APLIKASI', 'PENALARAN');

-- CreateEnum
CREATE TYPE "QuizKind" AS ENUM ('REGULAR', 'TRYOUT_TKA');

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'CATEGORY';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "categoryLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cognitiveLevel" "CognitiveLevel";

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "kind" "QuizKind" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "chapterSnapshot" TEXT,
ADD COLUMN     "levelSnapshot" "CognitiveLevel";

