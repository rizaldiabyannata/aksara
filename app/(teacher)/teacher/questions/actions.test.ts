import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { getQuestionForTeacher } from "@/lib/questions";
import { makeChapter, makeClass, makeQuestion, makeStudent, makeTeacher } from "../../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  expectRedirect,
  resetNextMocks,
} from "../../../../tests/next-mocks";
import { objects } from "../../../../tests/storage-fake";
import {
  createQuestionAction,
  deleteQuestionAction,
  duplicateQuestionAction,
  setQuestionStatusAction,
  updateQuestionAction,
} from "./actions";

vi.mock("next/headers", () =>
  import("../../../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => import("../../../../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(() => {
  resetNextMocks();
  objects.clear();
});

const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  }
  return fd;
};

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}

const valid = (chapterId: string) => ({
  chapterId,
  subchapterId: "",
  prompt: "Berapa 1 + 1?",
  option_a: "Satu",
  option_b: "Dua",
  correct: "b",
  explanation: "",
  defaultPoints: "2",
  difficulty: "EASY",
  sourceReference: "",
  verificationNote: "",
});

const calls: [string, (id: string, chapterId: string) => Promise<unknown>][] = [
  ["createQuestionAction", (_id, c) => createQuestionAction("SINGLE_CHOICE", undefined, form(valid(c)))],
  ["updateQuestionAction", (id, c) => updateQuestionAction(id, undefined, form(valid(c)))],
  ["setQuestionStatusAction", (id) => setQuestionStatusAction(id, "ACTIVE")],
  ["duplicateQuestionAction", (id) => duplicateQuestionAction(id)],
  ["deleteQuestionAction", (id) => deleteQuestionAction(id)],
];

describe.each(calls)("%s authz", (_name, call) => {
  it("is forbidden for a student session and changes nothing", async () => {
    const { user } = await makeTeacher();
    const ch = await makeChapter();
    const q = await makeQuestion(ch.id, user.id);
    await signIn(await makeStudent((await makeClass()).id));
    await expectForbidden(call(q.id, ch.id));
    expect(await prisma.question.count()).toBe(1);
    expect(await prisma.question.findUniqueOrThrow({ where: { id: q.id } })).toMatchObject({
      prompt: q.prompt,
      status: "DRAFT",
    });
  });

  it("redirects to login without a session", async () => {
    const { user } = await makeTeacher();
    const ch = await makeChapter();
    const q = await makeQuestion(ch.id, user.id);
    await expectRedirect(call(q.id, ch.id), "/teacher/login");
    expect(await prisma.question.count()).toBe(1);
  });
});

describe("question actions", () => {
  it("createQuestionAction keeps values on error", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ch = await makeChapter();
    const state = await createQuestionAction(
      "MULTIPLE_SELECT",
      undefined,
      form({ ...valid(ch.id), prompt: "", option_c: "Tiga", correct: ["a", "c"], defaultPoints: "x" }),
    );
    expect(state?.fieldErrors?.prompt).toBeTruthy();
    expect(state?.fieldErrors?.defaultPoints).toBeTruthy();
    expect(state?.values).toMatchObject({
      chapterId: ch.id,
      option_a: "Satu",
      option_c: "Tiga",
      correct: "a,c",
      defaultPoints: "x",
    });
    expect(await prisma.question.count()).toBe(0);
  });

  it("fromForm drops blank slots and maps MULTIPLE_SELECT correct", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ch = await makeChapter();
    const err = await createQuestionAction(
      "MULTIPLE_SELECT",
      undefined,
      form({ ...valid(ch.id), option_b: "  ", option_c: "Tiga", option_d: "Empat", correct: ["a", "d"] }),
    ).then(
      () => expect.fail("expected redirect"),
      (e: { digest?: string }) => e,
    );
    const row = await prisma.question.findFirstOrThrow();
    expect(err.digest?.split(";")[2]).toBe(`/teacher/questions/${row.id}`);
    const q = await getQuestionForTeacher(row.id);
    expect(q).toMatchObject({
      type: "MULTIPLE_SELECT",
      defaultPoints: 2,
      options: [
        { id: "a", text: "Satu" },
        { id: "c", text: "Tiga" },
        { id: "d", text: "Empat" },
      ],
      answerKey: { optionIds: ["a", "d"] },
    });
  });

  it("maps SHORT_ANSWER lines and caseSensitive", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ch = await makeChapter();
    await createQuestionAction(
      "SHORT_ANSWER",
      undefined,
      form({ ...valid(ch.id), accepted: "Jakarta\n\n  jkt \n", caseSensitive: "on" }),
    ).catch(() => {});
    const q = await getQuestionForTeacher((await prisma.question.findFirstOrThrow()).id);
    expect(q?.answerKey).toEqual({ accepted: ["Jakarta", "jkt"], caseSensitive: true });
  });

  it("deleteQuestionAction on ACTIVE returns the draft-first message", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const q = await makeQuestion((await makeChapter()).id, user.id, { status: "ACTIVE" });
    const state = await deleteQuestionAction(q.id);
    expect(state?.message).toBe("Jadikan soal draft dulu sebelum menghapusnya.");
    expect(await prisma.question.count()).toBe(1);
  });
});
