# Tahap 8: fitur nyata untuk elemen Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build, for real, the Stitch elements Tahap 7c left out (search, notifications, school year, exam token, attendance, profile photo, help/tips, illustrations), then show them in the Stitch spots.

**Architecture:** Prefer derived data over new tables. Only three schema additions, all nullable. Every new read is teacher-only or the student's own data, guarded server-side like the rest of `lib/`.

**Tech Stack:** Next.js 16 (cacheComponents), Prisma 7, Vitest on `aksara_test`, Playwright e2e.

**Spec:** user decision 2026-10-30 "langsung buatkan saja fiturnya pakai default" — no interview; the defaults below are the controller's calls (D-list). Invariants in `CLAUDE.md` apply unchanged.

## Defaults (controller's calls)

- **D1 Tahun ajaran/semester** is derived from the date in WITA: July–December = Ganjil of T.A `Y/Y+1`, January–June = Genap of T.A `Y-1/Y`. Pure function, no setting, no table.
- **D2 Notifikasi** = the teacher's existing "Perlu tindakan" tasks (`getTeacherDashboard`) plus open help requests (D6). The bell shows the count and the list. Nothing is stored, so there is no read/unread state.
- **D3 Pencarian global** (teacher only): `/teacher/search?q=` searches classes, students (name/NIS), materials (title), questions (prompt) and quizzes (title). Matching is case-insensitive `contains`, up to 5 per group. The topbar search box submits there (GET form, works without JS).
- **D4 Kehadiran** = distinct active students of a class who logged in (a `Session` created) during today's WITA day. Derived only; no attendance table and no manual marking. It is shown as "Hadir hari ini x/y" on the dashboard and the class cards.
- **D5 Token ujian**: `Quiz.examToken String?`. The teacher turns "Wajibkan token" on or off and can rotate it on the quiz detail page. The token is 6 chars from the class-code alphabet and shown big for the projector (reuse the class-code dialog pattern). When it is set, `startAttempt` refuses without the matching token (normalized like class codes). Resume (continuing an IN_PROGRESS attempt) never needs it. The token is never sent to students.
- **D6 Bantuan guru**: `QuizAttempt.helpRequestedAt DateTime?`. The student presses "Bantuan Guru / Kendala" on the attempt page, which goes through an owned, in-progress, deadline+grace-checked route. The teacher sees a flag in the monitoring list and the bell, and can clear it ("Sudah dibantu"). Idempotent.
- **D7 Foto profil**: teacher only. Student photos are not collected, per PRD data minimisation. `User.avatarImageId String?` points at an `Image` with no material/question, uploaded through the existing image pipeline (`lib/images.ts`, R2, size/type limits). Only the owner teacher may read it. The teacher can upload it on the Ganti Sandi page (renamed section "Profil & Keamanan") and remove it. When there is no photo, initials are shown.
- **D8 Tips/bantuan panels**: static, true app-usage tips (how to use features). They make no claims about the textbooks, and a weekly rotation picks one by ISO week. **Ilustrasi**: original inline SVGs (classroom/books, Stitch palette), `aria-hidden`, in the dashboard hero and the login pages. No stock photos.
- **D9 Peserta ujian card** on the attempt page: the student's own name and NIS (their own data).

## Tasks

- [ ] **T1 (read-only features)**: `lib/school-term.ts` (D1) + tests; `lib/search.ts` + `/teacher/search` page (D3) + tests; `lib/attendance.ts` (D4) + tests; topbar: term chip, search box, notification bell (D2, dropdown via `<details>`), dashboard/class "Hadir hari ini". Stitch spots from `docs/stitch/dasbor-guru*.html`, `kelola-kelas*.html`.
- [ ] **T2 (trust boundary + migration)**: one migration adding `Quiz.examToken`, `QuizAttempt.helpRequestedAt`, `User.avatarImageId`. D5 in `lib/quizzes.ts` + `lib/attempts.ts` (start check) + route + student start UI + teacher detail UI. D6 route + attempt UI + monitor flag + clear action. Tests: refuse without/with wrong token, accept with right token, resume without token, token absent from student payloads; help request owned/in-progress/idempotent, other student refused, teacher clear.
- [ ] **T3**: D7 avatar upload/remove/read authz + topbar photo; D9 card. Tests for authz (other teacher/student cannot read; non-image refused by existing limits).
- [ ] **T4**: D8 tips panels and SVG illustrations in their Stitch spots; Bantuan Guru button and Peserta card placement from `mengerjakan-ulangan*`.
- [ ] **T5**: e2e: exam token start flow and help request flow; full vitest + e2e + lint + tsc + build; CLAUDE.md + hub note.
