import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { test as base, type Page } from "@playwright/test";
import { assertTestDatabaseUrl, TEST_DATABASE_URL } from "../tests/test-db-url.mts";

// Each test owns fresh data. Never reset a deployed or production database.
export const test = base.extend<{ resetDatabase: void }>({
  resetDatabase: [async ({}, use) => {
    assertTestDatabaseUrl(TEST_DATABASE_URL);
    execFileSync("bun", ["--conditions=react-server", "e2e/seed.ts"], {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });
    await use();
  }, { auto: true }],
});

type Seed = {
  teacher: { username: string; password: string };
  newTeacher: { username: string; password: string };
  classCode: string;
  studentQuiz: { id: string; title: string };
  tokenQuiz: { id: string; title: string };
  teacherQuiz: { id: string; title: string };
  expiredQuiz: { id: string; title: string };
  remedialQuiz: { id: string; title: string };
  tryoutQuiz: { id: string; title: string };
};

// Written by e2e/seed.ts for each test, so read lazily.
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
