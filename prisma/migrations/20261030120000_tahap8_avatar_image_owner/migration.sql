-- A teacher profile photo (User.avatarImageId) belongs to neither a material nor a question.
ALTER TABLE "Image" DROP CONSTRAINT "Image_one_owner";
ALTER TABLE "Image" ADD CONSTRAINT "Image_at_most_one_owner" CHECK (num_nonnulls("materialId", "questionId") <= 1);
