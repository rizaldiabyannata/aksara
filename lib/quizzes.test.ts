import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  addQuizQuestion,
  countQuizzesByStatus,
  createQuiz,
  getQuizForTeacher,
  listQuizzes,
  moveQuizQuestion,
  publishQuiz,
  unpublishQuiz,
  removeQuizQuestion,
  setQuizClasses,
  setQuizQuestionPoints,
  updateQuiz,
  validateForPublish,
  type PublishCheck,
} from "@/lib/quizzes";
import { updateQuestion, getQuestionForTeacher, toPublicQuestion } from "@/lib/questions";
import {
  makeAttempt,
  makeChapter,
  makeClass,
  makeImage,
  makeQuestion,
  makeQuiz,
  makeQuizQuestion,
  makeStudent,
  makeTeacher,
} from "../tests/factories";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

const DUR = "Durasi harus bilangan bulat 1 sampai 300 menit.";
const TIME = "Tanggal dan jam tidak valid.";
const ORDER = "Jadwal selesai harus setelah jadwal mulai.";
const ATT = "Batas percobaan harus bilangan bulat 1 sampai 10.";
const KKM = "KKM harus bilangan bulat 0 sampai 100.";
const REM = "Kebijakan Remedial butuh KKM dan batas percobaan minimal 2.";
const LOCK = "Bagian ini terkunci setelah ulangan terbit.";
const ENDS = "Setelah terbit, jadwal selesai hanya boleh diperpanjang.";
const MAXA = "Setelah terbit, batas percobaan hanya boleh dinaikkan.";
const FORM_LOCK = "Soal ulangan terkunci setelah terbit.";
const NOT_ADDABLE = "Hanya soal aktif dari mata pelajaran ini yang bisa ditambahkan.";
const DUP = "Soal ini sudah ada di ulangan.";
const POIN = "Poin harus bilangan bulat 1 sampai 100.";
const CLASS_REQ = "Pilih minimal satu kelas.";
const CLASS_LOCK = "Kelas tidak bisa dilepas setelah ulangan terbit.";

const fe = (r: unknown) => (r as { fieldErrors: Record<string, string> }).fieldErrors;
const idOf = (r: unknown) => (r as { id: string }).id;

async function setup() {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  return { actor: user.id, chapter, subjectId: chapter.subjectId };
}

// Form values as strings, the way the teacher form sends them.
const setting = (over: Record<string, string> = {}) => ({
  title: "Ulangan Bab 1",
  instructions: "",
  durationMinutes: "30",
  startsAt: "",
  endsAt: "",
  maxAttempts: "1",
  shuffleQuestions: "",
  shuffleOptions: "",
  showFeedbackAfterRelease: "on",
  scoringPolicy: "HIGHEST",
  kkm: "",
  ...over,
});

describe("createQuiz", () => {
  it("creates a draft with the given settings", async () => {
    const { actor, subjectId } = await setup();
    const r = await createQuiz(
      actor,
      setting({ subjectId, startsAt: "2026-11-01T08:00", endsAt: "2026-11-01T09:00", kkm: "70", instructions: "Kerjakan teliti" }),
    );
    expect(r).toMatchObject({ ok: true });
    const q = await prisma.quiz.findUniqueOrThrow({ where: { id: idOf(r) } });
    expect(q).toMatchObject({
      title: "Ulangan Bab 1",
      instructions: "Kerjakan teliti",
      subjectId,
      createdById: actor,
      status: "DRAFT",
      durationMinutes: 30,
      maxAttempts: 1,
      scoringPolicy: "HIGHEST",
      kkm: 70,
      showFeedbackAfterRelease: true,
      shuffleQuestions: false,
      startsAt: new Date("2026-11-01T00:00:00Z"),
      endsAt: new Date("2026-11-01T01:00:00Z"),
    });
  });

  it("stores null and false for blank optional fields", async () => {
    const { actor, subjectId } = await setup();
    const r = await createQuiz(
      actor,
      setting({ subjectId, instructions: "", startsAt: "", endsAt: "", kkm: "", showFeedbackAfterRelease: "" }),
    );
    const q = await prisma.quiz.findUniqueOrThrow({ where: { id: idOf(r) } });
    expect(q).toMatchObject({
      instructions: null,
      startsAt: null,
      endsAt: null,
      kkm: null,
      showFeedbackAfterRelease: false,
    });
  });

  it.each<[string, Record<string, string>, string, string | undefined]>([
    ["judul hanya spasi", { title: "   " }, "title", "Judul wajib diisi, paling banyak 150 huruf."],
    ["judul 151 huruf", { title: "a".repeat(151) }, "title", "Judul wajib diisi, paling banyak 150 huruf."],
    ["petunjuk 5.001 huruf", { instructions: "a".repeat(5001) }, "instructions", "Petunjuk paling banyak 5.000 huruf."],
    ["durasi 0", { durationMinutes: "0" }, "durationMinutes", DUR],
    ["durasi 301", { durationMinutes: "301" }, "durationMinutes", DUR],
    ["durasi 1.5", { durationMinutes: "1.5" }, "durationMinutes", DUR],
    ["batas percobaan 0", { maxAttempts: "0" }, "maxAttempts", ATT],
    ["batas percobaan 11", { maxAttempts: "11" }, "maxAttempts", ATT],
    ["KKM 101", { kkm: "101" }, "kkm", KKM],
    ["remedial tanpa KKM", { scoringPolicy: "REMEDIAL", kkm: "", maxAttempts: "2" }, "kkm", REM],
    ["remedial dengan percobaan 1", { scoringPolicy: "REMEDIAL", kkm: "70", maxAttempts: "1" }, "kkm", REM],
    ["selesai sama dengan mulai", { startsAt: "2026-11-01T09:00", endsAt: "2026-11-01T09:00" }, "endsAt", ORDER],
    ["tanggal tak valid", { startsAt: "2026-13-01T08:00" }, "startsAt", TIME],
    ["tanggal 30 Februari", { endsAt: "2026-02-30T08:00" }, "endsAt", TIME],
    ["kebijakan __proto__", { scoringPolicy: "__proto__" }, "scoringPolicy", undefined],
  ])("rejects %s", async (_name, over, key, msg) => {
    const { actor, subjectId } = await setup();
    const r = await createQuiz(actor, setting({ ...over, subjectId }));
    expect(r).toMatchObject({ ok: false, error: "INVALID" });
    expect(fe(r)[key]).toBeDefined();
    if (msg) expect(fe(r)[key]).toBe(msg);
    expect(await prisma.quiz.count()).toBe(0);
  });

  it("rejects a missing or unknown subject", async () => {
    const { actor } = await setup();
    const SUBJ = "Pilih mata pelajaran.";
    expect(fe(await createQuiz(actor, setting({ subjectId: "" })))).toEqual({ subjectId: SUBJ });
    expect(fe(await createQuiz(actor, setting({ subjectId: "tidak-ada" })))).toEqual({ subjectId: SUBJ });
  });
});

describe("validateForPublish", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  const base: PublishCheck = {
    questions: [{ status: "ACTIVE", points: 2, type: "SINGLE_CHOICE" }],
    endsAt: null,
    scoringPolicy: "HIGHEST",
    kkm: null,
    maxAttempts: 1,
    activeClassCount: 1,
  };

  it("returns no reasons for a valid quiz", () => {
    expect(validateForPublish(base, now)).toEqual([]);
  });

  it("asks for at least one question", () => {
    expect(validateForPublish({ ...base, questions: [] }, now)).toEqual(["Tambahkan minimal satu soal."]);
  });

  it("names the first draft question by its number", () => {
    const questions = [
      { status: "ACTIVE" as const, points: 1, type: "SINGLE_CHOICE" as const },
      { status: "DRAFT" as const, points: 1, type: "SINGLE_CHOICE" as const },
    ];
    expect(validateForPublish({ ...base, questions }, now)).toEqual([
      "Soal nomor 2 masih draf. Aktifkan dulu di bank soal.",
    ]);
  });

  it("requires total points above 0", () => {
    const questions = [{ status: "ACTIVE" as const, points: 0, type: "SINGLE_CHOICE" as const }];
    expect(validateForPublish({ ...base, questions }, now)).toEqual(["Total poin harus lebih dari 0."]);
  });

  it("rejects an end time in the past", () => {
    expect(validateForPublish({ ...base, endsAt: new Date("2026-10-31T00:00:00Z") }, now)).toEqual([
      "Jadwal selesai sudah lewat.",
    ]);
  });

  it("requires at least one active class", () => {
    expect(validateForPublish({ ...base, activeClassCount: 0 }, now)).toEqual(["Pilih minimal satu kelas aktif."]);
  });

  it("checks remedial needs a KKM and at least 2 attempts", () => {
    const remedial = { ...base, scoringPolicy: "REMEDIAL" as const };
    expect(validateForPublish({ ...remedial, kkm: null, maxAttempts: 2 }, now)).toEqual([REM]);
    expect(validateForPublish({ ...remedial, kkm: 70, maxAttempts: 1 }, now)).toEqual([REM]);
    expect(validateForPublish({ ...remedial, kkm: 70, maxAttempts: 2 }, now)).toEqual([]);
  });
});

describe("addQuizQuestion", () => {
  it("adds an active question of the same subject at the next position with its default points", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const q1 = await makeQuestion(chapter.id, actor, { status: "ACTIVE", defaultPoints: 3 });
    const q2 = await makeQuestion(chapter.id, actor, { status: "ACTIVE", defaultPoints: 2 });
    expect(await addQuizQuestion(quiz.id, q1.id)).toEqual({ ok: true });
    expect(await addQuizQuestion(quiz.id, q2.id)).toEqual({ ok: true });
    const rows = await prisma.quizQuestion.findMany({
      where: { quizId: quiz.id },
      orderBy: { position: "asc" },
      select: { questionId: true, position: true, points: true },
    });
    expect(rows).toEqual([
      { questionId: q1.id, position: 1, points: 3 },
      { questionId: q2.id, position: 2, points: 2 },
    ]);
  });

  it("rejects a draft question", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const q = await makeQuestion(chapter.id, actor, { status: "DRAFT" });
    expect(fe(await addQuizQuestion(quiz.id, q.id))).toEqual({ questionId: NOT_ADDABLE });
  });

  it("rejects a question from another subject", async () => {
    const { actor, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const other = await makeChapter();
    const q = await makeQuestion(other.id, actor, { status: "ACTIVE" });
    expect(fe(await addQuizQuestion(quiz.id, q.id))).toEqual({ questionId: NOT_ADDABLE });
  });

  it("rejects a duplicate question", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
    expect(await addQuizQuestion(quiz.id, q.id)).toEqual({ ok: true });
    expect(fe(await addQuizQuestion(quiz.id, q.id))).toEqual({ questionId: DUP });
  });

  it("is locked once the quiz is published", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor, { status: "PUBLISHED" });
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
    expect(fe(await addQuizQuestion(quiz.id, q.id))).toEqual({ form: FORM_LOCK });
  });
});

describe("removeQuizQuestion and moveQuizQuestion", () => {
  async function threeQuestions() {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const qs = [];
    for (const position of [1, 2, 3]) {
      const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
      qs.push(await makeQuizQuestion(quiz.id, q.id, { position }));
    }
    return { quiz, qs };
  }
  const order = (quizId: string) =>
    prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });

  it("removes a question and closes the gap in positions", async () => {
    const { quiz, qs } = await threeQuestions();
    expect(await removeQuizQuestion(quiz.id, qs[1].id)).toEqual({ ok: true });
    expect(await order(quiz.id)).toEqual([
      { id: qs[0].id, position: 1 },
      { id: qs[2].id, position: 2 },
    ]);
  });

  it("moves up from position 1 as a no-op", async () => {
    const { quiz, qs } = await threeQuestions();
    expect(await moveQuizQuestion(quiz.id, qs[0].id, "up")).toEqual({ ok: true });
    expect(await order(quiz.id)).toEqual([
      { id: qs[0].id, position: 1 },
      { id: qs[1].id, position: 2 },
      { id: qs[2].id, position: 3 },
    ]);
  });

  it("moves down by swapping with the next question", async () => {
    const { quiz, qs } = await threeQuestions();
    expect(await moveQuizQuestion(quiz.id, qs[0].id, "down")).toEqual({ ok: true });
    expect(await order(quiz.id)).toEqual([
      { id: qs[1].id, position: 1 },
      { id: qs[0].id, position: 2 },
      { id: qs[2].id, position: 3 },
    ]);
  });

  it("ignores an unknown direction", async () => {
    const { quiz, qs } = await threeQuestions();
    expect(await moveQuizQuestion(quiz.id, qs[0].id, "sideways" as unknown as "up")).toEqual({ ok: true });
    expect((await order(quiz.id))[0].id).toBe(qs[0].id);
  });

  it("locks removal and moves once published", async () => {
    const { quiz, qs } = await threeQuestions();
    await prisma.quiz.update({ where: { id: quiz.id }, data: { status: "PUBLISHED" } });
    expect(fe(await removeQuizQuestion(quiz.id, qs[0].id))).toEqual({ form: FORM_LOCK });
    expect(fe(await moveQuizQuestion(quiz.id, qs[1].id, "up"))).toEqual({ form: FORM_LOCK });
  });
});

describe("setQuizQuestionPoints", () => {
  it.each(["0", "101", "x", "1.5"])("rejects points %s", async (bad) => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
    const qq = await makeQuizQuestion(quiz.id, q.id);
    expect(fe(await setQuizQuestionPoints(quiz.id, qq.id, bad))).toEqual({ points: POIN });
  });

  it("saves valid points and locks once published", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
    const qq = await makeQuizQuestion(quiz.id, q.id);
    expect(await setQuizQuestionPoints(quiz.id, qq.id, "5")).toEqual({ ok: true });
    expect((await prisma.quizQuestion.findUniqueOrThrow({ where: { id: qq.id } })).points).toBe(5);
    await prisma.quiz.update({ where: { id: quiz.id }, data: { status: "PUBLISHED" } });
    expect(fe(await setQuizQuestionPoints(quiz.id, qq.id, "7"))).toEqual({ form: FORM_LOCK });
  });
});

describe("setQuizClasses", () => {
  it("replaces the classes and ignores unknown ids", async () => {
    const { actor, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const a = await makeClass();
    const b = await makeClass();
    expect(await setQuizClasses(quiz.id, [a.id, "tidak-ada"])).toEqual({ ok: true });
    expect(await setQuizClasses(quiz.id, [b.id])).toEqual({ ok: true });
    const rows = await prisma.quizClass.findMany({ where: { quizId: quiz.id }, select: { classId: true } });
    expect(rows).toEqual([{ classId: b.id }]);
  });

  it("requires at least one known class while draft", async () => {
    const { actor, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    expect(fe(await setQuizClasses(quiz.id, []))).toEqual({ classIds: CLASS_REQ });
    expect(fe(await setQuizClasses(quiz.id, ["tidak-ada"]))).toEqual({ classIds: CLASS_REQ });
  });

  it("only adds classes once published", async () => {
    const { actor, subjectId } = await setup();
    const a = await makeClass();
    const b = await makeClass();
    const quiz = await makeQuiz(subjectId, actor, { status: "PUBLISHED" });
    await prisma.quizClass.create({ data: { quizId: quiz.id, classId: a.id } });
    expect(fe(await setQuizClasses(quiz.id, [b.id]))).toEqual({ classIds: CLASS_LOCK });
    expect(await setQuizClasses(quiz.id, [a.id, b.id])).toEqual({ ok: true });
    const rows = await prisma.quizClass.findMany({ where: { quizId: quiz.id }, select: { classId: true } });
    expect(rows.map((r) => r.classId).sort()).toEqual([a.id, b.id].sort());
  });
});

describe("updateQuiz", () => {
  it("updates a draft and writes no audit when scoring is unchanged", async () => {
    const { actor, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    expect(await updateQuiz(actor, quiz.id, setting({ title: "Judul baru" }))).toEqual({ ok: true });
    expect((await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).title).toBe("Judul baru");
    expect(await prisma.auditLog.count({ where: { action: "QUIZ_SCORING_CHANGED" } })).toBe(0);
  });

  it("returns NOT_FOUND for an unknown quiz", async () => {
    const { actor } = await setup();
    expect(await updateQuiz(actor, "tidak-ada", setting())).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  describe("once published", () => {
    async function publishedQuiz() {
      const { actor, subjectId } = await setup();
      const quiz = await makeQuiz(subjectId, actor, {
        status: "PUBLISHED",
        startsAt: new Date("2026-11-01T00:00:00Z"),
        endsAt: new Date("2026-11-01T01:00:00Z"),
        maxAttempts: 2,
      });
      return { actor, quiz };
    }
    const pubSetting = (over: Record<string, string> = {}) =>
      setting({ startsAt: "2026-11-01T08:00", endsAt: "2026-11-01T09:00", maxAttempts: "2", ...over });

    it("saves title and KKM and writes one scoring audit with from/to values", async () => {
      const { actor, quiz } = await publishedQuiz();
      expect(await updateQuiz(actor, quiz.id, pubSetting({ title: "Judul baru", kkm: "60" }))).toEqual({ ok: true });
      const audits = await prisma.auditLog.findMany({ where: { action: "QUIZ_SCORING_CHANGED" } });
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        actorUserId: actor,
        entityType: "Quiz",
        entityId: quiz.id,
        metadata: { fromPolicy: "HIGHEST", toPolicy: "HIGHEST", fromKkm: null, toKkm: 60 },
      });
    });

    it("locks duration, start time, shuffles and feedback", async () => {
      const { actor, quiz } = await publishedQuiz();
      const r = await updateQuiz(
        actor,
        quiz.id,
        pubSetting({ durationMinutes: "45", startsAt: "2026-11-01T07:00", shuffleQuestions: "on", showFeedbackAfterRelease: "" }),
      );
      expect(fe(r)).toEqual({
        durationMinutes: LOCK,
        startsAt: LOCK,
        shuffleQuestions: LOCK,
        showFeedbackAfterRelease: LOCK,
      });
    });

    it("allows the end time only to move later", async () => {
      const { actor, quiz } = await publishedQuiz();
      expect(fe(await updateQuiz(actor, quiz.id, pubSetting({ endsAt: "2026-11-01T08:30" })))).toEqual({ endsAt: ENDS });
      expect(fe(await updateQuiz(actor, quiz.id, pubSetting({ endsAt: "" })))).toEqual({ endsAt: ENDS });
      expect(await updateQuiz(actor, quiz.id, pubSetting({ endsAt: "2026-11-01T10:00" }))).toEqual({ ok: true });
    });

    it("rejects setting an end time that was empty", async () => {
      const { actor, quiz } = await publishedQuiz();
      await prisma.quiz.update({ where: { id: quiz.id }, data: { endsAt: null } });
      expect(fe(await updateQuiz(actor, quiz.id, pubSetting({ endsAt: "2026-11-01T10:00" })))).toEqual({ endsAt: ENDS });
    });

    it("allows the attempt limit only to rise", async () => {
      const { actor, quiz } = await publishedQuiz();
      expect(fe(await updateQuiz(actor, quiz.id, pubSetting({ maxAttempts: "1" })))).toEqual({ maxAttempts: MAXA });
      expect(await updateQuiz(actor, quiz.id, pubSetting({ maxAttempts: "3" }))).toEqual({ ok: true });
    });
  });
});

describe("countQuizzesByStatus", () => {
  it("counts DRAFT and PUBLISHED quizzes, zero when none", async () => {
    const { actor, subjectId } = await setup();
    expect(await countQuizzesByStatus()).toEqual({ DRAFT: 0, PUBLISHED: 0 });
    await makeQuiz(subjectId, actor);
    await makeQuiz(subjectId, actor, { status: "PUBLISHED" });
    expect(await countQuizzesByStatus()).toEqual({ DRAFT: 1, PUBLISHED: 1 });
  });
});

describe("listQuizzes and getQuizForTeacher", () => {
  it("lists quizzes with subject, count and sorted class names", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor, { title: "Ulangan A" });
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
    await makeQuizQuestion(quiz.id, q.id);
    const zed = await makeClass({ name: "Zeta" });
    const alp = await makeClass({ name: "Alfa" });
    await prisma.quizClass.createMany({
      data: [
        { quizId: quiz.id, classId: zed.id },
        { quizId: quiz.id, classId: alp.id },
      ],
    });
    const rows = await listQuizzes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: quiz.id,
      title: "Ulangan A",
      status: "DRAFT",
      questionCount: 1,
      classNames: ["Alfa", "Zeta"],
    });
    expect(rows[0].subjectName).toBe((await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })).name);
  });

  it("returns the detail with ordered questions, class ids and attempt count", async () => {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const q1 = await makeQuestion(chapter.id, actor, { status: "ACTIVE", prompt: "Soal dua" });
    const q2 = await makeQuestion(chapter.id, actor, { status: "DRAFT", prompt: "Soal satu" });
    await makeQuizQuestion(quiz.id, q2.id, { position: 2, points: 4 });
    await makeQuizQuestion(quiz.id, q1.id, { position: 1, points: 2 });
    const cls = await makeClass();
    await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
    const student = await makeStudent(cls.id);
    await makeAttempt(quiz.id, student.id);

    const d = await getQuizForTeacher(quiz.id);
    expect(d).toMatchObject({
      id: quiz.id,
      status: "DRAFT",
      subjectId,
      classIds: [cls.id],
      attemptCount: 1,
      questions: [
        { questionId: q1.id, position: 1, points: 2, prompt: "Soal dua", status: "ACTIVE", type: "SINGLE_CHOICE" },
        { questionId: q2.id, position: 2, points: 4, prompt: "Soal satu", status: "DRAFT", type: "SINGLE_CHOICE" },
      ],
    });
    expect(await getQuizForTeacher("tidak-ada")).toBeNull();
  });
});

describe("publishQuiz / unpublishQuiz", () => {
  async function ready(over: { prompt?: string; explanation?: string } = {}) {
    const { actor, chapter, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const cls = await makeClass();
    await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE", defaultPoints: 3, explanation: "Karena begitu", ...over });
    const qq = await makeQuizQuestion(quiz.id, q.id, { position: 1, points: 3 });
    return { actor, chapter, subjectId, quiz, cls, q, qq };
  }
  const audits = (action: string) => prisma.auditLog.count({ where: { action: action as never } });

  it("without questions: INVALID_PUBLISH, stays DRAFT, no snapshot", async () => {
    const { actor, subjectId } = await setup();
    const quiz = await makeQuiz(subjectId, actor);
    const cls = await makeClass();
    await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
    const r = await publishQuiz(actor, quiz.id);
    expect(r).toMatchObject({ ok: false, error: "INVALID_PUBLISH" });
    expect((r as { reasons: string[] }).reasons).toContain("Tambahkan minimal satu soal.");
    expect((await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).status).toBe("DRAFT");
    expect(await prisma.quizQuestion.count({ where: { questionSnapshot: { not: undefined } } })).toBe(0);
    expect(await audits("QUIZ_PUBLISHED")).toBe(0);
  });

  it("unknown quiz is NOT_FOUND", async () => {
    const { actor } = await setup();
    expect(await publishQuiz(actor, "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await unpublishQuiz(actor, "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("a rejected publish rolls back snapshots of valid questions", async () => {
    const { actor, chapter, quiz, qq } = await ready();
    const draft = await makeQuestion(chapter.id, actor, { status: "DRAFT" });
    await makeQuizQuestion(quiz.id, draft.id, { position: 2 });
    const r = await publishQuiz(actor, quiz.id);
    expect((r as { reasons: string[] }).reasons).toContain("Soal nomor 2 masih draf. Aktifkan dulu di bank soal.");
    const row = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: qq.id } });
    expect(row.questionSnapshot).toBeNull();
  });

  it("double publish: both ok, one audit, no secret in metadata", async () => {
    const { actor, quiz } = await ready();
    const rs = await Promise.all([publishQuiz(actor, quiz.id), publishQuiz(actor, quiz.id)]);
    expect(rs).toEqual([{ ok: true }, { ok: true }]);
    expect(await audits("QUIZ_PUBLISHED")).toBe(1);
    const a = await prisma.auditLog.findFirstOrThrow({ where: { action: "QUIZ_PUBLISHED" } });
    expect(a.metadata).toEqual({ questionCount: 1, maxPoints: 3 });
    const row = await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } });
    expect(row.status).toBe("PUBLISHED");
    expect(row.publishedAt).not.toBeNull();
  });

  it("snapshot = toPublicQuestion without id; key and explanation only in answerKeySnapshot", async () => {
    const { quiz, q, qq, actor } = await ready();
    await publishQuiz(actor, quiz.id);
    const row = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: qq.id } });
    const expected: Record<string, unknown> = { ...toPublicQuestion((await getQuestionForTeacher(q.id))!) };
    delete expected.id;
    expect(row.questionSnapshot).toEqual(expected);
    expect(row.answerKeySnapshot).toEqual({ answerKey: { optionId: "a" }, explanation: "Karena begitu" });
    expect(JSON.stringify(row.questionSnapshot)).not.toContain("Karena begitu");
  });

  it("image visibility: prompt/option -> QUESTION, explanation only -> EXPLANATION", async () => {
    const { actor, quiz, q, qq } = await ready();
    const i1 = await makeImage(null, actor, { questionId: q.id });
    const i2 = await makeImage(null, actor, { questionId: q.id });
    await makeImage(null, actor, { questionId: q.id }); // unreferenced
    await prisma.question.update({
      where: { id: q.id },
      data: { prompt: `Lihat ![x](aksara-image:${i1.id})`, explanation: `![y](aksara-image:${i2.id})` },
    });
    await publishQuiz(actor, quiz.id);
    const rows = await prisma.quizQuestionImage.findMany({ where: { quizQuestionId: qq.id } });
    expect(rows.map((r) => [r.imageId, r.visibility]).sort()).toEqual(
      [[i1.id, "QUESTION"], [i2.id, "EXPLANATION"]].sort(),
    );
  });

  it("bank edit after publish does not change the snapshot", async () => {
    const { actor, quiz, q, qq, chapter } = await ready();
    await publishQuiz(actor, quiz.id);
    const before = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: qq.id } });
    const r = await updateQuestion(actor, q.id, {
      chapterId: chapter.id, subchapterId: "", type: "SINGLE_CHOICE", prompt: "Prompt baru", explanation: "Baru",
      defaultPoints: 2, difficulty: "EASY", sourceReference: "", verificationNote: "",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answerKey: { optionId: "b" },
    });
    expect(r.ok).toBe(true);
    const after = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: qq.id } });
    expect(after.questionSnapshot).toEqual(before.questionSnapshot);
    expect(after.answerKeySnapshot).toEqual(before.answerKeySnapshot);
  });

  it("a question whose image was soft-deleted blocks publishing of another quiz", async () => {
    const { actor, quiz, q } = await ready();
    const img = await makeImage(null, actor, { questionId: q.id });
    await prisma.question.update({ where: { id: q.id }, data: { prompt: `![x](aksara-image:${img.id})` } });
    await prisma.image.update({ where: { id: img.id }, data: { deletedAt: new Date() } });
    const r = await publishQuiz(actor, quiz.id);
    expect((r as { reasons: string[] }).reasons).toContain("Soal nomor 1 memakai gambar yang sudah dihapus.");
  });

  it("inactive class does not count as active", async () => {
    const { actor, quiz, cls } = await ready();
    await prisma.class.update({ where: { id: cls.id }, data: { isActive: false } });
    const r = await publishQuiz(actor, quiz.id);
    expect((r as { reasons: string[] }).reasons).toContain("Pilih minimal satu kelas aktif.");
  });

  it("edits on a published quiz stay locked after the lock was added", async () => {
    const { actor, quiz, q } = await ready();
    await publishQuiz(actor, quiz.id);
    expect(await addQuizQuestion(quiz.id, q.id)).toMatchObject({ ok: false });
  });

  it("unpublish without attempts: DRAFT, snapshot null, no image rows, one audit", async () => {
    const { actor, quiz, q, qq } = await ready();
    const img = await makeImage(null, actor, { questionId: q.id });
    await prisma.question.update({ where: { id: q.id }, data: { prompt: `![x](aksara-image:${img.id})` } });
    await publishQuiz(actor, quiz.id);
    expect(await prisma.quizQuestionImage.count()).toBe(1);
    expect(await unpublishQuiz(actor, quiz.id)).toEqual({ ok: true });
    const row = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: qq.id } });
    expect(row.questionSnapshot).toBeNull();
    expect(row.answerKeySnapshot).toBeNull();
    expect(await prisma.quizQuestionImage.count()).toBe(0);
    expect(await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).toMatchObject({ status: "DRAFT", publishedAt: null });
    expect(await audits("QUIZ_UNPUBLISHED")).toBe(1);
    expect(await unpublishQuiz(actor, quiz.id)).toEqual({ ok: true }); // draft: no-op
    expect(await audits("QUIZ_UNPUBLISHED")).toBe(1);
  });

  it("unpublish with an attempt: HAS_ATTEMPTS and stays published", async () => {
    const { actor, quiz, cls } = await ready();
    await publishQuiz(actor, quiz.id);
    await makeAttempt(quiz.id, (await makeStudent(cls.id)).id);
    expect(await unpublishQuiz(actor, quiz.id)).toEqual({ ok: false, error: "HAS_ATTEMPTS" });
    expect((await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).status).toBe("PUBLISHED");
  });
});
