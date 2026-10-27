import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ImageView, MaterialDetail } from "@/lib/materials";
import { Markdown, MaterialView } from "./material-view";

const img: ImageView = {
  id: "abc",
  altText: "Peta",
  caption: "Peta Jawa",
  sourceReference: "Hal 12",
  width: 100,
  height: 80,
};

const render = (source: string, images: ImageView[] = []) =>
  renderToStaticMarkup(createElement(Markdown, { source, images }));

describe("Markdown", () => {
  it("raw HTML is not rendered", () => {
    const out = render("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>");
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/<img[^>]*onerror/i);
  });

  it("javascript: links are neutralised", () => {
    expect(render("[x](javascript:alert(1))")).not.toContain('href="javascript:');
  });

  it("external links get rel=noopener noreferrer", () => {
    const out = render("[situs](https://example.com)");
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("own aksara-image renders /api/images/<id> with DB alt fallback", () => {
    const out = render("![](aksara-image:abc)", [img]);
    expect(out).toContain('src="/api/images/abc"');
    expect(out).toContain('alt="Peta"');
    expect(out).toContain("Peta Jawa");
    expect(out).toContain("Hal 12");
  });

  it("unknown aksara-image id and external image URLs render text, not <img>", () => {
    const unknown = render("![x](aksara-image:nope)", [img]);
    expect(unknown).toContain("[Gambar tidak tersedia]");
    expect(unknown).not.toContain("<img");

    const external = render("![foto](https://evil.example/a.png)", [img]);
    expect(external).toContain("[Gambar: foto]");
    expect(external).not.toContain("<img");
    expect(external).not.toContain("evil.example");
  });

  it("GFM tables render", () => {
    expect(render("| a | b |\n|---|---|\n| 1 | 2 |")).toContain("<table");
  });

  it("headings are shifted so the page keeps one h1", () => {
    const out = render("# Satu\n\n## Dua\n\n### Tiga\n\n#### Empat");
    expect(out).toContain("<h2");
    expect(out).toContain("<h3");
    expect(out).toContain("<h4");
    expect(out).not.toContain("<h1");
  });
});

const material: MaterialDetail = {
  id: "m1",
  title: "Judul Materi",
  summary: "Ringkasan singkat",
  content: "Isi utama",
  examples: null,
  exercises: "",
  sourceReference: "Buku Matematika",
  sourcePages: "10-12",
  status: "PUBLISHED",
  chapterId: "c1",
  subchapterId: null,
  chapterTitle: "Bab 1",
  subjectName: "Matematika",
  subchapterTitle: null,
  images: [],
  publishedAt: null,
  updatedAt: new Date("2026-10-27T00:00:00Z"),
};

describe("MaterialView", () => {
  it("renders the title, summary, and source; hides empty optional sections", () => {
    const out = renderToStaticMarkup(createElement(MaterialView, { material }));
    expect(out).toContain("<h1");
    expect(out).toContain("Judul Materi");
    expect(out).toContain("Ringkasan singkat");
    expect(out).toContain("Materi");
    expect(out).toContain("Buku Matematika");
    expect(out).toContain("10-12");
    expect(out).not.toContain("Contoh dan Aktivitas");
    expect(out).not.toContain("Latihan");
  });

  it("renders optional sections when they have text", () => {
    const out = renderToStaticMarkup(
      createElement(MaterialView, {
        material: { ...material, examples: "Contoh 1", exercises: "Soal 1" },
      }),
    );
    expect(out).toContain("Contoh dan Aktivitas");
    expect(out).toContain("Latihan");
  });
});
