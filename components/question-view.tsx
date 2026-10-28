import { Markdown } from "@/components/material-view";
import type { PublicQuestion } from "@/lib/questions";

// Takes only PublicQuestion, so answer keys cannot reach the markup. No "use client": pure RSC markup.
export function QuestionView({ question }: { question: PublicQuestion }) {
  const { type, prompt, options, images } = question;
  const choices = type === "TRUE_FALSE" ? ["Benar", "Salah"] : options?.map((o) => o.text);
  return (
    <div className="space-y-4">
      <Markdown source={prompt} images={images} />
      {choices && (
        <ol type="A" className="space-y-2 pl-6">
          {choices.map((text, i) => (
            <li key={i} className="pl-1">
              <Markdown source={text} images={images} />
            </li>
          ))}
        </ol>
      )}
      {(type === "SHORT_ANSWER" || type === "ESSAY") && (
        <p className="text-muted-foreground">Siswa menjawab dengan mengetik.</p>
      )}
    </div>
  );
}
