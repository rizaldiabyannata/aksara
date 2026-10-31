import { expect } from "@playwright/test";
import { test, loginStudent, seed } from "./fixtures";

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
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("autosave gagal terlihat, jawaban dapat dicoba ulang dan pulih setelah reload", async ({ page }) => {
  await loginStudent(page, "100001");
  await page.getByRole("button", { name: `Mulai ${seed().studentQuiz.title}`, exact: true }).click();
  await page.waitForURL("**/attempt");
  await page.route("**/api/quiz-attempts/*/answers", route => route.abort("failed"));
  await page.getByRole("radio", { name: "5", exact: true }).check();
  await expect(page.getByText("Jawabanmu belum tersimpan. Coba lagi, ya.").filter({ visible: true }).first()).toBeVisible();
  await page.unroute("**/api/quiz-attempts/*/answers");
  await page.getByRole("radio", { name: "6", exact: true }).check();
  await expect(page.getByText(/✓ Tersimpan/).filter({ visible: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: "6", exact: true })).toBeChecked();
});


test("deadline server: percobaan kedaluwarsa terkunci dan tidak dapat dimulai ulang", async ({ page }) => {
  const quiz = seed().expiredQuiz;
  await loginStudent(page, "100005");
  await expect(page.getByText(quiz.title, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^(Mulai|Ulangi) ${quiz.title}$`) })).toHaveCount(0);
  await page.goto(`/student/quizzes/${quiz.id}/attempt`);
  await expect(page.getByText("Tidak ada ulangan yang sedang kamu kerjakan.", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByRole("link", { name: "Kembali ke daftar ulangan", exact: true }).click();
  await expect(page.getByText(quiz.title, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^(Mulai|Ulangi) ${quiz.title}$`) })).toHaveCount(0);
});
