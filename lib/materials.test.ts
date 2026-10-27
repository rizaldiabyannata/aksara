import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  canTransition,
  changeMaterialStatus,
  countMaterialsByStatus,
  createMaterial,
  deleteMaterial,
  getMaterialForTeacher,
  getPublishedMaterial,
  listMaterials,
  listPublishedTree,
  moveMaterial,
  updateMaterial,
} from "@/lib/materials";
import { objects } from "../tests/storage-fake";
import { makeChapter, makeImage, makeMaterial, makeSubchapter, makeTeacher } from "../tests/factories";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(() => objects.clear());

const FOREIGN = "Ada kode gambar yang bukan milik materi ini. Pakai tombol Salin kode sisip.";

async function setup() {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  return { actor: user.id, chapter };
}
const valid = (chapterId: string, over: Record<string, string> = {}) => ({
  title: "Judul",
  summary: "Ringkasan",
  content: "Isi",
  examples: "",
  exercises: "",
  sourceReference: "Buku",
  sourcePages: "",
  chapterId,
  subchapterId: "",
  ...over,
});

describe("canTransition", () => {
  it("allowed transitions table", () => {
    const S = ["DRAFT", "REVIEWED", "PUBLISHED"] as const;
    const ok = new Set(["DRAFT>REVIEWED", "REVIEWED>PUBLISHED", "REVIEWED>DRAFT", "PUBLISHED>DRAFT"]);
    for (const a of S) for (const b of S) expect(canTransition(a, b)).toBe(ok.has(`${a}>${b}`));
  });
});

describe("changeMaterialStatus", () => {
  it("DRAFT → PUBLISHED is rejected", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor);
    expect(await changeMaterialStatus(actor, m.id, "PUBLISHED")).toEqual({ ok: false, error: "BAD_TRANSITION" });
    expect((await prisma.material.findUniqueOrThrow({ where: { id: m.id } })).status).toBe("DRAFT");
    expect(await prisma.auditLog.count()).toBe(0);
  });
  it("publishing writes MATERIAL_STATUS_CHANGED and sets publishedAt", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor, { status: "REVIEWED" });
    expect(await changeMaterialStatus(actor, m.id, "PUBLISHED")).toEqual({ ok: true });
    const row = await prisma.material.findUniqueOrThrow({ where: { id: m.id } });
    expect(row.publishedAt).not.toBeNull();
    const a = await prisma.auditLog.findMany({ where: { action: "MATERIAL_STATUS_CHANGED" } });
    expect(a).toHaveLength(1);
    expect(a[0].metadata).toEqual({ from: "REVIEWED", to: "PUBLISHED" });
  });
  it("unknown id is NOT_FOUND", async () => {
    const { actor } = await setup();
    expect(await changeMaterialStatus(actor, "nope", "REVIEWED")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("createMaterial / updateMaterial", () => {
  it("creates with order max+1 and null optionals", async () => {
    const { actor, chapter } = await setup();
    await makeMaterial(chapter.id, actor, { order: 5 });
    const r = await createMaterial(actor, valid(chapter.id));
    if (!r.ok) throw new Error("fail");
    const row = await prisma.material.findUniqueOrThrow({ where: { id: r.id } });
    expect(row.order).toBe(6);
    expect(row.examples).toBeNull();
    expect(row.status).toBe("DRAFT");
  });
  it("whitespace-only title/summary/sourceReference are rejected", async () => {
    const { actor, chapter } = await setup();
    const r = await createMaterial(actor, valid(chapter.id, { title: "  ", summary: " ", sourceReference: "\t" }));
    expect(r.ok).toBe(false);
    if (!r.ok && r.error === "INVALID") expect(Object.keys(r.fieldErrors)).toEqual(expect.arrayContaining(["title", "summary", "sourceReference"]));
  });
  it("subchapter from another chapter is rejected", async () => {
    const { actor, chapter } = await setup();
    const other = await makeChapter();
    const sub = await makeSubchapter(other.id);
    const r = await createMaterial(actor, valid(chapter.id, { subchapterId: sub.id }));
    expect(r).toMatchObject({ ok: false, error: "INVALID", fieldErrors: { subchapterId: "Subbab harus dari bab yang dipilih." } });
  });
  it("aksara-image of another material is rejected; own image accepted", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor);
    const other = await makeMaterial(chapter.id, actor);
    const mine = await makeImage(m.id, actor);
    const theirs = await makeImage(other.id, actor);
    const bad = await updateMaterial(actor, m.id, valid(chapter.id, { content: `![x](aksara-image:${theirs.id})` }));
    expect(bad).toMatchObject({ ok: false, error: "INVALID", fieldErrors: { content: FOREIGN } });
    const good = await updateMaterial(actor, m.id, valid(chapter.id, { content: `![x](aksara-image:${mine.id})` }));
    expect(good).toEqual({ ok: true });
  });
  it("create rejects any image reference", async () => {
    const { actor, chapter } = await setup();
    const r = await createMaterial(actor, valid(chapter.id, { exercises: "![x](aksara-image:abc)" }));
    expect(r).toMatchObject({ ok: false, fieldErrors: { exercises: FOREIGN } });
  });
  it("update rejects a reference to a removed image", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor);
    const img = await makeImage(m.id, actor);
    await prisma.image.delete({ where: { id: img.id } });
    const r = await updateMaterial(actor, m.id, valid(chapter.id, { content: `![x](aksara-image:${img.id})` }));
    expect(r).toMatchObject({ ok: false, error: "INVALID", fieldErrors: { content: FOREIGN } });
  });
  it("editing a published material writes exactly 1 audit with field names only", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor, { status: "PUBLISHED", title: "Lama", content: "Lama isi", summary: "Ringkasan", sourceReference: "Buku" });
    const input = valid(chapter.id, { title: "RAHASIA-BARU", content: "ISI-BARU" });
    expect(await updateMaterial(actor, m.id, input)).toEqual({ ok: true });
    const a = await prisma.auditLog.findMany({ where: { action: "MATERIAL_UPDATED" } });
    expect(a).toHaveLength(1);
    expect((a[0].metadata as { fields: string[] }).fields).toEqual(["title", "content"]);
    expect(JSON.stringify(a[0].metadata)).not.toContain("BARU");
    await updateMaterial(actor, m.id, input);
    expect(await prisma.auditLog.count({ where: { action: "MATERIAL_UPDATED" } })).toBe(1);
  });
  it("editing a DRAFT writes no audit", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor);
    await updateMaterial(actor, m.id, valid(chapter.id, { title: "Baru" }));
    expect(await prisma.auditLog.count()).toBe(0);
  });
  it("moving chapter appends order in the new chapter", async () => {
    const { actor, chapter } = await setup();
    const other = await makeChapter();
    await makeMaterial(other.id, actor, { order: 7 });
    const m = await makeMaterial(chapter.id, actor);
    await updateMaterial(actor, m.id, valid(other.id));
    expect((await prisma.material.findUniqueOrThrow({ where: { id: m.id } })).order).toBe(8);
  });
});

describe("student visibility", () => {
  it("getPublishedMaterial returns null for DRAFT and REVIEWED", async () => {
    const { actor, chapter } = await setup();
    const d = await makeMaterial(chapter.id, actor);
    const r = await makeMaterial(chapter.id, actor, { status: "REVIEWED" });
    const p = await makeMaterial(chapter.id, actor, { status: "PUBLISHED" });
    expect(await getPublishedMaterial(d.id)).toBeNull();
    expect(await getPublishedMaterial(r.id)).toBeNull();
    expect((await getPublishedMaterial(p.id))?.id).toBe(p.id);
  });
  it("listPublishedTree hides chapters without a published material and hides drafts", async () => {
    const { actor, chapter } = await setup();
    const empty = await makeChapter();
    await makeMaterial(empty.id, actor);
    await makeMaterial(chapter.id, actor, { title: "Draft rahasia" });
    const p = await makeMaterial(chapter.id, actor, { status: "PUBLISHED" });
    const tree = await listPublishedTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].chapters).toHaveLength(1);
    expect(tree[0].chapters[0].materials).toEqual([{ id: p.id, title: p.title }]);
  });
  it("no storageKey in teacher or student detail", async () => {
    const { actor, chapter } = await setup();
    const m = await makeMaterial(chapter.id, actor, { status: "PUBLISHED" });
    const img = await makeImage(m.id, actor);
    for (const d of [await getMaterialForTeacher(m.id), await getPublishedMaterial(m.id)]) {
      expect(d?.images).toHaveLength(1);
      const s = JSON.stringify(d);
      expect(s).not.toContain("storageKey");
      expect(s).not.toContain(img.storageKey);
    }
  });
});

describe("deleteMaterial", () => {
  it("refuses PUBLISHED; deletes DRAFT with its images and R2 objects", async () => {
    const { actor, chapter } = await setup();
    const pub = await makeMaterial(chapter.id, actor, { status: "PUBLISHED" });
    expect(await deleteMaterial(actor, pub.id)).toEqual({ ok: false, error: "NOT_DRAFT" });
    const m = await makeMaterial(chapter.id, actor);
    const img = await makeImage(m.id, actor);
    objects.set(img.storageKey, { body: Buffer.from("x"), contentType: "image/jpeg" });
    expect(await deleteMaterial(actor, m.id)).toEqual({ ok: true });
    expect(objects.size).toBe(0);
    expect(await prisma.image.count()).toBe(0);
    expect(await prisma.material.count({ where: { id: m.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "MATERIAL_DELETED" } })).toBe(1);
  });
});

describe("ordering and listing", () => {
  it("moveMaterial swaps within chapter", async () => {
    const { actor, chapter } = await setup();
    const a = await makeMaterial(chapter.id, actor, { order: 1 });
    const b = await makeMaterial(chapter.id, actor, { order: 2 });
    expect(await moveMaterial(b.id, "up")).toEqual({ ok: true });
    const o = async (id: string) => (await prisma.material.findUniqueOrThrow({ where: { id } })).order;
    expect([await o(a.id), await o(b.id)]).toEqual([2, 1]);
    expect(await moveMaterial(b.id, "up")).toEqual({ ok: true }); // already first: no-op
    expect(await o(b.id)).toBe(1);
  });
  it("listMaterials caps at 200", async () => {
    const { actor, chapter } = await setup();
    await prisma.material.createMany({
      data: Array.from({ length: 201 }, (_, i) => ({
        chapterId: chapter.id, title: `M${i}`, summary: "s", content: "c", sourceReference: "b",
        order: i + 1, createdById: actor, updatedById: actor,
      })),
    });
    const r = await listMaterials({});
    expect(r.rows).toHaveLength(200);
    expect(r.capped).toBe(true);
    expect((await listMaterials({ chapterId: chapter.id, status: "PUBLISHED" })).rows).toHaveLength(0);
  });
  it("countMaterialsByStatus counts all statuses", async () => {
    const { actor, chapter } = await setup();
    await makeMaterial(chapter.id, actor);
    await makeMaterial(chapter.id, actor, { status: "PUBLISHED" });
    expect(await countMaterialsByStatus()).toEqual({ DRAFT: 1, REVIEWED: 0, PUBLISHED: 1 });
  });
});
