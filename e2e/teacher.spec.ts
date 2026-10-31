import { expect } from "@playwright/test";
import { test, loginStudent, loginTeacher, seed } from "./fixtures";

test("teacher grades the essay from the dashboard, releases, and the student sees the score", async ({ page, browser }) => {
  const { title } = seed().teacherQuiz;
  await loginTeacher(page);
  await expect(page.getByRole("heading", { name: `${title}: 1 jawaban uraian belum dinilai` })).toBeVisible();

  const task = (text: string) => page.getByRole("listitem").filter({ hasText: text });
  await task(`${title}: 1 jawaban uraian belum dinilai`).getByRole("link", { name: "Nilai sekarang" }).click();
  // The "Langkah berikutnya" box links straight to the first ungraded essay.
  await page.getByRole("link", { name: /Nilai 1 jawaban uraian/ }).click();
  await page.getByLabel("Nilai soal 1 (0 sampai 4)").fill("3");
  await page.getByRole("button", { name: "Simpan nilai" }).click();
  await expect(page.getByText("3,00 dari 4")).toBeVisible();

  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: `${title}: semua sudah dinilai, siap dibagikan ke 1 siswa` })).toBeVisible();
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
  await expect(dialog).toBeVisible();
  expect((await dialog.innerText()).replace(/\s+/g, "")).toContain(seed().classCode);
  await page.setViewportSize({ width: 360, height: 780 });
  // Fixed popups do not widen the document, so measure the dialog and the code itself.
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  const codeFits = await dialog.evaluate((d, code) => {
    const els = [...d.querySelectorAll<HTMLElement>("*")].filter((e) => (e.textContent ?? "").replace(/\s+/g, "").includes(code));
    const el = els[els.length - 1];
    return !!el && el.scrollWidth <= el.clientWidth;
  }, seed().classCode);
  expect(codeFits, "class code is clipped").toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Tampilkan kode" }).first()).toBeFocused();
});

// Regression: the edit page once called a "use client" helper from the server and crashed.
test("an existing question opens in the editor", async ({ page }) => {
  await loginTeacher(page);
  await page.goto("/teacher/questions");
  await page.getByRole("link", { name: /^Ubah soal/ }).first().click();
  await expect(page.getByLabel("Teks soal")).not.toBeEmpty();
});
