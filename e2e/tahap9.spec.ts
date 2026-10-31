import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { loginTeacher } from "./fixtures";

// Latest past school day in WITA (skip Sunday), so the form is always open whatever day the suite runs.
function pastSchoolDay(): string {
  let d = new Date(Date.now() + 8 * 3600_000 - 86400_000);
  if (d.getUTCDay() === 0) d = new Date(d.getTime() - 86400_000);
  return d.toISOString().slice(0, 10);
}

test("attendance: fill, mark one sick, save, reload, download the month", async ({ page }) => {
  const date = pastSchoolDay();
  await loginTeacher(page);
  await page.goto(`/teacher/attendance?date=${date}`);
  await page.getByRole("button", { name: "Sisanya hadir" }).click();
  await page.getByRole("group", { name: "Kehadiran Siswa Dua" }).getByText("Sakit").click();
  await page.getByRole("button", { name: "Simpan absensi" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Absensi \d+ siswa disimpan\./ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan absensi" })).toBeEnabled();
  const sick = page.getByRole("group", { name: "Kehadiran Siswa Dua" }).getByRole("radio", { name: "Sakit" });
  await expect(sick).toBeChecked();

  await page.reload();
  await expect(sick).toBeChecked();
  await expect(page.getByText("Semua siswa sudah diisi.")).toBeVisible();

  const izin = page.getByRole("group", { name: "Kehadiran Siswa Dua" }).getByRole("radio", { name: "Izin" });
  await page.getByRole("group", { name: "Kehadiran Siswa Dua" }).getByText("Izin", { exact: true }).click();
  await page.getByRole("button", { name: "Simpan absensi" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Absensi \d+ siswa disimpan\./ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan absensi" })).toBeEnabled();
  await expect(izin).toBeChecked();
  await page.reload();
  await expect(izin).toBeChecked();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Unduh rekap/ }).click();
  expect((await download).suggestedFilename()).toBe(`Absensi_vi-e2e_${date.slice(0, 7)}.xlsx`);
});

test("import students from an Excel roster read in the browser", async ({ page }) => {
  // Built here with synthetic names: title rows above the header, like a school roster sheet.
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("NAMA");
  ws.addRows([["SISWA KELAS 6"], [], ["NO", "NO INDUK", "NISN", "NAMA", "PANGGILAN"]]);
  ws.addRow([1, 7701, "0987654321", "IMPOR SATU", "Satu"]);
  ws.addRow([2, 7702, "0987654322", "IMPOR DUA", "Dua"]);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  await loginTeacher(page);
  await page.goto("/teacher/students");
  await page.getByRole("button", { name: "Impor dari Excel" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Masukkan ke kelas").selectOption({ label: "VI-E2E" });
  await dialog.getByLabel("File Excel (.xlsx)").setInputFiles({
    name: "roster.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer,
  });
  await dialog.getByRole("button", { name: "Periksa file" }).click();
  await expect(dialog.getByRole("row", { name: /IMPOR SATU.*Akan ditambahkan/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Tambahkan 2 siswa" }).click();
  await expect(dialog.getByText("2 siswa ditambahkan.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("No. Induk: 7702")).toBeVisible();
});
