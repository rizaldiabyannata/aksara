import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeChapter, makeImage, makeMaterial, makeQuestion, makeSubchapter, makeTeacher } from "../tests/factories";

// Raw insert so the DB CHECK runs, not Prisma's own checks.
function insertImage(createdById: string, materialId: string | null, questionId: string | null) {
  return prisma.$executeRaw`
    INSERT INTO "Image" ("id", "materialId", "questionId", "storageKey", "mimeType", "sizeBytes", "width", "height", "altText", "createdById")
    VALUES (${randomUUID()}, ${materialId}, ${questionId}, ${`images/raw-${randomUUID()}.jpg`}, 'image/jpeg', 1000, 10, 10, 'Gambar uji', ${createdById})
  `;
}

describe("Image owner CHECK", () => {
  it("CHECK allows an image with no owner (teacher avatar)", async () => {
    const { user } = await makeTeacher();
    await expect(insertImage(user.id, null, null)).resolves.not.toThrow();
  });

  it("CHECK rejects an image with both owners", async () => {
    const { user } = await makeTeacher();
    const chapter = await makeChapter();
    const material = await makeMaterial(chapter.id, user.id);
    const question = await makeQuestion(chapter.id, user.id);
    await expect(insertImage(user.id, material.id, question.id)).rejects.toThrow(/Image_at_most_one_owner/);
  });
});

describe("Question subchapter FK", () => {
  it("question with subchapter of another chapter is rejected by the composite FK", async () => {
    const { user } = await makeTeacher();
    const chapterA = await makeChapter();
    const chapterB = await makeChapter();
    const subB = await makeSubchapter(chapterB.id);
    await expect(
      makeQuestion(chapterA.id, user.id, { subchapterId: subB.id }),
    ).rejects.toThrow(/Question_subchapterId_chapterId_fkey/);
  });
});

// Keeps makeImage's question-owner call shape compiling for later tasks.
describe("makeImage question owner", () => {
  it("creates an image owned by a question", async () => {
    const { user } = await makeTeacher();
    const chapter = await makeChapter();
    const question = await makeQuestion(chapter.id, user.id);
    const img = await makeImage(null, user.id, { questionId: question.id });
    expect(img.questionId).toBe(question.id);
    expect(img.materialId).toBeNull();
  });
});
