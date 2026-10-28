import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeChapter, makeClass, makeImage, makeMaterial, makeStudent, makeTeacher } from "../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  resetNextMocks,
} from "../../../tests/next-mocks";
import { objects } from "../../../tests/storage-fake";
import { removeImageAction, updateImageMetaAction } from "./image-actions";

vi.mock("next/headers", () =>
  import("../../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => import("../../../tests/storage-fake").then((m) => m.storageMock()));

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
