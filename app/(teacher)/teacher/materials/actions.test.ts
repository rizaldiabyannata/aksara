import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeChapter, makeClass, makeMaterial, makeStudent, makeTeacher } from "../../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  resetNextMocks,
} from "../../../../tests/next-mocks";
import {
  changeMaterialStatusAction,
  createMaterialAction,
  deleteMaterialAction,
  moveMaterialAction,
  updateMaterialAction,
} from "./actions";

vi.mock("next/headers", () =>
  import("../../../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => resetNextMocks());

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}

const valid = (chapterId: string) => ({
  title: "Judul",
  summary: "Ringkasan",
  content: "Isi",
  sourceReference: "Buku",
  chapterId,
});

const calls: [string, (id: string, chapterId: string) => Promise<unknown>][] = [
  ["createMaterialAction", (_id, c) => createMaterialAction(undefined, form(valid(c)))],
  ["updateMaterialAction", (id, c) => updateMaterialAction(id, undefined, form({ ...valid(c), title: "Baru" }))],
  ["changeMaterialStatusAction", (id) => changeMaterialStatusAction(id, "REVIEWED")],
  ["moveMaterialAction", (id) => moveMaterialAction(id, "up")],
  ["deleteMaterialAction", (id) => deleteMaterialAction(id)],
];

describe.each(calls)("%s authz", (_name, call) => {
  it("is forbidden for a student session and changes nothing", async () => {
    const { user } = await makeTeacher();
    const ch = await makeChapter();
    const m = await makeMaterial(ch.id, user.id);
    await signIn(await makeStudent((await makeClass()).id));
    await expectForbidden(call(m.id, ch.id));
    expect(await prisma.material.count()).toBe(1);
    expect(await prisma.material.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({
      title: m.title,
      status: "DRAFT",
      order: m.order,
    });
  });
});

describe("material actions", () => {
  it("changeMaterialStatusAction DRAFT→PUBLISHED returns the transition message", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const m = await makeMaterial((await makeChapter()).id, user.id);
    const state = await changeMaterialStatusAction(m.id, "PUBLISHED");
    expect(state).toEqual({
      message: "Status materi tidak bisa diubah ke sana. Tandai sudah ditinjau dulu.",
      values: undefined,
    });
    expect((await prisma.material.findUniqueOrThrow({ where: { id: m.id } })).status).toBe("DRAFT");
  });

  it("createMaterialAction keeps values on error", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ch = await makeChapter();
    const state = await createMaterialAction(undefined, form({ ...valid(ch.id), title: "", summary: "Ringkas" }));
    expect(state?.fieldErrors?.title).toBeTruthy();
    expect(state?.values).toMatchObject({ summary: "Ringkas", chapterId: ch.id });
    expect(await prisma.material.count()).toBe(0);
  });

  it("createMaterialAction redirects to the new material", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const ch = await makeChapter();
    const err = await createMaterialAction(undefined, form(valid(ch.id))).then(
      () => expect.fail("expected redirect"),
      (e: { digest?: string }) => e,
    );
    const m = await prisma.material.findFirstOrThrow();
    expect(err.digest?.split(";")[2]).toBe(`/teacher/materials/${m.id}`);
  });

  it("deleteMaterialAction refuses a non-draft with the message", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const m = await makeMaterial((await makeChapter()).id, user.id, { status: "REVIEWED" });
    const state = await deleteMaterialAction(m.id);
    expect(state?.message).toBe("Kembalikan materi ke draft dulu sebelum menghapusnya.");
  });
});
