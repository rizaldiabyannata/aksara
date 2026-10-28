# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Aksara: a web app for one teacher and their grade VI SD/MI students. It covers learning materials, a question bank, timed online quizzes (ulangan), grading, result release, and Excel export. The full spec is `docs/PRD_Web_App_Belajar_Kelas_VI.md` (Indonesian). Read the relevant PRD section before building a feature.

Current state: Tahap 1 (foundation) and Tahap 2 (content) are built. Prisma 7 schema (User, Class, Session, LoginThrottle, AuditLog) with a seeded teacher. Custom auth in `lib/auth/`: student login by class code + NIS/name, teacher login by username/password, DB sessions, throttling, page/action guards. Teacher pages for classes (`lib/classes.ts`) and students (`lib/students.ts`) under `app/(teacher)/teacher/`; a stub student dashboard. Tahap 2 adds the Subject/Chapter/Subchapter/Material/Image models (MaterialStatus DRAFT → REVIEWED → PUBLISHED) with `lib/subjects.ts`, `lib/materials.ts`, `lib/images.ts`. `lib/storage.ts` is the only module that knows R2; tests mock it with `tests/storage-fake.ts`. `components/material-view.tsx` is the shared safe Markdown renderer. Image routes: `app/api/images` (POST upload, GET `[id]` → 302 to a presigned URL). Teacher pages are `/teacher/subjects` and `/teacher/materials`; student pages are `/student/materials`. Vitest integration tests run against Docker Postgres. Tahap 3 adds the Question model with `lib/questions.ts` (domain), `lib/grading.ts` (pure objective grading), `toPublicQuestion` as the only student-facing shape, and teacher-only question images. Teacher pages are `/teacher/questions` (nav entry and dashboard card). Quizzes (Tahap 4), score computation, recap, essay grading, and export (Tahap 5) are not built yet; `lib/grading.ts` only grades single objective answers.

This folder is its own git repo (default branch `main`, initialized 2026-10-27). It is nested inside the parent repo at `~/Documents/Code`. Run `git` from this folder, never from the parent.

## Commands

The package manager is Bun (`packageManager: bun@1.4.0`, `bun.lock`). Don't use npm, yarn, or pnpm.

```bash
bun install
bun dev                 # next dev on :3000
bun run build
bun run lint            # eslint (flat config, next core-web-vitals + typescript)
bunx tsc --noEmit       # typecheck; there is no script for it. A fresh checkout needs `bunx next typegen` first
bun run db:up           # Postgres in Docker (host port 5433; DBs aksara_dev, aksara_test)
bun run db:migrate      # prisma migrate dev
bun run db:seed         # teacher account from .env
bun run db:seed:content # 2 mapel + 10 bab (idempoten)
bun run test            # vitest run; needs Docker up
bun run test <file> -t "<name>"   # single test
bun run test lib/storage.r2.test.ts   # smoke R2 nyata; butuh R2_* di .env.local
bun run test:watch
bunx shadcn add <name>  # add a UI component into components/ui
```

`prisma migrate dev` (Prisma 7) does not regenerate the client: run `bunx prisma generate` after a migration.

Tests hit the real `aksara_test` DB: global setup refuses any DB name not ending `_test`, runs `prisma migrate deploy`, and each test truncates all tables. If a migration is edited after it was applied, the human must reset `aksara_test` manually (e.g. `DIRECT_URL=<test url> bunx prisma migrate reset`); agents can't (Prisma AI guard). Playwright for e2e is planned, not added.

## Stack quirks

- **Next.js 16.4.3 + React 19.3.** `next.config.ts` turns on `cacheComponents` and `partialPrefetching`. These change how dynamic data, `cookies()`, and caching behave. Check `node_modules/next/dist/docs/` before writing data-fetching or auth code. Typed route helpers like `LayoutProps<"/">` are global.
- **Tailwind v4** is loaded through the `@tailwindcss/turbopack` loader in `next.config.ts`. There is no `tailwind.config`. Theme tokens are CSS variables in `app/globals.css` (`@theme inline`).
- **shadcn style `base-maia`.** Primitives come from `@base-ui/react`, not Radix. Icons come from `@hugeicons/react` + `@hugeicons/core-free-icons`, not lucide.
- `cn` is the `cn` npm package, re-exported from `lib/utils.ts`. It is not clsx + tailwind-merge.
- The path alias `@/*` maps to the repo root. There is no `src/`.

## Planned architecture (PRD §10–12)

The whole app is one Next.js project: no separate frontend or backend. It is hosted on Vercel, with Prisma talking to a managed PostgreSQL instance (not on Vercel). Zod validates input and ExcelJS generates exports. Mutations go through Server Actions or Route Handlers. The PRD's starting route layout uses the route groups `(auth)/login`, `(teacher)/teacher/...`, `(student)/student/...`, and `app/api/quiz-attempts|quizzes|exports/...`. Core models: `User`, `Class`, `Session`, `Subject`, `Chapter`, `Subchapter`, `Material`, `Image`, `Question`, `Quiz`, `QuizClass`, `QuizQuestion`, `QuizQuestionImage`, `QuizAttempt`, `AttemptAnswer`, `AuditLog`. Images live in a private Cloudflare R2 bucket.

### Invariants (trust boundaries: don't relax them to simplify)

- **Server-side authz on every operation**: session, role (`TEACHER`/`STUDENT`), and ownership. Hiding a UI element is not access control. Students log in with NIS or name plus their class code: no password, no email. Each student has one active session, so a new login revokes the old one. (PRD v1.3 §7.1.) The teacher logs in with username and password. Identifiers are normalized. There is no public teacher sign-up: the teacher account comes from a seed.
- **Answer keys never reach a student client**, whether through RSC props, action results, or API responses. The same applies to hidden scores and other students' data.
- **Draft materials** (`DRAFT`, `REVIEWED`) are refused by the server for students, even when the URL is typed directly.
- **Quiz timer**: `startedAt`/`deadlineAt` are stored in the DB and checked against server time on every request. No `setTimeout` and no long-lived process. The browser only shows the countdown.
- **Autosave and submit are idempotent.** Each one checks session, attempt ownership, attempt status, and the deadline. Writes are accepted until `deadlineAt` + 60 seconds of network grace, then rejected; the countdown still ends at `deadlineAt`. Retries must not create duplicate attempts or answers. The attempt limit counts every attempt that started, including auto-submitted ones, except attempts the teacher replaced with a replacement attempt.
- **Snapshots**: when a quiz is published, each `QuizQuestion` stores `questionSnapshot` and `answerKeySnapshot`. Grading reads only the snapshot, so later edits to the question bank never change a published quiz.
- **Scoring**: `final = earned / max × 100`, shown with 2 decimals. A quiz with `max = 0` cannot be published. Multiple-select is all-or-nothing. Short answers match exactly after trimming and collapsing inner whitespace, with a per-question casing rule and no fuzzy matching. Essay scores may have 2 decimals. The recap score follows the quiz's `scoringPolicy`: `HIGHEST`, or `REMEDIAL`, where a remedial score is capped at the KKM. If any essay is still ungraded, the result is `PENDING_MANUAL_GRADING`, never final. Manual score changes go to the audit log.
- **Results** stay hidden until the teacher clicks "Rilis Hasil". Store who released them and when. Release is refused while any attempt is in progress or any essay is ungraded, and the teacher can unrelease.
- **Excel export** is teacher-only and served through an authorized request, never a public file. It has the sheets `Rekap Nilai` and `Rincian Jawaban`. Escape user text starting with `=`, `+`, `-`, or `@` so it can't run as a formula.

### Content and UX rules

- All UI copy is in Bahasa Indonesia and written for grade 6 children. Layouts must be responsive (phones first) and keyboard-navigable. The timer must not rely on color alone.
- Source books: Matematika Kelas VI (2022), 4 chapters, and IPAS Kelas VI revised edition (2025), 6 chapters. Never invent subchapters or questions and attribute them to the books. Content stays draft until the teacher verifies it.
- Keep only the minimum student data. Never log passwords, session cookies, answer keys, or full answers.

## Project context (Obsidian vault as RAG)

The vault at `~/Documents/Projects-Notes/Obsidian Vault` holds the *why*: decisions, plans, audits. This repo holds the *how, as of now*. When they disagree, the repo wins; fix the stale note in the same session. Before writing notes, follow the vault's own `CLAUDE.md`: frontmatter contract, vault-unique filenames, links back to the hub note. Never write daily progress or logs to the vault.

- Hub note: `Projects/Aksara/Aksara Project Context.md`. Read it before you start work. New notes go in subfolders of `Projects/Aksara/` and must be listed in the hub's `## Peta catatan`.
