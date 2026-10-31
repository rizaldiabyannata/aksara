import { expect, test } from "@playwright/test";
import { loginTeacher } from "./fixtures";

test("guru mengambil teks halaman PDF ke draf materi tanpa mengunggah PDF ke server", async ({ page }) => {
  await page.setContent("<h1>Bab Pecahan</h1><p>Satu per dua adalah setengah.</p><table><tr><th>Pecahan</th><th>Desimal</th></tr><tr><td>1/2</td><td>0,5</td></tr></table><p>1/2 + 1/2 = 1</p>");
  const pdf = await page.pdf();
  await loginTeacher(page);
  await page.goto("/teacher/subjects");
  const link = page.getByRole("link", { name: "Isi materi dari PDF" }).first();
  const href = await link.getAttribute("href");
  expect(href).toContain("chapterId=");
  await link.click();
  await expect(page.locator("#chapterId")).toHaveValue(new URL(`http://localhost${href}`).searchParams.get("chapterId")!);
  await page.locator("#book-pdf").setInputFiles({ name: "buku.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByText("dari 1 halaman PDF")).toBeVisible();
  await page.getByRole("button", { name: "Ambil teks halaman" }).click();
  await expect(page.locator("#content")).toHaveValue(/Satu per dua adalah setengah\./);
  await expect(page.locator("#content")).toHaveValue(/Pecahan[\s\S]*Desimal[\s\S]*0,5/);
  await expect(page.locator("#content")).toHaveValue(/1\/2 \+ 1\/2 = 1/);
  await expect(page.locator("#summary")).toHaveValue(/Bab Pecahan/);
  await expect(page.locator("#sourcePages")).toHaveValue("1");
  await page.locator("#title").fill("Materi yang disunting guru");
  await page.locator("#summary").fill("Ringkasan yang ditulis guru");
  await page.locator("#content").fill("Catatan guru sendiri.");
  await page.getByRole("button", { name: "Ambil teks halaman" }).click();
  await expect(page.locator("#title")).toHaveValue("Materi yang disunting guru");
  await expect(page.locator("#summary")).toHaveValue("Ringkasan yang ditulis guru");
  await expect(page.locator("#content")).toHaveValue(/Catatan guru sendiri\./);
  await expect(page.locator("#content")).toHaveValue(/Satu per dua adalah setengah\./);
  await page.getByRole("button", { name: "Buat materi" }).click();
  await expect(page).toHaveURL(/\/teacher\/materials\/[a-z0-9-]+$/);

  const chapterId = new URL(`http://localhost${href}`).searchParams.get("chapterId")!;
  await page.goto("/teacher/subjects");
  await page.getByRole("link", { name: "Buat soal" }).first().click();
  await page.locator('a[href*="type=SINGLE_CHOICE"]').first().click();
  await expect(page.locator("#chapterId")).toHaveValue(chapterId);
  await page.locator("#sourceReference").fill("Sumber pilihan guru");
  await page.locator("#book-pdf").setInputFiles({ name: "buku.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: "Ambil teks halaman" }).click();
  await page.getByRole("button", { name: "Tambahkan ke teks soal" }).click();
  await expect(page.locator("#sourceReference")).toHaveValue("Sumber pilihan guru");
  await expect(page.locator("#prompt")).toHaveValue(/Satu per dua adalah setengah\./);

  await page.goto("/teacher/subjects");
  await page.getByRole("link", { name: "Buat ulangan" }).first().click();
  await expect(page.locator("#title")).not.toHaveValue("");
  await expect(page.locator("#subjectId")).not.toHaveValue("");
  await page.getByRole("button", { name: "Buat ulangan" }).click();
  await expect(page).toHaveURL(/\/teacher\/quizzes\/[a-z0-9-]+\?chapterId=/);
  const firstQuestion = page.locator('input[name="questionId"]').first();
  await expect(firstQuestion).toBeVisible();
  await firstQuestion.check();
  await page.getByRole("button", { name: "Tambahkan soal terpilih" }).click();
  await expect(firstQuestion).toBeDisabled();

  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [`/teacher/materials/new?chapterId=${chapterId}`, `/teacher/questions/new?chapterId=${chapterId}&type=SINGLE_CHOICE`, `/teacher/quizzes/new?chapterId=${chapterId}`]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} scrolls sideways`).toBeLessThanOrEqual(360);
  }
});
