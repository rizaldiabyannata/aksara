import { UserIcon } from "@hugeicons/core-free-icons";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";
import { StatCard } from "./stat-card";

describe("PageHeader", () => {
  it("renders one h1, title and description, no empty actions wrapper", () => {
    const html = renderToStaticMarkup(createElement(PageHeader, { title: "Kelas Saya", description: "Daftar kelas" }));
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain("Kelas Saya");
    expect(html).toContain("Daftar kelas");
    expect(html).not.toContain('data-slot="page-actions"');
  });
  it("renders eyebrow and actions", () => {
    const html = renderToStaticMarkup(
      createElement(PageHeader, { title: "T", eyebrow: "Guru", actions: createElement("button", null, "Tambah") }),
    );
    expect(html).toContain("Guru");
    expect(html).toContain('data-slot="page-actions"');
    expect(html).toContain("Tambah");
  });
});

describe("StatCard", () => {
  it("renders label, value, hidden icon, and no heading", () => {
    const html = renderToStaticMarkup(
      createElement(StatCard, { label: "Siswa", value: 28, hint: "aktif", icon: UserIcon, tone: "success" }),
    );
    expect(html).toContain("Siswa");
    expect(html).toContain("28");
    expect(html).toContain("aktif");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).not.toMatch(/<h\d/);
  });
});
