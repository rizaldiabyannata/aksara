import { describe, expect, it } from "vitest";
import { cellText, findRosterRows, IMPORT_MAX } from "@/lib/student-import";

// Shaped like a school roster sheet: title rows, header, numeric NO INDUK, NISN as text, signature block.
const roster = [
  [],
  [null, "SISWA KELAS 6"],
  [],
  ["NO", "NO INDUK", "NO NISN", "NAMA", "PANGGILAN", "CITA-CITA"],
  [1, 901, "0123456789", "SITI CONTOH", "Siti", "Dokter"],
  [2, 902, { richText: [{ text: "31234" }, { text: "56789" }] }, { formula: "UPPER(X)", result: "ANDI CONTOH" }, "Andi"],
  [],
  [null, null, null, null, null, "Guru Kelas,"],
];

describe("findRosterRows", () => {
  it("skips sheets without a NAMA header and reads name, NISN and NO INDUK", () => {
    const cover = [["NAMA SEKOLAH", ":", "SD CONTOH"]];
    expect(findRosterRows([cover, roster])).toEqual({
      ok: true,
      rows: [
        { displayName: "SITI CONTOH", nis: "0123456789", studentNo: "901" },
        { displayName: "ANDI CONTOH", nis: "3123456789", studentNo: "902" },
      ],
    });
  });

  it("handles a two-line header (merged NOMOR / URUT INDUK NISN) and a name-only sheet", () => {
    const book = [
      ["NOMOR", "NOMOR", "NOMOR", "NAMA SISWA"],
      ["URUT", "INDUK", "NISN", "NAMA SISWA"],
      [1, 901, "0123456789", "SITI CONTOH"],
    ];
    expect(findRosterRows([book])).toEqual({ ok: true, rows: [{ displayName: "SITI CONTOH", nis: "", studentNo: "" }] });
    expect(findRosterRows([[["Nama"], ["Budi"]]])).toEqual({ ok: true, rows: [{ displayName: "Budi", nis: "", studentNo: "" }] });
  });

  it("reports a missing header, an empty list and too many rows", () => {
    expect(findRosterRows([[["foo"]]])).toEqual({ ok: false, error: "NO_HEADER" });
    expect(findRosterRows([[["NAMA"], []]])).toEqual({ ok: false, error: "EMPTY" });
    const big = [["NAMA"], ...Array.from({ length: IMPORT_MAX + 1 }, (_, i) => [`Siswa ${i}`])];
    expect(findRosterRows([big])).toEqual({ ok: false, error: "TOO_MANY" });
  });

  it("cellText flattens ExcelJS values", () => {
    expect(cellText(976)).toBe("976");
    expect(cellText({ text: "Pend. Pancasila", hyperlink: "https://x" })).toBe("Pend. Pancasila");
    expect(cellText(null)).toBe("");
  });
});
