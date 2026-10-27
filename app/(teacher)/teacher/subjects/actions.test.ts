import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import {
  makeChapter,
  makeClass,
  makeMaterial,
  makeStudent,
  makeSubchapter,
  makeTeacher,
} from "../../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  expectRedirect,
  resetNextMocks,
} from "../../../../tests/next-mocks";
import {
  deleteChapterAction,
  deleteSubchapterAction,
  deleteSubjectAction,
  moveChapterAction,
  moveSubchapterAction,
  saveChapterAction,
  saveSubchapterAction,
  saveSubjectAction,
} from "./actions";

vi.mock("next/headers", () =>
  import("../../../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  resetNextMocks();
  vi.mocked(revalidatePath).mockClear();
});

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}

// Subject, chapter and subchapter rows, to prove a rejected action changed nothing.
const snapshot = () =>
  Promise.all([
    prisma.subject.findMany({ orderBy: { id: "asc" } }),
    prisma.chapter.findMany({ orderBy: { id: "asc" } }),
    prisma.subchapter.findMany({ orderBy: { id: "asc" } }),
  ]);

type Ids = { subjectId: string; chapterId: string; subchapterId: string };

const calls: [string, (f: Ids) => Promise<unknown>][] = [
  [
    "saveSubjectAction",
    (f) => saveSubjectAction(f.subjectId, undefined, form({ name: "Mapel baru" })),
  ],
  ["deleteSubjectAction", (f) => deleteSubjectAction(f.subjectId)],
  [
    "saveChapterAction",
    (f) =>
      saveChapterAction(
        f.subjectId,
        null,
        undefined,
        form({ title: "Bab baru", sourceBook: "Buku Uji", sourceYearOrEdition: "2022" }),
      ),
  ],
  ["moveChapterAction", (f) => moveChapterAction(f.chapterId, "down")],
  ["deleteChapterAction", (f) => deleteChapterAction(f.chapterId)],
  [
    "saveSubchapterAction",
    (f) => saveSubchapterAction(f.chapterId, null, undefined, form({ title: "Subbab baru" })),
  ],
  ["moveSubchapterAction", (f) => moveSubchapterAction(f.subchapterId, "down")],
  ["deleteSubchapterAction", (f) => deleteSubchapterAction(f.subchapterId)],
];

async function fixtures(): Promise<Ids> {
  const chapter = await makeChapter();
  const sub = await makeSubchapter(chapter.id);
  return { subjectId: chapter.subjectId, chapterId: chapter.id, subchapterId: sub.id };
}

describe.each(calls)("%s authz", (_name, call) => {
  it("is forbidden for a student session and changes nothing", async () => {
    const ids = await fixtures();
    const cls = await makeClass();
    await signIn(await makeStudent(cls.id));
    const before = await snapshot();
    await expectForbidden(call(ids));
    expect(await snapshot()).toEqual(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("redirects to the teacher login without a session", async () => {
    const ids = await fixtures();
    await expectRedirect(call(ids), "/teacher/login");
  });
});

describe("subject actions", () => {
  it("saves a subject and revalidates the page", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    expect(await saveSubjectAction(null, undefined, form({ name: "IPAS" }))).toEqual({
      message: "Mapel disimpan.",
      ok: true,
    });
    expect(await prisma.subject.count({ where: { name: "IPAS" } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/teacher/subjects");
  });

  it("maps NAME_TAKEN and echoes the submitted name", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ids = await fixtures();
    await prisma.subject.create({ data: { name: "Matematika" } });
    expect(
      await saveSubjectAction(ids.subjectId, undefined, form({ name: "Matematika" })),
    ).toEqual({
      message: "Nama mapel ini sudah dipakai.",
      values: { name: "Matematika", description: "" },
    });
  });
});

describe("chapter actions", () => {
  it("deleteChapterAction on a chapter with materials returns the in-use message", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const chapter = await makeChapter();
    await makeMaterial(chapter.id, user.id);
    expect(await deleteChapterAction(chapter.id)).toEqual({
      message: "Bab ini masih dipakai 1 materi dan 0 subbab.",
    });
    expect(await prisma.chapter.count({ where: { id: chapter.id } })).toBe(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
