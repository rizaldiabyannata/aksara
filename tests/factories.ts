import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

let n = 0;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Counter-based 6-char code in the CHECK alphabet, unique per call.
function nextCode(i: number): string {
  let s = "";
  for (let k = 0; k < 6; k++) {
    s += CODE_ALPHABET[i % CODE_ALPHABET.length];
    i = Math.floor(i / CODE_ALPHABET.length);
  }
  return s;
}

export function makeClass(overrides: Partial<Prisma.ClassCreateInput> = {}) {
  const i = ++n;
  return prisma.class.create({
    data: { name: `Kelas ${i}`, code: nextCode(i), ...overrides },
  });
}

export function makeStudent(
  classId: string,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  const i = ++n;
  return prisma.user.create({
    data: {
      role: "STUDENT",
      displayName: `Siswa ${i}`,
      loginName: `siswa${i}`,
      classId,
      ...overrides,
    },
  });
}

export async function makeTeacher(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  const i = ++n;
  const password = "password-guru-123";
  const user = await prisma.user.create({
    data: {
      role: "TEACHER",
      username: `guru${i}`,
      displayName: `Guru ${i}`,
      passwordHash: await hashPassword(password),
      ...overrides,
    },
  });
  return { user, password };
}
