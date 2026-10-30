import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

export type ThrottleKey = { key: string; limit: 5 | 10 | 100 };

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

// Callers pass already-normalized values; no normalization here.
export const throttleKey = {
  teacher: (username: string): ThrottleKey => ({
    key: sha256(`teacher:${username}`),
    limit: 5,
  }),
  student: (code: string, identity: string): ThrottleKey => ({
    key: sha256(`student:${code}:${identity}`),
    limit: 10,
  }),
  // Wrong exam tokens: per student and quiz, so a guesser cannot walk the 31^6 space.
  examToken: (studentId: string, quizId: string): ThrottleKey => ({
    key: sha256(`examtoken:${studentId}:${quizId}`),
    limit: 10,
  }),
  ip: (ip: string): ThrottleKey => ({ key: sha256(`ip:${ip}`), limit: 100 }),
  // Separate bucket so students' typos on a shared school IP never lock out the teacher.
  teacherIp: (ip: string): ThrottleKey => ({
    key: sha256(`ip:teacher:${ip}`),
    limit: 100,
  }),
};

// ponytail: baris throttle lama tidak dibersihkan; tambah cleanup bila tabel membesar
/** Reserve one attempt on every key atomically; true means credentials may be verified. */
export async function reserveAttempt(keys: ThrottleKey[]): Promise<boolean> {
  const now = new Date();
  const counts = await Promise.all(
    keys.map(async ({ key, limit }) => {
      const rows = await prisma.$queryRaw<{ failCount: number }[]>`
        INSERT INTO "LoginThrottle" ("key", "failCount", "windowStartedAt")
        VALUES (${key}, 1, ${now}::timestamptz)
        ON CONFLICT ("key") DO UPDATE SET
          "failCount" = CASE
            WHEN "LoginThrottle"."windowStartedAt" <= ${now}::timestamptz - interval '15 minutes'
            THEN 1 ELSE "LoginThrottle"."failCount" + 1 END,
          "windowStartedAt" = CASE
            WHEN "LoginThrottle"."windowStartedAt" <= ${now}::timestamptz - interval '15 minutes'
            THEN ${now}::timestamptz ELSE "LoginThrottle"."windowStartedAt" END
        RETURNING "failCount"`;
      return rows[0].failCount <= limit;
    }),
  );
  return counts.every(Boolean);
}

/** Identity first; the IP key is charged only while the identity is within its limit. */
export async function reserveLogin(
  identity: ThrottleKey,
  ip: ThrottleKey,
): Promise<boolean> {
  return (await reserveAttempt([identity])) && reserveAttempt([ip]);
}

/** After a successful login: clear the identity row, give back one IP attempt (floor 0). */
export async function releaseOnSuccess(
  identity: ThrottleKey,
  ip: ThrottleKey,
): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "LoginThrottle" WHERE "key" = ${identity.key}`;
  await prisma.$executeRaw`UPDATE "LoginThrottle" SET "failCount" = GREATEST("failCount" - 1, 0) WHERE "key" = ${ip.key}`;
}
