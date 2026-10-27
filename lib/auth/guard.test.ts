import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession, revokeSessions } from "@/lib/auth/session";
import {
  clearSessionCookie,
  getRequestIp,
  readSessionToken,
  requireSession,
  requireStudent,
  requireTeacher,
  setSessionCookie,
} from "@/lib/auth/guard";
import { makeClass, makeStudent, makeTeacher } from "../../tests/factories";
import {
  cookieJar,
  cookieOptions,
  expectForbidden,
  expectRedirect,
  headerJar,
  resetNextMocks,
} from "../../tests/next-mocks";

vi.mock("next/headers", () =>
  import("../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);

beforeEach(resetNextMocks);
afterEach(() => vi.unstubAllEnvs());

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
  return token;
}

describe("guards", () => {
  it("redirects to the right login page without a cookie", async () => {
    await expectRedirect(requireTeacher(), "/teacher/login");
    await expectRedirect(requireStudent(), "/login");
    await expectRedirect(requireSession(), "/login");
  });

  it("returns 403 when a student hits a teacher guard and vice versa", async () => {
    const s = await makeStudent((await makeClass()).id);
    await signIn(s);
    await expectForbidden(requireTeacher());
    expect((await requireStudent()).id).toBe(s.id);

    const { user: t } = await makeTeacher();
    await signIn(t);
    await expectForbidden(requireStudent());
    expect((await requireTeacher()).id).toBe(t.id);
    expect((await requireSession()).id).toBe(t.id);
  });

  it("sends a teacher who must change password to /teacher/password", async () => {
    const { user: t } = await makeTeacher({ mustChangePassword: true });
    await signIn(t);
    await expectRedirect(requireTeacher(), "/teacher/password");
    expect((await requireTeacher({ allowPasswordChange: true })).id).toBe(t.id);
  });

  it("tells a replaced device why it was signed out", async () => {
    const s = await makeStudent((await makeClass()).id);
    await signIn(s);
    await revokeSessions(prisma, { userId: s.id }, "REPLACED");
    await expectRedirect(requireStudent(), "/login?alasan=perangkat-lain");
    await expectRedirect(requireSession(), "/login?alasan=perangkat-lain");
  });

  it("sends a teacher with a revoked session to the teacher login", async () => {
    const { user: t } = await makeTeacher();
    await signIn(t);
    await revokeSessions(prisma, { userId: t.id }, "REPLACED");
    await expectRedirect(requireTeacher(), "/teacher/login");
  });

  it("redirects a student deactivated after login to /login", async () => {
    const s = await makeStudent((await makeClass()).id);
    await signIn(s);
    await prisma.user.update({ where: { id: s.id }, data: { isActive: false } });
    await expectRedirect(requireStudent(), "/login");
  });
});

describe("cookie and request helpers", () => {
  it("sets the session cookie with safe options", async () => {
    const expiresAt = new Date(Date.now() + 3600_000);
    await setSessionCookie("tok", expiresAt);
    expect(await readSessionToken()).toBe("tok");
    expect(cookieOptions.get("aksara_session")).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    vi.stubEnv("NODE_ENV", "production");
    await setSessionCookie("tok", expiresAt);
    expect(cookieOptions.get("aksara_session")).toMatchObject({ secure: true });
  });

  it("clears the session cookie on path /", async () => {
    cookieJar.set("aksara_session", "tok");
    await clearSessionCookie();
    expect(await readSessionToken()).toBeUndefined();
    expect(cookieOptions.get("aksara_session")).toMatchObject({ path: "/" });
  });

  it("reads the client IP from the first x-forwarded-for entry", async () => {
    expect(await getRequestIp()).toBe("unknown");
    headerJar.set("x-forwarded-for", " 203.0.113.7 , 10.0.0.1");
    expect(await getRequestIp()).toBe("203.0.113.7");
  });
});
