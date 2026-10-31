import { expect, test } from "@playwright/test";
import { loginTeacher, seed } from "./fixtures";

for (const width of [360, 1280]) {
  test(`buku nilai: filter, rincian, unduh dan keyboard pada ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginTeacher(page);
    await page.goto("/teacher/grades");
    await expect(page.getByRole("heading", { name: "Buku Nilai", exact: true })).toBeVisible();
    await page.getByLabel("Cari siswa").fill("100002");
    await page.getByLabel("Jenis ulangan").selectOption("REGULAR");
    await page.getByRole("button", { name: "Terapkan filter" }).click();
    await expect(page).toHaveURL(/q=100002/);
    await expect(page.getByRole("table").first()).toContainText("Siswa Dua");
    await expect(page.getByRole("table").first()).not.toContainText("Siswa Satu");
    const detail = page.locator("summary").filter({ hasText: `Rincian Siswa Dua — ${seed().teacherQuiz.title}` });
    await detail.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: "Buka penilaian percobaan 1" }).first()).toBeVisible();
    for (const name of ["Excel ringkas", "CSV lengkap (ZIP)"]) {
      const downloaded = page.waitForEvent("download");
      await page.getByRole("link", { name, exact: true }).click();
      const file = await downloaded;
      expect(await file.failure()).toBeNull();
      expect(file.suggestedFilename()).toMatch(/^Buku_Nilai_.*\.(xlsx|zip)$/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("invalid filter is recoverable", async ({ page }) => {
  await loginTeacher(page);
  await page.goto("/teacher/grades?from=2030-02-30");
  await expect(page.getByRole("alert").filter({ hasText: "Buku nilai belum dapat ditampilkan" })).toContainText("Tanggal filter tidak valid");
  await page.getByRole("link", { name: "Atur ulang filter" }).click();
  await expect(page.getByRole("heading", { name: "Buku Nilai", exact: true })).toBeVisible();
});
