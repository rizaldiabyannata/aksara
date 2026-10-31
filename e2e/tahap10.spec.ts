import { expect } from "@playwright/test";
import { test, loginStudent, loginTeacher, seed } from "./fixtures";

test("tryout: student answers a PGK Kategori item, teacher releases and sees Evaluasi, student sees the per-chapter result", async ({ page, browser }) => {
  const { id, title } = seed().tryoutQuiz;
  const student = await browser.newPage();
  await loginStudent(student, "100005");
  await student.getByRole("button", { name: `Mulai ${title}` }).click();
  await student.waitForURL("**/attempt");
  await student.getByRole("radio", { name: "42", exact: true }).check();
  await student.getByRole("button", { name: "Berikutnya" }).click();
  await expect(student.getByText("Jawab setiap pernyataan")).toBeVisible();
  await student.getByRole("radiogroup", { name: "Kompos dibuat dari sisa makhluk hidup." }).getByRole("radio", { name: "Fakta" }).check();
  await student.getByRole("radiogroup", { name: "Kompos itu menyenangkan." }).getByRole("radio", { name: "Opini" }).check();
  await student.reload();
  // The attempt page opens on question 1 again; the saved answer must come back on question 2.
  await student.getByRole("button", { name: "Berikutnya" }).click();
  await expect(
    student.getByRole("radiogroup", { name: "Kompos itu menyenangkan." }).getByRole("radio", { name: "Opini" }),
  ).toBeChecked();
  await student.getByRole("button", { name: "Kumpulkan jawaban" }).click();
  await student.getByRole("alertdialog").getByRole("button", { name: "Kumpulkan" }).click();
  await expect(student.getByText("Jawabanmu sudah dikumpulkan.").first()).toBeVisible();

  await loginTeacher(page);
  await page.goto(`/teacher/quizzes/${id}`);
  await page.getByRole("button", { name: "Rilis hasil" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Rilis hasil" }).click();
  await expect(page.getByText("Hasil sudah dibagikan.")).toBeVisible();
  const evaluasi = page.getByRole("region", { name: "Evaluasi" });
  await expect(evaluasi.getByText("Kategori perkiraan, bukan skala resmi TKA.", { exact: false })).toBeVisible();
  await expect(evaluasi.getByRole("table", { name: "Persentase siswa yang menjawab benar per nomor soal" })).toBeVisible();
  await expect(evaluasi.getByRole("row", { name: /Siswa Lima/ })).toContainText("100.00");

  await student.goto(`/student/quizzes/${id}/result`);
  await expect(student.getByText("Kategori: Istimewa")).toBeVisible();
  const perBab = student.getByRole("region", { name: "Hasilmu per bagian" });
  await expect(perBab.getByRole("listitem").filter({ hasText: "Bilangan" })).toContainText("1 dari 1 benar");
  await expect(perBab.getByRole("listitem").filter({ hasText: "Data" })).toContainText("1 dari 1 benar");
  await student.close();
});
