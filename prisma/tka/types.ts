import type { CognitiveLevel, Difficulty } from "@/lib/generated/prisma/enums";
import type { FigureName } from "./figures";

/** One seed question. Option ids are given in order (a, b, c, ...). `{{gambar}}` in the prompt marks the figure. */
export type TkaItem = {
  chapter: string;
  sub?: string;
  difficulty: Difficulty;
  level?: CognitiveLevel;
  prompt: string;
  options: string[];
  explanation: string;
  figure?: { name: FigureName; alt: string };
} & (
  | { type: "SINGLE_CHOICE"; key: number }
  | { type: "MULTIPLE_SELECT"; key: number[] }
  | { type: "CATEGORY"; key: boolean[]; labels?: [string, string] }
);

export type TkaSubject = {
  name: string;
  chapters: { title: string; subs: string[] }[];
  quizTitle: string;
  items: TkaItem[];
};

export const SOURCE = "Disusun mengikuti kisi-kisi TKA SD (047/H/AN/2025), bukan soal resmi";

/** Grouped items (soal grup): the shared stimulus is copied into each prompt (D5). */
export const withText = (title: string, text: string, question: string) =>
  `**Bacalah teks berikut.**\n\n**${title}**\n\n${text
    .trim()
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n")}\n\n${question}`;
