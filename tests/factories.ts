import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

let n = 0;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Counter-based 6-char code in the CHECK alphabet, unique per call.
function nextCode(i: number): string {
  let s = "";
  for (let k = 0; k < 6; k++) {
    s += CODE_ALPHABET[i % CODE_ALPHABET.length];
    i = Math.floor(i / CODE_ALPHABET.length);
  }
  return s;
}

export function makeClass(overrides: Partial<Prisma.ClassCreateInput> = {}) {
  const i = ++n;
  return prisma.class.create({
    data: { name: `Kelas ${i}`, code: nextCode(i), ...overrides },
  });
}

export function makeStudent(
  classId: string,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  const i = ++n;
  return prisma.user.create({
    data: {
      role: "STUDENT",
      displayName: `Siswa ${i}`,
      loginName: `siswa${i}`,
      classId,
      ...overrides,
    },
  });
}

export async function makeTeacher(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  const i = ++n;
  const password = "password-guru-123";
  const user = await prisma.user.create({
    data: {
      role: "TEACHER",
      username: `guru${i}`,
      displayName: `Guru ${i}`,
      passwordHash: await hashPassword(password),
      ...overrides,
    },
  });
  return { user, password };
}

export async function makeChapter(overrides: Partial<Prisma.ChapterUncheckedCreateInput> = {}) {
  const i = ++n;
  const subject = await prisma.subject.create({ data: { name: `Mapel ${i}` } });
  return prisma.chapter.create({
    data: {
      subjectId: subject.id,
      title: `Bab ${i}`,
      order: 1,
      sourceBook: "Buku Uji",
      sourceYearOrEdition: "2022",
      ...overrides,
    },
  });
}

export function makeSubchapter(
  chapterId: string,
  overrides: Partial<Prisma.SubchapterUncheckedCreateInput> = {},
) {
  const i = ++n;
  return prisma.subchapter.create({
    data: { chapterId, title: `Subbab ${i}`, order: i, ...overrides },
  });
}

export function makeMaterial(
  chapterId: string,
  createdById: string,
  overrides: Partial<Prisma.MaterialUncheckedCreateInput> = {},
) {
  const i = ++n;
  return prisma.material.create({
    data: {
      chapterId,
      title: `Materi ${i}`,
      summary: "Ringkasan uji",
      content: "Isi uji",
      sourceReference: "Buku Uji",
      status: "DRAFT",
      order: i,
      createdById,
      updatedById: createdById,
      ...overrides,
    },
  });
}

export function makeQuestion(
  chapterId: string,
  createdById: string,
  overrides: Partial<Prisma.QuestionUncheckedCreateInput> = {},
) {
  return prisma.question.create({
    data: {
      chapterId,
      type: "SINGLE_CHOICE",
      prompt: "Soal uji",
      options: [
        { id: "a", text: "Satu" },
        { id: "b", text: "Dua" },
      ],
      answerKey: { optionId: "a" },
      defaultPoints: 1,
      difficulty: "EASY",
      status: "DRAFT",
      createdById,
      updatedById: createdById,
      ...overrides,
    },
  });
}

export function makeImage(
  materialId: string | null,
  createdById: string,
  overrides: Partial<Prisma.ImageUncheckedCreateInput> = {},
) {
  const i = ++n;
  return prisma.image.create({
    data: {
      materialId,
      storageKey: `images/test-${i}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: 1000,
      width: 10,
      height: 10,
      altText: "Gambar uji",
      createdById,
      ...overrides,
    },
  });
}
