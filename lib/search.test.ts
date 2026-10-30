import { describe, expect, it } from "vitest";
import { searchAll } from "@/lib/search";
import { makeChapter, makeClass, makeMaterial, makeQuestion, makeQuiz, makeStudent, makeTeacher } from "../tests/factories";

describe("searchAll", () => {
  it("returns empty for blank or 1-char queries", async () => {
    await makeClass({ name: "Kelas Melati" });
    for (const q of ["", "  ", "m", " m "]) {
      expect(await searchAll(q)).toEqual({ classes: [], students: [], materials: [], questions: [], quizzes: [] });
    }
  });

  it("finds each kind, case-insensitively and trimmed", async () => {
    const { user } = await makeTeacher();
    const c = await makeClass({ name: "VI Melati" });
    const s = await makeStudent(c.id, { displayName: "Budi Melati", nis: "9988" });
    const ch = await makeChapter();
    const m = await makeMaterial(ch.id, user.id, { title: "Pecahan melati" });
    const q = await makeQuestion(ch.id, user.id, { prompt: "Apa itu MELATI?" });
    const z = await makeQuiz(ch.subjectId, user.id, { title: "Ulangan Melati 1" });
    await makeMaterial(ch.id, user.id, { title: "Lain" });

    const r = await searchAll("  melati ");
    expect(r.classes.map((x) => x.id)).toEqual([c.id]);
    expect(r.students.map((x) => x.id)).toEqual([s.id]);
    expect(r.materials.map((x) => x.id)).toEqual([m.id]);
    expect(r.questions.map((x) => x.id)).toEqual([q.id]);
    expect(r.quizzes.map((x) => x.id)).toEqual([z.id]);
    expect((await searchAll("9988")).students.map((x) => x.id)).toEqual([s.id]);
  });

  it("caps each group at 5", async () => {
    for (let i = 0; i < 7; i++) await makeClass({ name: `Pelangi ${i}` });
    expect((await searchAll("pelangi")).classes).toHaveLength(5);
  });

  it("treats % and _ literally", async () => {
    await makeClass({ name: "Kelas A" });
    expect((await searchAll("%%")).classes).toHaveLength(0);
    await makeClass({ name: "Kelas 6_B 100%" });
    expect((await searchAll("6_b 100%")).classes.map((c) => c.name)).toEqual(["Kelas 6_B 100%"]);
  });
});
