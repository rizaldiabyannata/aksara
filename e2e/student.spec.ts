import { expect, test } from "@playwright/test";
import { loginStudent, seed } from "./fixtures";

test("student logs in, takes a quiz, submits, and waits for the result", async ({ page }) => {
  const { title } = seed().studentQuiz;
  await loginStudent(page, "Siswa Satu");
  await expect(page.getByRole("heading", { name: "Halo, Siswa Satu" })).toBeVisible();

  await page.getByRole("button", { name: `Mulai ${title}` }).click();
  await page.waitForURL("**/attempt");
  await page.getByLabel("5", { exact: true }).check();
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
