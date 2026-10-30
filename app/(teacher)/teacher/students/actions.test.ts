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
  createStudentAction,
  revokeStudentSessionsAction,
  setStudentActiveAction,
  updateStudentAction,
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
  [
    "createStudentAction",
    (id) => createStudentAction(undefined, form({ displayName: "Baru", classId: id })),
  ],
  [
    "updateStudentAction",
    (id) => updateStudentAction(id, undefined, form({ displayName: "Baru", classId: id })),
  ],
  ["revokeStudentSessionsAction", (id) => revokeStudentSessionsAction(id)],
  ["setStudentActiveAction", (id) => setStudentActiveAction(id, false)],
];

describe.each(calls)("%s authz", (_name, call) => {
  it("is forbidden for a student session and changes nothing", async () => {
    const cls = await makeClass();
    const s = await makeStudent(cls.id);
    await signIn(s);
    await expectForbidden(call(cls.id));
    expect(await prisma.user.count({ where: { role: "STUDENT" } })).toBe(1);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({
      displayName: s.displayName,
      isActive: true,
    });
  });

  it("redirects to the teacher login without a session", async () => {
    await expectRedirect(call("x"), "/teacher/login");
  });
});

describe("student actions", () => {
  it("creates a student and revalidates", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const cls = await makeClass();
    const state = await createStudentAction(
      undefined,
      form({ displayName: "Ahmad", nis: "1234", classId: cls.id }),
    );
    expect(state).toEqual({ message: "Siswa ditambahkan.", ok: true });
    expect(await prisma.user.count({ where: { displayName: "Ahmad" } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/teacher/students");
  });

  it("maps NAME_TAKEN with the class name and echoes the submitted values", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const cls = await makeClass({ name: "VI-A" });
    await makeStudent(cls.id, { displayName: "Ahmad", loginName: "ahmad" });
    const values = { displayName: "Ahmad", nis: "123456", studentNo: "", classId: cls.id };
    expect(await createStudentAction(undefined, form(values))).toEqual({
      message:
        "Nama ini sudah dipakai siswa lain di kelas VI-A. Tambahkan inisial, misalnya 'Ahmad R'.",
      values,
    });
  });

  it("maps NIS_TAKEN", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const cls = await makeClass();
    await makeStudent(cls.id, { nis: "5555" });
    expect(
      await createStudentAction(
        undefined,
        form({ displayName: "Lain", nis: "5555", classId: cls.id }),
      ),
    ).toEqual({
      message: "NIS ini sudah dipakai siswa lain.",
      values: { displayName: "Lain", nis: "5555", studentNo: "", classId: cls.id },
    });
  });

  it("returns field errors and maps NOT_FOUND", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const cls = await makeClass();
    const bad = await createStudentAction(undefined, form({ displayName: " ", classId: cls.id }));
    expect(bad?.fieldErrors?.displayName).toBeTruthy();
    expect(await revokeStudentSessionsAction("hilang")).toEqual({
      message: "Siswa tidak ditemukan.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deactivates a student", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const s = await makeStudent((await makeClass()).id);
    expect((await setStudentActiveAction(s.id, false))?.ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: s.id } })).isActive).toBe(false);
  });
});
