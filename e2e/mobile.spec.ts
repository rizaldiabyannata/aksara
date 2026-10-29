import { expect, test, type Page } from "@playwright/test";
import { loginStudent, loginTeacher, seed } from "./fixtures";

// Ruling R2: checkboxes/radios are measured by their <label>; links inside running text (p a) are exempt (WCAG 2.5.8).
async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("a,button,input,select,textarea,summary")) {
      if (el instanceof HTMLInputElement && el.type === "hidden") continue;
      if (!el.checkVisibility()) continue;
      if (el.matches("p a")) continue;
      const target = el.matches("input[type=checkbox],input[type=radio]") ? (el.closest("label") ?? el) : el;
      const r = target.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue; // sr-only
      if (r.height < 44) bad.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.height)}px`);
    }
    return bad;
  });
}

// "main" = the first focusable element inside <main>, for pages whose first action is a form field.
type Primary = { role: "button" | "link"; name: string | RegExp } | "main";

async function check(page: Page, path: string, primary: Primary) {
  if (path !== page.url().replace(/^https?:\/\/[^/]+/, "")) await page.goto(path);
  await page.waitForLoadState("networkidle");
  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} scrolls sideways`).toBeLessThanOrEqual(width);
  expect(await smallTargets(page), `${path} small targets`).toEqual([]);

  // Tab until the main action has focus, and every stop on the way shows a focus indicator.
  const target =
    primary === "main"
      ? page.locator("main").locator(":is(a,button,input:not([type=hidden]),select,textarea,summary):visible").first()
      : page.getByRole(primary.role, { name: primary.name }).first();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const visible = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return true;
      const cs = getComputedStyle(a);
      return cs.outlineStyle !== "none" || cs.boxShadow !== "none";
    });
    expect(visible, `${path} focus indicator at tab stop ${i + 1}`).toBe(true);
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`${path}: Tab never reached ${primary === "main" ? "main" : String(primary.name)}`);
}

for (const width of [360, 1280]) {
  test.describe(`${width} px`, () => {
    test.use({ viewport: { width, height: width === 360 ? 780 : 800 } });

    test(`student pages at ${width} px`, async ({ page }) => {
      const s = seed();
      await check(page, "/login", { role: "button", name: "Masuk" });
      await loginStudent(page, "Siswa Dengan Nama Yang Sangat Panjang Sekali");
      // The 360 run starts the quiz below, so the 1280 run's first card is the "Lanjutkan" link.
      await check(page, "/student", width === 360 ? { role: "button", name: `Mulai ${s.studentQuiz.title}` } : "main");
      await check(page, "/student/materials", { role: "link", name: "Beranda" });
      await check(page, `/student/quizzes/${s.teacherQuiz.id}/result`, { role: "link", name: /Kembali ke beranda|Lihat nilai|Beranda/ });
      if (width === 360) {
        await page.goto("/student");
        await page.getByRole("button", { name: `Mulai ${s.studentQuiz.title}` }).click();
        await page.waitForURL("**/attempt");
        await check(page, page.url().replace(/^https?:\/\/[^/]+/, ""), { role: "button", name: "Berikutnya" });
      }
    });

    test(`teacher pages at ${width} px`, async ({ page }) => {
      const s = seed();
      await check(page, "/teacher/login", { role: "button", name: "Masuk" });
      await loginTeacher(page);
      await check(page, "/teacher", { role: "link", name: /Pantau|Nilai sekarang|Rilis hasil|Lihat siswa|Lihat materi|Buat kelas/ });
      await check(page, `/teacher/quizzes/${s.studentQuiz.id}`, { role: "button", name: /Muat ulang|Rilis hasil/ });
      await check(page, "/teacher/classes", { role: "button", name: "Buat kelas" });
      await check(page, "/teacher/students", { role: "button", name: "Cari" });
      // The long seeded name must wrap, not widen the page (checked inside check()).
      await expect(page.getByText("Siswa Dengan Nama Yang Sangat Panjang Sekali").first()).toBeVisible();
      for (const path of [
        "/teacher/subjects",
        "/teacher/materials",
        "/teacher/materials/new",
        "/teacher/questions",
        "/teacher/questions/new",
        "/teacher/quizzes",
        "/teacher/password",
      ]) {
        await check(page, path, "main");
      }
    });
  });
}
