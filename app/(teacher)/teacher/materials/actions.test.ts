import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeChapter, makeClass, makeImage, makeMaterial, makeStudent, makeTeacher } from "../../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  resetNextMocks,
} from "../../../../tests/next-mocks";
import { objects } from "../../../../tests/storage-fake";
import {
  changeMaterialStatusAction,
  createMaterialAction,
  deleteMaterialAction,
  moveMaterialAction,
  removeImageAction,
  updateImageMetaAction,
  updateMaterialAction,
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

const imageCalls: [string, (imageId: string) => Promise<unknown>][] = [
  ["updateImageMetaAction", (id) => updateImageMetaAction(id, undefined, form({ altText: "Baru" }))],
  ["removeImageAction", (id) => removeImageAction(id)],
];

describe.each(imageCalls)("%s authz", (_name, call) => {
  it("is forbidden for a student session and changes nothing", async () => {
    const { user } = await makeTeacher();
    const m = await makeMaterial((await makeChapter()).id, user.id);
    const img = await makeImage(m.id, user.id);
    await signIn(await makeStudent((await makeClass()).id));
    await expectForbidden(call(img.id));
    expect(await prisma.image.findUniqueOrThrow({ where: { id: img.id } })).toMatchObject({
      altText: "Gambar uji",
    });
  });
});

describe("image actions", () => {
  it("updateImageMetaAction saves the metadata", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const m = await makeMaterial((await makeChapter()).id, user.id);
    const img = await makeImage(m.id, user.id);
    const state = await updateImageMetaAction(img.id, undefined, form({ altText: " Baru ", caption: "", sourceReference: "Buku" }));
    expect(state).toEqual({ message: "Gambar disimpan.", ok: true });
    expect(await prisma.image.findUniqueOrThrow({ where: { id: img.id } })).toMatchObject({
      altText: "Baru",
      caption: null,
      sourceReference: "Buku",
    });
  });

  it("updateImageMetaAction returns field errors and keeps values", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const m = await makeMaterial((await makeChapter()).id, user.id);
    const img = await makeImage(m.id, user.id);
    const state = await updateImageMetaAction(img.id, undefined, form({ altText: "", caption: "Ket" }));
    expect(state?.fieldErrors?.altText).toBeTruthy();
    expect(state?.values).toMatchObject({ caption: "Ket" });
    expect((await prisma.image.findUniqueOrThrow({ where: { id: img.id } })).altText).toBe("Gambar uji");
  });

  it("updateImageMetaAction reports a missing image", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const state = await updateImageMetaAction("tidak-ada", undefined, form({ altText: "Baru" }));
    expect(state?.message).toBe("Gambar tidak ditemukan. Muat ulang halaman.");
  });

  it("removeImageAction removes row and object", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const m = await makeMaterial((await makeChapter()).id, user.id);
    const img = await makeImage(m.id, user.id);
    objects.set(img.storageKey, { body: Buffer.from("x"), contentType: "image/jpeg" });
    const state = await removeImageAction(img.id);
    expect(state).toEqual({ message: "Gambar dihapus.", ok: true, values: undefined });
    expect(await prisma.image.count()).toBe(0);
    expect(objects.has(img.storageKey)).toBe(false);
  });

  it("removeImageAction reports a missing image", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const state = await removeImageAction("tidak-ada");
    expect(state?.message).toBe("Gambar tidak ditemukan. Muat ulang halaman.");
  });
});
