import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { assertTestDatabaseUrl } from "./test-db-url.mts";

beforeEach(async () => {
  assertTestDatabaseUrl(process.env.DATABASE_URL ?? "");
  await prisma.$executeRawUnsafe(
    'TRUNCATE "AuditLog","Session","LoginThrottle","Image","Question","Material","Subchapter","Chapter","Subject","User","Class" RESTART IDENTITY CASCADE',
  );
});

afterAll(() => prisma.$disconnect());
