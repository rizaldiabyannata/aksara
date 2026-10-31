import { expect, type Page } from "@playwright/test";
import { test, seed } from "./fixtures";

async function teacherLogin(page: Page, username: string, password: string) {
  // The previous submit must finish first: React resets the form when it does, wiping what we type.
  await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeEnabled();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

async function studentLogin(page: Page, classCode: string, identity: string) {
  await page.goto("/login");
  await page.getByLabel("Kode kelas").fill(classCode);
  await page.getByLabel("NIS atau nama").fill(identity);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

test("teacher: guarded pages redirect, wrong password is refused, login and logout work", async ({ page }) => {
  const { username, password } = seed().teacher;
  await page.goto("/teacher/students");
  await expect(page).toHaveURL(/\/teacher\/login$/);

  await teacherLogin(page, username, `${password}x`);
  await expect(page.getByRole("alert").filter({ hasText: "Username atau kata sandi salah." })).toBeVisible();
  await expect(page).toHaveURL(/\/teacher\/login$/);

  // Username is normalized (case, surrounding spaces).
  await teacherLogin(page, `  ${username.toUpperCase()} `, password);
  await page.waitForURL("**/teacher");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Selamat datang");

  await page.getByRole("button", { name: "Keluar" }).first().click();
  await page.waitForURL("**/teacher/login");
  await page.goto("/teacher");
  await expect(page).toHaveURL(/\/teacher\/login$/);
});

test("teacher: the 6th wrong attempt for one username is throttled", async ({ page }) => {
  // A fresh username nobody uses: the real e2e teacher is never locked out, and reruns start clean.
  const nobody = `nobody.${Date.now()}`;
  await page.goto("/teacher/login");
  for (let i = 0; i < 5; i++) {
    await teacherLogin(page, nobody, "salah-salah-salah");
    await expect(page.getByRole("alert").filter({ hasText: "Username atau kata sandi salah." })).toBeVisible();
  }
  await teacherLogin(page, nobody, "salah-salah-salah");
  await expect(page.getByRole("alert").filter({ hasText: "Terlalu banyak percobaan. Tunggu 15 menit, lalu coba lagi." })).toBeVisible();
});

test("student: wrong code refused, name login, a second device replaces the first, teacher pages locked", async ({ page, browser }) => {
  const { classCode } = seed();
  await page.goto("/student");
  await expect(page).toHaveURL(/\/login$/);

  await studentLogin(page, "ZZZZZZ", "Siswa Satu");
  await expect(page.getByRole("alert").filter({ hasText: "Kode kelas atau nama belum cocok. Coba periksa lagi, ya." })).toBeVisible();

  // Name is matched after normalizing case and spaces; the class code is case-insensitive.
  await studentLogin(page, classCode.toLowerCase(), "  siswa   SATU ");
  await page.waitForURL("**/student");

  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: /Halaman ini terkunci/ })).toBeVisible();

  const other = await browser.newPage();
  await studentLogin(other, classCode, "100001");
  await other.waitForURL("**/student");
  await other.close();

  await page.goto("/student");
  await expect(page).toHaveURL(/\/login\?alasan=perangkat-lain$/);
  await expect(page.getByText("Akunmu baru saja masuk dari perangkat lain.", { exact: false })).toBeVisible();
});

test("teacher who must change the initial password: the page renders, other pages wait, then the dashboard opens", async ({ page }) => {
  const { username, password } = seed().newTeacher;
  await page.goto("/teacher/login");
  await teacherLogin(page, username, password);
  await page.waitForURL("**/teacher/password");
  await expect(page.getByText("Wajib: ganti kata sandi awalmu sekarang", { exact: false })).toBeVisible();

  await page.goto("/teacher/students");
  await expect(page).toHaveURL(/\/teacher\/password$/);
  await expect(page.getByLabel("Kata sandi lama")).toBeVisible();

  const fresh = `${password}-baru-123`;
  await page.getByLabel("Kata sandi lama").fill(password);
  await page.getByLabel("Kata sandi baru", { exact: true }).fill(fresh);
  await page.getByLabel("Ulangi kata sandi baru").fill(fresh);
  await page.getByRole("button", { name: "Simpan kata sandi" }).click();
  await page.waitForURL("**/teacher");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Selamat datang");
});
