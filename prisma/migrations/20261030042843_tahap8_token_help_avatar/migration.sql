-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "examToken" TEXT;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "helpRequestedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarImageId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarImageId_fkey" FOREIGN KEY ("avatarImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
