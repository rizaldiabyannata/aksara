import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// No `server-only` here: seed and tests import this module too.
const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma = (g.__prisma ??= new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
}));
