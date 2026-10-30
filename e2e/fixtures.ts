import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

type Seed = {
  teacher: { username: string; password: string };
  classCode: string;
  studentQuiz: { id: string; title: string };
  tokenQuiz: { id: string; title: string };
  teacherQuiz: { id: string; title: string };
};

// Written by e2e/seed.ts during global setup, so read lazily.
export const seed = (): Seed => JSON.parse(readFileSync("e2e/.auth.json", "utf8"));

export async function loginStudent(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("Kode kelas").fill(seed().classCode);
  await page.getByLabel("NIS atau nama").fill(identity);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/student");
}

export async function loginTeacher(page: Page) {
  const { username, password } = seed().teacher;
  await page.goto("/teacher/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/teacher");
}
