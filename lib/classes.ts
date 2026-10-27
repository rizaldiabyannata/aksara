import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { revokeSessions } from "@/lib/auth/session";
import { uniqueViolation as sharedUniqueViolation } from "@/lib/unique-violation";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_CODE_TRIES = 5;

export function generateClassCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

const NAME_MSG = "Nama kelas wajib diisi, paling banyak 30 huruf.";
const nameSchema = z.object(
  {
    name: z
      .string({ error: NAME_MSG })
      .trim()
      .min(1, { error: NAME_MSG })
      .max(30, { error: NAME_MSG }),
  },
  { error: "Data kelas tidak lengkap. Coba isi lagi." },
);

type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> };

function parseName(
  input: unknown,
): { ok: true; name: string } | Invalid {
  const r = nameSchema.safeParse(input);
  if (r.success) return { ok: true, name: r.data.name };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = i.path.length ? String(i.path[0]) : "form";
    fieldErrors[key] ??= i.message;
  }
  return { ok: false, error: "INVALID", fieldErrors };
}

const uniqueViolation = (e: unknown) =>
  sharedUniqueViolation(e, { Class_code_key: "code", Class_name_key: "name" } as const);

export async function createClassWithCodes(
  actorId: string,
  input: unknown,
  nextCode: () => string,
): Promise<{ ok: true; id: string } | Invalid | { ok: false; error: "NAME_TAKEN" }> {
  const p = parseName(input);
  if (!p.ok) return p;
  for (let i = 0; i < MAX_CODE_TRIES; i++) {
    try {
      const id = await prisma.$transaction(async (tx) => {
        const c = await tx.class.create({
          data: { name: p.name, code: nextCode() },
          select: { id: true },
        });
        await writeAudit(tx, {
          actorUserId: actorId,
          action: "CLASS_CREATED",
          entityType: "Class",
          entityId: c.id,
        });
        return c.id;
      });
      return { ok: true, id };
    } catch (e) {
      const u = uniqueViolation(e);
      if (u === "name") return { ok: false, error: "NAME_TAKEN" };
      if (u !== "code") throw e;
    }
  }
  throw new Error("Gagal membuat kode kelas unik.");
}

export const createClass = (actorId: string, input: unknown) =>
  createClassWithCodes(actorId, input, generateClassCode);

export async function renameClass(
  actorId: string,
  classId: string,
  input: unknown,
): Promise<
  { ok: true } | Invalid | { ok: false; error: "NAME_TAKEN" | "NOT_FOUND" }
> {
  const p = parseName(input);
  if (!p.ok) return p;
  try {
    return await prisma.$transaction(async (tx) => {
      const { count } = await tx.class.updateMany({
        where: { id: classId },
        data: { name: p.name },
      });
      if (!count) return { ok: false, error: "NOT_FOUND" } as const;
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "CLASS_UPDATED",
        entityType: "Class",
        entityId: classId,
      });
      return { ok: true } as const;
    });
  } catch (e) {
    if (uniqueViolation(e) === "name") return { ok: false, error: "NAME_TAKEN" };
    throw e;
  }
}

export async function rotateClassCode(
  actorId: string,
  classId: string,
): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
  for (let i = 0; i < MAX_CODE_TRIES; i++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const cur = await tx.class.findUnique({
          where: { id: classId },
          select: { code: true },
        });
        if (!cur) return { ok: false, error: "NOT_FOUND" } as const;
        let code = generateClassCode();
        while (code === cur.code) code = generateClassCode();
        await tx.class.update({
          where: { id: classId },
          data: { code, codeRotatedAt: new Date() },
        });
        await writeAudit(tx, {
          actorUserId: actorId,
          action: "CLASS_CODE_ROTATED",
          entityType: "Class",
          entityId: classId,
        });
        return { ok: true } as const;
      });
    } catch (e) {
      if (uniqueViolation(e) !== "code") throw e;
    }
  }
  throw new Error("Gagal membuat kode kelas unik.");
}

export async function revokeClassSessions(
  actorId: string,
  classId: string,
): Promise<{ ok: true; revoked: number } | { ok: false; error: "NOT_FOUND" }> {
  return prisma.$transaction(async (tx) => {
    if (!(await tx.class.findUnique({ where: { id: classId }, select: { id: true } }))) {
      return { ok: false, error: "NOT_FOUND" } as const;
    }
    const revoked = await revokeSessions(tx, { classId }, "REVOKED");
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "CLASS_SESSIONS_REVOKED",
      entityType: "Class",
      entityId: classId,
      metadata: { revoked },
    });
    return { ok: true, revoked } as const;
  });
}

// Already in the requested state: ok, nothing changes, no audit row.
export async function setClassActive(
  actorId: string,
  classId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.class.findUnique({
      where: { id: classId },
      select: { isActive: true },
    });
    if (!cur) return { ok: false, error: "NOT_FOUND" } as const;
    if (cur.isActive === active) return { ok: true } as const;
    await tx.class.update({ where: { id: classId }, data: { isActive: active } });
    if (active) {
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "CLASS_ACTIVATED",
        entityType: "Class",
        entityId: classId,
      });
    } else {
      const revoked = await revokeSessions(tx, { classId }, "REVOKED");
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "CLASS_DEACTIVATED",
        entityType: "Class",
        entityId: classId,
        metadata: { revoked },
      });
    }
    return { ok: true } as const;
  });
}

// The only place Class.code leaves the domain (teacher class page).
export async function listClasses(): Promise<
  {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    codeRotatedAt: Date;
    studentCount: number;
  }[]
> {
  const rows = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      codeRotatedAt: true,
      _count: { select: { users: { where: { role: "STUDENT" } } } },
    },
  });
  return rows.map(({ _count, ...r }) => ({ ...r, studentCount: _count.users }));
}
