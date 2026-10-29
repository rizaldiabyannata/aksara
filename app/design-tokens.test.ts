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
  ["primary-foreground", "primary"],
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

  it("control borders and ring reach 3:1", () => {
    for (const [fg, bg] of [["input", "card"], ["input", "background"], ["ring", "background"], ["ring", "card"]]) {
      expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("no text token below 1rem", () => {
    const sizes = [...css.matchAll(/--text-([\w-]+):\s*([\d.]+)rem/g)].filter(([, n]) => !n.includes("line-height"));
    expect(sizes.length).toBeGreaterThan(0);
    for (const [, n, v] of sizes) expect(parseFloat(v), `--text-${n}`).toBeGreaterThanOrEqual(1);
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
