import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession, findSession } from "@/lib/auth/session";
import { makeClass, makeStudent, makeTeacher } from "../../../../tests/factories";
import {
  cookieJar,
  expectForbidden,
  expectRedirect,
  resetNextMocks,
} from "../../../../tests/next-mocks";
import { changePasswordAction } from "./actions";

vi.mock("next/headers", () =>
  import("../../../../tests/next-mocks").then((m) => m.nextHeadersMock()),
);

beforeEach(resetNextMocks);

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
  return token;
}

describe("changePasswordAction", () => {
  it("is forbidden for a student session", async () => {
    const cls = await makeClass();
    await signIn(await makeStudent(cls.id));
    await expectForbidden(changePasswordAction(undefined, new FormData()));
  });

  it("redirects to the teacher login without a session", async () => {
    await expectRedirect(changePasswordAction(undefined, new FormData()), "/teacher/login");
  });

  it("rotates the session cookie and redirects to /teacher", async () => {
    const { user, password } = await makeTeacher({ mustChangePassword: true });
    const oldToken = await signIn(user);
    const newPassword = "kata-sandi-baru-123";
    await expectRedirect(
      changePasswordAction(
        undefined,
        form({ currentPassword: password, newPassword, confirmPassword: newPassword }),
      ),
      "/teacher",
    );
    const newToken = cookieJar.get("aksara_session")!;
    expect(newToken).not.toBe(oldToken);
    expect((await findSession(newToken)).status).toBe("ok");
    expect((await findSession(oldToken)).status).not.toBe("ok");
  });

  it("maps a wrong current password", async () => {
    const { user } = await makeTeacher();
    await signIn(user);
    const newPassword = "kata-sandi-baru-123";
    expect(
      await changePasswordAction(
        undefined,
        form({ currentPassword: "bukan-sandinya", newPassword, confirmPassword: newPassword }),
      ),
    ).toEqual({ message: "Kata sandi lama salah." });
  });

  it("passes field errors through", async () => {
    const { user, password } = await makeTeacher();
    await signIn(user);
    const state = await changePasswordAction(
      undefined,
      form({ currentPassword: password, newPassword: "pendek", confirmPassword: "lain" }),
    );
    expect(state?.fieldErrors?.newPassword).toBe("Kata sandi baru minimal 12 karakter.");
  });
});
