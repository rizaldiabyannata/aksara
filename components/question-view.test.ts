import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ImageView } from "@/lib/materials";
import type { PublicQuestion } from "@/lib/questions";
import { QuestionView } from "./question-view";

const img: ImageView = {
  id: "img1",
  altText: "Diagram",
  caption: null,
  sourceReference: null,
  width: 100,
  height: 80,
};

const render = (question: PublicQuestion) =>
  renderToStaticMarkup(createElement(QuestionView, { question }));

describe("QuestionView", () => {
  it("renders option text as an ol labelled by position, with option images", () => {
    const out = render({
      id: "q1",
      type: "SINGLE_CHOICE",
      prompt: "Pilih jawaban yang benar.",
      options: [
        { id: "o1", text: "Pertama" },
        { id: "o2", text: "![Gambar A](aksara-image:img1)" },
      ],
      images: [img],
    });
    expect(out).toContain("<ol");
    expect(out).toContain('type="A"');
    expect(out).toContain("Pertama");
    expect(out).toContain('src="/api/images/img1"');
  });

  it("renders an unknown image id in an option as text, not img", () => {
    const out = render({
      id: "q1",
      type: "MULTIPLE_SELECT",
      prompt: "Pilih semua.",
      options: [{ id: "o1", text: "![x](aksara-image:nope)" }],
      images: [img],
    });
    expect(out).toContain("[Gambar tidak tersedia]");
    expect(out).not.toContain("<img");
  });

  it("shows Benar and Salah for TRUE_FALSE", () => {
    const out = render({ id: "q1", type: "TRUE_FALSE", prompt: "Bumi itu bulat.", options: null, images: [] });
    expect(out).toContain("Benar");
    expect(out).toContain("Salah");
  });

  it("shows the typing hint for SHORT_ANSWER and ESSAY", () => {
    for (const type of ["SHORT_ANSWER", "ESSAY"] as const) {
      const out = render({ id: "q1", type, prompt: "Jelaskan.", options: null, images: [] });
      expect(out).toContain("Siswa menjawab dengan mengetik.");
    }
  });
});
