import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { seedTeacher } from "./seed";

const PW = "correct-horse-battery";

afterEach(() => vi.restoreAllMocks());

describe("seedTeacher", () => {
  it("creates a normalized teacher who must change the password", async () => {
    const r = await seedTeacher({ TEACHER_USERNAME: "  Guru.Uji ", TEACHER_PASSWORD: PW });
    expect(r).toEqual({ ok: true, username: "guru.uji" });
    const u = await prisma.user.findMany({ where: { role: "TEACHER" } });
    expect(u).toHaveLength(1);
    expect(u[0].username).toBe("guru.uji");
    expect(u[0].mustChangePassword).toBe(true);
    expect(await verifyPassword(u[0].passwordHash!, PW)).toBe(true);
  });

  it("refuses a second run (any username) and keeps one teacher", async () => {
    await seedTeacher({ TEACHER_USERNAME: "guru", TEACHER_PASSWORD: PW });
    for (const name of ["guru", "guru2"]) {
      const r = await seedTeacher({ TEACHER_USERNAME: name, TEACHER_PASSWORD: PW });
      expect(r.ok).toBe(false);
    }
    expect(await prisma.user.count({ where: { role: "TEACHER" } })).toBe(1);
  });

  it("refuses when an inactive teacher exists", async () => {
    await seedTeacher({ TEACHER_USERNAME: "guru", TEACHER_PASSWORD: PW });
    await prisma.user.updateMany({ data: { isActive: false } });
    expect((await seedTeacher({ TEACHER_USERNAME: "lain", TEACHER_PASSWORD: PW })).ok).toBe(false);
  });

  it("rejects short passwords and missing env", async () => {
    expect((await seedTeacher({ TEACHER_USERNAME: "guru", TEACHER_PASSWORD: "short-pw-11" })).ok).toBe(false);
    expect((await seedTeacher({ TEACHER_USERNAME: "guru" })).ok).toBe(false);
    expect((await seedTeacher({ TEACHER_PASSWORD: PW })).ok).toBe(false);
    expect(await prisma.user.count()).toBe(0);
  });

  it.each(["ab", "guru baru", "guru!", "x".repeat(33)])("rejects invalid username %j", async (name) => {
    expect((await seedTeacher({ TEACHER_USERNAME: name, TEACHER_PASSWORD: PW })).ok).toBe(false);
    expect(await prisma.user.count()).toBe(0);
  });

  it("never lets the password reach console or the result", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const results = [
      await seedTeacher({ TEACHER_USERNAME: "guru", TEACHER_PASSWORD: PW }),
      await seedTeacher({ TEACHER_USERNAME: "guru", TEACHER_PASSWORD: PW }),
      await seedTeacher({ TEACHER_USERNAME: "bad name", TEACHER_PASSWORD: PW }),
    ];
    const seen = JSON.stringify([...spies.flatMap((s) => s.mock.calls), results]);
    expect(seen).not.toContain(PW);
  });
});
