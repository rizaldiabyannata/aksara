import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  deleteChapter,
  deleteSubchapter,
  deleteSubject,
  getSubjectTree,
  listChapterOptions,
  moveChapter,
  moveSubchapter,
  saveChapter,
  saveSubchapter,
  saveSubject,
} from "@/lib/subjects";
import { makeChapter, makeMaterial, makeSubchapter, makeTeacher } from "../tests/factories";

async function actor() {
  return (await makeTeacher()).user.id;
}

describe("saveSubject", () => {
  it("creates, trims the name, and rejects a duplicate with NAME_TAKEN", async () => {
    const r = await saveSubject(null, { name: "  Matematika ", description: "" });
    expect(r).toEqual({ ok: true });
    const s = await prisma.subject.findUniqueOrThrow({ where: { name: "Matematika" } });
    expect(s.description).toBeNull();
    expect(await saveSubject(null, { name: "Matematika" })).toEqual({
      ok: false,
      error: "NAME_TAKEN",
    });
  });

  it("returns NOT_FOUND when updating a missing id", async () => {
    expect(await saveSubject("nope", { name: "IPAS" })).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("deleteSubject", () => {
  it("subject with chapters cannot be deleted", async () => {
    const c = await makeChapter();
    const r = await deleteSubject(c.subjectId);
    expect(r).toMatchObject({ ok: false, error: "IN_USE" });
    if (r.ok || r.error !== "IN_USE") return;
    expect(r.message).toBe("Mapel ini masih punya 1 bab.");
    expect(await prisma.subject.count({ where: { id: c.subjectId } })).toBe(1);
  });
});

describe("saveChapter", () => {
  it("rejects blank title with INVALID", async () => {
    const c = await makeChapter();
    const r = await saveChapter(c.subjectId, null, {
      title: "   ",
      sourceBook: "Buku Uji",
      sourceYearOrEdition: "2022",
    });
    expect(r).toMatchObject({ ok: false, error: "INVALID" });
    if (r.ok || r.error !== "INVALID") return;
    expect(r.fieldErrors.title).toBeTruthy();
  });

  it("new chapter gets max+1 order", async () => {
    const c = await makeChapter({ order: 3 });
    const r = await saveChapter(c.subjectId, null, {
      title: "Bab Baru",
      sourceBook: "Buku Uji",
      sourceYearOrEdition: "2022",
    });
    expect(r).toEqual({ ok: true });
    const created = await prisma.chapter.findFirstOrThrow({
      where: { subjectId: c.subjectId, title: "Bab Baru" },
    });
    expect(created.order).toBe(4);
  });

  it("returns NOT_FOUND when updating a missing id", async () => {
    const c = await makeChapter();
    const input = { title: "X", sourceBook: "Buku", sourceYearOrEdition: "2022" };
    expect(await saveChapter(c.subjectId, "nope", input)).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("deleteChapter", () => {
  it("chapter with a material cannot be deleted", async () => {
    const a = await actor();
    const c = await makeChapter();
    await makeMaterial(c.id, a);
    const r = await deleteChapter(c.id);
    expect(r).toMatchObject({ ok: false, error: "IN_USE" });
    if (r.ok || r.error !== "IN_USE") return;
    expect(r.message).toContain("1 materi");
    expect(await prisma.chapter.count({ where: { id: c.id } })).toBe(1);
  });

  it("chapter with a subchapter cannot be deleted", async () => {
    const c = await makeChapter();
    await makeSubchapter(c.id);
    expect(await deleteChapter(c.id)).toMatchObject({ ok: false, error: "IN_USE" });
  });
});

describe("moveChapter", () => {
  it("swaps order with neighbour and is a no-op at the edge", async () => {
    const first = await makeChapter({ order: 1 });
    const second = await prisma.chapter.create({
      data: {
        subjectId: first.subjectId,
        title: "Bab Dua",
        order: 2,
        sourceBook: "Buku Uji",
        sourceYearOrEdition: "2022",
      },
    });

    expect(await moveChapter(second.id, "up")).toEqual({ ok: true });
    expect((await prisma.chapter.findUniqueOrThrow({ where: { id: first.id } })).order).toBe(2);
    expect((await prisma.chapter.findUniqueOrThrow({ where: { id: second.id } })).order).toBe(1);

    expect(await moveChapter(second.id, "up")).toEqual({ ok: true });
    expect((await prisma.chapter.findUniqueOrThrow({ where: { id: second.id } })).order).toBe(1);

    expect(await moveChapter("nope", "down")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("subchapters", () => {
  it("subchapter with a material cannot be deleted", async () => {
    const a = await actor();
    const c = await makeChapter();
    const s = await makeSubchapter(c.id);
    await makeMaterial(c.id, a, { subchapterId: s.id });
    const r = await deleteSubchapter(s.id);
    expect(r).toMatchObject({ ok: false, error: "IN_USE", message: "Subbab ini masih dipakai 1 materi." });
  });

  it("moveSubchapter swaps with the neighbour inside its chapter", async () => {
    const c = await makeChapter();
    const s1 = await makeSubchapter(c.id, { order: 1 });
    const s2 = await makeSubchapter(c.id, { order: 2 });
    expect(await moveSubchapter(s2.id, "up")).toEqual({ ok: true });
    expect((await prisma.subchapter.findUniqueOrThrow({ where: { id: s1.id } })).order).toBe(2);
    expect((await prisma.subchapter.findUniqueOrThrow({ where: { id: s2.id } })).order).toBe(1);
  });

  it("saveSubchapter creates with max+1 and returns NOT_FOUND for a missing chapter", async () => {
    const c = await makeChapter();
    await makeSubchapter(c.id, { order: 5 });
    expect(await saveSubchapter(c.id, null, { title: "Baru", sourcePages: "" })).toEqual({ ok: true });
    const created = await prisma.subchapter.findFirstOrThrow({ where: { title: "Baru" } });
    expect(created).toMatchObject({ order: 6, sourcePages: null });
    expect(await saveSubchapter("nope", null, { title: "X" })).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("getSubjectTree", () => {
  it("counts materials per chapter", async () => {
    const a = await actor();
    const c = await makeChapter({ order: 1 });
    await makeMaterial(c.id, a);
    await makeMaterial(c.id, a);
    await makeChapter({ subjectId: c.subjectId, title: "Bab Kosong", order: 2 });
    const tree = await getSubjectTree();
    const subject = tree.find((s) => s.id === c.subjectId);
    expect(subject?.chapters.map((ch) => ch.materialCount)).toEqual([2, 0]);
  });
});

describe("listChapterOptions", () => {
  it("labels chapters as Mapel · Bab n · Judul", async () => {
    const c = await makeChapter({ title: "Pecahan dan Desimal", order: 1 });
    await prisma.subject.update({ where: { id: c.subjectId }, data: { name: "Matematika" } });
    const opts = await listChapterOptions();
    const opt = opts.find((o) => o.id === c.id);
    expect(opt?.label).toBe("Matematika · Bab 1 · Pecahan dan Desimal");
  });
});
