import { pathToFileURL } from "node:url";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/normalize";

type SeedResult = { ok: true; username: string } | { ok: false; error: string };

// Messages never include the password.
export async function seedTeacher(env: {
  TEACHER_USERNAME?: string;
  TEACHER_PASSWORD?: string;
}): Promise<SeedResult> {
  const { TEACHER_USERNAME, TEACHER_PASSWORD } = env;
  if (!TEACHER_USERNAME || !TEACHER_PASSWORD) {
    return { ok: false, error: "TEACHER_USERNAME dan TEACHER_PASSWORD wajib diisi." };
  }
  const username = normalizeUsername(TEACHER_USERNAME);
  if (!/^[a-z0-9._]{3,32}$/.test(username)) {
    return { ok: false, error: "Username harus 3-32 karakter: huruf kecil, angka, titik, atau garis bawah." };
  }
  if (TEACHER_PASSWORD.length < 12) {
    return { ok: false, error: "Kata sandi minimal 12 karakter." };
  }

  const passwordHash = await hashPassword(TEACHER_PASSWORD);
  try {
    // ponytail: serializable tx is enough at this scale; a concurrent run with
    // a different name makes one side fail (caught below) instead of two teachers.
    await prisma.$transaction(
      async (tx) => {
        if (await tx.user.count({ where: { role: "TEACHER" } })) throw new Error("EXISTS");
        await tx.user.create({
          data: { role: "TEACHER", username, passwordHash, mustChangePassword: true, displayName: "Guru" },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "EXISTS") {
      return { ok: false, error: "Akun guru sudah ada; seed dibatalkan." };
    }
    return { ok: false, error: "Gagal membuat akun guru (mungkin sudah ada atau database bermasalah)." };
  }
  return { ok: true, username };
}

// import.meta.main is not in this tsconfig's types, so compare the entry path.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await seedTeacher({
    TEACHER_USERNAME: process.env.TEACHER_USERNAME,
    TEACHER_PASSWORD: process.env.TEACHER_PASSWORD,
  });
  await prisma.$disconnect();
  if (r.ok) console.log(`Akun guru dibuat: ${r.username}`);
  else {
    console.error(r.error);
    process.exit(1);
  }
}
