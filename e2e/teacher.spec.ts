import { expect, test } from "@playwright/test";
import { loginStudent, loginTeacher, seed } from "./fixtures";

test("teacher grades the essay from the dashboard, releases, and the student sees the score", async ({ page, browser }) => {
  const { title } = seed().teacherQuiz;
  await loginTeacher(page);
  await expect(page.getByText(`${title}: 1 jawaban uraian belum dinilai`)).toBeVisible();

  const task = (text: string) => page.getByRole("listitem").filter({ hasText: text });
  await task(`${title}: 1 jawaban uraian belum dinilai`).getByRole("link", { name: "Nilai sekarang" }).click();
  // The "Langkah berikutnya" box links straight to the first ungraded essay.
  await page.getByRole("link", { name: /Nilai 1 jawaban uraian/ }).click();
  await page.getByLabel("Nilai soal 1 (0 sampai 4)").fill("3");
  await page.getByRole("button", { name: "Simpan nilai" }).click();
  await expect(page.getByText("3,00 dari 4")).toBeVisible();

  await page.goto("/teacher");
  await expect(page.getByText(`${title}: semua sudah dinilai, siap dibagikan ke 1 siswa`)).toBeVisible();
  await task(`${title}: semua sudah dinilai`).getByRole("link", { name: "Rilis hasil" }).click();
  await page.getByRole("button", { name: "Rilis hasil" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Rilis hasil" }).click();
  await expect(page.getByText("Hasil sudah dibagikan.")).toBeVisible();

  const student = await browser.newPage();
  await loginStudent(student, "100002");
  await expect(student.getByText("Nilaimu sudah keluar").first()).toBeVisible();
  await student.getByRole("link", { name: /Lihat nilai/ }).first().click();
  await expect(student.getByText("75,00").first()).toBeVisible();
  await student.close();
});

test("class code dialog", async ({ page }) => {
  await loginTeacher(page);
  await page.goto("/teacher/classes");
  await page.getByRole("button", { name: "Tampilkan kode" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(seed().classCode);
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
