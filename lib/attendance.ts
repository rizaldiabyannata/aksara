import { prisma } from "@/lib/db";

const WITA_MS = 8 * 3600_000;
const DAY_MS = 86400_000;

/** Per class: active students who logged in (a Session was created) during today's WITA day. Derived only. */
export async function attendanceToday(now: Date) {
  const start = new Date(Math.floor((now.getTime() + WITA_MS) / DAY_MS) * DAY_MS - WITA_MS);
  const end = new Date(start.getTime() + DAY_MS);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, classId: { not: null } },
    select: { classId: true, sessions: { where: { createdAt: { gte: start, lt: end } }, select: { id: true }, take: 1 } },
  });
  const byClass = new Map<string, { classId: string; present: number; total: number }>();
  for (const s of students) {
    const row = byClass.get(s.classId!) ?? { classId: s.classId!, present: 0, total: 0 };
    row.total++;
    if (s.sessions.length) row.present++;
    byClass.set(s.classId!, row);
  }
  return [...byClass.values()];
}
