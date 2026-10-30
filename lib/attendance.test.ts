import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { attendanceToday } from "@/lib/attendance";
import { makeClass, makeStudent } from "../tests/factories";

const now = new Date("2026-10-30T04:00:00Z"); // 12:00 WITA; WITA day starts 2026-10-29T16:00Z
let k = 0;
const session = (userId: string, createdAt: Date, revoked = false) =>
  prisma.session.create({
    data: {
      tokenHash: `h${++k}-${Math.random()}`, userId, createdAt,
      expiresAt: new Date(now.getTime() + 86400_000),
      ...(revoked ? { revokedAt: now, revokedReason: "REPLACED" as const } : {}),
    },
  });

describe("attendanceToday", () => {
  it("counts distinct active students with a session today (WITA)", async () => {
    const c = await makeClass();
    const [a, b, gone, off, yest] = await Promise.all([
      makeStudent(c.id), makeStudent(c.id), makeStudent(c.id, { isActive: false }), makeStudent(c.id), makeStudent(c.id),
    ]);
    await session(a.id, new Date("2026-10-30T01:00:00Z"));
    await session(a.id, new Date("2026-10-30T03:00:00Z"), true); // same student twice
    await session(b.id, new Date("2026-10-29T16:00:00Z"), true); // WITA midnight, revoked still counts
    await session(gone.id, new Date("2026-10-30T01:00:00Z")); // inactive
    await session(yest.id, new Date("2026-10-29T15:59:59Z")); // yesterday in WITA
    void off;
    const r = await attendanceToday(now);
    expect(r).toEqual([{ classId: c.id, present: 2, total: 4 }]);
  });

  it("lists classes with no logins as 0/total", async () => {
    const c = await makeClass();
    await makeStudent(c.id);
    expect(await attendanceToday(now)).toEqual([{ classId: c.id, present: 0, total: 1 }]);
  });
});
