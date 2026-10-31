import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { saveAnswer, submitAttempt } from "@/lib/attempts";
import { publishQuiz } from "@/lib/quizzes";
import { countGradeFragments, getGradebook } from "@/lib/gradebook";
import { buildGradeTables, serializeGradebook } from "@/lib/gradebook-export";
import { at, setup, started, t0 } from "../tests/quiz-setup";
import { makeImage, makeQuestion, makeQuizQuestion } from "../tests/factories";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

describe("gradebook export", () => {
  it("summary roundtrip preserves numeric grades, textual NISN and blocks formulas", async () => {
    const s = await setup();
    await prisma.user.update({ where: { id: s.student.id }, data: { displayName: '=SUM(1,2)', nis: "001234", studentNo: "0009" } });
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    const book = await getGradebook({}, { now: at(3) });
    const tables = buildGradeTables(book, "summary");
    const file = await serializeGradebook(tables, "xlsx", book.capturedAt);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(file.data).buffer);
    expect(wb.worksheets.map((s) => s.name)).toEqual(["Petunjuk", "BN-001"]);
    const row = wb.getWorksheet("BN-001")!.getRow(2);
    expect(row.getCell(2).value).toBe("'=SUM(1,2)");
    expect(row.getCell(3).value).toBe("001234");
    expect(row.values).toContain(100);
    expect(row.getCell(3).numFmt).toBe("@");
    const zipFile = await serializeGradebook(tables, "csv", book.capturedAt);
    const zip = await JSZip.loadAsync(zipFile.data);
    const csv = await zip.file("BN-001.csv")!.async("string");
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"001234"');
    expect(zip.file("Petunjuk.csv")).not.toBeNull();
    const csvBook = new ExcelJS.Workbook();
    const parsed = await csvBook.csv.read(Readable.from([csv]), { map: (value) => value });
    expect(parsed.getRow(2).getCell(2).value).toBe("'=SUM(1,2)");
    expect(parsed.getRow(2).getCell(3).value).toBe("001234");
  });

  it("full export joins all attempts/questions, readable and raw answers, evaluation; excludes exam token", async () => {
    const s = await setup({ kind: "TRYOUT_TKA" }, [{ type: "CATEGORY", cognitiveLevel: "PENALARAN" }]);
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { values: { a: true, b: false } } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    await prisma.quiz.update({ where: { id: s.quiz.id }, data: { examToken: "SECRET-TOKEN" } });
    const book = await getGradebook({}, { full: true, now: at(3) });
    const tables = buildGradeTables(book, "full");
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(["Rekap Nilai", "Ulangan", "Soal", "Percobaan", "Rincian Jawaban", "Rincian Elemen", "Analisis Butir"]));
    const answers = tables.find((t) => t.name === "Rincian Jawaban")!;
    expect(answers.rows.flat()).toContain("P1: Fakta; P2: Opini");
    expect(answers.rows.flat()).toContain('{"values":{"a":true,"b":false}}');
    expect(answers.rows.flat()).toContain(id);
    expect(tables.find((t) => t.name === "Analisis Butir")!.rows[0]).toEqual(expect.arrayContaining([s.quiz.id, s.qqs[0].id, 1, 100]));
    expect(JSON.stringify(tables)).not.toContain("SECRET-TOKEN");
  });

  it("long Unicode/quoted content roundtrips losslessly through continuation sheet in both formats", async () => {
    const s = await setup({}, [{ type: "ESSAY" }]);
    const id = await started(s);
    const text = '=Hai,"\n\u0001😀'.repeat(7000);
    // Import/history can contain text larger than the current answer editor allows.
    await prisma.attemptAnswer.create({ data: { attemptId: id, quizQuestionId: s.qqs[0].id, answer: { text } } });
    const book = await getGradebook({}, { full: true, now: at(1) });
    const tables = buildGradeTables(book, "full");
    const long = tables.find((t) => t.name === "Konten Panjang")!;
    expect(long.rows.length).toBeGreaterThan(1);
    const ref = long.rows[0][0];
    const chunks = long.rows.filter((r) => r[0] === ref);
    expect(chunks.map((r) => JSON.parse(String(r[6]))).join("")).toBe(text);
    expect(chunks.every((r) => String(r[6]).length <= 30000)).toBe(true);
    const file = await serializeGradebook(tables, "xlsx", book.capturedAt);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(file.data).buffer);
    expect(wb.getWorksheet("Konten Panjang")!.rowCount).toBe(long.rows.length + 1);
    const zipped = await serializeGradebook(tables, "csv", book.capturedAt);
    const zip = await JSZip.loadAsync(zipped.data);
    const csv = await zip.file("Konten Panjang.csv")!.async("string");
    const csvBook = new ExcelJS.Workbook();
    const parsed = await csvBook.csv.read(Readable.from([csv]), { map: (value) => value });
    const restored: string[] = [];
    parsed.eachRow((r, i) => { if (i > 1 && r.getCell(1).value === ref) restored.push(JSON.parse(String(r.getCell(7).value))); });
    expect(restored.join("")).toBe(text);
  });

  it("pending replacement never contributes old grades to evaluation, and export times retain milliseconds", async () => {
    const s = await setup({ maxAttempts: 2 });
    const first = await started(s);
    await saveAnswer(s.student.id, first, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, first, at(1234));
    const second = await started(s, at(2000));
    await prisma.quizAttempt.update({ where: { id: second }, data: { status: "SUBMITTED", replacementGrantedAt: at(2001) } });
    const book = await getGradebook({}, { full: true, now: at(2002) });
    const tables = buildGradeTables(book, "full");
    expect(tables.find((t) => t.name === "Rincian Elemen")!.rows).toHaveLength(0);
    expect(tables.find((t) => t.name === "Analisis Butir")!.rows).toHaveLength(0);
    expect(JSON.stringify(tables.find((t) => t.name === "Percobaan")!.rows)).toContain("2030-01-01T00:00:01.234Z");
  });

  it("rejects oversized output before serializing instead of truncating rows", async () => {
    await expect(serializeGradebook([{ name: "Test", headers: ["ID"], rows: Array.from({ length: 100_000 }, () => ["x"]) }], "xlsx", new Date())).rejects.toMatchObject({ status: 422 });
  });

  it("exports six question types and alternative text for question and explanation images", async () => {
    const s = await setup({}, [{}, { type: "MULTIPLE_SELECT" }, { type: "CATEGORY" }, { type: "ESSAY" }], false);
    const tf = await makeQuestion(s.chapter.id, s.teacher.id, { type: "TRUE_FALSE", options: Prisma.DbNull, answerKey: { value: true }, status: "ACTIVE" });
    const short = await makeQuestion(s.chapter.id, s.teacher.id, { type: "SHORT_ANSWER", options: Prisma.DbNull, answerKey: { accepted: ["Lombok"], caseSensitive: false }, status: "ACTIVE" });
    const tfq = await makeQuizQuestion(s.quiz.id, tf.id, { position: 5 });
    const shortq = await makeQuizQuestion(s.quiz.id, short.id, { position: 6 });
    const img = await makeImage(null, s.teacher.id, { questionId: s.qqs[0].questionId, altText: "Segitiga" });
    const explanation = await makeImage(null, s.teacher.id, { questionId: s.qqs[0].questionId, altText: "Penjelasan segitiga" });
    await prisma.question.update({ where: { id: s.qqs[0].questionId }, data: { prompt: `![soal](aksara-image:${img.id})`, explanation: `![bahas](aksara-image:${explanation.id})` } });
    expect(await publishQuiz(s.teacher.id, s.quiz.id, t0)).toEqual({ ok: true });
    const id = await started(s);
    const answers = [
      [s.qqs[0].id, { optionId: "a" }], [s.qqs[1].id, { optionIds: ["a", "b"] }],
      [s.qqs[2].id, { values: { a: true, b: false } }], [s.qqs[3].id, { text: "Uraian" }],
      [tfq.id, { value: true }], [shortq.id, { text: "Lombok" }],
    ] as const;
    for (const [quizQuestionId, answer] of answers) expect((await saveAnswer(s.student.id, id, { quizQuestionId, answer }, at(1))).ok).toBe(true);
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    const tables = buildGradeTables(await getGradebook({}, { full: true, now: at(3) }), "full");
    const qs = tables.find((t) => t.name === "Soal")!;
    expect(qs.rows.map((r) => r[4])).toEqual(["SINGLE_CHOICE", "MULTIPLE_SELECT", "CATEGORY", "ESSAY", "TRUE_FALSE", "SHORT_ANSWER"]);
    expect(qs.rows[0]).toContain("[gambar: Segitiga]");
    expect(qs.rows[0]).toContain("[gambar: Penjelasan segitiga]");
    const detail = tables.find((t) => t.name === "Rincian Jawaban")!;
    expect(detail.rows.map((r) => r[7])).toEqual(["Satu", "A; B", "P1: Fakta; P2: Opini", "Uraian", "Benar", "Lombok"]);
  });

  it("preflight counts only cells above 30000 UTF-16 units and preserves whitespace within JSON", async () => {
    const s = await setup({}, [{ type: "ESSAY" }]);
    const id = await started(s);
    const answer = await prisma.attemptAnswer.create({ data: { attemptId: id, quizQuestionId: s.qqs[0].id, answer: { text: "a" } } });
    for (const text of ["a ".repeat(15000), "😀".repeat(15000), "\u0001".repeat(5000)]) {
      await prisma.attemptAnswer.update({ where: { id: answer.id }, data: { answer: { text } } });
      // Readable text <=30000 units; JSON text adds the object wrapper (or escapes), needing seven 4500-unit chunks.
      expect(await prisma.$transaction((tx) => countGradeFragments(tx, [s.quiz.id], [s.student.id]))).toBe(7);
    }
  });
});
