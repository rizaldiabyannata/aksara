import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { gradeEssay, saveAnswer, submitAttempt } from "@/lib/attempts";
import { releaseResults } from "@/lib/results";
import { makeStudent } from "../../../tests/factories";
import { cookieJar, expectForbidden, expectRedirect, resetNextMocks } from "../../../tests/next-mocks";
import { at, setup, started } from "../../../tests/quiz-setup";
import { GET } from "./[quizId]/route";

vi.mock("next/headers", () => import("../../../tests/next-mocks").then((m) => m.nextHeadersMock()));
vi.mock("@/lib/storage", () => import("../../../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(resetNextMocks);

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}
const get = (quizId: string) => GET(new Request(`http://localhost/api/exports/${quizId}`), { params: Promise.resolve({ quizId }) });

async function download(teacherId: string, quizId: string) {
  await signIn({ id: teacherId, role: "TEACHER" });
  const res = await get(quizId);
  expect(res.status).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  const rows = (name: string) =>
    (wb.getWorksheet(name)?.getSheetValues() ?? []).filter(Boolean).map((r) => (r as unknown[]).slice(1));
  return { res, wb, rekap: rows("Rekap Nilai"), rincian: rows("Rincian Jawaban") };
}

const essayId = (attemptId: string) =>
  prisma.attemptAnswer.findFirstOrThrow({ where: { attemptId, objectivePoints: null }, select: { id: true } }).then((a) => a.id);

describe("GET /api/exports/[quizId]", () => {
  it("anonymous → teacher login; student → 403", async () => {
    const s = await setup();
    await expectRedirect(get(s.quiz.id), "/teacher/login");
    await signIn({ id: s.student.id, role: "STUDENT" });
    await expectForbidden(get(s.quiz.id));
  });

  it("two sheets, attachment, audit; formula text escaped; pending has no score; idle student listed", async () => {
    const s = await setup({ title: "Ulangan: Pecahan & Desimal" }, [{}, { type: "ESSAY" }]);
    await prisma.user.update({ where: { id: s.student.id }, data: { displayName: '=HYPERLINK("http://x")' } });
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    await makeStudent(s.cls.id, { displayName: "Zaki" });

    const { res, wb, rekap, rincian } = await download(s.teacher.id, s.quiz.id);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="Nilai_ulangan-pecahan-desimal_\d{4}-\d{2}-\d{2}\.xlsx"$/);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Rekap Nilai", "Rincian Jawaban"]);

    const [head, student, idle] = rekap;
    expect(head[13]).toBe("Nilai rekap (0–100)");
    expect(student[3]).toBe(`'=HYPERLINK("http://x")`);
    expect(student[13] ?? null).toBeNull();
    expect(student[15]).toBe("Belum final – 1 uraian belum dinilai");
    expect(idle).toMatchObject({ 3: "Zaki", 15: "Belum mulai" });

    expect(rincian.slice(1).map((r) => [r[5], r[8], r[9], r[11] ?? null, r[12]])).toEqual([
      [1, "Satu", "Satu", 1, "Otomatis"],
      [2, "(kosong)", "RUBRIK-RAHASIA", null, "Menunggu penilaian guru"],
    ]);
    expect(await prisma.auditLog.findFirst({ where: { action: "EXPORT_DOWNLOADED" } })).toMatchObject({
      actorUserId: s.teacher.id, metadata: { quizId: s.quiz.id, rowCount: 4 },
    });
  });

  it("REMEDIAL KKM 75, 60 then 90: recap 75, highest 90, Tuntas", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 75, maxAttempts: 2 }, [{ type: "ESSAY", points: 10 }]);
    for (const [points, t] of [["6", 0], ["9", 300]] as const) {
      const id = await started(s, at(t));
      await submitAttempt(s.student.id, s.quiz.id, id, at(t + 1));
      await gradeEssay(s.teacher.id, await essayId(id), { points }, at(t + 2));
      if (t === 0) await releaseResults(s.teacher.id, s.quiz.id, at(100));
    }
    const { rekap, rincian } = await download(s.teacher.id, s.quiz.id);
    expect(rekap[1].slice(6, 16)).toEqual([2, "Remedial", 75, 60, 90, 9, 10, 75, "Tuntas", "Final"]);
    expect(rincian.slice(1).map((r) => r[4])).toEqual(["1 (Utama)", "2 (Remedial 1)"]);
  });

  it("unknown quiz → 404", async () => {
    const s = await setup();
    await signIn({ id: s.teacher.id, role: "TEACHER" });
    expect((await get("nope")).status).toBe(404);
  });
});
