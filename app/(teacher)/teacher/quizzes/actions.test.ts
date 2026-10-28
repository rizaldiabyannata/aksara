import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import {
  makeChapter, makeClass, makeQuestion, makeQuiz, makeQuizQuestion, makeStudent, makeTeacher,
} from "../../../../tests/factories";
import { cookieJar, expectForbidden, expectRedirect, resetNextMocks } from "../../../../tests/next-mocks";
import { deleteQuestionAction } from "../questions/actions";
import {
  addQuizQuestionAction, createQuizAction, moveQuizQuestionAction, publishQuizAction,
  removeQuizQuestionAction, setQuizClassesAction, setQuizQuestionPointsAction, unpublishQuizAction,
  updateQuizAction,
} from "./actions";

vi.mock("next/headers", () => import("../../../../tests/next-mocks").then((m) => m.nextHeadersMock()));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => import("../../../../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(resetNextMocks);

const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
};
async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}
const settings = {
  title: "Ulangan Bab 1", instructions: "", durationMinutes: "30", startsAt: "", endsAt: "",
  maxAttempts: "1", scoringPolicy: "HIGHEST", kkm: "",
  shuffleQuestions: "", shuffleOptions: "", showFeedbackAfterRelease: "",
};

async function world() {
  const { user } = await makeTeacher();
  const ch = await makeChapter();
  const quiz = await makeQuiz(ch.subjectId, user.id);
  const q = await makeQuestion(ch.id, user.id, { status: "ACTIVE" });
  const qq = await makeQuizQuestion(quiz.id, q.id);
  return { user, ch, quiz, q, qq };
}

const calls: [string, (w: Awaited<ReturnType<typeof world>>) => Promise<unknown>][] = [
  ["createQuizAction", (w) => createQuizAction(undefined, form({ title: "X", subjectId: w.ch.subjectId }))],
  ["updateQuizAction", (w) => updateQuizAction(w.quiz.id, undefined, form(settings))],
  ["setQuizClassesAction", (w) => setQuizClassesAction(w.quiz.id, undefined, form({ classId: [] }))],
  ["addQuizQuestionAction", (w) => addQuizQuestionAction(w.quiz.id, w.q.id)],
  ["removeQuizQuestionAction", (w) => removeQuizQuestionAction(w.quiz.id, w.qq.id)],
  ["moveQuizQuestionAction", (w) => moveQuizQuestionAction(w.quiz.id, w.qq.id, "up")],
  ["setQuizQuestionPointsAction", (w) => setQuizQuestionPointsAction(w.quiz.id, w.qq.id, undefined, form({ points: "5" }))],
  ["publishQuizAction", (w) => publishQuizAction(w.quiz.id)],
  ["unpublishQuizAction", (w) => unpublishQuizAction(w.quiz.id)],
];

describe.each(calls)("%s authz", (_n, call) => {
  it("is forbidden for a student and changes nothing", async () => {
    const w = await world();
    await signIn(await makeStudent((await makeClass()).id));
    await expectForbidden(call(w));
    expect(await prisma.quiz.count()).toBe(1);
    expect(await prisma.quiz.findUniqueOrThrow({ where: { id: w.quiz.id } })).toMatchObject({ status: "DRAFT", title: w.quiz.title });
    expect(await prisma.quizQuestion.count()).toBe(1);
  });
  it("redirects to login without a session", async () => {
    const w = await world();
    await expectRedirect(call(w), "/teacher/login");
    expect(await prisma.quiz.count()).toBe(1);
  });
});

describe("quiz actions", () => {
  it("createQuizAction with only title+subject redirects to the new quiz", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ch = await makeChapter();
    const err = await createQuizAction(undefined, form({ title: "Baru", subjectId: ch.subjectId })).then(
      () => expect.fail("expected redirect"),
      (e: { digest?: string }) => e,
    );
    const row = await prisma.quiz.findFirstOrThrow();
    expect(err.digest?.split(";")[2]).toBe(`/teacher/quizzes/${row.id}`);
    expect(row).toMatchObject({ instructions: null, startsAt: null, endsAt: null, kkm: null });
  });

  it("createQuizAction echoes values on error", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const state = await createQuizAction(undefined, form({ title: "", subjectId: "" }));
    expect(state?.fieldErrors?.title).toBeTruthy();
    expect(state?.fieldErrors?.subjectId).toBeTruthy();
    expect(await prisma.quiz.count()).toBe(0);
  });

  it.each(["instructions", "startsAt", "endsAt", "kkm", "shuffleQuestions", "shuffleOptions", "showFeedbackAfterRelease"])(
    "updateQuizAction accepts empty %s and stores null/false",
    async (name) => {
      const { user, quiz } = await world();
      await signIn(user);
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: {
          instructions: "x", startsAt: new Date("2030-01-01T00:00:00Z"), endsAt: new Date("2030-01-02T00:00:00Z"),
          kkm: 70, shuffleQuestions: true, shuffleOptions: true, showFeedbackAfterRelease: true,
        },
      });
      const full = {
        ...settings, instructions: "x", startsAt: "2030-01-01T08:00", endsAt: "2030-01-02T08:00", kkm: "70",
        shuffleQuestions: "on", shuffleOptions: "on", showFeedbackAfterRelease: "on",
      };
      const state = await updateQuizAction(quiz.id, undefined, form({ ...full, [name]: "" }));
      expect(state).toMatchObject({ ok: true, message: "Ulangan disimpan." });
      const row = await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } });
      expect(row[name as "kkm"]).toBe(["kkm", "instructions", "startsAt", "endsAt"].includes(name) ? null : false);
    },
  );

  it("updateQuizAction echoes values including checkboxes on error", async () => {
    const { user, quiz } = await world();
    await signIn(user);
    const state = await updateQuizAction(quiz.id, undefined, form({ ...settings, title: "", shuffleQuestions: "on" }));
    expect(state?.fieldErrors?.title).toBeTruthy();
    expect(state?.values).toMatchObject({ shuffleQuestions: "on", shuffleOptions: "", durationMinutes: "30" });
  });

  it("setQuizClassesAction ignores forged non-string entries", async () => {
    const { user, quiz } = await world();
    await signIn(user);
    const c = await makeClass();
    const fd = form({ classId: [c.id] });
    fd.append("classId", new File(["x"], "x.txt"));
    expect(await setQuizClassesAction(quiz.id, undefined, fd)).toMatchObject({ ok: true, message: "Kelas disimpan." });
    expect(await prisma.quizClass.count()).toBe(1);
    expect((await setQuizClassesAction(quiz.id, undefined, form({})))?.message).toBe("Pilih minimal satu kelas.");
  });

  it("publishQuizAction lists every reason", async () => {
    const { user, quiz, q } = await world();
    await signIn(user);
    await prisma.question.update({ where: { id: q.id }, data: { status: "DRAFT" } });
    const state = await publishQuizAction(quiz.id);
    expect(state?.ok).toBeFalsy();
    expect(state?.message).toContain("Soal nomor 1 masih draf. Aktifkan dulu di bank soal.");
    expect(state?.message).toContain("Pilih minimal satu kelas aktif.");
  });

  it("publishes then refuses unpublish once attempted", async () => {
    const { user, quiz } = await world();
    await signIn(user);
    const c = await makeClass();
    await prisma.quizClass.create({ data: { quizId: quiz.id, classId: c.id } });
    await prisma.question.updateMany({ data: { status: "ACTIVE" } });
    expect(await publishQuizAction(quiz.id)).toMatchObject({ ok: true, message: "Ulangan diterbitkan." });
    const { makeAttempt } = await import("../../../../tests/factories");
    await makeAttempt(quiz.id, (await makeStudent(c.id)).id);
    expect((await unpublishQuizAction(quiz.id))?.message).toBe(
      "Ulangan ini sudah dikerjakan siswa, jadi tidak bisa dikembalikan ke draf.",
    );
  });

  it("moveQuizQuestionAction ignores a forged direction", async () => {
    const { user, quiz, ch, qq } = await world();
    await signIn(user);
    const q2 = await makeQuestion(ch.id, user.id, { status: "ACTIVE" });
    const qq2 = await makeQuizQuestion(quiz.id, q2.id);
    const before = await prisma.quizQuestion.findMany({ orderBy: { position: "asc" }, select: { id: true } });
    await expect(moveQuizQuestionAction(quiz.id, qq2.id, "sideways" as "up")).resolves.not.toThrow();
    expect(await prisma.quizQuestion.findMany({ orderBy: { position: "asc" }, select: { id: true } })).toEqual(before);
    expect(before[0].id).toBe(qq.id);
  });

  it("deleting a bank question used by a quiz gives the IN_USE message", async () => {
    const { user, q } = await world();
    await signIn(user);
    await prisma.question.update({ where: { id: q.id }, data: { status: "DRAFT" } });
    const state = await deleteQuestionAction(q.id);
    expect(state?.message).toBe("Soal ini dipakai di ulangan. Keluarkan dari ulangan draf dulu.");
  });
});
