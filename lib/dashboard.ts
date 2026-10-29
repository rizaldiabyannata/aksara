import { prisma } from "@/lib/db";
import { finalizeExpiredAttempts, UNGRADED } from "@/lib/attempts";
import { countMaterialsByStatus } from "@/lib/materials";
import { countQuestionsByStatus } from "@/lib/questions";

export type TeacherTask =
  | { kind: "RUNNING"; quizId: string; title: string; inProgress: number }
  | { kind: "GRADE"; quizId: string; title: string; essays: number }
  | { kind: "RELEASE"; quizId: string; title: string; students: number }
  | { kind: "OTHER_DEVICE"; students: number }
  | { kind: "REVIEWED_MATERIALS"; count: number };

/** The teacher's to-do list. RELEASE mirrors the checks in releaseResults (lib/results.ts). */
export async function getTeacherDashboard(now: Date = new Date()) {
  await finalizeExpiredAttempts({}, now);
  const quizzes = await prisma.quiz.findMany({
    where: { status: "PUBLISHED", attempts: { some: {} } },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: {
      id: true, title: true, resultsReleasedAt: true,
      attempts: {
        select: {
          status: true, studentId: true, replacementGrantedAt: true, replacedBy: { select: { id: true } },
          _count: { select: { answers: { where: UNGRADED } } },
        },
      },
    },
  });

  const running: TeacherTask[] = [], grade: TeacherTask[] = [], release: TeacherTask[] = [];
  for (const q of quizzes) {
    const inProgress = q.attempts.filter((a) => a.status === "IN_PROGRESS").length;
    const counted = q.attempts.filter((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt);
    const essays = counted.reduce((n, a) => n + a._count.answers, 0);
    const pendingReplacement = q.attempts.some((a) => a.replacementGrantedAt && !a.replacedBy);
    if (inProgress) running.push({ kind: "RUNNING", quizId: q.id, title: q.title, inProgress });
    if (essays) grade.push({ kind: "GRADE", quizId: q.id, title: q.title, essays });
    if (!q.resultsReleasedAt && !inProgress && !essays && !pendingReplacement && counted.length) {
      release.push({ kind: "RELEASE", quizId: q.id, title: q.title, students: new Set(counted.map((a) => a.studentId)).size });
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

  const [materials, questions, activeStudents] = await Promise.all([
    countMaterialsByStatus(), countQuestionsByStatus(),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
  ]);

  const tasks: TeacherTask[] = [...running, ...grade, ...release];
  if (otherDevice) tasks.push({ kind: "OTHER_DEVICE", students: otherDevice });
  if (materials.REVIEWED) tasks.push({ kind: "REVIEWED_MATERIALS", count: materials.REVIEWED });
  return {
    tasks,
    counts: { materialsPublished: materials.PUBLISHED, questionsActive: questions.ACTIVE, activeStudents },
  };
}
