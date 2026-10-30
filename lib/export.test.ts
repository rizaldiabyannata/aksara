import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { saveAttendance, setHoliday } from "@/lib/attendance";
import { buildAttendanceWorkbook, readable, safeText } from "@/lib/export";
import { makeClass, makeStudent, makeTeacher } from "../tests/factories";
import type { QuestionSnapshot } from "@/lib/quizzes";

const snap = {
  type: "MULTIPLE_SELECT", prompt: "p",
  options: [{ id: "a", text: "Lihat ![x](aksara-image:img1)" }, { id: "b", text: "Dua" }],
  images: [{ id: "img1", altText: "segitiga siku-siku", caption: null, sourceReference: null, width: 1, height: 1 }],
} as QuestionSnapshot;

describe("export text", () => {
  it("answers and keys become readable text, images as [gambar: alt]", () => {
    expect(readable(snap, { optionIds: ["a", "b"] })).toBe("Lihat [gambar: segitiga siku-siku]; Dua");
    expect(readable(snap, { value: false })).toBe("Salah");
    expect(readable(snap, { accepted: ["Jakarta", "DKI"] })).toBe("Jakarta; DKI");
    expect(readable(snap, { rubric: null })).toBe("");
    expect(readable(snap, null)).toBe("(kosong)");
  });

  it("CATEGORY answers list each statement with its label, open ones as (kosong)", () => {
    const cat = { ...snap, type: "CATEGORY", labels: ["Fakta", "Opini"] } as QuestionSnapshot;
    expect(readable(cat, { values: { a: true, b: false } })).toBe("Lihat [gambar: segitiga siku-siku]: Fakta; Dua: Opini");
    expect(readable(cat, { values: { b: true } })).toBe("Lihat [gambar: segitiga siku-siku]: (kosong); Dua: Fakta");
    expect(readable({ ...cat, labels: undefined }, { values: { a: false, b: true } })).toContain(": Salah; Dua: Benar");
  });

  it("safeText prefixes formula starters only", () => {
    for (const s of ["=1+1", "+62", "-5", "@x", "\tA", "\rA"]) expect(safeText(s)).toBe(`'${s}`);
    expect(safeText("Budi = pintar")).toBe("Budi = pintar");
  });
});

describe("buildAttendanceWorkbook", () => {
  it("lays out the month like the school book: blanks for H, letters for S/I/A, '-' unfilled, red Sundays/holidays", async () => {
    const now = new Date("2026-10-30T04:00:00Z");
    const t = (await makeTeacher()).user.id;
    const c = await makeClass({ name: "6A" });
    const a = await makeStudent(c.id, { displayName: "=Ani", nis: "0123456789", studentNo: "901" });
    const b = await makeStudent(c.id, { displayName: "Budi" });
    await setHoliday(t, { date: "2026-10-28", note: "Rapat guru" });
    await saveAttendance(t, { classId: c.id, date: "2026-10-01", marks: [{ studentId: a.id, status: "HADIR" }, { studentId: b.id, status: "ALPA" }] }, now);

    const book = (await buildAttendanceWorkbook(c.id, "2026-10", now))!;
    expect(book.filename).toBe("Absensi_6a_2026-10.xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(book.data as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Daftar Hadir")!;
    const head = ws.getRow(4).values as unknown[];
    expect(head.slice(1, 6)).toEqual(["NO", "NO INDUK", "NISN", "NAMA SISWA", 1]);
    expect(head.slice(-4)).toEqual(["S", "I", "A", "JML"]);
    expect(ws.getCell("D2").value).toBe("BULAN : OKTOBER 2026");
    expect(String(ws.getCell(2, 5 + 31).value)).toBe("HS : 26");
    const ani = ws.getRow(5), budi = ws.getRow(6);
    expect(ani.getCell(3).value).toBe("0123456789");
    expect(ani.getCell(4).value).toBe("'=Ani");
    expect(ani.getCell(5).value).toBe(""); // HADIR on the 1st
    expect(budi.getCell(5).value).toBe("A");
    expect(budi.getCell(6).value).toBe("-"); // 2nd: open, not filled
    expect(budi.getCell(5 + 31 + 3).value).toBe(1); // JML
    expect((ani.getCell(5 + 3).fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFFF0000"); // Sunday the 4th
    expect((ani.getCell(5 + 27).fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFFF0000"); // holiday the 28th
    expect(ws.getRow(ws.rowCount).getCell(1).value).toBe("28: Rapat guru");
    expect(await buildAttendanceWorkbook(c.id, "2026-1", now)).toBeNull();
  });
});
