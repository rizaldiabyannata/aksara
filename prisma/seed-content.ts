import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/db";

const SUBJECTS = [
  {
    name: "Matematika",
    sourceBook: "Matematika untuk SD/MI Kelas VI",
    sourceYearOrEdition: "2022",
    chapters: ["Pecahan dan Desimal", "Rasio", "Kubus dan Balok", "Peluang"],
  },
  {
    name: "IPAS",
    sourceBook: "Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas VI (Edisi Revisi)",
    sourceYearOrEdition: "Edisi Revisi 2025",
    chapters: [
      "Makanan Bergizi untuk Kesehatan Pencernaanmu",
      "Tarik dan Embuskan",
      "Jejak Sang Pahlawan",
      "Kearifan Lokal, Warisan Leluhur untuk Persatuan Bangsa",
      "Energi untuk Masa Depan",
      "Mengembara di Jagat Raya",
    ],
  },
];

// update: {} keeps any title or field the teacher has edited since the first run.
export async function seedContent(db = prisma): Promise<{ subjects: number; chapters: number }> {
  let chapters = 0;
  for (const s of SUBJECTS) {
    const subject = await db.subject.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name },
    });
    for (const [i, title] of s.chapters.entries()) {
      const order = i + 1;
      await db.chapter.upsert({
        where: { subjectId_order: { subjectId: subject.id, order } },
        update: {},
        create: {
          subjectId: subject.id,
          order,
          title,
          sourceBook: s.sourceBook,
          sourceYearOrEdition: s.sourceYearOrEdition,
        },
      });
      chapters++;
    }
  }
  return { subjects: SUBJECTS.length, chapters };
}

// import.meta.main is not in this tsconfig's types, so compare the entry path.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await seedContent();
  await prisma.$disconnect();
  console.log(`Mapel: ${r.subjects}, bab: ${r.chapters}`);
}
