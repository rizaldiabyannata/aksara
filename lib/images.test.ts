import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  canStudentViewImage,
  extractImageIds,
  processUpload,
  addImage,
  imageRedirectTarget,
  removeImage,
  updateImageMeta,
} from "@/lib/images";
import { prisma } from "@/lib/db";
import { objects } from "../tests/storage-fake";
import { makeAttempt, makeChapter, makeClass, makeImage, makeMaterial, makeQuestion, makeQuiz, makeQuizQuestion, makeStudent, makeTeacher } from "../tests/factories";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));
beforeEach(() => objects.clear());

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("extractImageIds", () => {
  it("finds ids in images and links, deduped", () => {
    expect(
      extractImageIds(
        "![a](aksara-image:x1) [b](aksara-image:x1) ![c](aksara-image:y2)",
      ),
    ).toEqual(["x1", "y2"]);
  });
});

describe("canStudentViewImage", () => {
  it("lets the teacher see drafts and students see only published", () => {
    expect(
      canStudentViewImage({ role: "TEACHER", materialStatus: "DRAFT" }),
    ).toBe(true);
    expect(
      canStudentViewImage({ role: "STUDENT", materialStatus: "PUBLISHED" }),
    ).toBe(true);
    expect(
      canStudentViewImage({ role: "STUDENT", materialStatus: "DRAFT" }),
    ).toBe(false);
    expect(
      canStudentViewImage({ role: "STUDENT", materialStatus: "REVIEWED" }),
    ).toBe(false);
  });
});

describe("processUpload", () => {
  it("strips EXIF and caps long side at 1600", async () => {
    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "#c00" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Aksara" } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const r = await processUpload(input);
    if (!r.ok) throw new Error(r.error);
    expect(r.image.mimeType).toBe("image/jpeg");
    expect(r.image.ext).toBe("jpg");
    expect(r.image.width).toBe(1600);
    expect(r.image.height).toBe(800);
    expect((await sharp(r.image.data).metadata()).exif).toBeUndefined();
  });

  it("keeps PNG as PNG and does not upscale", async () => {
    const input = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#0c0" },
    })
      .png()
      .toBuffer();
    const r = await processUpload(input);
    if (!r.ok) throw new Error(r.error);
    expect(r.image.mimeType).toBe("image/png");
    expect(r.image.ext).toBe("png");
    expect([r.image.width, r.image.height]).toEqual([300, 200]);
  });

  it("rejects SVG", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(await processUpload(svg)).toEqual({ ok: false, error: "UNSUPPORTED" });
  });

  it("rejects fake .png", async () => {
    expect(await processUpload(Buffer.from("bukan png"))).toEqual({
      ok: false,
      error: "UNSUPPORTED",
    });
  });

  it("rejects truncated PNG", async () => {
    expect(await processUpload(PNG_HEADER)).toEqual({
      ok: false,
      error: "UNSUPPORTED",
    });
  });

  it("rejects decompression bombs without throwing", async () => {
    // Build a 1x1 PNG, then patch IHDR width/height to 30000 (sharp refuses to create a huge image).
    const bomb = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    bomb.writeUInt32BE(30000, 16);
    bomb.writeUInt32BE(30000, 20);
    expect(await processUpload(bomb)).toEqual({ ok: false, error: "UNSUPPORTED" });
  });
});

async function setup(status: "DRAFT" | "PUBLISHED" = "DRAFT") {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  const material = await makeMaterial(chapter.id, user.id, { status });
  const file = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } })
    .jpeg()
    .withExif({ IFD0: { Copyright: "x" } })
    .toBuffer();
  return { user, material, file };
}

describe("addImage", () => {
  it("image without alt text is rejected and nothing is stored", async () => {
    const { user, material, file } = await setup();
    const r = await addImage(user.id, { materialId: material.id, altText: "  ", file });
    expect(r).toMatchObject({ ok: false, error: "INVALID" });
    if (!r.ok && r.error === "INVALID") {
      expect(r.fieldErrors.altText).toBe("Teks alternatif wajib diisi, paling banyak 200 huruf.");
    }
    expect(objects.size).toBe(0);
    expect(await prisma.image.count()).toBe(0);
  });

  it("unknown material is NOT_FOUND and nothing is stored", async () => {
    const { user, file } = await setup();
    expect(await addImage(user.id, { materialId: "nope", altText: "a", file })).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
    expect(objects.size).toBe(0);
  });

  it("rejects unsupported bytes without storing", async () => {
    const { user, material } = await setup();
    const r = await addImage(user.id, { materialId: material.id, altText: "a", file: Buffer.from("hello world!!") });
    expect(r).toEqual({ ok: false, error: "UNSUPPORTED" });
    expect(objects.size).toBe(0);
  });

  it("21st image is rejected with LIMIT", async () => {
    const { user, material, file } = await setup();
    for (let i = 0; i < 20; i++) await makeImage(material.id, user.id);
    expect(await addImage(user.id, { materialId: material.id, altText: "a", file })).toEqual({
      ok: false,
      error: "LIMIT",
    });
    expect(objects.size).toBe(0);
  });

  it("stores a clean object, a row and an audit without the key", async () => {
    const { user, material, file } = await setup();
    const r = await addImage(user.id, { materialId: material.id, altText: " Peta ", caption: "", file });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = await prisma.image.findUniqueOrThrow({ where: { id: r.id } });
    expect(row).toMatchObject({ altText: "Peta", caption: null, sourceReference: null, createdById: user.id });
    expect(row.storageKey).toMatch(/^images\/[0-9a-f-]{36}\.jpg$/);
    const obj = objects.get(row.storageKey)!;
    expect((await sharp(obj.body).metadata()).exif).toBeUndefined();
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "IMAGE_ADDED" } });
    expect(audit.metadata).toEqual({ imageId: r.id, materialId: material.id });
  });

  it("DB failure after put removes the object", async () => {
    const { user, material, file } = await setup();
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("db"));
    await expect(addImage(user.id, { materialId: material.id, altText: "a", file })).rejects.toThrow("db");
    expect(objects.size).toBe(0);
  });
});

describe("updateImageMeta", () => {
  it("updates, validates and reports missing", async () => {
    const { user, material } = await setup();
    const img = await makeImage(material.id, user.id);
    expect(await updateImageMeta(img.id, { altText: "Baru", caption: "C", sourceReference: "" })).toEqual({ ok: true });
    expect(await prisma.image.findUniqueOrThrow({ where: { id: img.id } })).toMatchObject({
      altText: "Baru",
      caption: "C",
      sourceReference: null,
    });
    expect(await updateImageMeta(img.id, { altText: "" })).toMatchObject({ ok: false, error: "INVALID" });
    expect(await updateImageMeta("nope", { altText: "a" })).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("removeImage", () => {
  it("deletes row, object, writes IMAGE_REMOVED without storageKey", async () => {
    const { user, material } = await setup();
    const img = await makeImage(material.id, user.id);
    objects.set(img.storageKey, { body: Buffer.from("x"), contentType: "image/jpeg" });
    expect(await removeImage(user.id, img.id)).toEqual({ ok: true });
    expect(await prisma.image.count()).toBe(0);
    expect(objects.size).toBe(0);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "IMAGE_REMOVED" } });
    expect(audit.metadata).toEqual({ imageId: img.id, materialId: material.id });
    expect(JSON.stringify(audit)).not.toContain(img.storageKey);
    expect(await removeImage(user.id, img.id)).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("imageRedirectTarget", () => {
  it("students get null for DRAFT, URL for PUBLISHED; teacher gets URL for DRAFT", async () => {
    const { user, material } = await setup();
    const pub = await makeMaterial((await makeChapter()).id, user.id, { status: "PUBLISHED" });
    const draftImg = await makeImage(material.id, user.id);
    const pubImg = await makeImage(pub.id, user.id);
    const cls = await makeClass();
    const stu = await makeStudent(cls.id);
    const student = { id: stu.id, role: "STUDENT" } as never;
    const teacher = { id: user.id, role: "TEACHER" } as never;
    expect(await imageRedirectTarget(student, draftImg.id)).toBeNull();
    expect(await imageRedirectTarget(student, pubImg.id)).toBe(`https://r2.test/${pubImg.storageKey}?sig=1`);
    expect(await imageRedirectTarget(teacher, draftImg.id)).toBe(`https://r2.test/${draftImg.storageKey}?sig=1`);
    expect(await imageRedirectTarget(teacher, "nope")).toBeNull();
  });
});

describe("question-owned images", () => {
  async function qsetup() {
    const { user, file } = await setup();
    const q = await makeQuestion((await makeChapter()).id, user.id);
    return { user, q, file };
  }

  it("adds an image to a question, audit has questionId, 6th -> LIMIT", async () => {
    const { user, q, file } = await qsetup();
    const r = await addImage(user.id, { questionId: q.id, altText: "Gambar A", file });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await prisma.image.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({ questionId: q.id, materialId: null });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "IMAGE_ADDED" } });
    expect(audit.metadata).toEqual({ imageId: r.id, questionId: q.id });
    for (let i = 0; i < 4; i++) await makeImage(null, user.id, { questionId: q.id });
    const before = objects.size;
    expect(await addImage(user.id, { questionId: q.id, altText: "a", file })).toEqual({ ok: false, error: "LIMIT" });
    expect(objects.size).toBe(before);
  });

  it("both or no owner -> INVALID form; unknown question -> NOT_FOUND", async () => {
    const { user, q, file } = await qsetup();
    const m = await makeMaterial((await makeChapter()).id, user.id);
    for (const o of [{}, { materialId: m.id, questionId: q.id }]) {
      expect(await addImage(user.id, { ...o, altText: "a", file })).toMatchObject({
        ok: false, error: "INVALID", fieldErrors: { form: expect.any(String) },
      });
    }
    expect(await addImage(user.id, { questionId: "nope", altText: "a", file })).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(objects.size).toBe(0);
  });

  it("removeImage audit of a question image carries questionId", async () => {
    const { user, q } = await qsetup();
    const img = await makeImage(null, user.id, { questionId: q.id });
    await removeImage(user.id, img.id);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "IMAGE_REMOVED" } });
    expect(audit.metadata).toEqual({ imageId: img.id, questionId: q.id });
  });

  it("canStudentViewImage with no material: teacher only", () => {
    expect(canStudentViewImage({ role: "STUDENT", materialStatus: null })).toBe(false);
    expect(canStudentViewImage({ role: "TEACHER", materialStatus: null })).toBe(true);
  });

  it("teacher gets a presigned URL; student gets null even for an ACTIVE question", async () => {
    const { user } = await qsetup();
    const q = await makeQuestion((await makeChapter()).id, user.id, { status: "ACTIVE" });
    const img = await makeImage(null, user.id, { questionId: q.id });
    const stu = await makeStudent((await makeClass()).id);
    expect(await imageRedirectTarget({ id: user.id, role: "TEACHER" } as never, img.id)).toBe(`https://r2.test/${img.storageKey}?sig=1`);
    expect(await imageRedirectTarget({ id: stu.id, role: "STUDENT" } as never, img.id)).toBeNull();
  });
});

describe("removeImage with a published quiz", () => {
  it("referenced: soft delete, row and object stay, audit written; unreferenced: hard delete", async () => {
    const { user } = await setup();
    const chapter = await makeChapter();
    const q = await makeQuestion(chapter.id, user.id);
    const used = await makeImage(null, user.id, { questionId: q.id });
    const free = await makeImage(null, user.id, { questionId: q.id });
    for (const i of [used, free]) objects.set(i.storageKey, { body: Buffer.from("x"), contentType: "image/jpeg" });
    const quiz = await makeQuiz(chapter.subjectId, user.id);
    const qq = await makeQuizQuestion(quiz.id, q.id);
    await prisma.quizQuestionImage.create({ data: { quizQuestionId: qq.id, imageId: used.id, visibility: "QUESTION" } });

    expect(await removeImage(user.id, used.id)).toEqual({ ok: true });
    expect((await prisma.image.findUniqueOrThrow({ where: { id: used.id } })).deletedAt).not.toBeNull();
    expect(objects.has(used.storageKey)).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "IMAGE_REMOVED", entityId: used.id } })).toBe(1);
    expect(await removeImage(user.id, used.id)).toEqual({ ok: false, error: "NOT_FOUND" });

    expect(await removeImage(user.id, free.id)).toEqual({ ok: true });
    expect(await prisma.image.findUnique({ where: { id: free.id } })).toBeNull();
    expect(objects.has(free.storageKey)).toBe(false);
  });

  it("soft-deleted images do not count toward the question limit", async () => {
    const { user, file } = await setup();
    const chapter = await makeChapter();
    const q = await makeQuestion(chapter.id, user.id);
    for (let i = 0; i < 5; i++) await makeImage(null, user.id, { questionId: q.id, deletedAt: new Date() });
    expect((await addImage(user.id, { questionId: q.id, altText: "a", file })).ok).toBe(true);
  });
});

describe("student access to frozen quiz images", () => {
  const T = new Date("2030-01-01T00:00:00.000Z");
  const at = (ms: number) => new Date(T.getTime() + ms);

  async function qz(visibility: "QUESTION" | "EXPLANATION" = "QUESTION", imgOver: object = {}) {
    const { user } = await makeTeacher();
    const chapter = await makeChapter();
    const cls = await makeClass();
    const q = await makeQuestion(chapter.id, user.id, { status: "ACTIVE" });
    const img = await makeImage(null, user.id, { questionId: q.id, ...imgOver });
    const quiz = await makeQuiz(chapter.subjectId, user.id, { status: "PUBLISHED" });
    await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
    const qq = await makeQuizQuestion(quiz.id, q.id);
    await prisma.quizQuestionImage.create({ data: { quizQuestionId: qq.id, imageId: img.id, visibility } });
    const stu = await makeStudent(cls.id);
    const asStudent = { id: stu.id, role: "STUDENT" } as never;
    const url = `https://r2.test/${img.storageKey}?sig=1`;
    const attempt = (over: object = {}) =>
      makeAttempt(quiz.id, stu.id, { startedAt: T, deadlineAt: at(30 * 60_000), ...over });
    return { user, img, quiz, stu, asStudent, url, attempt };
  }

  it("404 before start; 302 in progress; 404 after submit", async () => {
    const c = await qz();
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(1000))).toBeNull();
    const a = await c.attempt();
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(1000))).toBe(c.url);
    await prisma.quizAttempt.update({ where: { id: a.id }, data: { status: "SUBMITTED", submitReason: "MANUAL", submittedAt: at(2000) } });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBeNull();
  });

  it("deadline + 61s without submit: null; within grace: URL", async () => {
    const c = await qz();
    await c.attempt();
    const d = 30 * 60_000;
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(d + 59_000))).toBe(c.url);
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(d + 61_000))).toBeNull();
  });

  it("EXPLANATION is never served during an attempt", async () => {
    const c = await qz("EXPLANATION");
    await c.attempt();
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(1000))).toBeNull();
  });

  it("another student's quiz and replaced attempts: null", async () => {
    const c = await qz();
    await c.attempt();
    const other = await makeStudent((await makeClass()).id);
    expect(await imageRedirectTarget({ id: other.id, role: "STUDENT" } as never, c.img.id, at(1000))).toBeNull();
    await prisma.quizAttempt.updateMany({ where: { quizId: c.quiz.id }, data: { replacementGrantedAt: T } });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(1000))).toBeNull();
  });

  it("soft-deleted frozen image still served to the active attempt; teacher sees everything", async () => {
    const c = await qz("QUESTION", { deletedAt: T });
    await c.attempt();
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(1000))).toBe(c.url);
    expect(await imageRedirectTarget({ id: c.user.id, role: "TEACHER" } as never, c.img.id, at(1000))).toBe(c.url);
  });

  const submitted = { status: "SUBMITTED", submitReason: "MANUAL", submittedAt: at(2000), gradingStatus: "FINAL", objectiveScore: 1 };
  const release = (quizId: string, data: object = {}) =>
    prisma.quiz.update({ where: { id: quizId }, data: { resultsReleasedAt: at(2500), ...data } });

  it("(b) QUESTION image after release; gone after unrelease or when replaced", async () => {
    const c = await qz();
    await c.attempt(submitted);
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBeNull();
    await release(c.quiz.id);
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBe(c.url);
    await release(c.quiz.id, { resultsReleasedAt: null });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBeNull();
    await release(c.quiz.id);
    await prisma.quizAttempt.updateMany({ where: { quizId: c.quiz.id }, data: { replacementGrantedAt: T } });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBeNull();
  });

  it("(b) EXPLANATION follows the key: switch off or remedial still open → null", async () => {
    const c = await qz("EXPLANATION");
    const a = await c.attempt(submitted);
    await release(c.quiz.id);
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBe(c.url);
    await release(c.quiz.id, { showFeedbackAfterRelease: false });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBeNull();
    await release(c.quiz.id, { showFeedbackAfterRelease: true, scoringPolicy: "REMEDIAL", kkm: 70, maxAttempts: 2 });
    await prisma.quizAttempt.update({ where: { id: a.id }, data: { objectiveScore: 0 } });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBeNull();
    await prisma.quizAttempt.update({ where: { id: a.id }, data: { objectiveScore: 1 } });
    expect(await imageRedirectTarget(c.asStudent, c.img.id, at(3000))).toBe(c.url);
  });
});
