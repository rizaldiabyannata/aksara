import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "AuditLog","Session","LoginThrottle","User","Class" RESTART IDENTITY CASCADE',
  );
});

afterAll(() => prisma.$disconnect());
