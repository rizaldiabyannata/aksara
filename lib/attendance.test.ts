import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  attendanceToday, getClassDay, monthRecap, removeHoliday, saveAttendance, setHoliday, witaToday,
} from "@/lib/attendance";
import { makeClass, makeStudent, makeTeacher } from "../tests/factories";

// Friday 2026-10-30, 12:00 WITA. 2026-11-01 is a Sunday.
const now = new Date("2026-10-30T04:00:00Z");

async function setup() {
  const t = (await makeTeacher()).user.id;
  const c = await makeClass();
  const [a, b] = await Promise.all([makeStudent(c.id, { displayName: "Ani" }), makeStudent(c.id, { displayName: "Budi" })]);
  return { t, c, a, b };
}

describe("witaToday", () => {
  it("rolls over at WITA midnight", () => {
    expect(witaToday(new Date("2026-10-29T15:59:59Z"))).toBe("2026-10-29");
    expect(witaToday(new Date("2026-10-29T16:00:00Z"))).toBe("2026-10-30");
  });
});

describe("saveAttendance", () => {
  it("upserts marks idempotently; getClassDay shows them, blank = null", async () => {
    const { t, c, a, b } = await setup();
    const input = { classId: c.id, date: "2026-10-30", marks: [{ studentId: a.id, status: "SAKIT" }] };
    expect(await saveAttendance(t, input, now)).toEqual({ ok: true, saved: 1 });
    expect(await saveAttendance(t, input, now)).toEqual({ ok: true, saved: 1 });
    expect(await prisma.attendance.count()).toBe(1);
    const day = await getClassDay(c.id, "2026-10-30", now);
    expect(day?.state).toBe("OPEN");
    expect(day?.students.map((s) => [s.id, s.status])).toEqual([[a.id, "SAKIT"], [b.id, null]]);
  });

  it("refuses Sundays, holidays and future dates; past dates are fine", async () => {
    const { t, c, a } = await setup();
    const marks = [{ studentId: a.id, status: "HADIR" }];
    expect(await saveAttendance(t, { classId: c.id, date: "2026-11-01", marks }, now)).toMatchObject({ error: "CLOSED", state: "SUNDAY" });
    expect(await saveAttendance(t, { classId: c.id, date: "2026-10-31", marks }, now)).toMatchObject({ error: "CLOSED", state: "FUTURE" });
    await setHoliday(t, { date: "2026-10-28", note: "Libur sekolah" });
    expect(await saveAttendance(t, { classId: c.id, date: "2026-10-28", marks }, now)).toMatchObject({ error: "CLOSED", state: "HOLIDAY" });
    expect(await saveAttendance(t, { classId: c.id, date: "2026-10-27", marks }, now)).toEqual({ ok: true, saved: 1 });
  });

  it("refuses students of another class, inactive students, duplicates and bad input", async () => {
    const { t, c, a } = await setup();
    const other = await makeStudent((await makeClass()).id);
    const gone = await makeStudent(c.id, { isActive: false });
    for (const marks of [
      [{ studentId: other.id, status: "HADIR" }],
      [{ studentId: gone.id, status: "HADIR" }],
      [{ studentId: a.id, status: "HADIR" }, { studentId: a.id, status: "SAKIT" }],
      [{ studentId: a.id, status: "TELAT" }],
    ]) {
      expect(await saveAttendance(t, { classId: c.id, date: "2026-10-30", marks }, now)).toMatchObject({ ok: false, error: "INVALID" });
    }
    expect(await saveAttendance(t, { classId: c.id, date: "2026-02-30", marks: [{ studentId: a.id, status: "HADIR" }] }, now))
      .toMatchObject({ ok: false, error: "INVALID" });
    expect(await prisma.attendance.count()).toBe(0);
  });
});

describe("holidays", () => {
  it("hide existing marks while set and bring them back when removed; both audited", async () => {
    const { t, c, a } = await setup();
    await saveAttendance(t, { classId: c.id, date: "2026-10-05", marks: [{ studentId: a.id, status: "ALPA" }] }, now);
    expect((await monthRecap(c.id, "2026-10", now))!.students[0]!.alpa).toBe(1);
    expect(await setHoliday(t, { date: "2026-10-05", note: "  Rapat   guru " })).toEqual({ ok: true });
    expect((await getClassDay(c.id, "2026-10-05", now))!.note).toBe("Rapat guru");
    expect((await monthRecap(c.id, "2026-10", now))!.students[0]!.alpa).toBe(0);
    await removeHoliday(t, "2026-10-05");
    expect((await monthRecap(c.id, "2026-10", now))!.students[0]!.alpa).toBe(1);
    expect((await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map((l) => l.action)).toEqual(["HOLIDAY_SET", "HOLIDAY_REMOVED"]);
    expect(await setHoliday(t, { date: "2026-10-06", note: " " })).toMatchObject({ error: "INVALID" });
  });
});

describe("attendanceToday", () => {
  it("counts recorded and HADIR marks for today (WITA) among active students", async () => {
    const { t, c, a, b } = await setup();
    await makeStudent(c.id, { isActive: false });
    await saveAttendance(t, { classId: c.id, date: "2026-10-29", marks: [{ studentId: b.id, status: "HADIR" }] }, now);
    await saveAttendance(t, { classId: c.id, date: "2026-10-30", marks: [{ studentId: a.id, status: "HADIR" }] }, now);
    expect(await attendanceToday(now)).toEqual([{ classId: c.id, present: 1, recorded: 1, total: 2 }]);
    await saveAttendance(t, { classId: c.id, date: "2026-10-30", marks: [{ studentId: b.id, status: "IZIN" }] }, now);
    expect(await attendanceToday(now)).toEqual([{ classId: c.id, present: 1, recorded: 2, total: 2 }]);
  });
});

describe("monthRecap", () => {
  it("HS skips Sundays and holidays; counts S/I/A per student; rejects bad months", async () => {
    const { t, c, a, b } = await setup();
    await setHoliday(t, { date: "2026-10-28", note: "Libur" });
    await saveAttendance(t, { classId: c.id, date: "2026-10-01", marks: [{ studentId: a.id, status: "SAKIT" }, { studentId: b.id, status: "HADIR" }] }, now);
    await saveAttendance(t, { classId: c.id, date: "2026-10-02", marks: [{ studentId: a.id, status: "IZIN" }] }, now);
    const r = (await monthRecap(c.id, "2026-10", now))!;
    expect(r.days).toHaveLength(31);
    expect(r.days[3]).toMatchObject({ day: 4, state: "SUNDAY" });
    expect(r.days[27]).toMatchObject({ day: 28, state: "HOLIDAY", note: "Libur" });
    expect(r.days[30]).toMatchObject({ day: 31, state: "FUTURE" });
    expect(r.hs).toBe(31 - 4 - 1); // 4 Sundays (4, 11, 18, 25), 1 holiday
    expect(r.students.map((s) => [s.displayName, s.sakit, s.izin, s.alpa])).toEqual([["Ani", 1, 1, 0], ["Budi", 0, 0, 0]]);
    expect(r.students[1]!.marks[0]).toBe("HADIR");
    expect(await monthRecap(c.id, "2026-13", now)).toBeNull();
    expect(await monthRecap("nope", "2026-10", now)).toBeNull();
  });
});
