import { Card } from "@/components/ui/card";
import { Status } from "@/components/status";
import { TKA_CATEGORY_LABEL, TKA_CATEGORY_NOTE, TKA_CATEGORY_TONE as CATEGORY_TONE, type Group, type TkaCategory } from "@/lib/evaluation";
import type { QuizEvaluation } from "@/lib/results";
import { LEVEL_LABEL, TYPE_LABEL } from "../../questions/labels";

const CATEGORIES = Object.keys(TKA_CATEGORY_LABEL) as TkaCategory[];
const levelName = (k: string) => LEVEL_LABEL[k as keyof typeof LEVEL_LABEL] ?? k;
const th = "px-3 py-2 font-bold";
const td = "px-3 py-2";

function Bar({ g }: { g: Group }) {
  return (
    <div className="flex min-w-40 items-center gap-2">
      <div aria-hidden="true" className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full bg-primary-container" style={{ width: `${g.pct}%` }} />
      </div>
      <span className="w-28 shrink-0 text-right tabular-nums">
        <b>{g.pct}%</b> <span className="text-text-muted">({g.earned}/{g.max})</span>
      </span>
    </div>
  );
}

function GroupTable({ caption, head, groups, name = (k) => k }: { caption: string; head: string; groups: Group[]; name?: (k: string) => string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-container-low text-xs text-text-muted">
          <tr>
            <th scope="col" className={th}>{head}</th>
            <th scope="col" className={th}>Benar (rata-rata kelas)</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key} className="border-t border-border-subtle">
              <th scope="row" className={`${td} font-semibold`}>{name(g.key)}</th>
              <td className={td}><Bar g={g} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** D8: where the class is weak. Built only from final recaps; empty until someone has a final score. */
export function Evaluation({ e }: { e: QuizEvaluation }) {
  if (e.students.length === 0) {
    return <Card className="px-(--card-spacing)"><p>Evaluasi muncul setelah ada siswa yang nilainya final.</p></Card>;
  }
  const tryout = e.kind === "TRYOUT_TKA";
  const weakest = [...e.items].sort((a, b) => a.pct - b.pct || a.position - b.position);
  return (
    <div className="flex flex-col gap-space-lg">
      <p className="text-text-muted">
        Dari {e.students.length} siswa yang nilainya sudah final. Setiap siswa dihitung dari percobaan yang menjadi nilai rekapnya.
      </p>
      {tryout && (
        <Card className="gap-3! px-(--card-spacing)">
          <h3 className="text-lg font-semibold">Kategori nilai</h3>
          <ul className="grid grid-cols-2 gap-space-sm sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <li key={c} className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3">
                <Status tone={CATEGORY_TONE[c]}>{TKA_CATEGORY_LABEL[c]}</Status>
                <span className="font-headline-sm text-headline-sm">{e.students.filter((s) => s.category === c).length} siswa</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-muted">
            {TKA_CATEGORY_NOTE} Batasnya: Istimewa ≥ 80, Baik 60–79,99, Memadai 40–59,99, Kurang &lt; 40.
          </p>
        </Card>
      )}

      <section aria-labelledby="eval-bab" className="flex flex-col gap-2">
        <h3 id="eval-bab" className="text-lg font-semibold">Per bab / elemen</h3>
        <GroupTable caption="Persentase benar per bab untuk seluruh kelas" head="Bab" groups={e.chapters} />
      </section>

      {e.levels.length > 0 && (
        <section aria-labelledby="eval-level" className="flex flex-col gap-2">
          <h3 id="eval-level" className="text-lg font-semibold">Per level kognitif</h3>
          <GroupTable caption="Persentase benar per level kognitif untuk seluruh kelas" head="Level" groups={e.levels} name={levelName} />
        </section>
      )}

      <section aria-labelledby="eval-siswa" className="flex flex-col gap-2">
        <h3 id="eval-siswa" className="text-lg font-semibold">Per siswa</h3>
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Nilai dan persentase benar per bab untuk setiap siswa</caption>
            <thead className="bg-surface-container-low text-xs text-text-muted">
              <tr>
                <th scope="col" className={th}>Siswa</th>
                <th scope="col" className={th}>Nilai</th>
                {tryout && <th scope="col" className={th}>Kategori</th>}
                {e.chapters.map((c) => <th key={c.key} scope="col" className={th}>{c.key}</th>)}
              </tr>
            </thead>
            <tbody>
              {e.students.map((s) => {
                const by = new Map(s.chapters.map((c) => [c.key, c]));
                return (
                  <tr key={s.studentId} className="border-t border-border-subtle">
                    <th scope="row" className={`${td} font-semibold`}>
                      {s.name}
                      <span className="block text-xs font-normal text-text-muted">{s.className}</span>
                    </th>
                    <td className={`${td} font-bold tabular-nums`}>{s.score.toFixed(2)}</td>
                    {tryout && <td className={td}>{s.category && <Status tone={CATEGORY_TONE[s.category]}>{TKA_CATEGORY_LABEL[s.category]}</Status>}</td>}
                    {e.chapters.map((c) => {
                      const g = by.get(c.key);
                      return <td key={c.key} className={`${td} tabular-nums`}>{g ? `${g.pct}% (${g.earned}/${g.max})` : "-"}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="eval-butir" className="flex flex-col gap-2">
        <h3 id="eval-butir" className="text-lg font-semibold">Analisis butir soal</h3>
        <p className="text-sm text-text-muted">Diurutkan dari soal yang paling sedikit dijawab benar.</p>
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Persentase siswa yang menjawab benar per nomor soal</caption>
            <thead className="bg-surface-container-low text-xs text-text-muted">
              <tr>
                <th scope="col" className={th}>Nomor</th>
                <th scope="col" className={th}>Bab</th>
                <th scope="col" className={th}>Level</th>
                <th scope="col" className={th}>Bentuk</th>
                <th scope="col" className={th}>Benar</th>
              </tr>
            </thead>
            <tbody>
              {weakest.map((i) => (
                <tr key={i.position} className="border-t border-border-subtle">
                  <th scope="row" className={`${td} font-semibold tabular-nums`}>{i.position}</th>
                  <td className={td}>{i.chapter ?? "-"}</td>
                  <td className={td}>{i.level ? LEVEL_LABEL[i.level] : "-"}</td>
                  <td className={td}>{TYPE_LABEL[i.type]}</td>
                  <td className={`${td} tabular-nums`}><b>{i.pct}%</b> <span className="text-text-muted">({i.correct}/{i.total} siswa)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
