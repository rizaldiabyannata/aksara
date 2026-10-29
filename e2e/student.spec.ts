import { expect, test } from "@playwright/test";
import { loginStudent, seed } from "./fixtures";

test("student logs in, takes a quiz, submits, and waits for the result", async ({ page }) => {
  const { title } = seed().studentQuiz;
  await loginStudent(page, "Siswa Satu");
  await expect(page.getByRole("heading", { name: "Halo, Siswa Satu" })).toBeVisible();

  await page.getByRole("button", { name: `Mulai ${title}` }).click();
  await page.waitForURL("**/attempt");
  await expect(page.locator("[data-student-header]")).toBeHidden();
  await page.getByRole("radio", { name: "5", exact: true }).check();
  const doubt = page.getByLabel("Ragu-ragu dengan nomor ini?");
  await doubt.check();
  await page.reload();
  await expect(page.getByLabel("Ragu-ragu dengan nomor ini?")).toBeChecked();
  await expect(page.getByRole("radio", { name: "5", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Berikutnya" }).click();
  await page.getByLabel("Jawaban soal 2").fill("Dua ditambah tiga sama dengan lima.");
  await page.getByRole("button", { name: "Kumpulkan jawaban" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Kumpulkan" }).click();
  await expect(page.getByText("Jawabanmu sudah dikumpulkan.").first()).toBeVisible();

  await page.getByRole("link", { name: "Kembali ke daftar ulangan" }).click();
  await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
  await page.goto("/student");
  await expect(page.getByText("Nilaimu akan muncul setelah gurumu membagikannya").first()).toBeVisible();
});
