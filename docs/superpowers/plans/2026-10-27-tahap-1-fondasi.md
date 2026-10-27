# Aksara Tahap 1 (Fondasi) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (dipilih pengguna 2026-10-27) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun F14 Kelas, F01 Autentikasi dan Sesi, dan F02 Akun Siswa. Hasilnya: guru bisa membuat kelas dan siswa, siswa bisa login dengan kode kelas + NIS/nama, dan setiap operasi dilindungi guard server.

**Architecture:** Satu app Next.js 16 (cacheComponents). Logika domain ada di `lib/` sebagai modul *deep*: `lib/auth/*`, `lib/classes.ts`, `lib/students.ts`. Modul-modul ini bebas dari Next dan diuji langsung ke Postgres nyata. Satu-satunya seam ke Next adalah `lib/auth/guard.ts` (cookie, header, redirect, forbidden). Server Action di `app/` sengaja tipis: guard → domain → `revalidatePath`, lalu pesan Bahasa Indonesia.

**Tech Stack:** Next 16.4.3, React 19.3, Bun 1.4 (package manager), Prisma 7.10.1 + `@prisma/adapter-pg`, PostgreSQL 17 (Docker lokal, Neon di produksi), `@node-rs/argon2` 2.2.2, Zod 4, Vitest 5 (env node), shadcn `base-maia`.

**Spec:** `docs/PRD_Web_App_Belajar_Kelas_VI.md` v1.3 (§7.1, §12, §13, §15, §16, §18), ditambah vault `Projects/Aksara/Feature Specs/` F00, F01, F02, F12, F14. Spesifikasi vault menjadi sumber kebenaran perilaku, dengan koreksi dari tabel keputusan di bawah.

## Context

Repo ini masih scaffold `create-next-app` + shadcn, belum ada satu commit pun. Tahap 1 PRD §18 meletakkan fondasi untuk semua tahap berikutnya: DB + migrasi, kelas dan kode kelas, auth guru/siswa, RBAC, dan seed guru. Fitur Tahap 2+ bergantung pada guard dan model `User`/`Class` dari tahap ini.

## Keputusan (hasil grilling 2026-10-27)

| # | Keputusan | Alasan |
|---|---|---|
| D1 | **Neon** (region Singapore, ap-southeast-1). Saat runtime `DATABASE_URL` = URL pooled (`-pooler`) via `@prisma/adapter-pg`, untuk migrasi `DIRECT_URL`. Fungsi Vercel di region `sin1` (`vercel.json`) | Integrasi Vercel, branch per preview, free tier tidak di-pause permanen seperti Supabase. Adapter `pg` yang sama dipakai untuk Docker lokal |
| D2 | Test integrasi memakai **Docker Postgres 17** (`compose.yaml`, port 5433, DB `aksara_dev` + `aksara_test`). `globalSetup` menjalankan `prisma migrate reset --force` sekali, `beforeEach` menjalankan `TRUNCATE ... CASCADE`, file test berjalan serial | Docker sudah terpasang. Postgres-nya identik dengan produksi, tanpa jaringan dan tanpa kredensial |
| D3 | **Vitest 5**, `environment: 'node'`, tanpa jsdom/RTL. UI diuji di Tahap 6 (Playwright) | ESM/TS bawaan. Bin vitest jalan di Node, sama seperti runtime Vercel |
| D4 | **Prisma 7.10.1 di-pin persis**, karena tag `latest` npm sekarang = 8.0.0-rc.27. Generator `prisma-client` → `lib/generated/prisma` (di-gitignore). `prisma.config.ts` memuat env lewat `process.loadEnvFile()`. `postinstall: prisma generate`. `@prisma/engines` masuk `trustedDependencies`. Migrasi produksi manual/CI dengan `prisma migrate deploy`, tidak dijalankan saat build | Stabil. Bun memblokir postinstall engines kalau tidak di-trust. Migrasi tidak boleh berjalan diam-diam di preview |
| D5 | **`@node-rs/argon2` 2.2.2** Argon2id m=19456, t=2, p=1 | Binary prebuilt linux-x64-gnu, dan sudah ada di daftar default `serverExternalPackages` Next (`next/dist/lib/server-external-packages.jsonc`) |
| D6 | Login siswa paralel: interactive transaction + `SELECT ... FOR UPDATE` pada baris `User` | Yang terakhir menang, dan dijamin tepat satu sesi aktif |
| D7 | Throttle *reserve-before-verify*. Upsert atomik dengan `RETURNING failCount` dijalankan sebelum verifikasi. Login sukses menghapus kunci identitas dan mengurangi kunci IP sebanyak 1. Fixed window 15 menit, **tanpa `lockedUntil`**. `key` = SHA-256 hex dari kunci mentah | Burst paralel tidak bisa melewati batas. Kode kelas dan nama tebakan tidak tersimpan polos |
| D8 | Asumsi F00 disetujui: ganti kode kelas **tidak** mencabut sesi; sesi siswa 8 jam dan guru 12 jam, **absolut**; pindah kelas tidak mencabut sesi | Konfirmasi pemilik produk |
| D9 | **Soft-revoke**: `Session.revokedAt` + `revokedReason` (`REPLACED`, `REVOKED`). Sesi `REPLACED` diarahkan ke `/login?alasan=perangkat-lain`. Setiap login menghapus baris lama siswa itu yang sudah dicabut atau kedaluwarsa. Logout menghapus baris | Perangkat lama perlu tahu alasannya (F01 kemampuan #4). Teks F01 berubah dari "hapus" menjadi "cabut" |
| D10 | Rute memakai segmen Inggris PRD §11 dengan UI Indonesia, **tanpa `proxy.ts`** | Guard per halaman sudah cukup. Proxy tidak menambah keamanan (YAGNI) |
| D11 | `experimental.authInterrupts`: role salah → `forbidden()` (403 asli) + `app/forbidden.tsx`; tanpa sesi → `redirect()` ke login | Kriteria selesai meminta 403. API experimental ini terkurung di `guard.ts` |
| D12 | Tambahan aksi audit: `TEACHER_PASSWORD_CHANGED`, `CLASS_ACTIVATED`. Menonaktifkan siswa atau kelas **juga mencabut sesinya** | Tanpa pencabutan, mengaktifkan kembali akan "menghidupkan" sesi lama. Kelas yang salah dinonaktifkan harus bisa dipulihkan |

## Global Constraints

- Hanya Bun (`bun add`, `bun run`, `bunx`). Jangan npm/yarn/pnpm.
- Versi di-pin persis: `prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 @node-rs/argon2@2.2.2`.
- Semua teks UI berbahasa Indonesia untuk anak kelas 6, mobile-first (360 px), bisa dipakai dengan keyboard, setiap field punya `<label>`, dan pesan validasi ditaruh dekat field.
- Pesan login gagal siswa: **"Kode kelas atau nama/NIS tidak cocok."** Pesan login gagal guru: **"Username atau kata sandi salah."** Pesan throttle: **"Terlalu banyak percobaan. Tunggu 15 menit, lalu coba lagi."** Pesan untuk perangkat lama: **"Akunmu baru saja masuk dari perangkat lain. Kalau itu bukan kamu, beri tahu guru."**
- Alfabet kode kelas: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, panjang 6, dibangkitkan dengan `crypto.randomInt`.
- Batas throttle: guru 5, siswa (kode+identitas) 10, IP 100, per window 15 menit.
- TTL sesi: STUDENT 8 jam, TEACHER 12 jam. Cookie `aksara_session`: `httpOnly`, `secure` saat `NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`.
- Kata sandi guru minimal 12 karakter. Username setelah normalisasi harus cocok `^[a-z0-9._]{3,32}$`.
- Nama siswa 1–60 karakter, tidak boleh digit saja. NIS `^[0-9]{4,20}$`, opsional, unik global. Nama kelas 1–30 karakter, unik.
- Waktu disimpan `timestamptz` (UTC) dan ditampilkan dalam `Asia/Makassar`.
- Jangan pernah `console.*` atau memasukkan ke audit: kata sandi, token, cookie, atau kode kelas. `passwordHash`, `tokenHash`, dan `Class.code` tidak boleh ada di props atau respons, kecuali `code` di halaman kelas guru.
- Setiap Server Action, halaman terlindungi, dan Route Handler memanggil guard di baris pertama. Di halaman, guard dipanggil di dalam komponen yang dibungkus `<Suspense>`, karena dengan cacheComponents membaca `cookies()` di luar Suspense menyebabkan build error.
- `redirect()` di action dipanggil **di luar** `try`.
- Jangan membuat model atau fitur Tahap 2+: tidak ada proxy.ts, impor massal, hapus permanen, atau E2E.

## Review Focus

1. **Aktivasi ulang tidak boleh menghidupkan sesi lama.** Siswa atau kelas yang dinonaktifkan lalu diaktifkan lagi tetap ditolak memakai cookie lama. Test-nya di Task 10 dan 11.
2. **Test tidak boleh menghapus DB yang salah.** `globalSetup` menolak berjalan kalau `DIRECT_URL` tidak mengarah ke database berakhiran `_test`. Test-nya di Task 2.
3. **Input Unicode/spasi aneh.** NBSP, tab, huruf/digit fullwidth (`１２３４`), dan kode kelas yang diketik huruf kecil atau dengan spasi (`abc def`) tetap dinormalisasi dengan benar. Test-nya di Task 3.
4. **Username guru yang tidak ada** menghasilkan pesan yang sama, tetap menjalankan verifikasi hash dummy, dan tetap kena throttle. Test-nya di Task 7.
5. **Siswa yang pindah kelas**: kode kelas lama + namanya ditolak, kode kelas baru diterima, dan nama harus unik di kelas tujuan. Test-nya di Task 11.

---

## Peta file

| Path | Tanggung jawab |
|---|---|
| `compose.yaml`, `docker/init-test-db.sql` | Postgres 17 lokal + DB `aksara_test` |
| `.env.example`, `.gitignore` (+`!.env.example`, `/lib/generated/`) | Konfigurasi |
| `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/*_init/migration.sql` | Skema + CHECK constraint |
| `prisma/seed.ts` (+`.test.ts`) | Seed guru dari env |
| `vercel.json` | `{"regions":["sin1"]}` |
| `vitest.config.ts`, `tests/global-setup.ts`, `tests/setup.ts`, `tests/factories.ts`, `tests/next-mocks.ts`, `tests/server-only-stub.ts` | Harness test |
| `lib/db.ts` | Prisma singleton |
| `lib/normalize.ts` | Normalisasi identitas, username, kode |
| `lib/audit.ts` | `AuditAction` + `writeAudit(tx, …)` |
| `lib/format.ts` | `formatWita(date)` |
| `lib/auth/password.ts`, `throttle.ts`, `session.ts`, `login.ts` | Inti auth (bebas Next) |
| `lib/auth/guard.ts` | Seam Next: cookie, IP, `require*`, `forbidden`/`redirect` |
| `lib/classes.ts`, `lib/students.ts` | Domain F14, F02 |
| `app/page.tsx` (redirect), `app/forbidden.tsx` | Root |
| `app/(auth)/login/*`, `app/(auth)/teacher/login/*`, `app/(auth)/actions.ts` | Login siswa/guru, logout |
| `app/(teacher)/teacher/{layout,page}.tsx`, `password/*`, `classes/*`, `students/*` | Area guru |
| `app/(student)/student/page.tsx` | Dasbor siswa (placeholder) |
| `components/ui/*` | `bunx shadcn add input label card table badge alert alert-dialog dialog native-select` (kalau `native-select` tidak ada di registry `base-maia`, pakai `<select>` berstyle input) |

Test diletakkan di sebelah file yang diuji (`*.test.ts`).

---

### Task 0: Commit awal, worktree, salin rencana

- [ ] Periksa `git status`, lalu `git add -A && git commit -m "chore: initial Next.js + shadcn scaffold"` di `main`.
- [ ] Ikuti `superpowers:using-git-worktrees` untuk membuat branch `feat/tahap-1-fondasi`.
- [ ] Salin rencana ini ke `docs/superpowers/plans/2026-10-27-tahap-1-fondasi.md`, lalu commit `docs: add Tahap 1 implementation plan`.

### Task 1: Docker Postgres + Prisma + skema + migrasi awal

**Files:** Create `compose.yaml`, `docker/init-test-db.sql`, `.env.example`, `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/<ts>_init/migration.sql`, `lib/db.ts`, `vercel.json`. Modify `.gitignore`, `package.json`.

**Interfaces — Produces:** `import { prisma } from '@/lib/db'`, plus tipe/enum dari `@/lib/generated/prisma/client` (`Role`, `SessionRevokedReason`, `Prisma`).

- [ ] `bun add @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 @node-rs/argon2@2.2.2 zod server-only`. Lalu `bun add -d prisma@7.10.1 vitest vite-tsconfig-paths`. Tambahkan `@prisma/engines` ke `trustedDependencies`. Skrip: `postinstall: prisma generate`, `test: vitest run`, `test:watch: vitest`, `db:up: docker compose up -d`, `db:migrate: prisma migrate dev`, `db:seed: bun prisma/seed.ts`.
- [ ] `compose.yaml`: image `postgres:17`, port `5433:5432`, `POSTGRES_USER=aksara POSTGRES_PASSWORD=aksara POSTGRES_DB=aksara_dev`, volume bernama, dan mount `docker/init-test-db.sql` (`CREATE DATABASE aksara_test;`) ke `/docker-entrypoint-initdb.d/`.
- [ ] `.env.example` (tanpa rahasia): `DATABASE_URL`/`DIRECT_URL=postgresql://aksara:aksara@localhost:5433/aksara_dev`, `TEACHER_USERNAME=`, `TEACHER_PASSWORD=`, plus komentar soal URL pooled vs direct di Neon.
- [ ] `prisma.config.ts`: `try { process.loadEnvFile() } catch {}`, schema `prisma/schema.prisma`, migrations `prisma/migrations`, datasource url `process.env.DIRECT_URL`.
- [ ] `schema.prisma`: generator `prisma-client` dengan output `../lib/generated/prisma`. Model:
  - `enum Role { TEACHER STUDENT }`, `enum SessionRevokedReason { REPLACED REVOKED }`.
  - `User`: `id String @id @default(cuid())`, `role Role`, `username String? @unique`, `passwordHash String?`, `mustChangePassword Boolean @default(false)`, `displayName String`, `loginName String?`, `nis String? @unique`, `classId String?` → `Class`, `isActive Boolean @default(true)`, `createdAt`/`updatedAt`. Tambahkan `@@unique([classId, loginName])` dan `@@index([classId])`.
  - `Class`: `id`, `name String @unique`, `code String @unique`, `codeRotatedAt`, `isActive`, `createdAt`, `updatedAt`.
  - `Session`: `id`, `tokenHash String @unique`, `userId` → `User` (`onDelete: Cascade`), `expiresAt`, `createdAt`, `revokedAt DateTime?`, `revokedReason SessionRevokedReason?`, `@@index([userId])`.
  - `LoginThrottle`: `key String @id`, `failCount Int`, `windowStartedAt`.
  - `AuditLog`: `id`, `actorUserId` → `User` (`onDelete: Restrict`), `action String`, `entityType String`, `entityId String`, `metadata Json?`, `createdAt`, `@@index([entityType, entityId])`, `@@index([createdAt])`.
  - Semua kolom waktu memakai `@db.Timestamptz(3)`.
- [ ] Jalankan `bun run db:up && bunx prisma migrate dev --name init --create-only`, lalu tambahkan di akhir `migration.sql`:
  ```sql
  ALTER TABLE "User" ADD CONSTRAINT "User_role_fields_check" CHECK (
    ("role" = 'STUDENT' AND "classId" IS NOT NULL AND "loginName" IS NOT NULL AND "username" IS NULL AND "passwordHash" IS NULL)
    OR ("role" = 'TEACHER' AND "username" IS NOT NULL AND "passwordHash" IS NOT NULL AND "classId" IS NULL AND "loginName" IS NULL AND "nis" IS NULL));
  ALTER TABLE "User" ADD CONSTRAINT "User_nis_format_check" CHECK ("nis" IS NULL OR "nis" ~ '^[0-9]{4,20}$');
  ALTER TABLE "Class" ADD CONSTRAINT "Class_code_format_check" CHECK ("code" ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');
  ```
  Setelah itu jalankan `bunx prisma migrate dev`.
- [ ] `lib/db.ts`: `import 'server-only'` tidak dipakai di sini, karena seed dan test juga mengimpornya. Isinya singleton `globalThis.__prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`.
- [ ] Verifikasi: `bunx prisma migrate status` menampilkan "Database schema is up to date", dan `bunx tsc --noEmit` lulus.
- [ ] Commit: `feat(db): add Prisma 7 schema for User, Class, Session, LoginThrottle, AuditLog`

### Task 2: Harness Vitest + test constraint skema

**Files:** Create `vitest.config.ts`, `tests/global-setup.ts`, `tests/setup.ts`, `tests/factories.ts`, `tests/server-only-stub.ts`, `prisma/schema.test.ts`. Modify `CLAUDE.md` (Commands + Current state).

**Interfaces — Produces:** `tests/factories.ts`: `makeClass(overrides?) → Class`, `makeStudent(classId, overrides?) → User`, `makeTeacher(overrides?) → { user, password }` (memakai `hashPassword` dari Task 4; sebelum Task 4 ada, buat dulu dengan hash literal lalu ganti di Task 4).

- [ ] `vitest.config.ts`: `plugins: [tsconfigPaths()]`, `resolve.alias['server-only'] = tests/server-only-stub.ts`, dan `test: { environment: 'node', globalSetup: 'tests/global-setup.ts', setupFiles: ['tests/setup.ts'], fileParallelism: false, env: { DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL, __NEXT_EXPERIMENTAL_AUTH_INTERRUPTS: 'true', TZ: 'UTC' } }`, dengan `TEST_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://aksara:aksara@localhost:5433/aksara_test'`.
- [ ] `tests/global-setup.ts`: **lempar error** kalau nama DB di URL tidak berakhiran `_test` (Review Focus #2). Kalau aman, jalankan `execFileSync('bunx', ['prisma','migrate','reset','--force'], { env, stdio: 'inherit' })`. Ekstrak cek URL-nya menjadi `assertTestDatabaseUrl(url)` yang diekspor.
- [ ] `tests/setup.ts`: `beforeEach(() => prisma.$executeRawUnsafe('TRUNCATE "AuditLog","Session","LoginThrottle","User","Class" RESTART IDENTITY CASCADE'))` dan `afterAll(() => prisma.$disconnect())`.
- [ ] Test `prisma/schema.test.ts`, tulis dulu:
  - `assertTestDatabaseUrl` menolak `.../aksara_dev` dan menerima `.../aksara_test`
  - STUDENT tanpa `classId` → insert gagal (CHECK)
  - TEACHER dengan `classId` → gagal
  - `Class.code = 'ABCDE0'` (berisi `0`) → gagal
  - `loginName` sama di kelas yang sama → P2002; di kelas berbeda → berhasil
  - `nis` sama di dua kelas → P2002
- [ ] Jalankan `bun run test prisma/schema.test.ts`. Harapannya PASS (constraint sudah ada dari Task 1; test ini mengunci perilakunya).
- [ ] Update `CLAUDE.md` bagian Commands: `bun run db:up`, `bun run db:migrate`, `bun run db:seed`, `bun run test`, `bun run test <file> -t "<nama>"`, `bun run test:watch`. Catat bahwa test butuh Docker hidup. Hapus kalimat "There are no tests yet" dan perbarui "Current state".
- [ ] Commit: `test: add Vitest harness with Docker Postgres and schema constraint tests`

### Task 3: Normalisasi (`lib/normalize.ts`)

**Interfaces — Produces:** `normalizeIdentity(s: string): string`, `isNis(normalized: string): boolean`, `normalizeUsername(s: string): string`, `normalizeClassCode(s: string): string`.

- [ ] Test lebih dulu, `lib/normalize.test.ts`:
  - `normalizeIdentity('  Budi \t  Santoso ')` → `'budi santoso'`
  - `normalizeIdentity('Budi Santoso')` → `'budi santoso'`
  - `normalizeIdentity('ＢＵＤＩ')` → `'budi'`
  - `normalizeIdentity('１２３４')` → `'1234'`
  - `isNis('0012345')` → true; `isNis('budi 2')` → false; `isNis('')` → false
  - `normalizeUsername(' Bu.Guru_1 ')` → `'bu.guru_1'`
  - `normalizeClassCode(' abc def ')` → `'ABCDEF'` (semua whitespace dihapus, karena kode ditampilkan berkelompok "ABC DEF")
- [ ] Implementasi: NFKC → ganti `/\s+/gu` dengan `' '` → trim → `toLowerCase()`. `isNis` = `/^[0-9]+$/`. Kode kelas: NFKC → hapus `/\s+/gu` → `toUpperCase()`.
- [ ] Jalankan `bun run test lib/normalize.test.ts` sampai PASS. Commit: `feat(auth): add identity, username, and class code normalization`

### Task 4: Hash kata sandi (`lib/auth/password.ts`)

**Interfaces — Produces:** `hashPassword(pw: string): Promise<string>`, `verifyPassword(hash: string, pw: string): Promise<boolean>`, `verifyDummyPassword(pw: string): Promise<false>` (verifikasi terhadap hash konstanta yang dibuat sekali secara lazy, supaya waktu respons setara).

- [ ] Test:
  - hash diawali `$argon2id$v=19$m=19456,t=2,p=1$`
  - verify benar → true, verify salah → false
  - dua hash dari kata sandi yang sama berbeda (ada salt)
  - `verifyDummyPassword('x')` → false
- [ ] Implementasi dengan `hash`/`verify` dari `@node-rs/argon2`, opsi `{ memoryCost: 19456, timeCost: 2, parallelism: 1 }`. Argon2id adalah default-nya; jangan impor const enum `Algorithm`. Ganti hash literal di `tests/factories.ts` dengan `hashPassword`.
- [ ] PASS → commit: `feat(auth): add Argon2id password hashing`

### Task 5: Throttle (`lib/auth/throttle.ts`)

**Interfaces — Produces:**
- `throttleKey.teacher(username)`, `throttleKey.student(code, identity)`, `throttleKey.ip(ip)` → `{ key: string /* sha256 hex */, limit: 5 | 10 | 100 }`
- `reserveAttempt(keys: ThrottleKey[]): Promise<boolean>`: `true` berarti boleh diverifikasi
- `releaseOnSuccess(identity: ThrottleKey, ip: ThrottleKey): Promise<void>`

- [ ] Test (`vi.useFakeTimers({ toFake: ['Date'] })` saja, supaya socket `pg` tidak ikut rusak):
  - 5 reserve guru → true, reserve ke-6 → false
  - setelah `vi.setSystemTime(+15 menit)` → true lagi (window di-reset)
  - siswa: reserve ke-11 → false
  - 10 reserve guru paralel (`Promise.all`) → tepat 5 true
  - `releaseOnSuccess` menghapus baris identitas, dan `failCount` IP turun 1 (tidak negatif)
  - baris di DB tidak memuat string mentah (`key` cocok `/^[0-9a-f]{64}$/` dan tidak mengandung kode kelas)
- [ ] Implementasi: satu `$queryRaw` per kunci, memakai `INSERT … ON CONFLICT ("key") DO UPDATE SET "failCount" = CASE WHEN "LoginThrottle"."windowStartedAt" <= ${now} - interval '15 minutes' THEN 1 ELSE "LoginThrottle"."failCount" + 1 END, "windowStartedAt" = CASE … THEN ${now} ELSE "LoginThrottle"."windowStartedAt" END RETURNING "failCount"`, dengan `now = new Date()` dari JS (supaya bisa dipalsukan di test). Hasil `allowed` = semua count ≤ limit. Tambahkan komentar `// ponytail: baris throttle lama tidak dibersihkan; tambah cleanup bila tabel membesar`.
- [ ] PASS → commit: `feat(auth): add atomic DB-backed login throttle`

### Task 6: Sesi + audit (`lib/auth/session.ts`, `lib/audit.ts`)

**Interfaces — Produces:**
- `lib/audit.ts`: `type AuditAction = 'STUDENT_CREATED'|'STUDENT_UPDATED'|'STUDENT_SESSIONS_REVOKED'|'STUDENT_SESSION_REPLACED'|'STUDENT_DEACTIVATED'|'STUDENT_ACTIVATED'|'CLASS_CREATED'|'CLASS_UPDATED'|'CLASS_CODE_ROTATED'|'CLASS_SESSIONS_REVOKED'|'CLASS_DEACTIVATED'|'CLASS_ACTIVATED'|'TEACHER_PASSWORD_CHANGED'`. `writeAudit(tx: Prisma.TransactionClient, e: { actorUserId; action: AuditAction; entityType: 'User'|'Class'; entityId; metadata?: Record<string, string|number|boolean|string[]> }): Promise<void>`.
- `lib/auth/session.ts`:
  - `SESSION_TTL_MS = { STUDENT: 8*3600_000, TEACHER: 12*3600_000 }`
  - `type SessionUser = { id: string; role: Role; displayName: string; classId: string | null; mustChangePassword: boolean }`
  - `createSession(tx, user: { id: string; role: Role }): Promise<{ token: string; expiresAt: Date }>`, dengan token `randomBytes(32).toString('base64url')` dan DB menyimpan `sha256` hex-nya
  - `findSession(token: string): Promise<{ status: 'ok'; user: SessionUser } | { status: 'revoked'; reason: SessionRevokedReason } | { status: 'none' }>`
  - `revokeSessions(tx, scope: { userId: string } | { classId: string }, reason: SessionRevokedReason): Promise<number>`: hanya sesi aktif yang belum kedaluwarsa
  - `deleteSession(token: string): Promise<void>`
- [ ] Test:
  - sesi baru ditemukan → `ok`, dan `user` **hanya** berisi 5 key `SessionUser` (`Object.keys` sama persis, tanpa `passwordHash`/`tokenHash`)
  - kedaluwarsa (`setSystemTime` +8 jam +1 detik untuk siswa) → `none`; guru masih `ok` di +8 jam
  - user `isActive=false` → `none`; kelas siswa `isActive=false` → `none`
  - `revokeSessions({userId}, 'REPLACED')` → `findSession` = `revoked`/`REPLACED`, dan return-nya = 1
  - `revokeSessions({classId}, 'REVOKED')` hanya mengenai siswa kelas itu
  - token acak → `none`
  - kolom `tokenHash` ≠ token
- [ ] PASS → commit: `feat(auth): add DB sessions with soft revoke and audit helper`

### Task 7: Login, logout, ganti kata sandi (`lib/auth/login.ts`)

**Interfaces — Consumes:** Task 3–6. **Produces:**
- `type LoginResult = { ok: true; token: string; expiresAt: Date; mustChangePassword: boolean } | { ok: false; error: 'INVALID' | 'THROTTLED' }`
- `loginStudent(input: { classCode: string; identity: string; ip: string }): Promise<LoginResult>`
- `loginTeacher(input: { username: string; password: string; ip: string }): Promise<LoginResult>`
- `changeTeacherPassword(userId: string, input: unknown): Promise<{ ok: true; token: string; expiresAt: Date } | { ok: false; error: 'INVALID' | 'WRONG_PASSWORD'; fieldErrors?: Record<string, string> }>`. Field `currentPassword`, `newPassword` (≥12, ≠ current), `confirmPassword`. Fungsi ini mencabut **semua** sesi guru (`REVOKED`), membuat sesi baru (rotasi, PRD §13), set `mustChangePassword=false`, dan menulis audit `TEACHER_PASSWORD_CHANGED`.
- `logout(token: string): Promise<void>`

Alur siswa:
1. Normalisasi input.
2. `reserveAttempt([student(code, identity), ip(ip)])`. Kalau false → `THROTTLED`.
3. Cari kelas aktif dari kode, lalu siswa aktif dari `nis` kalau `isNis`, selain itu dari `loginName`, di kelas itu. Kalau tidak ada → `INVALID`.
4. Jalankan `$transaction`: `SELECT id FROM "User" WHERE id=$1 FOR UPDATE` → hapus baris sesi siswa itu yang sudah dicabut atau kedaluwarsa → `revokeSessions({userId}, 'REPLACED')` = n → `createSession` → kalau n>0, tulis audit `STUDENT_SESSION_REPLACED` (actor = siswa itu, `{ revoked: n }`).
5. `releaseOnSuccess`.

Alur guru: reserve `[teacher(u), ip]` → cari TEACHER aktif. Kalau tidak ada, `await verifyDummyPassword` → `INVALID`. Kalau ada, verify → create session (guru boleh punya banyak sesi) → release.

- [ ] Test (kriteria F01/F02/§9.6):
  - login via NIS; login via nama dengan `'  BUDI   santoso '`; kode diketik `' abc def '` → ok
  - NIS benar + kode kelas lain → `INVALID`
  - nama ada di kelas A, kode kelas B → `INVALID`
  - kelas nonaktif / siswa nonaktif / kode salah / nama salah → semuanya `{ ok:false, error:'INVALID' }` (bentuk identik, `toEqual`)
  - login kedua → `findSession(token1)` = `revoked`/`REPLACED`, sesi aktif tepat 1, ada 1 `AuditLog STUDENT_SESSION_REPLACED` dengan `metadata = { revoked: 1 }`
  - dua `loginStudent` paralel → tepat 1 sesi aktif
  - guru: 5× kata sandi salah, lalu kata sandi benar → `THROTTLED`
  - username tidak ada → `INVALID`, `verifyDummyPassword` terpanggil (spy lewat `vi.spyOn` pada modul `password`), dan percobaan ke-6 → `THROTTLED` (Review Focus #4)
  - guru baru → `mustChangePassword: true`
  - `changeTeacherPassword`: kata sandi lama salah → `WRONG_PASSWORD`; baru < 12 → `INVALID` + `fieldErrors.newPassword`; sukses → token lama `revoked`, `mustChangePassword=false`, kata sandi baru bisa dipakai login, ada audit
  - `logout` → `findSession` = `none`
- [ ] PASS → commit: `feat(auth): add student/teacher login, logout, and password change`

### Task 8: Seed guru (`prisma/seed.ts`)

**Interfaces — Produces:** `seedTeacher(env: { TEACHER_USERNAME?: string; TEACHER_PASSWORD?: string }): Promise<{ ok: true; username: string } | { ok: false; error: string }>`, plus `if (import.meta.main)` yang memanggilnya dengan `process.env`, mencetak hanya username, dan exit 1 kalau gagal.

- [ ] Test:
  - env lengkap → guru dibuat dengan `mustChangePassword=true` dan username sudah dinormalisasi
  - dijalankan kedua kali → `ok:false` dan jumlah guru tetap 1
  - kata sandi < 12 → `ok:false`
  - username tidak valid → `ok:false`
  - spy `console.*` tidak pernah menerima string kata sandi
- [ ] Verifikasi manual: `TEACHER_USERNAME=guru TEACHER_PASSWORD=… bun run db:seed` ke `aksara_dev` (kalau Bun bermasalah dengan Prisma/argon2, ganti ke `node --experimental-strip-types`, lalu catat di Risiko).
- [ ] Commit: `feat(auth): add env-driven teacher seed`

### Task 9: Guard + authInterrupts (`lib/auth/guard.ts`)

**Files:** Create `lib/auth/guard.ts`, `tests/next-mocks.ts`, `app/forbidden.tsx`. Modify `next.config.ts` (`experimental: { authInterrupts: true }`).

**Interfaces — Produces** (semua `import 'server-only'`):
- `requireSession(): Promise<SessionUser>`: tanpa sesi → `redirect('/login')`; `REPLACED` → `redirect('/login?alasan=perangkat-lain')`
- `requireTeacher(opts?: { allowPasswordChange?: boolean }): Promise<SessionUser>`: tanpa sesi → `redirect('/teacher/login')`; role ≠ TEACHER → `forbidden()`; `mustChangePassword && !allowPasswordChange` → `redirect('/teacher/password')`
- `requireStudent(): Promise<SessionUser>`: tanpa sesi → `/login` (+alasan); role ≠ STUDENT → `forbidden()`
- `setSessionCookie(token, expiresAt)`, `clearSessionCookie()`, `readSessionToken(): Promise<string | undefined>`, `getRequestIp(): Promise<string>` (entri pertama `x-forwarded-for` di-trim, fallback `'unknown'`)
- `tests/next-mocks.ts`: `cookieJar: Map<string,string>`, `headerJar: Map<string,string>`, plus factory untuk `vi.mock('next/headers', …)` dan `vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))`. Helper `expectRedirect(promise, path)` (digest diawali `NEXT_REDIRECT` dan memuat path) dan `expectForbidden(promise)` (digest `NEXT_HTTP_ERROR_FALLBACK;403`).
- [ ] Test:
  - tanpa cookie: `requireTeacher` → redirect `/teacher/login`, `requireStudent` → redirect `/login`
  - cookie siswa → `requireTeacher` → **403**
  - cookie guru → `requireStudent` → 403
  - guru `mustChangePassword` → redirect `/teacher/password`; dengan `allowPasswordChange` → ok
  - sesi `REPLACED` → redirect `/login?alasan=perangkat-lain`
  - siswa dinonaktifkan setelah login → redirect `/login`
  - `setSessionCookie` menulis opsi `httpOnly:true, sameSite:'lax', path:'/'`, dan `secure` mengikuti `NODE_ENV`
- [ ] `app/forbidden.tsx`: "Kamu tidak boleh membuka halaman ini." + tautan ke `/login`.
- [ ] PASS + `bunx tsc --noEmit` → commit: `feat(auth): add server guards with 403 via authInterrupts`

### Task 10: Domain kelas (`lib/classes.ts`)

**Interfaces — Produces** (semua menerima `actorId` dan menulis audit di transaksi yang sama, tanpa isi kode):
- `generateClassCode(): string`
- `createClass(actorId, input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: 'INVALID' | 'NAME_TAKEN'; fieldErrors? }>`: retry maks 5× kalau terjadi P2002 pada `code`
- `renameClass(actorId, classId, input: unknown)`: error `INVALID | NAME_TAKEN | NOT_FOUND`
- `rotateClassCode(actorId, classId): Promise<{ ok: true } | { ok: false; error: 'NOT_FOUND' }>`: kode baru ≠ lama, update `codeRotatedAt`, **tidak** mencabut sesi (D8)
- `revokeClassSessions(actorId, classId): Promise<{ ok: true; revoked: number } | …>`
- `setClassActive(actorId, classId, active: boolean)`: menonaktifkan juga memanggil `revokeSessions({classId}, 'REVOKED')` (D12). Audit `CLASS_DEACTIVATED`/`CLASS_ACTIVATED`
- `listClasses(): Promise<{ id; name; code; isActive; codeRotatedAt; studentCount }[]>`
- [ ] Test:
  - 1000× `generateClassCode()` → semua cocok `^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$`, dan semua karakter alfabet muncul
  - nama kembar → `NAME_TAKEN`; nama kosong / 31 karakter → `INVALID`
  - **setelah rotate, `loginStudent` dengan kode lama → `INVALID` dan dengan kode baru → ok**; sesi yang sudah ada tetap `ok`
  - `revokeClassSessions` → sesi siswa kelas itu `revoked`/`REVOKED`, kelas lain tidak tersentuh
  - nonaktifkan → login `INVALID` dan sesi lama ditolak; **aktifkan kembali → cookie lama tetap ditolak** (Review Focus #1), login baru ok
  - setiap mutasi menulis tepat 1 audit, dan `JSON.stringify(metadata)` tidak memuat kode kelas
- [ ] PASS → commit: `feat(classes): add class management with rotating codes`

### Task 11: Domain siswa (`lib/students.ts`)

**Interfaces — Produces:**
- `createStudent(actorId, input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: 'INVALID' | 'NAME_TAKEN' | 'NIS_TAKEN' | 'CLASS_NOT_FOUND'; fieldErrors?: Record<string,string> }>`. Field `displayName`, `nis` (string kosong → null), `classId`. Simpan `displayName` dengan spasi yang sudah dirapikan (kapitalisasi asli), `loginName = normalizeIdentity(displayName)`, dan role di-hardcode `STUDENT`.
- `updateStudent(actorId, studentId, input: unknown)`: error sama + `NOT_FOUND`. Audit `STUDENT_UPDATED { fields: [...] }` (hanya nama field yang berubah)
- `revokeStudentSessions(actorId, studentId)`: audit `{ revoked: n }`
- `setStudentActive(actorId, studentId, active)`: menonaktifkan juga mencabut sesi (D12)
- `listStudents(filter: { classId?: string; q?: string }): Promise<{ id; displayName; nis; className; classId; isActive; replacedCount7d: number; lastReplacedAt: Date | null }[]>`. Peringatan dihitung lewat `groupBy` pada `AuditLog` (`STUDENT_SESSION_REPLACED`, 7 hari terakhir). Tambahkan `// ponytail: tanpa pagination (satu guru, ±60 siswa); tambah saat > 200 baris`
- [ ] Test (kriteria F02):
  - siswa baru langsung bisa `loginStudent` via nama dan via NIS
  - `'Budi'` lalu `'budi '` di kelas yang sama → `NAME_TAKEN`; di kelas lain → ok
  - nama `'12345'` → `INVALID` + `fieldErrors.displayName`
  - NIS `'12a'` / `'123'` → `INVALID`; NIS duplikat → `NIS_TAKEN`
  - `role` di input diabaikan (tetap STUDENT)
  - pindah kelas: kode kelas lama + nama → `INVALID`, kode kelas baru → ok; nama bentrok di kelas tujuan → `NAME_TAKEN`; sesi tidak dicabut (D8) (Review Focus #5)
  - `revokeStudentSessions` → request berikutnya `revoked`
  - nonaktif → login `INVALID` dan sesi lama ditolak; diaktifkan lagi → cookie lama tetap ditolak (Review Focus #1)
  - `listStudents` setelah 2 login berurutan → `replacedCount7d = 1`; hasilnya tidak memuat key `code`/`passwordHash`
- [ ] PASS → commit: `feat(students): add student account management`

### Task 12: Halaman auth + dasbor placeholder

**Files:**
- `app/page.tsx` → `redirect('/login')`
- `app/(auth)/login/{page.tsx, student-login-form.tsx}`
- `app/(auth)/teacher/login/{page.tsx, teacher-login-form.tsx}`
- `app/(auth)/actions.ts`: `loginStudentAction`, `loginTeacherAction`, `logoutAction`
- `app/(teacher)/teacher/{layout.tsx, page.tsx}`
- `app/(teacher)/teacher/password/{page.tsx, password-form.tsx, actions.ts}`
- `app/(student)/student/page.tsx`
- Test: `app/(auth)/actions.test.ts`

**Interfaces:** action dengan bentuk `useActionState` `(prev: FormState, formData: FormData) => Promise<FormState>`, di mana `FormState = { message?: string; fieldErrors?: Record<string,string> } | undefined`.

- [ ] Test action dulu (dengan `tests/next-mocks.ts`):
  - `loginStudentAction` sukses → cookie `aksara_session` terisi + redirect `/student`
  - gagal → `{ message: 'Kode kelas atau nama/NIS tidak cocok.' }` tanpa cookie
  - throttled → pesan throttle
  - `loginTeacherAction` untuk guru baru → redirect `/teacher/password`
  - `logoutAction` → baris sesi terhapus, cookie dihapus, redirect ke login
  - action ganti kata sandi dipanggil dengan cookie siswa → 403
- [ ] Halaman: shell statis + `<Suspense>`. `/login` membaca `searchParams.alasan` di dalam Suspense dan menampilkan `Alert` dengan pesan perangkat lain. Form memakai `Card` + `Label`/`Input`, `autoComplete="off"` untuk kode kelas, `inputMode` default, tombol "Masuk" dengan `aria-busy` saat pending, dan pesan error `role="alert"`. Halaman login guru punya tautan "Masuk sebagai siswa". `teacher/layout.tsx` hanya berisi nav statis (Dasbor, Kelas, Siswa, Keluar) tanpa baca sesi. Dasbor guru/siswa: komponen dalam Suspense memanggil `requireTeacher()`/`requireStudent()` lalu menampilkan "Halo, {displayName}" + tombol Keluar. Halaman password memanggil `requireTeacher({ allowPasswordChange: true })`.
- [ ] Verifikasi: `bun run test app` PASS, `bun run build` sukses (tanpa error `blocking-prerender`), dan `bun dev` + login manual siswa/guru di 360 px.
- [ ] Commit: `feat(auth): add login, logout, password change pages and dashboards`

### Task 13: UI kelola kelas (`/teacher/classes`)

**Files:** `app/(teacher)/teacher/classes/{page.tsx, actions.ts, class-forms.tsx, actions.test.ts}`

- [ ] Test action:
  - cookie siswa → `createClassAction` **403**
  - tanpa cookie → redirect `/teacher/login`
  - guru → kelas dibuat + `revalidatePath('/teacher/classes')`
  - `NAME_TAKEN` → pesan "Nama kelas ini sudah dipakai."
- [ ] Action: `createClassAction`, `renameClassAction`, `rotateClassCodeAction`, `revokeClassSessionsAction`, `setClassActiveAction`. Masing-masing `requireTeacher()` → domain → `revalidatePath` → pesan.
- [ ] UI: daftar kartu kelas (nama, jumlah siswa, status, kode dalam font mono). Tombol "Tampilkan kode" membuka `Dialog` berisi kode `text-7xl` yang dikelompokkan "ABC DEF" (normalisasi Task 3 menerima spasi). "Ganti kode", "Keluarkan semua siswa", dan "Nonaktifkan/Aktifkan" memakai `AlertDialog` konfirmasi dalam Bahasa Indonesia. Status tidak boleh hanya ditandai warna; `Badge` harus berteks "Aktif"/"Nonaktif".
- [ ] PASS + build → commit: `feat(classes): add teacher class management page`

### Task 14: UI kelola siswa (`/teacher/students`)

**Files:** `app/(teacher)/teacher/students/{page.tsx, actions.ts, student-forms.tsx, actions.test.ts}`

- [ ] Test action:
  - cookie siswa → `createStudentAction` **403**
  - `NAME_TAKEN` → pesan F02 "Nama ini sudah dipakai siswa lain di kelas {nama kelas}. Tambahkan inisial, misalnya 'Ahmad R'."
  - `NIS_TAKEN` → "NIS ini sudah dipakai siswa lain."
- [ ] Action: `createStudentAction`, `updateStudentAction`, `revokeStudentSessionsAction`, `setStudentActiveAction`.
- [ ] UI: filter kelas (`?kelas=`) + pencarian (`?q=`) dibaca di dalam Suspense, form tambah siswa (nama, NIS opsional, kelas), dan tabel yang berubah jadi daftar kartu di mobile. Peringatan login ganda: `Badge` "Login dari perangkat lain: {n}× (7 hari), terakhir {formatWita}". Edit lewat `Dialog`, yang memberi tahu guru agar menyampaikan nama baru kepada siswa. "Keluarkan dari semua perangkat" dan "Nonaktifkan/Aktifkan" memakai konfirmasi. `lib/format.ts` berisi `formatWita(d)` = `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', dateStyle: 'medium', timeStyle: 'short' })`, dengan unit test dari 1 nilai UTC ke WITA.
- [ ] PASS + build → commit: `feat(students): add teacher student management page`

### Task 15: Bukti tanpa rahasia + verifikasi akhir

- [ ] Test `lib/auth/no-secrets.test.ts`: spy `console.log/info/warn/error`, lalu jalankan login siswa sukses+gagal+throttle, login guru sukses+gagal, `rotateClassCode`, dan `changeTeacherPassword`. Pastikan tidak ada output yang memuat token, kata sandi, atau kode kelas (lama/baru), dan seluruh `AuditLog.metadata` (di-JSON-kan) juga tidak memuatnya.
- [ ] Cek statis: `rg -n "passwordHash|tokenHash" app/` → tidak ada hasil, dan `rg -n "\bcode\b" app/ | rg -v "teacher/classes"` ditinjau manual.
- [ ] Verifikasi (output ditempel di ringkasan): `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build`. Smoke test `bun run start`: login guru dari seed → ganti kata sandi → buat kelas → buat siswa → login siswa di jendela incognito → login lagi di jendela lain → jendela pertama melihat pesan perangkat lain.
- [ ] Jalankan `superpowers:verification-before-completion`, lalu `security-review`, lalu `superpowers:requesting-code-review`. Perbaiki temuan, lalu commit `test: prove no secrets reach logs or audit metadata`.

### Task 16: Update vault + penutupan branch

- [ ] Hub `Aksara Project Context.md`:
  - `updated: 2026-10-27`
  - Status: "Tahap 1 (F01, F02, F14) dibangun di branch `feat/tahap-1-fondasi`"
  - Tabel Keputusan: tambah D1–D12 secara ringkas, dengan alasan
  - Risiko terbuka: hapus "penyedia Postgres belum dipilih" dan "test runner belum diputuskan"; tambah "authInterrupts masih experimental" dan "Preview Vercel belum diuji"
- [ ] F01: "hapus sesi" → "cabut sesi (soft-revoke, `revokedReason`)"; `LoginThrottle` tanpa `lockedUntil` dengan key di-hash. F00: asumsi Q-13 (kode diganti, 8 jam, pindah kelas) → diputuskan. F12: tambah `TEACHER_PASSWORD_CHANGED`, `CLASS_ACTIVATED`, dan aturan bahwa nonaktif mencabut sesi. Naikkan `updated:` di setiap note yang diubah. Tanpa log harian.
- [ ] `superpowers:finishing-a-development-branch`.

---

## Risiko & cara verifikasi

| Risiko (bergantung versi) | Verifikasi |
|---|---|
| cacheComponents: `cookies()`/`searchParams` di luar `<Suspense>` = build error; status redirect/403 di halaman bisa 200 setelah streaming | `bun run build` di Task 12–14 harus lulus tanpa `blocking-prerender-*`. Test 403 dijalankan pada action (status terlempar sebagai digest), bukan halaman |
| `authInterrupts` experimental. `forbidden()` melempar Error kalau flag mati (dicek lewat `process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS`) | `next.config.ts` menyalakan flag; Vitest men-set env yang sama; test 403 di Task 9/13/14 |
| Server Action tanpa header `Origin` hanya diberi warning, tidak ditolak | Keamanan tetap bersandar pada guard + cookie `SameSite=Lax`. Dicatat di security-review |
| Prisma 7: generator `prisma-client`, `prisma.config.ts`, adapter wajib; tag npm `latest` = RC | Versi di-pin; `migrate status` + `tsc` di Task 1; `bun run build` memastikan klien hasil generate ter-bundle. Di Vercel: `postinstall` generate, `@prisma/client` sudah ada di daftar external Next |
| Bun memblokir postinstall `@prisma/engines` | `trustedDependencies`; `bunx prisma migrate dev` harus jalan di Task 1 |
| Native binding `@node-rs/argon2` di Vercel | Prebuilt linux-x64-gnu + external default Next. Lokal: `bun run build && bun run start` + login guru. **Manual (butuh project Vercel milikmu):** login guru di Preview Deployment region `sin1` |
| `server-only` melempar error di Vitest | Alias ke stub di `vitest.config.ts` |
| Fake timers merusak driver `pg` | Hanya `toFake: ['Date']` |
| Seed dijalankan dengan Bun runtime (bukan Node) | Smoke `bun run db:seed` di Task 8; cadangan `node --experimental-strip-types` |

## Verifikasi end-to-end

`bun run db:up` → `bun run db:migrate` → `bun run db:seed` → `bun run lint && bunx tsc --noEmit && bun run test && bun run build` → `bun run start`, lalu smoke test manual Task 15 di lebar 360 px dengan keyboard saja.

## Sengaja tidak dikerjakan

`proxy.ts`, pagination siswa, cleanup baris throttle/sesi kedaluwarsa (di luar bersih-bersih per login), UI audit log, Playwright, impor massal, hapus permanen, deploy Vercel (hanya `vercel.json` region).
