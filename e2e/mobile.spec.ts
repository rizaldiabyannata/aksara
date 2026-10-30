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
      if (r.height < 44 || r.width < 44) bad.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}px`);
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

  // Tab until the main action has focus, then up to 15 more stops (or until focus leaves <main>); every stop needs a real focus indicator.
  const target =
    primary === "main"
      ? page.locator("main").locator(":is(a,button,input:not([type=hidden]),select,textarea,summary):visible").first()
      : page.getByRole(primary.role, { name: primary.name }).first();
  // transition-all animates the ring in; read settled values.
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important}" });
  const indicator = () =>
    page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return { ok: true, inMain: true, desc: "body" };
      const read = () => {
        const cs = getComputedStyle(a);
        return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), shadow: cs.boxShadow };
      };
      const on = read();
      a.blur();
      const off = read();
      a.focus();
      const ok = (on.style !== "none" && on.width > 0) || on.shadow !== off.shadow;
      return { ok, inMain: !!a.closest("main"), desc: `${a.tagName} ${(a.textContent ?? "").trim().slice(0, 20)} ${a.className.toString().slice(0, 80)} on=${JSON.stringify(on)} off=${JSON.stringify(off)}` };
    });
  let reached = false;
  let extra = 0;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const { ok, inMain, desc } = await indicator();
    expect(ok, `${path} focus indicator at tab stop ${i + 1}: ${desc}`).toBe(true);
    if (!reached && (await target.evaluate((el) => el === document.activeElement))) reached = true;
    else if (reached && (++extra >= 15 || !inMain)) return;
  }
  if (!reached) throw new Error(`${path}: Tab never reached ${primary === "main" ? "main" : String(primary.name)}`);
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
        // The fixed bottom bar must not cover the last row (the "Ragu-ragu" flag).
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const flag = (await page.getByText("Ragu-ragu dengan nomor ini?").boundingBox())!;
        const bar = (await page.getByRole("button", { name: "Kumpulkan jawaban" }).boundingBox())!;
        expect(flag.y + flag.height, "flag row hidden by bottom bar").toBeLessThanOrEqual(bar.y);
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
      const name = page.getByText("Siswa Dengan Nama Yang Sangat Panjang Sekali").first();
      await expect(name).toBeVisible();
      expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth), "long name is clipped").toBe(true);
      for (const path of [
        "/teacher/subjects",
        "/teacher/materials",
        "/teacher/materials/new",
        "/teacher/questions",
        "/teacher/questions/new",
        "/teacher/quizzes",
        "/teacher/attendance",
        "/teacher/password",
      ]) {
        await check(page, path, "main");
      }
    });
  });
}
