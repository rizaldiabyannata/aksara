import { execFileSync } from "node:child_process";
import { expect } from "@playwright/test";
import { TEST_DATABASE_URL } from "../tests/test-db-url.mts";
import { test, loginTeacher } from "./fixtures";

test("bulk status: pilihan lintas halaman, pengecualian, filter, konfirmasi dan mobile", async ({ page }) => {
  test.setTimeout(120_000);
  execFileSync("bun", ["--conditions=react-server", "e2e/seed-bulk.ts"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL }, stdio: "pipe",
  });
  await loginTeacher(page);
  await page.goto("/teacher/questions");
  await page.getByRole("combobox", { name: "Mapel", exact: true }).selectOption({ label: "Bulk E2E" });
  await page.getByRole("button", { name: "Terapkan", exact: true }).click();
  const toolbar = page.getByRole("group", { name: "Aksi massal Bank Soal" });
  const choices = page.getByRole("checkbox", { name: /^Pilih soal\s*:/ });
  const selectedCount = (n: number) => toolbar.getByRole("status").filter({ hasText: new RegExp(`^${n} soal dipilih`) });
  await expect(choices).toHaveCount(50);
  await choices.first().focus();
  await page.keyboard.press("Space");
  await expect(selectedCount(1)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Pilih halaman ini/ })).toHaveJSProperty("indeterminate", true);
  await page.getByRole("link", { name: "Berikutnya", exact: true }).click();
  await expect(choices).toHaveCount(10);
  await expect(selectedCount(1)).toBeVisible();
  await choices.first().check();
  await expect(selectedCount(2)).toBeVisible();
  await page.getByRole("link", { name: "Sebelumnya", exact: true }).click();
  await expect(choices).toHaveCount(50);
  await expect(choices.first()).toBeChecked();
  await toolbar.getByRole("button", { name: "Batalkan pilihan" }).click();
  await page.getByRole("checkbox", { name: /^Pilih halaman ini/ }).check();
  await expect(selectedCount(50)).toBeVisible();
  await toolbar.getByRole("button", { name: "Pilih semua 60 hasil filter" }).click();
  await choices.first().uncheck();
  await expect(selectedCount(59)).toBeVisible();
  await page.getByRole("link", { name: "Berikutnya", exact: true }).click();
  await expect(choices).toHaveCount(10);
  await expect(selectedCount(59)).toBeVisible();
  await expect(choices.first()).toBeChecked();
  await choices.first().uncheck();
  await expect(selectedCount(58)).toBeVisible();
  await toolbar.getByRole("button", { name: "Aktifkan", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Aktifkan 58 soal?");
  await expect(dialog).toContainText("dihitung ulang");
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(toolbar.getByRole("button", { name: "Aktifkan", exact: true })).toBeFocused();
  await expect(selectedCount(58)).toBeVisible();
  await toolbar.getByRole("button", { name: "Aktifkan", exact: true }).click();
  let finishRequest!: () => void;
  const gate = new Promise<void>(resolve => { finishRequest = resolve; });
  await page.route("**/teacher/questions**", async route => {
    if (route.request().method() === "POST") { await gate; await route.continue(); }
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "Konfirmasi perubahan" }).click();
  await expect(page.locator('[aria-label="Aksi massal Bank Soal"] button').filter({ hasText: /^Aktifkan$/ })).toBeDisabled();
  await expect(page.locator('input[type="checkbox"]').first()).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Memproses…" })).toBeDisabled();
  finishRequest();
  await expect(dialog).not.toBeVisible();
  await expect(toolbar.getByRole("status").filter({ hasText: "58 soal diaktifkan" })).toBeVisible();
  await expect(selectedCount(0)).toBeVisible();
  await page.unroute("**/teacher/questions**");

  await page.getByRole("link", { name: /^Draf \(/ }).click();
  await expect(page.getByText("Menampilkan 0 butir (halaman 2)")).not.toBeVisible();
  await expect(choices).toHaveCount(2);
  await toolbar.getByRole("button", { name: "Pilih semua 2 hasil filter" }).click();
  await page.getByRole("link", { name: /^Aktif \(/ }).click();
  await expect(selectedCount(0)).toBeVisible();
  await expect(choices).toHaveCount(50);
  await toolbar.getByRole("button", { name: "Pilih semua 58 hasil filter" }).click();
  await page.route("**/teacher/questions**", async route => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  await toolbar.getByRole("button", { name: "Jadikan draf", exact: true }).click();
  await dialog.getByRole("button", { name: "Konfirmasi perubahan" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(toolbar.getByRole("alert")).toContainText("Belum dapat memastikan hasil");
  await expect(selectedCount(58)).toBeVisible();
  await page.unroute("**/teacher/questions**");
  await toolbar.getByRole("button", { name: "Jadikan draf", exact: true }).click();
  await dialog.getByRole("button", { name: "Konfirmasi perubahan" }).click();
  await expect(toolbar.getByRole("status").filter({ hasText: "58 soal dijadikan draf" })).toBeVisible();
  await expect(choices).toHaveCount(0);
  await page.getByRole("link", { name: "Semua", exact: true }).click();
  await expect(choices).toHaveCount(50);
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => [...document.querySelectorAll("main *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, text: el.textContent?.slice(0, 80) })));
    expect(await page.evaluate(() => document.documentElement.scrollWidth), JSON.stringify(overflow)).toBeLessThanOrEqual(width);
    for (const control of [toolbar.getByRole("button", { name: "Pilih semua 60 hasil filter" }), choices.first().locator("..")]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await toolbar.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/question-bulk-${width}.png` });
  }
});
