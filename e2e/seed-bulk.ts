// Additional data for the bulk-action spec only; never run against an application DB.
import { prisma } from "../lib/db";
import { assertTestDatabaseUrl } from "../tests/test-db-url.mts";
assertTestDatabaseUrl(process.env.DATABASE_URL ?? "");
try {
  const teacher = await prisma.user.findUniqueOrThrow({ where: { username: "e2eguru" } });
  await prisma.subject.create({ data: {
    name: "Bulk E2E", chapters: { create: {
      title: "Bulk Bab", order: 1, sourceBook: "Buku Uji", sourceYearOrEdition: "2026",
      questions: { create: Array.from({ length: 60 }, (_, i) => ({
        type: "TRUE_FALSE", prompt: `Bulk soal ${String(i + 1).padStart(2, "0")}`,
        difficulty: "EASY", defaultPoints: 1, status: "DRAFT", answerKey: { value: true },
        createdById: teacher.id, updatedById: teacher.id,
      })) },
    } },
  } });
} finally { await prisma.$disconnect(); }
