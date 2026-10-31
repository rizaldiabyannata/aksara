import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { IMPORT_SHEETS } from "../lib/question-import-format";
import { test, loginStudent, loginTeacher } from "./fixtures";

const examples: Record<string, string>[] = [
  { Urutan: "1", Soal: "Excel: hasil 2 + 2?", "Opsi A": "4", "Opsi B": "5", Kunci: "A", Pembahasan: "PEMBAHASAN-EXCEL-RAHASIA" },
  { Urutan: "2", Soal: "Excel: 8 bilangan genap.", Kunci: "Benar" },
  { Urutan: "3", Soal: "Excel: pilih genap.", "Opsi A": "2", "Opsi B": "4", "Opsi C": "5", Kunci: "A;B" },
  { Urutan: "4", Soal: "Excel: ibu kota Bali?", "Jawaban Diterima": "Denpasar\nKota Denpasar" },
  { Urutan: "5", Soal: "Excel: jelaskan hemat air.", "Pedoman Penilaian": "RUBRIK-EXCEL-RAHASIA" },
  { Urutan: "6", Soal: "Excel: kelompokkan.", "Pernyataan A": "2 genap", "Pernyataan B": "3 genap", "Kunci A": "1", "Kunci B": "2" },
];

test("template Excel → enam tipe → retry aman → draf → aktif → siswa", async ({ page, browser }) => {
  test.setTimeout(150_000);
  await loginTeacher(page);
  await page.goto("/teacher/quizzes");
  await page.getByRole("link", { name: "Impor dari Excel" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Unduh template Excel" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("template-soal-aksara.xlsx");
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(new Uint8Array(await readFile((await download.path())!)).buffer);
  for (const [i, def] of IMPORT_SHEETS.entries()) book.getWorksheet(def.name)!.getRow(2).values = def.headers.map(h => examples[i][h] ?? "");
  await page.getByLabel("Judul ulangan").fill("Ulangan impor Excel E2E");
  await page.getByLabel("Mata pelajaran", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Bab", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("VI-E2E", { exact: true }).check();
  const pg = book.getWorksheet("Pilihan Ganda")!;
  const keyColumn = IMPORT_SHEETS[0].headers.indexOf("Kunci") + 1;
  pg.getCell(2, keyColumn).value = "Z";
  const upload = async () => page.getByLabel("File Excel soal").setInputFiles({ name: "soal.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await book.xlsx.writeBuffer()) });
  await upload();
  await expect(page.getByRole("alert").filter({ hasText: "Perlu diperbaiki" })).toContainText("Pilihan Ganda, baris 2");
  await expect(page.getByRole("button", { name: "Simpan soal dan draf ulangan" })).toBeDisabled();
  pg.getCell(2, keyColumn).value = "A";
  await upload();
  await expect(page.getByRole("status").filter({ hasText: "6 soal ditemukan" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Pratinjau soal" }).getByRole("listitem")).toHaveCount(6);
  await page.getByText("Periksa opsi, kunci, dan pembahasan", { exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("PEMBAHASAN-EXCEL-RAHASIA", { exact: true })).toBeVisible();
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const button of [page.getByRole("link", { name: "Unduh template Excel" }), page.getByRole("button", { name: "Simpan soal dan draf ulangan" })]) {
      const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/question-import-preview.png", fullPage: true });
  let firstBody = "";
  let firstId = "";
  let attempts = 0;
  await page.route("**/api/question-import", async route => {
    attempts++;
    if (attempts === 1) {
      firstBody = route.request().postData()!;
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      firstId = (await response.json()).id;
      await route.abort("failed");
    } else { expect(route.request().postData()).toBe(firstBody); await route.continue(); }
  });
  await page.getByRole("button", { name: "Simpan soal dan draf ulangan" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Koneksi terputus" })).toBeVisible();
  await page.getByRole("button", { name: "Coba simpan lagi" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/quizzes/${firstId}$`));
  const quizUrl = page.url();
  await expect(page.getByRole("link", { name: /^Periksa soal \d+$/ })).toHaveCount(6);
  await page.getByRole("button", { name: "Terbitkan ulangan", exact: true }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Terbitkan", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "masih draf" })).toBeVisible();
  const hrefs = await page.getByRole("link", { name: /^Periksa soal \d+$/ }).evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href));
  for (const href of hrefs) {
    await page.goto(href);
    await page.getByRole("button", { name: "Aktifkan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Jadikan draft", exact: true })).toBeVisible();
  }
  await page.goto(quizUrl);
  await page.getByRole("button", { name: "Terbitkan ulangan", exact: true }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Terbitkan", exact: true }).click();
  await expect(page.getByText("Terbit", { exact: true })).toBeVisible();
  const student = await browser.newPage();
  await loginStudent(student, "100004");
  const denied = await student.request.get("/api/question-import/template"); expect(denied.status()).toBe(403);
  await student.getByRole("button", { name: "Mulai Ulangan impor Excel E2E", exact: true }).click();
  await student.waitForURL("**/attempt");
  await expect(student.getByText("Excel: hasil 2 + 2?", { exact: true })).toBeVisible();
  const html = await student.content();
  expect(html).not.toContain("PEMBAHASAN-EXCEL-RAHASIA"); expect(html).not.toContain("RUBRIK-EXCEL-RAHASIA");
  await student.getByRole("radio", { name: "4", exact: true }).check();
  await student.getByRole("button", { name: "Berikutnya", exact: true }).click();
  await expect(student.getByText("Excel: 8 bilangan genap.", { exact: true })).toBeVisible();
  await student.getByRole("radio", { name: "Benar", exact: true }).check();
  await student.getByRole("button", { name: "Berikutnya", exact: true }).click();
  await student.getByRole("checkbox", { name: "2", exact: true }).check();
  await student.getByRole("checkbox", { name: "4", exact: true }).check();
  await student.getByRole("button", { name: "Berikutnya", exact: true }).click();
  await student.getByLabel("Jawaban soal 4", { exact: true }).fill("Denpasar");
  await student.getByRole("button", { name: "Berikutnya", exact: true }).click();
  await student.getByLabel("Jawaban soal 5", { exact: true }).fill("Menutup keran setelah dipakai.");
  await student.getByRole("button", { name: "Berikutnya", exact: true }).click();
  await expect(student.getByText("Excel: kelompokkan.", { exact: true })).toBeVisible();
  await student.getByRole("radio").nth(0).check();
  await student.getByRole("radio").nth(3).check();
  await student.getByRole("button", { name: "Kumpulkan jawaban", exact: true }).click();
  await student.getByRole("alertdialog").getByRole("button", { name: "Kumpulkan", exact: true }).click();
  await expect(student.getByText("Jawabanmu sudah dikumpulkan.").first()).toBeVisible();
  await student.close();
});
