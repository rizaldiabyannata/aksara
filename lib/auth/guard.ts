import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { findSession, type SessionUser } from "@/lib/auth/session";

// The only seam between the Next request context and the auth core.
// Pages must call these inside a <Suspense> boundary: with cacheComponents, reading cookies() outside one fails the build.

const SESSION_COOKIE = "aksara_session";

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

// Server Functions / Route Handlers only: cookies are read-only during render.
export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}

export async function getRequestIp(): Promise<string> {
  const xff = (await headers()).get("x-forwarded-for");
  return xff?.split(",")[0].trim() || "unknown";
}

// Dedupes the DB lookup when a layout and page both guard in one render; a no-op elsewhere.
const getSession = cache(async () => {
  const token = await readSessionToken();
  return token ? findSession(token) : ({ status: "none" } as const);
});

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (s.status === "ok") return s.user;
  redirect(
    s.status === "revoked" && s.reason === "REPLACED"
      ? "/login?alasan=perangkat-lain"
      : "/login",
  );
}

export async function requireStudent(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "STUDENT") forbidden();
  return user;
}

export async function requireTeacher(
  opts: { allowPasswordChange?: boolean } = {},
): Promise<SessionUser> {
  const s = await getSession();
  if (s.status !== "ok") redirect("/teacher/login");
  if (s.user.role !== "TEACHER") forbidden();
  if (s.user.mustChangePassword && !opts.allowPasswordChange) {
    redirect("/teacher/password");
  }
  return s.user;
}
