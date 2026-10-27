import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeClass, makeStudent, makeTeacher } from "../../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  expectRedirect,
  resetNextMocks,
} from "../../../../tests/next-mocks";
import {
  createClassAction,
  renameClassAction,
  revokeClassSessionsAction,
  rotateClassCodeAction,
  setClassActiveAction,
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

const calls: [string, (id: string) => Promise<unknown>][] = [
  ["createClassAction", () => createClassAction(undefined, form({ name: "VI-X" }))],
  ["renameClassAction", (id) => renameClassAction(id, undefined, form({ name: "VI-X" }))],
  ["rotateClassCodeAction", (id) => rotateClassCodeAction(id)],
  ["revokeClassSessionsAction", (id) => revokeClassSessionsAction(id)],
  ["setClassActiveAction", (id) => setClassActiveAction(id, false)],
];

describe.each(calls)("%s authz", (_name, call) => {
  it("is forbidden for a student session and changes nothing", async () => {
    const cls = await makeClass();
    await signIn(await makeStudent(cls.id));
    await expectForbidden(call(cls.id));
    expect(await prisma.class.count()).toBe(1);
    expect(await prisma.class.findUniqueOrThrow({ where: { id: cls.id } })).toMatchObject({
      name: cls.name,
      code: cls.code,
      isActive: true,
    });
  });

  it("redirects to the teacher login without a session", async () => {
    await expectRedirect(call("x"), "/teacher/login");
  });
});

describe("class actions", () => {

  it("creates a class and revalidates the list", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const state = await createClassAction(undefined, form({ name: "VI-A" }));
    expect(state).toEqual({ message: "Kelas dibuat.", ok: true });
    expect(await prisma.class.count({ where: { name: "VI-A" } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/teacher/classes");
  });

  it("returns field errors for an empty name", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const state = await createClassAction(undefined, form({ name: " " }));
    expect(state?.fieldErrors?.name).toBeTruthy();
    expect(state?.values).toEqual({ name: " " });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps NAME_TAKEN and echoes the submitted name", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    await makeClass({ name: "VI-A" });
    expect(await createClassAction(undefined, form({ name: "VI-A" }))).toEqual({
      message: "Nama kelas ini sudah dipakai.",
      values: { name: "VI-A" },
    });
  });

  it("maps NOT_FOUND for a missing class", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    expect(await renameClassAction("hilang", undefined, form({ name: "Baru" }))).toEqual({
      message: "Kelas tidak ditemukan.",
      values: { name: "Baru" },
    });
    expect(await rotateClassCodeAction("hilang")).toEqual({
      message: "Kelas tidak ditemukan.",
    });
  });

  it("rotates the code and deactivates", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const cls = await makeClass();
    expect((await rotateClassCodeAction(cls.id))?.message).toBe("Kode kelas sudah diganti.");
    expect((await prisma.class.findUniqueOrThrow({ where: { id: cls.id } })).code).not.toBe(cls.code);
    await setClassActiveAction(cls.id, false);
    expect((await prisma.class.findUniqueOrThrow({ where: { id: cls.id } })).isActive).toBe(false);
  });
});
