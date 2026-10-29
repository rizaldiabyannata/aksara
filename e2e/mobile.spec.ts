import { expect, test, type Page } from "@playwright/test";
import { loginStudent, loginTeacher, seed } from "./fixtures";

test.use({ viewport: { width: 360, height: 780 } });

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

async function check(page: Page, path: string, primary: { role: "button" | "link"; name: string | RegExp }) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} scrolls sideways`).toBeLessThanOrEqual(360);
  expect(await smallTargets(page), `${path} small targets`).toEqual([]);

  // Tab until the main action has focus, and every stop on the way shows a focus indicator.
  const target = page.getByRole(primary.role, { name: primary.name }).first();
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
  throw new Error(`${path}: Tab never reached ${String(primary.name)}`);
}

test("student pages at 360 px", async ({ page }) => {
  const s = seed();
  await check(page, "/login", { role: "button", name: "Masuk" });
  await loginStudent(page, "Siswa Dengan Nama Yang Sangat Panjang Sekali");
  await check(page, "/student", { role: "button", name: `Mulai ${s.studentQuiz.title}` });
  await check(page, "/student/materials", { role: "link", name: "Beranda" });
  await check(page, `/student/quizzes/${s.teacherQuiz.id}/result`, { role: "link", name: /Kembali ke beranda|Lihat nilai|Beranda/ });
});

test("teacher pages at 360 px", async ({ page }) => {
  const s = seed();
  await check(page, "/teacher/login", { role: "button", name: "Masuk" });
  await loginTeacher(page);
  await check(page, "/teacher", { role: "link", name: /Pantau|Nilai sekarang|Rilis hasil|Lihat siswa|Lihat materi|Buat kelas/ });
  await check(page, `/teacher/quizzes/${s.studentQuiz.id}`, { role: "button", name: /Muat ulang|Rilis hasil/ });
  await check(page, "/teacher/classes", { role: "button", name: "Buat kelas" });
  await check(page, "/teacher/students", { role: "button", name: "Cari" });
});
