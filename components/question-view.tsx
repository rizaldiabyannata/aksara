import { Markdown } from "@/components/material-view";
import type { PublicQuestion } from "@/lib/questions";

const TRUE_FALSE_CHOICES = [
  { id: "true", text: "Benar" },
  { id: "false", text: "Salah" },
];

// Takes only PublicQuestion, so answer keys cannot reach the markup. No "use client": pure RSC markup.
export function QuestionView({ question }: { question: PublicQuestion }) {
  const { type, prompt, options, images } = question;
  const choices = type === "TRUE_FALSE" ? TRUE_FALSE_CHOICES : options;
  return (
    <div className="space-y-4">
      <Markdown source={prompt} images={images} />
      {choices && (
        <ol type="A" className="space-y-2 pl-6">
          {choices.map((c) => (
            <li key={c.id} className="pl-1">
              <Markdown source={c.text} images={images} />
            </li>
          ))}
        </ol>
      )}
      {(type === "SHORT_ANSWER" || type === "ESSAY") && (
        <p className="text-muted-foreground">Jawaban diketik.</p>
      )}
    </div>
  );
}
