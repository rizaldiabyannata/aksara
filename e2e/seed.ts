// E2E fixture: wipes aksara_test and creates isolated synthetic classroom data.
// Run before each test with `bun --conditions=react-server`; writes e2e/.auth.json for the specs.
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { saveAnswer, startAttempt, submitAttempt } from "@/lib/attempts";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { publishQuiz } from "@/lib/quizzes";
import { createStudent } from "@/lib/students";
import { assertTestDatabaseUrl } from "../tests/test-db-url.mts";
import { makeChapter, makeClass, makeQuestion, makeQuiz, makeQuizQuestion, makeTeacher } from "../tests/factories";

assertTestDatabaseUrl(process.env.DATABASE_URL ?? "");
await prisma.$executeRawUnsafe(
  'TRUNCATE "AuditLog","Session","LoginThrottle","Image","Question","Material","Subchapter","Chapter","Subject","User","Class" RESTART IDENTITY CASCADE',
);

const password = randomBytes(12).toString("base64url");
const { user: teacher } = await makeTeacher({
  username: "e2eguru", displayName: "Bu Guru", mustChangePassword: false, passwordHash: await hashPassword(password),
});
// A fresh seeded teacher who must change the initial password first (e2e/login.spec.ts).
const newPassword = randomBytes(12).toString("base64url");
await makeTeacher({
  username: "e2egurubaru", displayName: "Guru Baru", mustChangePassword: true, passwordHash: await hashPassword(newPassword),
});
const cls = await makeClass({ name: "VI-E2E" });
const students: Record<string, string> = {};
for (const [displayName, nis] of [
  ["Siswa Satu", "100001"],
  ["Siswa Dua", "100002"],
  ["Siswa Dengan Nama Yang Sangat Panjang Sekali", "100003"],
  ["Siswa Empat", "100004"],
  ["Siswa Lima", "100005"],
] as const) {
  const r = await createStudent(teacher.id, { displayName, nis, classId: cls.id });
  if (!r.ok) throw new Error(`seed student ${displayName}: ${r.error}`);
  students[displayName] = r.id;
}

const chapter = await makeChapter();
const choice = await makeQuestion(chapter.id, teacher.id, {
  status: "ACTIVE", prompt: "Berapa 2 + 3?",
  options: [{ id: "a", text: "5" }, { id: "b", text: "6" }], answerKey: { optionId: "a" },
});
const essay = await makeQuestion(chapter.id, teacher.id, {
  status: "ACTIVE", type: "ESSAY", prompt: "Jelaskan cara menjumlahkan 2 dan 3.", answerKey: { rubric: "Menyebut 5." },
});

async function publish(title: string, questions: { id: string; points: number }[]) {
  const quiz = await makeQuiz(chapter.subjectId, teacher.id, { title, durationMinutes: 30 });
  await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
  const qqs = [];
  for (const [i, q] of questions.entries())
    qqs.push(await makeQuizQuestion(quiz.id, q.id, { position: i + 1, points: q.points }));
  const r = await publishQuiz(teacher.id, quiz.id, new Date());
  if (!r.ok) throw new Error(`seed publish ${title}: ${JSON.stringify(r)}`);
  return { quiz, qqs };
}

// Tryout TKA over two chapters, taken and released live by e2e/tahap10.spec.ts.
const tkaBilangan = await makeChapter({ title: "Bilangan" });
await prisma.subject.update({ where: { id: tkaBilangan.subjectId }, data: { name: "TKA Matematika" } });
await prisma.subchapter.create({ data: { chapterId: tkaBilangan.id, title: "Pecahan senilai", order: 1 } });
await prisma.subject.create({ data: {
  name: "TKA Bahasa Indonesia",
  chapters: { create: { title: "Evaluasi dan Apresiasi", order: 1, sourceBook: "Kisi-kisi TKA", sourceYearOrEdition: "2025" } },
} });
const tkaData = await prisma.chapter.create({
  data: { subjectId: tkaBilangan.subjectId, order: 2, title: "Data", sourceBook: "Kisi-kisi TKA", sourceYearOrEdition: "2025" },
});
const tkaCategory = await makeQuestion(tkaData.id, teacher.id, {
  status: "ACTIVE", type: "CATEGORY", prompt: "Tentukan fakta atau opini.", cognitiveLevel: "PENALARAN",
  options: [{ id: "a", text: "Kompos dibuat dari sisa makhluk hidup." }, { id: "b", text: "Kompos itu menyenangkan." }],
  answerKey: { values: { a: true, b: false } }, categoryLabels: ["Fakta", "Opini"],
});
const tkaChoice = await makeQuestion(tkaBilangan.id, teacher.id, {
  status: "ACTIVE", prompt: "Hasil 6 × 7 adalah ....", cognitiveLevel: "PEMAHAMAN",
  options: [{ id: "a", text: "42" }, { id: "b", text: "36" }], answerKey: { optionId: "a" },
});
const tryout = await makeQuiz(tkaBilangan.subjectId, teacher.id, { title: "Tryout E2E", kind: "TRYOUT_TKA", durationMinutes: 75 });
await prisma.quizClass.create({ data: { quizId: tryout.id, classId: cls.id } });
await makeQuizQuestion(tryout.id, tkaChoice.id, { position: 1, points: 1 });
await makeQuizQuestion(tryout.id, tkaCategory.id, { position: 2, points: 1 });
if (!(await publishQuiz(teacher.id, tryout.id, new Date())).ok) throw new Error("seed publish tryout");

// Taken live by e2e/student.spec.ts.
const forStudent = await publish("Ulangan Siswa", [{ id: choice.id, points: 2 }, { id: essay.id, points: 8 }]);
// Exam token and help request flows (e2e/tahap8.spec.ts); the spec turns the token on itself.
const forToken = await publish("Ulangan Token", [{ id: choice.id, points: 2 }]);
// Already answered by Siswa Dua, waiting for the teacher to grade (e2e/teacher.spec.ts).
const forTeacher = await publish("Ulangan Guru", [{ id: essay.id, points: 4 }]);
const dua = { id: students["Siswa Dua"], classId: cls.id };
const started = await startAttempt(dua, forTeacher.quiz.id);
if (!started.ok) throw new Error("seed start");
await saveAnswer(dua.id, started.attemptId, { quizQuestionId: forTeacher.qqs[0].id, answer: { text: "Hasilnya 5." } });
await submitAttempt(dua.id, forTeacher.quiz.id, started.attemptId);
// Window over, so the dashboard promotes release even if other students never start.
await prisma.quiz.update({ where: { id: forTeacher.quiz.id }, data: { endsAt: new Date(Date.now() - 60_000) } });

// An objective-only failed attempt for the browser remedial/replacement journeys.
const remedial = await makeQuiz(chapter.subjectId, teacher.id, {
  title: "Remedial E2E", maxAttempts: 2, scoringPolicy: "REMEDIAL", kkm: 75,
  showFeedbackAfterRelease: true,
});
await prisma.quizClass.create({ data: { quizId: remedial.id, classId: cls.id } });
await makeQuizQuestion(remedial.id, choice.id, { position: 1, points: 1 });
if (!(await publishQuiz(teacher.id, remedial.id, new Date())).ok) throw new Error("seed remedial publish");
const empat = { id: students["Siswa Empat"], classId: cls.id };
const failed = await startAttempt(empat, remedial.id);
if (!failed.ok) throw new Error("seed remedial start");
await submitAttempt(empat.id, remedial.id, failed.attemptId);

// An already expired attempt exercises server finalization without clock sleeps.
const expired = await makeQuiz(chapter.subjectId, teacher.id, { title: "Waktu Habis E2E", durationMinutes: 1 });
await prisma.quizClass.create({ data: { quizId: expired.id, classId: cls.id } });
await makeQuizQuestion(expired.id, choice.id, { position: 1, points: 1 });
if (!(await publishQuiz(teacher.id, expired.id, new Date())).ok) throw new Error("seed expired publish");
if (!(await startAttempt({ id: students["Siswa Lima"], classId: cls.id }, expired.id, new Date(Date.now() - 300_000))).ok)
  throw new Error("seed expired start");

writeFileSync(
  "e2e/.auth.json",
  JSON.stringify({
    teacher: { username: "e2eguru", password },
    newTeacher: { username: "e2egurubaru", password: newPassword },
    classCode: cls.code,
    studentQuiz: { id: forStudent.quiz.id, title: forStudent.quiz.title },
    tokenQuiz: { id: forToken.quiz.id, title: forToken.quiz.title },
    teacherQuiz: { id: forTeacher.quiz.id, title: forTeacher.quiz.title },
    expiredQuiz: { id: expired.id, title: expired.title },
    remedialQuiz: { id: remedial.id, title: remedial.title },
    tryoutQuiz: { id: tryout.id, title: tryout.title },
  }),
);
await prisma.$disconnect();
