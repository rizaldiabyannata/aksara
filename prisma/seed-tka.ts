// Tryout TKA seed (Tahap 10): kisi-kisi structure, 30 + 30 DRAFT questions, two DRAFT tryout quizzes.
// Run: bun run db:seed:tka (needs the teacher from db:seed and the S3_* env for figures). Idempotent.
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { addImage } from "@/lib/images";
import { createQuestion } from "@/lib/questions";
import { BAHASA_INDONESIA } from "./tka/bahasa-indonesia";
import { FIGURES } from "./tka/figures";
import { MATEMATIKA } from "./tka/matematika";
import { SOURCE, type TkaItem, type TkaSubject } from "./tka/types";

export const TKA_SUBJECTS: TkaSubject[] = [MATEMATIKA, BAHASA_INDONESIA];
const SOURCE_BOOK = "Kisi-kisi TKA SD/MI (Perkaban BSKAP 047/H/AN/2025)";
const EDITION = "2025, perlu dicek ke Pusmendik";
const IDS = "abcdefgh";
const INSTRUCTIONS =
  "Tryout ini berisi 30 soal dan dikerjakan dalam 75 menit. Ada tiga bentuk soal: pilihan ganda (pilih satu), " +
  "pilihan ganda kompleks (pilih semua yang benar), dan kategori (jawab setiap pernyataan). " +
  "Nilai dan kategorinya hanya perkiraan, bukan nilai TKA resmi.";

/** Domain input for createQuestion. Choice options are rotated by `index` so the key is not always A. */
export function toInput(item: TkaItem, chapterId: string, subchapterId: string | undefined, index: number) {
  const n = item.options.length;
  const r = item.type === "CATEGORY" ? 0 : index % n;
  const options = item.options.map((_, j) => ({ id: IDS[j], text: item.options[(j + r) % n] }));
  const at = (old: number) => IDS[(old - r + n) % n];
  const answerKey =
    item.type === "SINGLE_CHOICE" ? { optionId: at(item.key) }
    : item.type === "MULTIPLE_SELECT" ? { optionIds: item.key.map(at) }
    : { values: Object.fromEntries(item.key.map((v, j) => [IDS[j], v])) };
  return {
    chapterId, subchapterId, type: item.type, prompt: item.prompt, options, answerKey,
    explanation: item.explanation, defaultPoints: 1, difficulty: item.difficulty,
    cognitiveLevel: item.level ?? null, sourceReference: SOURCE,
    ...(item.type === "CATEGORY" && { categoryLabels: item.labels ?? ["Benar", "Salah"] }),
  };
}

async function figurePng(name: keyof typeof FIGURES): Promise<Uint8Array> {
  const white = { r: 255, g: 255, b: 255, alpha: 1 };
  // trim() drops the empty canvas around the drawing; extend() gives it a small even margin back.
  return sharp(Buffer.from(FIGURES[name]()))
    .flatten({ background: white })
    .trim()
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: white })
    .png()
    .toBuffer();
}

async function upsertStructure(s: TkaSubject) {
  const subject = await prisma.subject.upsert({ where: { name: s.name }, update: {}, create: { name: s.name } });
  const chapters = new Map<string, { id: string; subs: Map<string, string> }>();
  for (const [i, c] of s.chapters.entries()) {
    const chapter = await prisma.chapter.upsert({
      where: { subjectId_order: { subjectId: subject.id, order: i + 1 } },
      update: {},
      create: { subjectId: subject.id, order: i + 1, title: c.title, sourceBook: SOURCE_BOOK, sourceYearOrEdition: EDITION },
    });
    const subs = new Map<string, string>();
    for (const [j, title] of c.subs.entries()) {
      const sub = await prisma.subchapter.upsert({
        where: { chapterId_order: { chapterId: chapter.id, order: j + 1 } },
        update: {},
        create: { chapterId: chapter.id, order: j + 1, title },
      });
      subs.set(title, sub.id);
    }
    chapters.set(c.title, { id: chapter.id, subs });
  }
  return { subjectId: subject.id, chapters };
}

export async function seedTka(): Promise<{ questions: number; quizzes: number; skipped: string[] }> {
  const teacher = await prisma.user.findFirst({ where: { role: "TEACHER" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!teacher) throw new Error("Belum ada akun guru. Jalankan `bun run db:seed` dulu.");
  const out = { questions: 0, quizzes: 0, skipped: [] as string[] };

  for (const s of TKA_SUBJECTS) {
    const { subjectId, chapters } = await upsertStructure(s);
    // Questions and quiz are seeded once; the teacher edits them afterwards.
    if (await prisma.question.count({ where: { chapter: { subjectId } } })) {
      out.skipped.push(s.name);
      continue;
    }
    const created: string[] = [];
    try {
      for (const [i, item] of s.items.entries()) {
        const ch = chapters.get(item.chapter);
        if (!ch) throw new Error(`Bab tidak dikenal: ${item.chapter}`);
        const subId = item.sub ? ch.subs.get(item.sub) : undefined;
        if (item.sub && !subId) throw new Error(`Subbab tidak dikenal: ${item.sub}`);
        const r = await createQuestion(teacher.id, toInput(item, ch.id, subId, i));
        if (!r.ok) throw new Error(`Soal ${s.name} nomor ${i + 1} tidak valid: ${JSON.stringify(r.fieldErrors)}`);
        created.push(r.id);
        if (item.figure) {
          const img = await addImage(teacher.id, { questionId: r.id, altText: item.figure.alt, file: await figurePng(item.figure.name) });
          if (!img.ok) throw new Error(`Gambar soal ${s.name} nomor ${i + 1} gagal: ${img.error}`);
          await prisma.question.update({
            where: { id: r.id },
            data: { prompt: item.prompt.replace("{{gambar}}", `![${item.figure.alt}](aksara-image:${img.id})`) },
          });
        }
      }
      await prisma.quiz.create({
        data: {
          subjectId, title: s.quizTitle, kind: "TRYOUT_TKA", durationMinutes: 75, instructions: INSTRUCTIONS,
          createdById: teacher.id,
          questions: { create: created.map((questionId, i) => ({ questionId, position: i + 1, points: 1 })) },
        },
      });
    } catch (e) {
      // ponytail: uploaded objects of a failed run stay in the bucket; only the DB rows are undone so a rerun starts clean.
      await prisma.image.deleteMany({ where: { questionId: { in: created } } });
      await prisma.question.deleteMany({ where: { id: { in: created } } });
      throw e;
    }
    out.questions += created.length;
    out.quizzes++;
  }
  return out;
}

// import.meta.main is not in this tsconfig's types, so compare the entry path.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await seedTka();
  await prisma.$disconnect();
  console.log(`Soal TKA: ${r.questions}, tryout: ${r.quizzes}${r.skipped.length ? `, dilewati (sudah ada): ${r.skipped.join(", ")}` : ""}`);
}
