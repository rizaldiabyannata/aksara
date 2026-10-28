import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { publishQuiz } from "@/lib/quizzes";
import { GRACE_MS, getAttemptView, startAttempt } from "@/lib/attempts";
import { makeChapter, makeClass, makeQuestion, makeQuiz, makeQuizQuestion, makeStudent, makeTeacher } from "../../../tests/factories";
import { cookieJar, expectForbidden, expectRedirect, resetNextMocks } from "../../../tests/next-mocks";
import { POST as start } from "../quizzes/[quizId]/start/route";
import { POST as submit } from "../quizzes/[quizId]/submit/route";
import { GET as view } from "./[attemptId]/route";
import { PUT as save } from "./[attemptId]/answers/route";

vi.mock("next/headers", () => import("../../../tests/next-mocks").then((m) => m.nextHeadersMock()));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => import("../../../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(() => resetNextMocks());

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}

async function setup() {
  const { user: teacher } = await makeTeacher();
  const chapter = await makeChapter();
  const cls = await makeClass();
  const quiz = await makeQuiz(chapter.subjectId, teacher.id, { durationMinutes: 30 });
  await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
  const q = await makeQuestion(chapter.id, teacher.id, {
    status: "ACTIVE", type: "SHORT_ANSWER", options: undefined, answerKey: { accepted: ["KUNCI-UNIK-XYZ"], caseSensitive: false },
    explanation: "PEMBAHASAN-RAHASIA",
  } as never);
  const qq = await makeQuizQuestion(quiz.id, q.id, { position: 1, points: 7 });
  const student = await makeStudent(cls.id);
  expect(await publishQuiz(teacher.id, quiz.id)).toEqual({ ok: true });
  return { teacher, cls, quiz, q, qq, student };
}
type S = Awaited<ReturnType<typeof setup>>;

const O = "http://localhost";
const req = (method: string, body?: unknown, origin: string | null = O) =>
  new Request(`${O}/api/x`, {
    method,
    headers: { ...(origin ? { origin } : {}), "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const qp = (quizId: string) => ({ params: Promise.resolve({ quizId }) });
const ap = (attemptId: string) => ({ params: Promise.resolve({ attemptId }) });
const startVia = async (s: S) => ((await (await start(req("POST"), qp(s.quiz.id))).json()) as { attemptId: string }).attemptId;

describe("authz and origin", () => {
  it("teacher session is 403 on every route", async () => {
    const s = await setup();
    await signIn(s.teacher);
    await expectForbidden(start(req("POST"), qp(s.quiz.id)));
    await expectForbidden(submit(req("POST", { attemptId: "x" }), qp(s.quiz.id)));
    await expectForbidden(view(req("GET", undefined, null), ap("x")));
    await expectForbidden(save(req("PUT", {}), ap("x")));
  });

  it("no session redirects to /login", async () => {
    await expectRedirect(start(req("POST"), qp("x")), "/login");
    await expectRedirect(submit(req("POST", { attemptId: "x" }), qp("x")), "/login");
    await expectRedirect(view(req("GET", undefined, null), ap("x")), "/login");
    await expectRedirect(save(req("PUT", {}), ap("x")), "/login");
  });

  it("foreign Origin is 403 and writes nothing", async () => {
    const s = await setup();
    await signIn(s.student);
    const evil = "https://evil.test";
    expect((await start(req("POST", undefined, evil), qp(s.quiz.id))).status).toBe(403);
    expect(await prisma.quizAttempt.count()).toBe(0);
    const id = await startVia(s);
    expect((await save(req("PUT", { quizQuestionId: s.qq.id, answer: { text: "a" } }, evil), ap(id))).status).toBe(403);
    expect((await submit(req("POST", { attemptId: id }, evil), qp(s.quiz.id))).status).toBe(403);
    expect(await prisma.attemptAnswer.count()).toBe(0);
    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id } })).status).toBe("IN_PROGRESS");
  });
});

describe("student flow", () => {
  it("start twice returns the same attempt; unknown quiz is 404", async () => {
    const s = await setup();
    await signIn(s.student);
    expect(await startVia(s)).toBe(await startVia(s));
    const res = await start(req("POST"), qp("nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ ok: false, error: "NOT_FOUND", message: "Ulangan tidak ditemukan." });
  });

  it("bad bodies are 400 / 404", async () => {
    const s = await setup();
    await signIn(s.student);
    const id = await startVia(s);
    for (const b of ["not json", "null", "[1]", "5"]) {
      const res = await save(req("PUT", b), ap(id));
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Jawaban tidak valid.");
    }
    expect((await save(req("PUT", { quizQuestionId: s.qq.id, answer: { text: "x".repeat(201) } }), ap(id))).status).toBe(400);
    expect((await submit(req("POST", "not json"), qp(s.quiz.id))).status).toBe(404);
  });

  it("PUT within grace is 200", async () => {
    const s = await setup();
    await signIn(s.student);
    const past = new Date(Date.now() - 30 * 60_000 - 30_000); // deadline passed 30s ago
    const r = await startAttempt({ id: s.student.id, classId: s.cls.id }, s.quiz.id, past);
    if (!r.ok) throw new Error("start");
    const ok = await save(req("PUT", { quizQuestionId: s.qq.id, answer: { text: "abc" } }), ap(r.attemptId));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, savedAt: expect.any(String) });

  });

  it("past grace: 409 DEADLINE_PASSED with baku message", async () => {
    const s = await setup();
    await signIn(s.student);
    const old = new Date(Date.now() - 30 * 60_000 - GRACE_MS - 1000);
    const r = await startAttempt({ id: s.student.id, classId: s.cls.id }, s.quiz.id, old);
    if (!r.ok) throw new Error("start");
    const res = await save(req("PUT", { quizQuestionId: s.qq.id, answer: { text: "abc" } }), ap(r.attemptId));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "DEADLINE_PASSED", message: "Waktu habis, jawabanmu sudah dikumpulkan." });
  });

  it("submit with another quiz's attemptId is 404; second start hits the limit with 409", async () => {
    const s = await setup();
    await signIn(s.student);
    const id = await startVia(s);
    const other = await makeQuiz((await prisma.quiz.findUniqueOrThrow({ where: { id: s.quiz.id } })).subjectId, s.teacher.id);
    expect((await submit(req("POST", { attemptId: id }), qp(other.id))).status).toBe(404);
    const ok = await submit(req("POST", { attemptId: id }), qp(s.quiz.id));
    expect(await ok.json()).toEqual({ ok: true, reason: "MANUAL" });
    const again = await start(req("POST"), qp(s.quiz.id));
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("ATTEMPT_LIMIT");
    const closed = await save(req("PUT", { quizQuestionId: s.qq.id, answer: { text: "z" } }), ap(id));
    expect(closed.status).toBe(409);
    expect((await closed.json()).error).toBe("ATTEMPT_CLOSED");
  });

  it("another student's attempt is 404 on GET", async () => {
    const s = await setup();
    await signIn(s.student);
    const id = await startVia(s);
    await signIn(await makeStudent(s.cls.id));
    expect((await view(req("GET", undefined, null), ap(id))).status).toBe(404);
  });

  it("no leak, and every response is no-store", async () => {
    const s = await setup();
    await signIn(s.student);
    const res = [
      await start(req("POST"), qp(s.quiz.id)),
    ];
    const id = ((await res[0].clone().json()) as { attemptId: string }).attemptId;
    res.push(await view(req("GET", undefined, null), ap(id)));
    res.push(await save(req("PUT", { quizQuestionId: s.qq.id, answer: { text: "KUNCI-UNIK-XYZ" } }), ap(id)));
    res.push(await view(req("GET", undefined, null), ap(id)));
    res.push(await submit(req("POST", { attemptId: id }), qp(s.quiz.id)));
    res.push(await view(req("GET", undefined, null), ap(id)));
    const bodies: string[] = [];
    for (const r of res) {
      expect(r.status).toBe(200);
      expect(r.headers.get("cache-control")).toBe("no-store");
      bodies.push(JSON.stringify(await r.json()));
    }
    // The student's own typed answer is echoed by design (GET after save); the key text must not leak otherwise.
    const all = bodies.join("\n").replaceAll('"text":"KUNCI-UNIK-XYZ"', "");
    const code = (await prisma.class.findUniqueOrThrow({ where: { id: s.cls.id }, select: { code: true } })).code;
    for (const bad of ["KUNCI-UNIK-XYZ", "PEMBAHASAN-RAHASIA", '"points"', '"maxPoints"', s.q.id, code, "storageKey"]) {
      expect(all).not.toContain(bad);
    }
    expect(await getAttemptView(s.student.id, { attemptId: id })).toMatchObject({ status: "SUBMITTED" });
  });
});
