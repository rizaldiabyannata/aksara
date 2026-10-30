import { expect, test } from "@playwright/test";
import { loginStudent, loginTeacher, seed } from "./fixtures";

test("exam token gate, help request, and topbar search", async ({ page, browser }) => {
  const { id, title } = seed().tokenQuiz;
  await loginTeacher(page);
  await page.goto(`/teacher/quizzes/${id}`);
  await page.getByLabel("Wajibkan token").click();
  await expect(page.getByLabel("Wajibkan token")).toBeChecked();
  await page.getByRole("button", { name: "Tampilkan token (besar)" }).click();
  const label = await page.getByRole("dialog").getByLabel(/^Token: /).getAttribute("aria-label");
  const token = label!.replace("Token: ", "").replace(/\s+/g, "");
  expect(token).toMatch(/^[A-Z0-9]{6}$/);
  await page.keyboard.press("Escape");

  const student = await browser.newPage();
  await loginStudent(student, "100004");
  await student.getByLabel("Token ujian").fill("ZZZZZZ");
  await student.getByRole("button", { name: `Mulai ${title}` }).click();
  await expect(student.getByRole("status").filter({ hasText: /token/i })).toBeVisible();
  await expect(student).toHaveURL(/\/student$/);

  await student.getByLabel("Token ujian").fill(` ${token.slice(0, 3).toLowerCase()} ${token.slice(3).toLowerCase()} `);
  await student.getByRole("button", { name: `Mulai ${title}` }).click();
  await student.waitForURL("**/attempt");

  await student.getByRole("button", { name: "Bantuan Guru / Kendala" }).click();
  await expect(student.getByText("Guru sudah diberi tahu.")).toBeVisible();

  await page.goto(`/teacher/quizzes/${id}`);
  await page.getByRole("group").filter({ has: page.getByLabel(/^Notifikasi/) }).getByLabel(/^Notifikasi/).first().click();
  await expect(page.getByRole("link", { name: `${title}: 1 siswa minta bantuan` }).first()).toBeVisible();
  await expect(page.getByText("Minta bantuan", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tandai Siswa Empat sudah dibantu" }).click();
  await expect(page.getByText("Minta bantuan", { exact: true })).toBeHidden();
  await student.close();

  await page.goto("/teacher");
  await page.getByRole("search").first().getByRole("searchbox").fill("Siswa Dua");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/teacher/search?q=*");
  await expect(page.getByText("Siswa Dua").first()).toBeVisible();
});
