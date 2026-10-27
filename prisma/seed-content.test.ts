import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { seedContent } from "./seed-content";

describe("seedContent", () => {
  it("creates 2 subjects, 10 chapters, 0 subchapters and is idempotent", async () => {
    await seedContent();
    await seedContent();
    expect(await prisma.subject.count()).toBe(2);
    expect(await prisma.chapter.count()).toBe(10);
    expect(await prisma.subchapter.count()).toBe(0);
    const ipas6 = await prisma.chapter.findFirst({
      where: { subject: { name: "IPAS" }, order: 6 },
    });
    expect(ipas6?.title).toBe("Mengembara di Jagat Raya");
  });

  it("does not overwrite a teacher-edited chapter title", async () => {
    await seedContent();
    const ch = await prisma.chapter.findFirstOrThrow({ where: { order: 1 } });
    await prisma.chapter.update({ where: { id: ch.id }, data: { title: "Judul Guru" } });
    await seedContent();
    expect((await prisma.chapter.findUniqueOrThrow({ where: { id: ch.id } })).title).toBe(
      "Judul Guru",
    );
  });
});
