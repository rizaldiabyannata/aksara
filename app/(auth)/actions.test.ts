import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession, revokeSessions } from "@/lib/auth/session";
import { makeClass, makeStudent, makeTeacher } from "../../tests/factories";
import {
  cookieJar,
  cookieOptions,
  expectRedirect,
  headerJar,
  resetNextMocks,
} from "../../tests/next-mocks";
import { loginStudentAction, loginTeacherAction, logoutAction } from "./actions";

vi.mock("next/headers", () =>
  import("../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);

beforeEach(() => {
  resetNextMocks();
  headerJar.set("x-forwarded-for", "203.0.113.7");
});

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("loginStudentAction", () => {
  it("sets the session cookie and redirects to /student", async () => {
    const cls = await makeClass();
    await makeStudent(cls.id, { loginName: "budi santoso", displayName: "Budi Santoso" });
    await expectRedirect(
      loginStudentAction(undefined, form({ classCode: cls.code.toLowerCase(), identity: "Budi  Santoso" })),
      "/student",
    );
    expect(cookieJar.get("aksara_session")).toBeTruthy();
    expect(cookieOptions.get("aksara_session")).toMatchObject({ httpOnly: true, path: "/" });
  });

  it("returns the mismatch message without a cookie", async () => {
    const cls = await makeClass();
    expect(
      await loginStudentAction(undefined, form({ classCode: cls.code, identity: "tidak ada" })),
    ).toEqual({ message: "Kode kelas atau nama/NIS tidak cocok." });
    expect(cookieJar.has("aksara_session")).toBe(false);
  });

  it("treats missing fields as empty instead of throwing", async () => {
    expect(await loginStudentAction(undefined, new FormData())).toEqual({
      message: "Kode kelas atau nama/NIS tidak cocok.",
    });
  });

  it("returns the throttle message after 10 tries", async () => {
    const cls = await makeClass();
    const fd = form({ classCode: cls.code, identity: "salah" });
    for (let i = 0; i < 10; i++) await loginStudentAction(undefined, fd);
    expect(await loginStudentAction(undefined, fd)).toEqual({
      message: "Terlalu banyak percobaan. Tunggu 15 menit, lalu coba lagi.",
    });
  });

  it("returns a generic message when the domain call throws", async () => {
    const spy = vi.spyOn(prisma.user, "findFirst").mockRejectedValueOnce(new Error("db down"));
    const cls = await makeClass();
    expect(
      await loginStudentAction(undefined, form({ classCode: cls.code, identity: "budi" })),
    ).toEqual({ message: "Ada masalah. Coba lagi sebentar lagi." });
    spy.mockRestore();
  });
});

describe("loginTeacherAction", () => {
  it("sends a teacher who must change the password to /teacher/password", async () => {
    const { user, password } = await makeTeacher({ mustChangePassword: true });
    await expectRedirect(
      loginTeacherAction(undefined, form({ username: user.username!, password })),
      "/teacher/password",
    );
    expect(cookieJar.get("aksara_session")).toBeTruthy();
  });

  it("sends other teachers to /teacher", async () => {
    const { user, password } = await makeTeacher();
    await expectRedirect(
      loginTeacherAction(undefined, form({ username: user.username!, password })),
      "/teacher",
    );
  });

  it("returns the wrong-credentials message without a cookie", async () => {
    const { user } = await makeTeacher();
    expect(
      await loginTeacherAction(undefined, form({ username: user.username!, password: "salah-sekali-123" })),
    ).toEqual({ message: "Username atau kata sandi salah." });
    expect(cookieJar.has("aksara_session")).toBe(false);
  });
});

describe("logoutAction", () => {
  it("deletes the session row, clears the cookie, and sends a student to /login", async () => {
    const cls = await makeClass();
    const student = await makeStudent(cls.id);
    const { token } = await createSession(prisma, student);
    cookieJar.set("aksara_session", token);
    await expectRedirect(logoutAction(), "/login");
    expect(await prisma.session.count()).toBe(0);
    expect(cookieJar.has("aksara_session")).toBe(false);
  });

  it("sends a teacher to /teacher/login", async () => {
    const { user } = await makeTeacher();
    const { token } = await createSession(prisma, user);
    cookieJar.set("aksara_session", token);
    await expectRedirect(logoutAction(), "/teacher/login");
    expect(await prisma.session.count()).toBe(0);
  });

  it("still deletes a revoked session and clears the cookie", async () => {
    const cls = await makeClass();
    const student = await makeStudent(cls.id);
    const { token } = await createSession(prisma, student);
    await revokeSessions(prisma, { userId: student.id }, "REPLACED");
    cookieJar.set("aksara_session", token);
    await expectRedirect(logoutAction(), "/login");
    expect(await prisma.session.count()).toBe(0);
    expect(cookieJar.has("aksara_session")).toBe(false);
  });

  it("works without a cookie", async () => {
    await expectRedirect(logoutAction(), "/login");
  });

  it("clears the cookie even when the DB call fails", async () => {
    const spy = vi.spyOn(prisma.session, "deleteMany").mockRejectedValueOnce(new Error("db down"));
    const { user } = await makeTeacher();
    const { token } = await createSession(prisma, user);
    cookieJar.set("aksara_session", token);
    await expect(logoutAction()).rejects.toThrow("db down");
    expect(cookieJar.has("aksara_session")).toBe(false);
    spy.mockRestore();
  });
});
