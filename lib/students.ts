import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { revokeSessions } from "@/lib/auth/session";
import { isNis, normalizeIdentity } from "@/lib/normalize";
import { IMPORT_MAX } from "@/lib/student-import";
import { uniqueViolation } from "@/lib/unique-violation";

const NAME_MSG = "Nama wajib diisi, paling banyak 60 huruf.";
const NIS_MSG = "NIS harus 4–20 angka.";
const CLASS_MSG = "Pilih kelas dulu.";
const STUDENT_NO_MSG = "No. induk hanya angka, paling banyak 10.";

const schema = z.object(
  {
    // Stored form: NFKC + single spaces + trimmed, original casing kept.
    displayName: z
      .string({ error: NAME_MSG })
      .transform((s) => s.normalize("NFKC").replace(/\s+/gu, " ").trim())
      .pipe(
        z
          .string()
          .min(1, { error: NAME_MSG })
          .max(60, { error: NAME_MSG })
          .refine((n) => !isNis(normalizeIdentity(n)), {
            error: "Nama tidak boleh hanya angka.",
          }),
      ),
    // Empty / missing -> null; otherwise stored as the normalized digits (what login compares).
    nis: z
      .string({ error: NIS_MSG })
      .nullish()
      .transform((s) => normalizeIdentity(s ?? "") || null)
      .refine((n) => n === null || /^[0-9]{4,20}$/.test(n), { error: NIS_MSG }),
    studentNo: z
      .string({ error: STUDENT_NO_MSG })
      .nullish()
      .transform((s) => normalizeIdentity(s ?? "") || null)
      .refine((n) => n === null || /^[0-9]{1,10}$/.test(n), { error: STUDENT_NO_MSG }),
    classId: z.string({ error: CLASS_MSG }).min(1, { error: CLASS_MSG }),
  },
  { error: "Data siswa tidak lengkap. Coba isi lagi." },
);

type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> };
type Parsed = { displayName: string; nis: string | null; studentNo: string | null; classId: string };

function parse(input: unknown): { ok: true; v: Parsed } | Invalid {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, v: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = i.path.length ? String(i.path[0]) : "form";
    fieldErrors[key] ??= i.message;
  }
  return { ok: false, error: "INVALID", fieldErrors };
}

type NameTaken = { ok: false; error: "NAME_TAKEN"; className: string };
type NisTaken = { ok: false; error: "NIS_TAKEN" };
type StudentNoTaken = { ok: false; error: "STUDENT_NO_TAKEN" };
type ClassNotFound = { ok: false; error: "CLASS_NOT_FOUND" };
type NotFound = { ok: false; error: "NOT_FOUND" };

const INDEXES = {
  User_classId_loginName_key: "name",
  User_nis_key: "nis",
  User_studentNo_key: "studentNo",
} as const;

async function toTaken(e: unknown, classId: string): Promise<NameTaken | NisTaken | StudentNoTaken> {
  const u = uniqueViolation(e, INDEXES);
  if (u === "nis") return { ok: false, error: "NIS_TAKEN" };
  if (u === "studentNo") return { ok: false, error: "STUDENT_NO_TAKEN" };
  if (u !== "name") throw e;
  const c = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  return { ok: false, error: "NAME_TAKEN", className: c?.name ?? "" };
}

// Creating in an inactive class is allowed: the teacher may prepare accounts ahead.
export async function createStudent(
  actorId: string,
  input: unknown,
): Promise<
  { ok: true; id: string } | Invalid | NameTaken | NisTaken | StudentNoTaken | ClassNotFound
> {
  const p = parse(input);
  if (!p.ok) return p;
  const { displayName, nis, studentNo, classId } = p.v;
  try {
    return await prisma.$transaction(async (tx) => {
      if (!(await tx.class.findUnique({ where: { id: classId }, select: { id: true } }))) {
        return { ok: false, error: "CLASS_NOT_FOUND" } as const;
      }
      const u = await tx.user.create({
        data: {
          role: "STUDENT",
          displayName,
          loginName: normalizeIdentity(displayName),
          nis,
          studentNo,
          classId,
        },
        select: { id: true },
      });
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "STUDENT_CREATED",
        entityType: "User",
        entityId: u.id,
      });
      return { ok: true, id: u.id } as const;
    });
  } catch (e) {
    return toTaken(e, classId);
  }
}

export async function updateStudent(
  actorId: string,
  studentId: string,
  input: unknown,
): Promise<
  { ok: true } | Invalid | NameTaken | NisTaken | StudentNoTaken | ClassNotFound | NotFound
> {
  const p = parse(input);
  if (!p.ok) return p;
  const { displayName, nis, studentNo, classId } = p.v;
  try {
    return await prisma.$transaction(async (tx) => {
      const cur = await tx.user.findFirst({
        where: { id: studentId, role: "STUDENT" },
        select: { displayName: true, nis: true, studentNo: true, classId: true },
      });
      if (!cur) return { ok: false, error: "NOT_FOUND" } as const;
      if (!(await tx.class.findUnique({ where: { id: classId }, select: { id: true } }))) {
        return { ok: false, error: "CLASS_NOT_FOUND" } as const;
      }
      const fields = [
        cur.displayName !== displayName && "displayName",
        cur.nis !== nis && "nis",
        cur.studentNo !== studentNo && "studentNo",
        cur.classId !== classId && "classId",
      ].filter((f): f is string => !!f);
      if (fields.length === 0) return { ok: true } as const;
      // Moving class deliberately keeps sessions (D8).
      await tx.user.update({
        where: { id: studentId },
        data: { displayName, loginName: normalizeIdentity(displayName), nis, studentNo, classId },
      });
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "STUDENT_UPDATED",
        entityType: "User",
        entityId: studentId,
        metadata: { fields },
      });
      return { ok: true } as const;
    });
  } catch (e) {
    return toTaken(e, classId);
  }
}

export async function revokeStudentSessions(
  actorId: string,
  studentId: string,
): Promise<{ ok: true; revoked: number } | NotFound> {
  return prisma.$transaction(async (tx) => {
    if (!(await tx.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { id: true } }))) {
      return { ok: false, error: "NOT_FOUND" } as const;
    }
    const revoked = await revokeSessions(tx, { userId: studentId }, "REVOKED");
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "STUDENT_SESSIONS_REVOKED",
      entityType: "User",
      entityId: studentId,
      metadata: { revoked },
    });
    return { ok: true, revoked } as const;
  });
}

// Already in the requested state: ok, nothing changes, no audit row.
export async function setStudentActive(
  actorId: string,
  studentId: string,
  active: boolean,
): Promise<{ ok: true } | NotFound> {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
      select: { isActive: true },
    });
    if (!cur) return { ok: false, error: "NOT_FOUND" } as const;
    if (cur.isActive === active) return { ok: true } as const;
    await tx.user.update({ where: { id: studentId }, data: { isActive: active } });
    if (active) {
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "STUDENT_ACTIVATED",
        entityType: "User",
        entityId: studentId,
      });
    } else {
      const revoked = await revokeSessions(tx, { userId: studentId }, "REVOKED");
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "STUDENT_DEACTIVATED",
        entityType: "User",
        entityId: studentId,
        metadata: { revoked },
      });
    }
    return { ok: true } as const;
  });
}

// ponytail: tanpa pagination (satu guru, ±60 siswa); tambah saat > 200 baris
export async function listStudents(filter: { classId?: string; q?: string }): Promise<
  {
    id: string;
    displayName: string;
    nis: string | null;
    studentNo: string | null;
    className: string;
    classId: string | null;
    isActive: boolean;
    replacedCount7d: number;
    lastReplacedAt: Date | null;
  }[]
> {
  const q = filter.q?.trim();
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(filter.classId ? { classId: filter.classId } : {}),
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { nis: { startsWith: q } },
              { studentNo: { startsWith: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ class: { name: "asc" } }, { displayName: "asc" }],
    select: {
      id: true,
      displayName: true,
      nis: true,
      studentNo: true,
      classId: true,
      isActive: true,
      class: { select: { name: true } },
    },
  });
  const warn = await prisma.auditLog.groupBy({
    by: ["entityId"],
    where: {
      action: "STUDENT_SESSION_REPLACED",
      entityType: "User",
      createdAt: { gte: new Date(Date.now() - 7 * 86400_000) },
      entityId: { in: rows.map((r) => r.id) },
    },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const byId = new Map(warn.map((w) => [w.entityId, w]));
  return rows.map(({ class: cls, ...r }) => ({
    ...r,
    className: cls?.name ?? "",
    replacedCount7d: byId.get(r.id)?._count._all ?? 0,
    lastReplacedAt: byId.get(r.id)?._max.createdAt ?? null,
  }));
}

export type ImportRowResult = {
  displayName: string;
  nis: string | null;
  studentNo: string | null;
  status: "NEW" | "EXISTS" | "INVALID";
  message?: string;
};

const importRows = z
  .array(z.object({ displayName: z.unknown(), nis: z.unknown(), studentNo: z.unknown() }))
  .min(1)
  .max(IMPORT_MAX);

/**
 * Roster import (rows come from the browser, so every row is re-validated here).
 * Rows that clash with an existing student or an earlier row are skipped, never updated.
 * `commit: false` is the preview; `commit: true` creates every NEW row in one transaction.
 */
export async function importStudents(
  actorId: string,
  classId: string,
  rows: unknown,
  commit: boolean,
): Promise<
  | { ok: true; rows: ImportRowResult[]; created: number }
  | { ok: false; error: "INVALID_ROWS" | "CHANGED" }
  | ClassNotFound
> {
  const list = importRows.safeParse(rows);
  if (!list.success) return { ok: false, error: "INVALID_ROWS" };
  if (!(await prisma.class.findUnique({ where: { id: classId }, select: { id: true } }))) {
    return { ok: false, error: "CLASS_NOT_FOUND" };
  }
  const parsed = list.data.map((r) => {
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    return parse({ displayName: str(r.displayName), nis: str(r.nis), studentNo: str(r.studentNo), classId });
  });
  const valid = parsed.flatMap((p) => (p.ok ? [p.v] : []));
  const existing = await prisma.user.findMany({
    where: {
      OR: [
        { nis: { in: valid.flatMap((v) => (v.nis ? [v.nis] : [])) } },
        { studentNo: { in: valid.flatMap((v) => (v.studentNo ? [v.studentNo] : [])) } },
        { classId, loginName: { in: valid.map((v) => normalizeIdentity(v.displayName)) } },
      ],
    },
    select: { nis: true, studentNo: true, classId: true, loginName: true },
  });
  const nisSeen = new Set(existing.flatMap((u) => (u.nis ? [u.nis] : [])));
  const noSeen = new Set(existing.flatMap((u) => (u.studentNo ? [u.studentNo] : [])));
  const nameSeen = new Set(existing.flatMap((u) => (u.classId === classId && u.loginName ? [u.loginName] : [])));

  const results: ImportRowResult[] = parsed.map((p, i) => {
    const raw = list.data[i]!;
    if (!p.ok) {
      return {
        displayName: typeof raw.displayName === "string" ? raw.displayName : "",
        nis: typeof raw.nis === "string" ? raw.nis : null,
        studentNo: typeof raw.studentNo === "string" ? raw.studentNo : null,
        status: "INVALID",
        message: Object.values(p.fieldErrors)[0],
      };
    }
    const { displayName, nis, studentNo } = p.v;
    const loginName = normalizeIdentity(displayName);
    const clash =
      (nis && nisSeen.has(nis) && "NISN sudah dipakai siswa lain.") ||
      (studentNo && noSeen.has(studentNo) && "No. induk sudah dipakai siswa lain.") ||
      (nameSeen.has(loginName) && "Nama ini sudah ada di kelas ini.");
    // Later rows clash with earlier ones in the same file too.
    if (nis) nisSeen.add(nis);
    if (studentNo) noSeen.add(studentNo);
    nameSeen.add(loginName);
    return clash
      ? { displayName, nis, studentNo, status: "EXISTS", message: clash }
      : { displayName, nis, studentNo, status: "NEW" };
  });

  const fresh = results.filter((r) => r.status === "NEW");
  if (!commit || fresh.length === 0) return { ok: true, rows: results, created: 0 };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({
        data: fresh.map((r) => ({
          role: "STUDENT" as const,
          displayName: r.displayName,
          loginName: normalizeIdentity(r.displayName),
          nis: r.nis,
          studentNo: r.studentNo,
          classId,
        })),
      });
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "STUDENTS_IMPORTED",
        entityType: "Class",
        entityId: classId,
        metadata: { created: fresh.length },
      });
    });
  } catch (e) {
    // Someone added a clashing student between the check and the insert: ask for a new preview.
    if (uniqueViolation(e, INDEXES)) return { ok: false, error: "CHANGED" };
    throw e;
  }
  return { ok: true, rows: results, created: fresh.length };
}
