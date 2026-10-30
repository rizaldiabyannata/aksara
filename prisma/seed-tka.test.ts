import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { publishQuiz } from "@/lib/quizzes";
import { gradeObjective, type ObjectiveQuestion } from "@/lib/grading";
import { makeTeacher } from "../tests/factories";
import { objects } from "../tests/storage-fake";
import { TKA_SUBJECTS, seedTka, toInput } from "./seed-tka";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

const count = <T extends string>(xs: (T | null | undefined)[]) =>
  xs.reduce<Record<string, number>>((m, x) => ((m[x ?? "-"] = (m[x ?? "-"] ?? 0) + 1), m), {});

describe("TKA seed content (D12)", () => {
  it("each mapel has 30 items: PG 20, MCMA 5, Kategori 5", () => {
    for (const s of TKA_SUBJECTS) {
      expect(s.items).toHaveLength(30);
      expect(count(s.items.map((i) => i.type))).toEqual({ SINGLE_CHOICE: 20, MULTIPLE_SELECT: 5, CATEGORY: 5 });
    }
  });

  it("composition per element and level", () => {
    const [mat, bi] = TKA_SUBJECTS;
    expect(count(mat.items.map((i) => i.chapter))).toEqual({ Bilangan: 12, "Objek Geometri": 5, Pengukuran: 8, Data: 5 });
    expect(count(mat.items.map((i) => i.level))).toEqual({ PEMAHAMAN: 10, APLIKASI: 12, PENALARAN: 8 });
    expect(count(bi.items.map((i) => i.chapter))).toEqual({ "Pemahaman Tekstual": 9, "Pemahaman Inferensial": 13, "Evaluasi dan Apresiasi": 8 });
    expect(bi.items.every((i) => !i.level)).toBe(true);
  });

  it("rotation moves the key with its option", () => {
    for (const s of TKA_SUBJECTS) {
      s.items.forEach((item, i) => {
        const input = toInput(item, "c", undefined, i);
        const key = { type: input.type, answerKey: input.answerKey } as ObjectiveQuestion;
        const text = (id: string) => input.options.find((o) => o.id === id)!.text;
        if (item.type === "SINGLE_CHOICE") expect(text((input.answerKey as { optionId: string }).optionId)).toBe(item.options[item.key]);
        if (item.type === "MULTIPLE_SELECT") {
          expect((input.answerKey as { optionIds: string[] }).optionIds.map(text).sort()).toEqual(item.key.map((k) => item.options[k]).sort());
        }
        expect(gradeObjective(key, input.type === "CATEGORY" ? { values: (input.answerKey as { values: object }).values } : input.answerKey, 1)).toBe(1);
      });
      const firsts = s.items.flatMap((item, i) => (item.type === "SINGLE_CHOICE" ? [(toInput(item, "c", undefined, i).answerKey as { optionId: string }).optionId] : []));
      expect(new Set(firsts).size).toBe(4);
    }
  });
});

describe("seedTka", () => {
  it("refuses without a teacher", async () => {
    await expect(seedTka()).rejects.toThrow("db:seed");
  });

  it("seeds structure, 60 draft questions with figures and two tryout drafts; a rerun is a no-op", async () => {
    objects.clear();
    const { user } = await makeTeacher();
    expect(await seedTka()).toEqual({ questions: 60, quizzes: 2, skipped: [] });

    const qs = await prisma.question.findMany({ select: { status: true, prompt: true, sourceReference: true, createdById: true } });
    expect(qs).toHaveLength(60);
    expect(qs.every((q) => q.status === "DRAFT" && q.createdById === user.id && q.sourceReference?.includes("bukan soal resmi"))).toBe(true);
    expect(qs.some((q) => q.prompt.includes("{{gambar}}"))).toBe(false);
    const imgs = await prisma.image.findMany({ select: { id: true, questionId: true, mimeType: true } });
    expect(imgs).toHaveLength(7);
    expect(imgs.every((i) => i.mimeType === "image/png")).toBe(true);
    expect(objects.size).toBe(7);
    for (const i of imgs) {
      const q = await prisma.question.findUniqueOrThrow({ where: { id: i.questionId! } });
      expect(q.prompt).toContain(`aksara-image:${i.id}`);
    }
    expect(await prisma.subchapter.count()).toBe(15 + 10);

    const quizzes = await prisma.quiz.findMany({ include: { _count: { select: { questions: true } } } });
    expect(quizzes.map((q) => [q.kind, q.status, q.durationMinutes, q.shuffleQuestions, q._count.questions])).toEqual([
      ["TRYOUT_TKA", "DRAFT", 75, false, 30],
      ["TRYOUT_TKA", "DRAFT", 75, false, 30],
    ]);
    const r = await publishQuiz(user.id, quizzes[0].id);
    expect((r as { reasons: string[] }).reasons).toContain("Soal nomor 1 masih draf. Aktifkan dulu di bank soal.");

    expect(await seedTka()).toEqual({ questions: 0, quizzes: 0, skipped: ["TKA Matematika", "TKA Bahasa Indonesia"] });
    expect(await prisma.question.count()).toBe(60);
    expect(await prisma.quiz.count()).toBe(2);
  });
});
