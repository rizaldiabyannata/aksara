import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  countQuestionsByStatus,
  createQuestion,
  deleteQuestion,
  duplicateQuestion,
  getQuestionForTeacher,
  listQuestions,
  setQuestionStatus,
  toPublicQuestion,
  updateQuestion,
} from "@/lib/questions";
import * as storage from "@/lib/storage";
import { objects } from "../tests/storage-fake";
import { makeChapter, makeImage, makeMaterial, makeQuestion, makeSubchapter, makeTeacher } from "../tests/factories";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(() => objects.clear());

const FOREIGN = "Ada kode gambar yang bukan milik soal ini. Pakai tombol Salin kode sisip.";
const O = (...ids: string[]) => ids.map((id) => ({ id, text: `Opsi ${id}` }));

async function setup() {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  return { actor: user.id, chapter };
}
const base = (chapterId: string) => ({
  chapterId, subchapterId: "", prompt: "Berapa 1+1?", explanation: "", defaultPoints: 2,
  difficulty: "EASY", sourceReference: "", verificationNote: "",
});
const sc = (chapterId: string, over: object = {}) => ({
  ...base(chapterId), type: "SINGLE_CHOICE", options: O("a", "b", "c"), answerKey: { optionId: "b" }, ...over,
});
const fe = (r: unknown) => (r as { fieldErrors: Record<string, string> }).fieldErrors;

describe("createQuestion validation", () => {
  it("accepts all five types", async () => {
    const { actor, chapter } = await setup();
    const b = base(chapter.id);
    const inputs = [
      sc(chapter.id),
      { ...b, type: "TRUE_FALSE", answerKey: { value: false } },
      { ...b, type: "MULTIPLE_SELECT", options: O("a", "b", "c"), answerKey: { optionIds: ["a", "c"] } },
      { ...b, type: "SHORT_ANSWER", answerKey: { accepted: [" Jakarta "], caseSensitive: false } },
      { ...b, type: "ESSAY" },
    ];
    for (const i of inputs) expect((await createQuestion(actor, i)).ok).toBe(true);
    const rows = await prisma.question.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows[1].options).toBeNull();
    expect(rows[3].answerKey).toEqual({ accepted: ["Jakarta"], caseSensitive: false });
    expect(rows[4].answerKey).toEqual({ rubric: null });
  });

  it("single choice key and option count errors", async () => {
    const { actor, chapter } = await setup();
    const c = chapter.id;
    expect(fe(await createQuestion(actor, sc(c, { answerKey: { optionId: "z" } }))).answerKey).toBe(
      "Pilih satu jawaban benar dari opsi yang terisi.",
    );
    // correct mark on a blank slot
    expect(fe(await createQuestion(actor, sc(c, { options: O("a", "b"), answerKey: { optionId: "c" } }))).answerKey).toBeDefined();
    expect(fe(await createQuestion(actor, sc(c, { options: O("a") }))).options).toBe("Isi 2 sampai 6 opsi.");
    expect(fe(await createQuestion(actor, sc(c, { options: O("a", "b", "c", "d", "e", "f", "g") }))).options).toBe("Isi 2 sampai 6 opsi.");
  });

  it("multiple select rules", async () => {
    const { actor, chapter } = await setup();
    const ms = (ids: string[]) => ({
      ...base(chapter.id), type: "MULTIPLE_SELECT", options: O("a", "b", "c"), answerKey: { optionIds: ids },
    });
    const msg = "Tandai minimal satu jawaban benar, tetapi jangan semuanya.";
    expect(fe(await createQuestion(actor, ms(["a", "b", "c"]))).answerKey).toBe(msg);
    expect(fe(await createQuestion(actor, ms([]))).answerKey).toBe(msg);
    expect(fe(await createQuestion(actor, ms(["a", "z"]))).answerKey).toBeDefined();
    expect(fe(await createQuestion(actor, { ...ms(["a"]), options: O("a", "b") })).options).toBe("Isi 3 sampai 8 opsi.");
  });

  it("duplicate options", async () => {
    const { actor, chapter } = await setup();
    const dup = [{ id: "a", text: "A" }, { id: "b", text: "A " }];
    expect(fe(await createQuestion(actor, sc(chapter.id, { options: dup, answerKey: { optionId: "a" } }))).options).toBe(
      "Teks opsi tidak boleh sama.",
    );
    const img = [{ id: "a", text: "A ![x](aksara-image:p)" }, { id: "b", text: "A ![x](aksara-image:q)" }];
    // refs fail (create has no images) but not as duplicates
    expect(fe(await createQuestion(actor, sc(chapter.id, { options: img, answerKey: { optionId: "a" } }))).options).toBe(FOREIGN);
  });

  it("short answer rules", async () => {
    const { actor, chapter } = await setup();
    const sa = (accepted: string[], caseSensitive = false) => ({
      ...base(chapter.id), type: "SHORT_ANSWER", answerKey: { accepted, caseSensitive },
    });
    const msg = "Isi 1 sampai 10 jawaban yang diterima, satu per baris.";
    expect(fe(await createQuestion(actor, sa([]))).answerKey).toBe(msg);
    expect(fe(await createQuestion(actor, sa(["   "]))).answerKey).toBe(msg);
    expect(fe(await createQuestion(actor, sa(Array.from({ length: 11 }, (_, i) => `k${i}`)))).answerKey).toBe(msg);
    expect(fe(await createQuestion(actor, sa(["Jakarta", " jakarta "]))).answerKey).toBe("Ada jawaban diterima yang sama.");
    expect((await createQuestion(actor, sa(["Jakarta", " jakarta "], true))).ok).toBe(true);
    expect(fe(await createQuestion(actor, sa(["x".repeat(201)]))).answerKey).toBe("Setiap jawaban paling banyak 200 huruf.");
  });

  it("option id outside a-h, points, prompt", async () => {
    const { actor, chapter } = await setup();
    const c = chapter.id;
    const bad = [{ id: "__proto__", text: "x" }, { id: "b", text: "y" }];
    expect(fe(await createQuestion(actor, sc(c, { options: bad }))).options).toBeDefined();
    for (const p of [0, 101, 1.5]) {
      expect(fe(await createQuestion(actor, sc(c, { defaultPoints: p }))).defaultPoints).toBe("Poin harus bilangan bulat 1 sampai 100.");
    }
    expect(fe(await createQuestion(actor, sc(c, { prompt: "   " }))).prompt).toBe("Teks soal wajib diisi, paling banyak 5.000 huruf.");
    expect(fe(await createQuestion(actor, sc(c, { difficulty: "X" }))).difficulty).toBe("Pilih tingkat kesulitan.");
  });

  it("subchapter must belong to chapter", async () => {
    const { actor, chapter } = await setup();
    const other = await makeChapter();
    const sub = await makeSubchapter(other.id);
    expect(fe(await createQuestion(actor, sc(chapter.id, { subchapterId: sub.id }))).subchapterId).toBe(
      "Subbab harus dari bab yang dipilih.",
    );
  });

  it("image refs must belong to this question", async () => {
    const { actor, chapter } = await setup();
    const { user } = await makeTeacher();
    const q2 = await makeQuestion(chapter.id, actor);
    const foreignQ = await makeImage(null, actor, { questionId: q2.id });
    const mat = await makeMaterial(chapter.id, user.id);
    const foreignM = await makeImage(mat.id, actor);
    for (const id of [foreignQ.id, foreignM.id]) {
      const r = await createQuestion(actor, sc(chapter.id, { prompt: `![x](aksara-image:${id})` }));
      expect(fe(r).prompt).toBe(FOREIGN);
    }
    const r = await createQuestion(actor, sc(chapter.id, { explanation: `![x](aksara-image:${foreignQ.id})` }));
    expect(fe(r).explanation).toBe(FOREIGN);
    // own image accepted on update
    const own = await makeImage(null, actor, { questionId: q2.id });
    const up = await updateQuestion(actor, q2.id, sc(chapter.id, { prompt: `![x](aksara-image:${own.id})` }));
    expect(up.ok).toBe(true);
  });
});

describe("updateQuestion", () => {
  it("rejects type change", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor);
    const r = await updateQuestion(actor, q.id, { ...base(chapter.id), type: "ESSAY" });
    expect(fe(r).type).toBe("Tipe soal tidak bisa diubah.");
  });

  it("not found", async () => {
    const { actor, chapter } = await setup();
    expect(await updateQuestion(actor, "nope", sc(chapter.id))).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("audits only ACTIVE edits, field names only", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor);
    expect((await updateQuestion(actor, q.id, sc(chapter.id, { prompt: "Draf baru" }))).ok).toBe(true);
    expect(await prisma.auditLog.count()).toBe(0);
    await setQuestionStatus(actor, q.id, "ACTIVE");
    const edit = sc(chapter.id, { prompt: "RAHASIA-PROMPT", answerKey: { optionId: "c" } });
    expect((await updateQuestion(actor, q.id, edit)).ok).toBe(true);
    const a = await prisma.auditLog.findMany({ where: { action: "QUESTION_UPDATED" } });
    expect(a).toHaveLength(1);
    expect(a[0].metadata).toEqual({ fields: ["prompt", "answerKey"] });
    expect(JSON.stringify(a[0].metadata)).not.toContain("RAHASIA");
    await updateQuestion(actor, q.id, edit);
    expect(await prisma.auditLog.count({ where: { action: "QUESTION_UPDATED" } })).toBe(1);
  });
});

describe("status and delete", () => {
  it("status change audits once, same status is a no-op", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor);
    expect(await setQuestionStatus(actor, q.id, "ACTIVE")).toEqual({ ok: true });
    expect(await setQuestionStatus(actor, q.id, "ACTIVE")).toEqual({ ok: true });
    const a = await prisma.auditLog.findMany({ where: { action: "QUESTION_STATUS_CHANGED" } });
    expect(a).toHaveLength(1);
    expect(a[0].metadata).toEqual({ from: "DRAFT", to: "ACTIVE" });
    expect(await setQuestionStatus(actor, "nope", "ACTIVE")).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await countQuestionsByStatus()).toEqual({ DRAFT: 0, ACTIVE: 1 });
  });

  it("refuses to delete ACTIVE", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE" });
    expect(await deleteQuestion(actor, q.id)).toEqual({ ok: false, error: "NOT_DRAFT" });
    expect(await prisma.question.count()).toBe(1);
  });

  it("deletes DRAFT with images and objects", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor);
    const img = await makeImage(null, actor, { questionId: q.id, storageKey: "images/q1.jpg" });
    objects.set(img.storageKey, { data: Buffer.from("x"), contentType: "image/jpeg" } as never);
    expect(await deleteQuestion(actor, q.id)).toEqual({ ok: true });
    expect(await prisma.question.count()).toBe(0);
    expect(await prisma.image.count()).toBe(0);
    expect(objects.size).toBe(0);
    const a = await prisma.auditLog.findMany({ where: { action: "QUESTION_DELETED" } });
    expect(a).toHaveLength(1);
    expect(a[0].metadata).toEqual({ type: "SINGLE_CHOICE", chapterId: chapter.id });
    expect(await deleteQuestion(actor, q.id)).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("toPublicQuestion", () => {
  it("is an allowlist: no key, explanation, rubric, note, hidden image or storageKey", () => {
    const img = (id: string) => ({ id, altText: "a", caption: null, sourceReference: null, width: 1, height: 1, storageKey: "SK-SECRET" });
    const q = {
      id: "q1", type: "SHORT_ANSWER" as const, prompt: "Ibu kota? ![x](aksara-image:i1)",
      options: [{ id: "a", text: "A ![x](aksara-image:i2)", correct: true } as never],
      images: [img("i1"), img("i2"), img("i3")],
      answerKey: { accepted: ["KUNCI-UNIK"] }, explanation: "PEMBAHASAN ![x](aksara-image:i3)",
      verificationNote: "CATATAN", rubric: "RUBRIK",
    };
    const p = toPublicQuestion(q);
    const s = JSON.stringify(p);
    for (const bad of ["KUNCI-UNIK", "PEMBAHASAN", "CATATAN", "RUBRIK", "i3", "SK-SECRET", "storageKey", "correct"]) {
      expect(s).not.toContain(bad);
    }
    expect(p.images.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(p.options).toEqual([{ id: "a", text: "A ![x](aksara-image:i2)" }]);
  });
});

describe("listQuestions / getQuestionForTeacher", () => {
  it("filters every dimension and q case-insensitively", async () => {
    const { actor, chapter } = await setup();
    const other = await makeChapter();
    const sub = await makeSubchapter(chapter.id);
    const a = await makeQuestion(chapter.id, actor, { prompt: "Luas Segitiga", subchapterId: sub.id, difficulty: "HARD", status: "ACTIVE", type: "ESSAY", options: undefined, answerKey: { rubric: null } });
    await makeQuestion(other.id, actor, { prompt: "lain" });
    const ids = async (f: Parameters<typeof listQuestions>[0]) => (await listQuestions(f)).rows.map((r) => r.id);
    expect(await ids({})).toHaveLength(2);
    expect(await ids({ chapterId: chapter.id })).toEqual([a.id]);
    expect(await ids({ subjectId: chapter.subjectId })).toEqual([a.id]);
    expect(await ids({ subchapterId: sub.id })).toEqual([a.id]);
    expect(await ids({ type: "ESSAY" })).toEqual([a.id]);
    expect(await ids({ difficulty: "HARD" })).toEqual([a.id]);
    expect(await ids({ status: "ACTIVE" })).toEqual([a.id]);
    expect(await ids({ q: "  segitiga " })).toEqual([a.id]);
    expect(await ids({ q: "   " })).toHaveLength(2);
  });

  it("paginates 50 per page", async () => {
    const { actor, chapter } = await setup();
    await prisma.question.createMany({
      data: Array.from({ length: 51 }, (_, i) => ({
        chapterId: chapter.id, type: "TRUE_FALSE" as const, prompt: `s${i}`, answerKey: { value: true },
        defaultPoints: 1, difficulty: "EASY" as const, createdById: actor, updatedById: actor,
      })),
    });
    const p1 = await listQuestions({});
    expect(p1.rows).toHaveLength(50);
    expect(p1.hasNext).toBe(true);
    for (const page of [NaN, 0]) expect((await listQuestions({ page })).rows).toHaveLength(50);
    const p2 = await listQuestions({ page: 2 });
    expect(p2.rows).toHaveLength(1);
    expect(p2.hasNext).toBe(false);
    expect((await listQuestions({ page: 999 })).rows).toHaveLength(0);
  });

  it("detail never carries storageKey", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor);
    await makeImage(null, actor, { questionId: q.id, storageKey: "images/zzz.jpg" });
    const d = await getQuestionForTeacher(q.id);
    expect(d?.images).toHaveLength(1);
    expect(JSON.stringify(d)).not.toContain("zzz");
    expect(d?.subjectName).toBeDefined();
    expect(await getQuestionForTeacher("nope")).toBeNull();
  });
});

describe("question options with own images", () => {
  it("option texts that differ only in own image ids are accepted", async () => {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor);
    const i1 = await makeImage(null, actor, { questionId: q.id });
    const i2 = await makeImage(null, actor, { questionId: q.id });
    const options = [
      { id: "a", text: `![x](aksara-image:${i1.id})` },
      { id: "b", text: `![x](aksara-image:${i2.id})` },
    ];
    const r = await updateQuestion(actor, q.id, sc(chapter.id, { options, answerKey: { optionId: "a" } }));
    expect(r.ok).toBe(true);
  });
});

describe("duplicateQuestion", () => {
  async function withImages() {
    const { actor, chapter } = await setup();
    const q = await makeQuestion(chapter.id, actor, { status: "ACTIVE", explanation: "x" });
    const i1 = await makeImage(null, actor, { questionId: q.id, storageKey: "images/old1.png", altText: "Alt 1", caption: "Cap", mimeType: "image/png" });
    const i2 = await makeImage(null, actor, { questionId: q.id, storageKey: "images/old2.jpg" });
    for (const i of [i1, i2]) objects.set(i.storageKey, { body: Buffer.from("x"), contentType: i.mimeType });
    const ref = (i: { id: string }) => `![a](aksara-image:${i.id})`;
    await prisma.question.update({
      where: { id: q.id },
      data: {
        prompt: `P ${ref(i1)} ${ref(i1)}`,
        options: [{ id: "a", text: ref(i1) }, { id: "b", text: ref(i2) }],
        explanation: `E ${ref(i2)}`,
      },
    });
    return { actor, q, i1, i2 };
  }

  it("copies images and rewrites ids; source untouched; DRAFT; no audit", async () => {
    const { actor, q, i1, i2 } = await withImages();
    const before = await prisma.question.findUniqueOrThrow({ where: { id: q.id } });
    const r = await duplicateQuestion(actor, q.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dup = await prisma.question.findUniqueOrThrow({ where: { id: r.id }, include: { images: true } });
    expect(dup.status).toBe("DRAFT");
    expect(dup.images).toHaveLength(2);
    const byAlt = (alt: string) => dup.images.find((i) => i.altText === alt)!;
    const n1 = byAlt("Alt 1");
    const n2 = dup.images.find((i) => i.id !== n1.id)!;
    expect(n1).toMatchObject({ caption: "Cap", mimeType: "image/png", questionId: r.id });
    expect(n1.storageKey).toMatch(/^images\/[0-9a-f-]{36}\.png$/);
    expect(n2.storageKey).toMatch(/\.jpg$/);
    expect(objects.has(n1.storageKey) && objects.has(n2.storageKey)).toBe(true);
    expect(dup.prompt).toBe(`P ![a](aksara-image:${n1.id}) ![a](aksara-image:${n1.id})`);
    expect(dup.options).toEqual([
      { id: "a", text: `![a](aksara-image:${n1.id})` },
      { id: "b", text: `![a](aksara-image:${n2.id})` },
    ]);
    expect(dup.explanation).toBe(`E ![a](aksara-image:${n2.id})`);
    expect(dup.createdById).toBe(actor);
    expect(JSON.stringify(dup)).not.toContain(i1.id);
    expect(await prisma.question.findUniqueOrThrow({ where: { id: q.id } })).toEqual(before);
    expect(await prisma.image.count({ where: { questionId: q.id } })).toBe(2);
    expect(i2.id).not.toBe(n2.id);
    expect(await prisma.auditLog.count()).toBe(0);
    expect(await duplicateQuestion(actor, "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("rolls back when the 2nd copy fails", async () => {
    const { actor, q } = await withImages();
    const real = (await import("../tests/storage-fake")).storageMock().copyObject;
    const spy = vi.spyOn(storage, "copyObject")
      .mockImplementationOnce(real)
      .mockRejectedValueOnce(new Error("R2 down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(duplicateQuestion(actor, q.id)).rejects.toThrow("R2 down");
    expect(await prisma.question.count()).toBe(1);
    expect(await prisma.image.count()).toBe(2);
    expect([...objects.keys()].sort()).toEqual(["images/old1.png", "images/old2.jpg"]);
    spy.mockRestore();
    errSpy.mockRestore();
  });
});
