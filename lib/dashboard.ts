import { prisma } from "@/lib/db";
import { attendanceToday, dayState, witaToday } from "@/lib/attendance";
import { finalizeExpiredAttempts, UNGRADED } from "@/lib/attempts";
import { countMaterialsByStatus } from "@/lib/materials";
import { countQuestionsByStatus } from "@/lib/questions";

export type TeacherTask =
  | { kind: "HELP"; quizId: string; title: string; students: number }
  | { kind: "RUNNING"; quizId: string; title: string; inProgress: number; started: number; assigned: number }
  | { kind: "GRADE"; quizId: string; title: string; essays: number }
  | { kind: "RELEASE"; quizId: string; title: string; students: number }
  | { kind: "ATTENDANCE"; classId: string; className: string; missing: number }
  | { kind: "OTHER_DEVICE"; students: number }
  | { kind: "REVIEWED_MATERIALS"; count: number };

/** The teacher's to-do list. RELEASE mirrors the checks in releaseResults (lib/results.ts). */
export async function getTeacherDashboard(now: Date = new Date()) {
  await finalizeExpiredAttempts({}, now);
  const quizzes = await prisma.quiz.findMany({
    where: { status: "PUBLISHED", attempts: { some: {} } },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: {
      id: true, title: true, resultsReleasedAt: true, endsAt: true,
      classes: { select: { classId: true } },
      attempts: {
        select: {
          status: true, studentId: true, helpRequestedAt: true, replacementGrantedAt: true, replacedBy: { select: { id: true } },
          _count: { select: { answers: { where: UNGRADED } } },
        },
      },
    },
  });

  const help: TeacherTask[] = [], running: TeacherTask[] = [], grade: TeacherTask[] = [], release: TeacherTask[] = [];
  for (const q of quizzes) {
    const inProgress = q.attempts.filter((a) => a.status === "IN_PROGRESS").length;
    const counted = q.attempts.filter((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt);
    const essays = counted.reduce((n, a) => n + a._count.answers, 0);
    const pendingReplacement = q.attempts.some((a) => a.replacementGrantedAt && !a.replacedBy);
    const asking = q.attempts.filter((a) => a.status === "IN_PROGRESS" && a.helpRequestedAt).length;
    if (asking) help.push({ kind: "HELP", quizId: q.id, title: q.title, students: asking });
    if (inProgress) {
      const assigned = await prisma.user.count({
        where: { role: "STUDENT", isActive: true, classId: { in: q.classes.map((c) => c.classId) } },
      });
      const started = new Set(q.attempts.map((a) => a.studentId)).size;
      running.push({ kind: "RUNNING", quizId: q.id, title: q.title, inProgress, started, assigned });
    }
    if (essays) grade.push({ kind: "GRADE", quizId: q.id, title: q.title, essays });
    if (!q.resultsReleasedAt && !inProgress && !essays && !pendingReplacement && counted.length) {
      const done = new Set(counted.map((a) => a.studentId));
      // Promote only when the window is over or everyone in the target classes has finished.
      const windowOver = !!q.endsAt && q.endsAt <= now;
      const missing = windowOver ? 0 : await prisma.user.count({
        where: { role: "STUDENT", isActive: true, classId: { in: q.classes.map((c) => c.classId) }, id: { notIn: [...done] } },
      });
      if (!missing) release.push({ kind: "RELEASE", quizId: q.id, title: q.title, students: done.size });
    }
  }

  const replaced = await prisma.auditLog.groupBy({
    by: ["entityId"],
    where: {
      action: "STUDENT_SESSION_REPLACED", entityType: "User",
      createdAt: { gte: new Date(now.getTime() - 7 * 86400_000) },
    },
  });
  const otherDevice = await prisma.user.count({
    where: { role: "STUDENT", isActive: true, id: { in: replaced.map((r) => r.entityId).filter((id): id is string => !!id) } },
  });

  const [materials, questions, activeStudents, today, attendance, classes] = await Promise.all([
    countMaterialsByStatus(), countQuestionsByStatus(),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    dayState(witaToday(now), now), attendanceToday(now),
    prisma.class.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const tasks: TeacherTask[] = [...help, ...running, ...grade, ...release];
  if (today.state === "OPEN") {
    const byClass = new Map(attendance.map((a) => [a.classId, a]));
    for (const c of classes) {
      const a = byClass.get(c.id);
      if (a && a.recorded < a.total) tasks.push({ kind: "ATTENDANCE", classId: c.id, className: c.name, missing: a.total - a.recorded });
    }
  }
  if (otherDevice) tasks.push({ kind: "OTHER_DEVICE", students: otherDevice });
  if (materials.REVIEWED) tasks.push({ kind: "REVIEWED_MATERIALS", count: materials.REVIEWED });
  return {
    tasks,
    counts: { materialsPublished: materials.PUBLISHED, questionsActive: questions.ACTIVE, activeStudents },
  };
}
