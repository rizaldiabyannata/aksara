// Pure 0–100 scoring and recap (PRD §7.6–7.7). Points travel in hundredths so 2/3 rounds like the PRD, not like a float.
import type { AttemptStatus, GradingStatus, ScoringPolicy } from "@/lib/generated/prisma/enums";

export type ScoredAttempt = {
  slot: number;
  replaced: boolean;
  status: AttemptStatus;
  gradingStatus: GradingStatus | null;
  maxPoints: number;
  earnedCenti: number;
};
export type ScoringQuiz = { scoringPolicy: ScoringPolicy; kkm: number | null; resultsReleasedAt: Date | null };
export type Recap = {
  primary: number | null;
  highest: number | null;
  recap: number | null;
  basis: ScoredAttempt | null;
  final: boolean;
  passed: boolean | null;
};

/** earned / max × 100, half-up to 2 decimals. max is never 0: publish refuses it. */
export function attemptScore(earnedCenti: number, maxPoints: number): number {
  return Math.round((earnedCenti * 100) / maxPoints) / 100;
}

const score = (a: ScoredAttempt) => attemptScore(a.earnedCenti, a.maxPoints);
const best = (as: ScoredAttempt[]) => as.reduce<ScoredAttempt | null>((m, a) => (m && score(m) >= score(a) ? m : a), null);

export function computeRecap(attempts: ScoredAttempt[], quiz: ScoringQuiz): Recap {
  const counted = attempts.filter((a) => a.status === "SUBMITTED" && !a.replaced);
  const first = counted.find((a) => a.slot === 1) ?? null;
  const top = best(counted);
  let basis: ScoredAttempt | null;
  let recap: number | null;
  if (quiz.scoringPolicy === "HIGHEST" || quiz.kkm === null) {
    basis = top;
    recap = top && score(top);
  } else {
    const kkm = quiz.kkm;
    const rem = best(counted.filter((a) => a.slot >= 2));
    basis = first;
    recap = first && score(first);
    // A remedial counts at most the KKM and never pulls the recap below the primary score.
    if (first && rem && score(first) < kkm && Math.min(score(rem), kkm) > score(first)) {
      basis = rem;
      recap = Math.min(score(rem), kkm);
    }
  }
  return {
    primary: first && score(first),
    highest: top && score(top),
    recap,
    basis,
    final: counted.length > 0 && counted.every((a) => a.gradingStatus === "FINAL"),
    passed: quiz.kkm === null || recap === null ? null : recap >= quiz.kkm,
  };
}

/** May a second-or-later attempt start? The attempt limit is checked separately. */
export function retakeOpen(attempts: ScoredAttempt[], quiz: ScoringQuiz): boolean {
  if (!quiz.resultsReleasedAt) return quiz.scoringPolicy === "HIGHEST";
  if (quiz.scoringPolicy === "HIGHEST" || quiz.kkm === null) return false;
  const r = computeRecap(attempts, quiz);
  // recap < KKM ⇔ primary < KKM and no remedial reached the KKM.
  return r.final && r.recap !== null && r.recap < quiz.kkm;
}
