import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const root = css.match(/:root\s*{([^}]*)}/)?.[1] ?? "";
const tokens: Record<string, string> = {};
for (const [, k, v] of root.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[k] = v.trim();

// Resolves one level of var(--x), so `--ring: var(--primary)` works.
function hex(name: string): string {
  const v = tokens[name]?.replace(/^var\(--([\w-]+)\)$/, (_, n) => tokens[n]);
  if (!v || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`--${name} is not hex: ${v}`);
  return v;
}

function lum(h: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string) {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const tones = ["success", "warning", "info", "destructive"];
const textPairs = [
  ["foreground", "background"], ["foreground", "card"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "secondary"],
  ["primary-strong", "background"], ["primary-strong", "secondary"], ["primary-strong", "primary-soft"],
  ["secondary-foreground", "secondary"],
  ...tones.flatMap((t) => [[t, `${t}-soft`], [t, "card"]]),
  ["primary-foreground", "success"],
];

describe("design tokens", () => {
  it("text pairs reach 4.5:1", () => {
    for (const [fg, bg] of textPairs) {
      expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Tahap 7b: buttons follow Stitch's bright orange, so their bold white label is near-AA (≥ 3.5:1), not 4.5.
  it("primary button label reaches 3.5:1", () => {
    expect(ratio("primary-foreground", "primary")).toBeGreaterThanOrEqual(3.5);
  });

  it("control borders and ring reach 3:1", () => {
    for (const [fg, bg] of [["input", "card"], ["input", "background"], ["ring", "background"], ["ring", "card"]]) {
      expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  // Tahap 7c: the user chose Stitch's exact type scale (10–14 px labels included), so there is no 16 px floor anymore.
  // Stitch's theme is mirrored 1:1 so its markup can be ported verbatim. Overrides: names that collide with ours
  // (primary/secondary/background keep their app meaning) and the filled orange, kept at #ea580c by user decision.
  it("mirrors the Stitch theme", () => {
    const cfg = readFileSync("docs/stitch/dasbor-guru.html", "utf8").match(/tailwind\.config = (\{[\s\S]*?\})\s*<\/script>/)![1];
    const theme = css.match(/@theme inline\s*{([\s\S]*?)\n}/)![1];
    const val = (k: string) => theme.match(new RegExp(`--${k}:\\s*([^;]+);`))?.[1].trim();
    const override: Record<string, string> = { "primary-container": "#ea580c", "border-active": "#ea580c" };
    const colors = [...cfg.matchAll(/"([\w-]+)": "(#[0-9a-fA-F]{6})"/g)].filter(([, k]) => !["primary", "secondary", "background"].includes(k));
    expect(colors.length).toBeGreaterThan(50);
    for (const [, k, v] of colors) expect(val(`color-${k}`)?.toLowerCase(), k).toBe((override[k] ?? v).toLowerCase());
    for (const [, k, size] of cfg.matchAll(/"([\w-]+)": \[ "([\d.]+rem)"/g)) expect(val(`text-${k}`), k).toBe(size);
    const spacing = cfg.match(/"spacing": \{([\s\S]*?)\}/)![1];
    for (const [, k, v] of spacing.matchAll(/"([\w-]+)": "([\d.]+rem)"/g)) expect(val(`spacing-${k}`), k).toBe(v);
    expect(val("color-brand-blue")).toBe("#0d59c3");
  });

  it("accent-decor is never a text color", () => {
    const hits = ["app", "components"].flatMap((d) =>
      (readdirSync(d, { recursive: true }) as string[])
        .filter((f) => f.endsWith(".tsx"))
        .filter((f) => readFileSync(`${d}/${f}`, "utf8").includes("text-accent-decor")),
    );
    expect(hits).toEqual([]);
  });

  // primary on primary-soft is 4.02:1, so it is a usage guard, not a contrast check.
  it("primary is never text on primary-soft", () => {
    const hits = ["app", "components"].flatMap((d) =>
      (readdirSync(d, { recursive: true }) as string[])
        .filter((f) => f.endsWith(".tsx"))
        .filter((f) =>
          [...readFileSync(`${d}/${f}`, "utf8").matchAll(/(["'`])((?:(?!\1)[^\n])*)\1/g)].some(
            ([, , c]) => /(?<![\w-])text-primary(?![\w-])/.test(c) && /(?<![\w-])bg-primary-soft(?![\w-])/.test(c),
          ),
        ),
    );
    expect(hits).toEqual([]);
  });
});
