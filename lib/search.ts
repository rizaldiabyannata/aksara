import { prisma } from "@/lib/db";

const TAKE = 5;
// Prisma passes LIKE wildcards through, so escape them.
const has = (q: string) => ({ contains: q.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const });

/** Teacher-only global search. The caller must have passed requireTeacher(). */
export async function searchAll(raw: string) {
  const q = raw.trim();
  if (q.length < 2) return { classes: [], students: [], materials: [], questions: [], quizzes: [] };
  const [classes, students, materials, questions, quizzes] = await Promise.all([
    prisma.class.findMany({ where: { name: has(q) }, orderBy: { name: "asc" }, take: TAKE, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: "STUDENT", OR: [{ displayName: has(q) }, { nis: has(q) }] },
      orderBy: { displayName: "asc" }, take: TAKE,
      select: { id: true, displayName: true, nis: true, class: { select: { name: true } } },
    }),
    prisma.material.findMany({ where: { title: has(q) }, orderBy: { title: "asc" }, take: TAKE, select: { id: true, title: true, status: true } }),
    prisma.question.findMany({ where: { prompt: has(q) }, orderBy: { createdAt: "desc" }, take: TAKE, select: { id: true, prompt: true } }),
    prisma.quiz.findMany({ where: { title: has(q) }, orderBy: { title: "asc" }, take: TAKE, select: { id: true, title: true, status: true } }),
  ]);
  return { classes, students, materials, questions, quizzes };
}
