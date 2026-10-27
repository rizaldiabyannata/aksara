# Aksara Tahap 2 (Konten): Rencana Implementasi

> **Untuk agen pelaksana:** SUB-SKILL WAJIB: superpowers:subagent-driven-development (dipilih pengguna). Bila classifier menolak dispatch subagent, jangan diakali: lanjutkan inline dengan superpowers:executing-plans. Langkah memakai checkbox (`- [ ]`). Saat eksekusi dimulai, rencana ini disalin ke `docs/superpowers/plans/2026-10-27-tahap-2-konten.md`.

**Goal:** Guru bisa menyusun mapel → bab → subbab, menulis materi Markdown dengan gambar R2, lalu meninjau dan menerbitkannya. Siswa hanya bisa membaca materi yang `PUBLISHED`.

**Architecture:** Logika domain ditulis sebagai modul *deep* di `lib/` (`subjects`, `materials`, `images`), bebas Next, dan diuji langsung ke Postgres. `lib/storage.ts` adalah satu-satunya modul yang mengenal R2, dan itulah seam nyata dengan dua adapter: R2 (`@aws-sdk/client-s3`) dan fake in-memory (`tests/storage-fake.ts`, dipasang lewat `vi.mock`). Server Action dan Route Handler tetap tipis (guard → domain → revalidate). Pratinjau guru dan halaman siswa memakai satu komponen `MaterialView`. Semua halaman dinamis, tanpa `use cache`.

**Tech Stack:** Next 16.4.3 (cacheComponents), React 19.3, Bun 1.4, Prisma 7.10.1 + adapter-pg, Zod 4, Vitest 5. Dependensi baru: `react-markdown@10.1.0`, `remark-gfm@4.0.1`, `@aws-sdk/client-s3@3.1157.0`, `@aws-sdk/s3-request-presigner@3.1157.0`, `sharp@0.35.5` (versi yang sama dengan milik Next).

**Spec:** `docs/PRD_Web_App_Belajar_Kelas_VI.md` (§6, §7.2, §9.1, §9.8, §10.2, §12, §13, §15, §18 Tahap 2), ditambah vault `Projects/Aksara/Feature Specs/` F03, F04, F11, F12, F13. Vault adalah sumber kebenaran perilaku, dengan koreksi dari tabel keputusan di bawah.

## Context

Tahap 1 (auth, kelas, siswa) sudah ada di `main`. Tahap 2 menyiapkan konten: kerangka mapel/bab yang akan dipakai bank soal (Tahap 3) dan ulangan (Tahap 4), materi dengan alur publikasi, dan jalur gambar R2 yang aman. Trust boundary utama tahap ini: draft dan gambarnya tidak pernah terlihat siswa, `storageKey` tidak pernah sampai ke klien, dan Markdown guru tidak bisa menjalankan skrip.

## Keputusan

Keputusan final sebelum grilling tidak diulang di sini (lihat prompt dan F03/F04/F13). Tabel ini hanya memuat hasil grilling 2026-10-27 dan keputusan turunan.

| # | Keputusan | Alasan | Asal |
|---|---|---|---|
| D1 | `react-markdown` + `remark-gfm`. `urlTransform` hanya meloloskan `aksara-image:` di samping `defaultUrlTransform`. `components.img`: id ada di peta gambar materi → `<img src="/api/images/<id>">` dengan alt dari Markdown, atau `altText` DB bila kosong. Id tak dikenal → teks "[Gambar tidak tersedia]". `src` lain (http dsb.) → teks "[Gambar: alt]", sehingga tidak ada hotlink eksternal. `components.a`: `rel="noopener noreferrer" target="_blank"`. HTML mentah dibiarkan default (di-escape, tidak dirender) | Tanpa `dangerouslySetInnerHTML`, jalan di RSC, ada tabel untuk matematika | Q1 |
| D2 | Test memakai fake `lib/storage` lewat `vi.mock`, dev memakai bucket R2 `aksara-dev`. `lib/storage.r2.test.ts` di-skip bila env R2 tidak ada; isinya put → presigned GET 200 → GET tanpa tanda tangan ditolak 4xx → delete | Test tanpa jaringan, sementara bukti privasi diambil dari R2 asli | Q2 |
| D3 | `sharp@0.35.5` dijadikan dependensi langsung, dihapus dari `ignoreScripts`, dan tetap ada di `trustedDependencies`. Diverifikasi lewat test EXIF/resize + `bun run build` + satu unggahan di Preview Vercel (oleh pengguna) | Binary prebuilt `@img/*`, dan sudah termasuk `serverExternalPackages` bawaan Next | Q3 |
| D4 | `Image.materialId` wajib (FK Restrict). `questionId`, `deletedAt`, dan CHECK "tepat satu pemilik" ditunda ke Tahap 3 | YAGNI, migrasinya murah | Q4 |
| D5 | Semua halaman dinamis, tanpa `use cache`. Action memanggil `revalidatePath` untuk UI guru | Tidak ada risiko cache basi setelah `PUBLISHED → DRAFT` | Q5 |
| D6 | Editor berupa textarea Markdown. Panel gambar punya tombol "Salin kode sisip" (clipboard) dan kode yang bisa diseleksi manual. Pratinjau di halaman terpisah | Kode paling sedikit | Q6 |
| D7 | Daftar materi guru tanpa pagination: filter `?subjectId&chapterId&status`, `take: 201`. Bila 201 baris → tampil 200 + "Tampil 200 materi pertama. Persempit filter." (komentar `ponytail:`) | Volume ±150 materi | Q7 |
| D8 | Setup Cloudflare berupa checklist di README dan diakhiri smoke test R2 | Tidak ada skrip sekali pakai | Q8 |
| D9 | Urutan materi diubah dengan tombol naik/turun (`moveMaterial`) yang menukar `order` dalam satu transaksi. Materi baru, atau materi yang pindah bab, mendapat `max(order)+1` di babnya | Pola sama dengan bab/subbab | Q9 |
| D10 | `deleteMaterial` hanya untuk status `DRAFT`, dengan ConfirmAction. Satu transaksi menghapus baris `Image` + `Material` dan menulis audit `MATERIAL_DELETED` `{title}`, lalu objek R2 dihapus best effort | Materi sampah dan babnya tidak terkunci selamanya | Q10 |
| D11 | Kerja di branch `tahap-2-konten` dalam checkout ini, tanpa worktree. `.claude/**` dikecualikan dari eslint dan vitest | Memori: worktree bersarang mencemari lint/test | Q11 |
| D12 | `Subject.slug` **tidak dibuat**. `name` unik sudah cukup untuk kunci seed, dan tidak ada rute yang memakai slug | Kolom tanpa pemakai | turunan |
| D13 | `storageKey` = `images/<randomUUID>.<ext>`, **tanpa prefix env**, karena bucket sudah satu per env. Kunci dibuat sebelum insert, jadi terlepas dari `Image.id` (cuid) | Prefix env berlebihan, F13 dikoreksi | turunan |
| D14 | Re-encode mempertahankan format asal (jpeg/png/webp). `.rotate()` menerapkan orientasi EXIF, lalu metadata dibuang (default sharp), sisi terpanjang ≤ 1.600 px (`fit: "inside"`, `withoutEnlargement`). Hasil > 2 MB ditolak. Gagal decode (termasuk melewati `limitInputPixels`) → `UNSUPPORTED` | PNG diagram tetap tajam | turunan |
| D15 | Audit hanya untuk yang diminta F12: `MATERIAL_STATUS_CHANGED`, `MATERIAL_UPDATED`, `IMAGE_ADDED`, `IMAGE_REMOVED`, ditambah `MATERIAL_DELETED` (D10). CRUD mapel/bab/subbab dan pembuatan materi tidak diaudit | F12 tidak memintanya | turunan |
| D16 | Klien S3: `region: "auto"`, endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, `requestChecksumCalculation: "WHEN_REQUIRED"`, `responseChecksumValidation: "WHEN_REQUIRED"`. Klien dibuat malas saat panggilan pertama, sehingga build dan test tidak butuh env | SDK v3 baru mengirim checksum default yang tidak didukung R2 | turunan |
| D17 | 404 untuk materi siswa memakai `not-found.tsx` per segmen dengan teks "Materi ini sedang diperbarui guru." Teks ini juga dipakai untuk id yang memang tidak ada, supaya keberadaan draft tidak terungkap | F04 edge case | turunan |
| D18 | `POST /api/images`: cek `Origin` dulu (host Origin ≠ `Host` → 403), lalu `requireTeacher()`. File > 4 MB → 413. Respons berupa JSON `{ ok, id? , message?, fieldErrors? }` | Batas Vercel 4,5 MB, Server Action dibatasi 1 MB | turunan |

## Global Constraints

- Hanya Bun (`bun add`, `bun run`, `bunx`). Dependensi baru di-pin persis seperti di Tech Stack.
- UI dalam Bahasa Indonesia untuk anak kelas 6, mobile-first (360 px), bisa dipakai dengan keyboard, setiap field punya `<label>`, tombol `h-11`. Waktu ditampilkan lewat `formatWita`.
- Halaman: guard dan semua pembacaan `params`/`searchParams`/cookie berada di komponen di dalam `<Suspense>`. `redirect()` dan `notFound()` di luar `try`.
- Panjang field materi: judul 1–150, ringkasan 1–1.000, isi 1–50.000, contoh/latihan 0–50.000, `sourceReference` 1–200, `sourcePages` 0–50. Alt gambar 1–200, keterangan 0–200, sumber gambar 0–200. Judul mapel 1–80, judul bab/subbab 1–150, `sourceBook` 1–150, `sourceYearOrEdition` 1–40, `sourcePages` subbab 0–50. Semua string di-trim; string kosong pada field opsional disimpan `null`.
- Gambar: maks 20 per materi, file asli ≤ 4 MB, hasil ≤ 2 MB, jpeg/png/webp dikenali dari magic bytes.
- Jangan pernah mengirim `storageKey`, kunci R2, atau URL bertanda tangan ke log maupun audit. `console.error` hanya boleh memuat `imageId`.
- Migrasi baru dibuat dengan `bun run db:migrate --name tahap_2_konten`. Jangan edit migrasi init.
- Setiap model baru masuk daftar `TRUNCATE` di `tests/setup.ts`.
- Pola action: salin `run()` dari `app/(teacher)/teacher/classes/actions.ts`. Pola domain: `parse*` + Zod + `Invalid` dari `lib/classes.ts`. Pola test authz: `describe.each` dari `classes/actions.test.ts`.

## Model per peran (paling murah yang cukup)

- **haiku** (default): task dengan interface + test lengkap di rencana ini (T0, T1+2, T3, T4, T7, T9, T11, T12, T13), plus review spek per task.
- **sonnet**: hanya untuk task yang menyentuh trust boundary dan butuh penilaian lintas modul: T5 (materi/visibilitas siswa), T6 (akses gambar), T8 (Route Handler), T10 (halaman materi multi-file). Review kualitas per task juga sonnet untuk keempat task ini, haiku untuk sisanya.
- **opus**: hanya satu kali, review akhir seluruh branch (keamanan). Tidak dipakai untuk implementasi.
- Eskalasi: bila haiku gagal 2× pada test yang sama, ulangi task itu dengan sonnet, jangan opus.

## Pesan baku (dipakai persis)

- Transisi tidak sah: "Status materi tidak bisa diubah ke sana. Tandai sudah ditinjau dulu."
- Subbab salah bab: "Subbab harus dari bab yang dipilih."
- Kode gambar asing: "Ada kode gambar yang bukan milik materi ini. Pakai tombol Salin kode sisip."
- Masih dipakai: mapel "Mapel ini masih punya {n} bab.", bab "Bab ini masih dipakai {n} materi dan {m} subbab.", subbab "Subbab ini masih dipakai {n} materi."
- Hapus non-draft: "Kembalikan materi ke draft dulu sebelum menghapusnya."
- Gambar: tipe "File harus gambar JPG, PNG, atau WEBP.", terlalu besar "Ukuran gambar paling besar 4 MB.", batas "Satu materi paling banyak 20 gambar.", alt "Teks alternatif wajib diisi, paling banyak 200 huruf."
- Siswa 404: "Materi ini sedang diperbarui guru."

## Peta file

**Dibuat:** `prisma/migrations/<ts>_tahap_2_konten/migration.sql`, `prisma/seed-content.ts`, `prisma/seed-content.test.ts`, `lib/subjects.ts`(+test), `lib/materials.ts`(+test), `lib/images.ts`(+test), `lib/storage.ts`, `lib/storage.r2.test.ts`, `tests/storage-fake.ts`, `components/material-view.tsx`(+`.test.ts`), `app/api/images/route.ts`, `app/api/images/[id]/route.ts`, `app/api/images/route.test.ts`, `app/(teacher)/teacher/subjects/{page.tsx,actions.ts,actions.test.ts,subject-forms.tsx}`, `app/(teacher)/teacher/materials/{page.tsx,actions.ts,actions.test.ts,material-form.tsx,image-panel.tsx}`, `.../materials/new/page.tsx`, `.../materials/[id]/page.tsx`, `.../materials/[id]/preview/page.tsx`, `app/(student)/student/materials/page.tsx`, `.../materials/[id]/{page.tsx,not-found.tsx}`.

**Diubah:** `prisma/schema.prisma`, `lib/audit.ts`, `tests/setup.ts`, `tests/factories.ts`, `eslint.config.mjs`, `vitest.config.mts`, `package.json`, `app/(teacher)/teacher/layout.tsx` (NAV), `app/(teacher)/teacher/page.tsx`, `app/(student)/student/page.tsx`, `.env.example`, `README.md`, `CLAUDE.md`.

---

## Task 0: Branch dan pengecualian `.claude/**`

**Model:** haiku. **Files:** `eslint.config.mjs`, `vitest.config.mts`.

- [ ] `git switch -c tahap-2-konten`. Salin rencana ini ke `docs/superpowers/plans/2026-10-27-tahap-2-konten.md`.
- [ ] Tambahkan `".claude/**"` ke `globalIgnores` eslint, dan `exclude: [...configDefaults.exclude, ".claude/**"]` (import `configDefaults` dari `vitest/config`) di `test` vitest.
- [ ] Verifikasi: `bun run lint` dan `bun run test` lulus (sama seperti di main).
- [ ] Commit `chore: ignore .claude in lint and tests; add Tahap 2 plan`.

## Task 1+2 (satu dispatch): Skema, migrasi, seed mapel/bab

**Model:** haiku. **Files:** `prisma/schema.prisma`, migrasi baru, `lib/audit.ts`, `tests/setup.ts`, `tests/factories.ts`, `prisma/seed-content.ts`, `prisma/seed-content.test.ts`, `prisma/schema.test.ts` (tambah kasus), `package.json` (script `db:seed:content`).

**Produces (skema):**
- `enum MaterialStatus { DRAFT REVIEWED PUBLISHED }`
- `Subject { id cuid, name String @unique, description String?, createdAt, updatedAt, chapters Chapter[] }`
- `Chapter { id, subjectId (onDelete Restrict), title, order Int, sourceBook, sourceYearOrEdition, createdAt, updatedAt; @@unique([subjectId, order]) }`
- `Subchapter { id, chapterId (Restrict), title, order Int, sourcePages String?, createdAt, updatedAt; @@unique([chapterId, order]); @@unique([id, chapterId]) }`
- `Material` sesuai tabel F04 (tanpa field tambahan): FK `chapterId` Restrict; relasi subbab **komposit** `fields: [subchapterId, chapterId], references: [id, chapterId]`, onDelete Restrict, sehingga DB sendiri menolak subbab dari bab lain (FK MATCH SIMPLE: `subchapterId` null lolos). `createdById`/`updatedById` → `User` Restrict. `@@index([chapterId, status, order])`. Semua waktu `@db.Timestamptz(3)`.
- `Image { id cuid, materialId (Restrict), storageKey @unique, mimeType, sizeBytes Int, width Int, height Int, altText, caption String?, sourceReference String?, createdById → User, createdAt; @@index([materialId]) }`
- `lib/audit.ts`: `AuditAction` ditambah `"MATERIAL_STATUS_CHANGED" | "MATERIAL_UPDATED" | "MATERIAL_DELETED" | "IMAGE_ADDED" | "IMAGE_REMOVED"`, `entityType` ditambah `"Material" | "Image"`.
- `tests/setup.ts`: TRUNCATE ditambah `"Image","Material","Subchapter","Chapter","Subject"`.
- `tests/factories.ts`: `makeChapter(overrides?)` (membuat Subject + Chapter, return Chapter), `makeSubchapter(chapterId, overrides?)`, `makeMaterial(chapterId: string, createdById: string, overrides?: Partial<Prisma.MaterialUncheckedCreateInput>)` (default `DRAFT`, field wajib terisi), `makeImage(materialId: string, createdById: string, overrides?)` (`storageKey: images/test-<n>.jpg`, 10×10).
- `seedContent(db = prisma): Promise<{ subjects: number; chapters: number }>`: upsert mapel berdasarkan `name` dan bab berdasarkan `subjectId_order`, dengan `update: {}` sehingga suntingan guru tidak ditimpa. Data persis PRD §6: "Matematika" (`sourceBook` "Matematika untuk SD/MI Kelas VI", `sourceYearOrEdition` "2022", bab 1–4: Pecahan dan Desimal; Rasio; Kubus dan Balok; Peluang), "IPAS" (`sourceBook` "Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas VI (Edisi Revisi)", "Edisi Revisi 2025", bab 1–6 seperti F03). Blok main mengikuti pola `prisma/seed.ts`. Script: `"db:seed:content": "bun prisma/seed-content.ts"`.

**Test dulu:**
- `seed-content.test.ts` › "creates 2 subjects, 10 chapters, 0 subchapters and is idempotent": jalankan 2×, lalu `subject.count()===2`, `chapter.count()===10`, `subchapter.count()===0`; judul bab IPAS ke-6 === "Mengembara di Jagat Raya".
- › "does not overwrite a teacher-edited chapter title": ubah judul, seed lagi, judul tetap.
- `schema.test.ts` › "DB rejects a material whose subchapter belongs to another chapter": `prisma.material.create` dengan subbab dari bab lain → rejects (FK violation).

**Verifikasi:** `bun run db:migrate --name tahap_2_konten`, lalu `bun run test prisma/`. Commit `feat(db): content schema and subject/chapter seed`.

## Task 3: `lib/subjects.ts`

**Model:** haiku. **Files:** `lib/subjects.ts`, `lib/subjects.test.ts`.

**Produces:**
```ts
type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> };
type InUse = { ok: false; error: "IN_USE"; message: string };   // message = pesan baku dengan angka
type NotFound = { ok: false; error: "NOT_FOUND" };
export type SubjectTree = { id; name; description: string | null;
  chapters: { id; title; order; sourceBook; sourceYearOrEdition; materialCount: number;
    subchapters: { id; title; order; sourcePages: string | null; materialCount: number }[] }[] }[];
export function getSubjectTree(): Promise<SubjectTree>;            // mapel by name, bab/subbab by order
export function saveSubject(id: string | null, input: unknown): Promise<{ ok: true } | Invalid | NotFound | { ok: false; error: "NAME_TAKEN" }>;
export function deleteSubject(id: string): Promise<{ ok: true } | InUse | NotFound>;
export function saveChapter(subjectId: string, id: string | null, input: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export function moveChapter(id: string, dir: "up" | "down"): Promise<{ ok: true } | NotFound>;
export function deleteChapter(id: string): Promise<{ ok: true } | InUse | NotFound>;
export function saveSubchapter(chapterId: string, id: string | null, input: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export function moveSubchapter(id: string, dir: "up" | "down"): Promise<{ ok: true } | NotFound>;
export function deleteSubchapter(id: string): Promise<{ ok: true } | InUse | NotFound>;
export function listChapterOptions(): Promise<{ id; label: string; subchapters: { id; label: string }[] }[]>; // label "Matematika · Bab 1 · Pecahan dan Desimal"
```
- Create memberi `order = max+1` dalam induknya. Pindah urutan menukar dengan tetangga dalam satu transaksi, dalam 3 langkah (`order` sementara = `-order`) agar unique tidak bentrok. Di ujung → `ok` tanpa perubahan.
- Delete menghitung pemakai di dalam transaksi. FK Restrict menjadi pengaman cadangan.

**Test dulu (lib/subjects.test.ts):** "chapter with a material cannot be deleted" (`IN_USE`, pesan memuat "1 materi"); "subject with chapters cannot be deleted"; "moveChapter swaps order with neighbour and is a no-op at the edge"; "saveChapter rejects blank title" (`"   "` → `INVALID`); "new chapter gets max+1 order"; "getSubjectTree counts materials per chapter".

**Verifikasi:** `bun run test lib/subjects.test.ts`. Commit `feat(subjects): subject/chapter/subchapter domain`.

## Task 4 (satu dispatch, dua modul kecil): `lib/storage.ts` + bagian murni `lib/images.ts`

**Model:** haiku. **Files:** `lib/storage.ts`, `tests/storage-fake.ts`, `lib/storage.r2.test.ts`, `lib/images.ts` (bagian murni), `lib/images.test.ts`, `package.json` (deps `@aws-sdk/client-s3@3.1157.0 @aws-sdk/s3-request-presigner@3.1157.0 sharp@0.35.5`, `sharp` dihapus dari `ignoreScripts`).

**Produces:**
```ts
// lib/storage.ts  ("server-only"; satu-satunya importir @aws-sdk)
export function putImage(key: string, body: Buffer, contentType: string): Promise<void>;
export function deleteImage(key: string): Promise<void>;
export function presignGet(key: string): Promise<string>; // expiresIn 300, ResponseCacheControl "private, max-age=300"
// tests/storage-fake.ts
export const objects: Map<string, { body: Buffer; contentType: string }>;
export function storageMock(): { putImage; deleteImage; presignGet };  // presignGet → `https://r2.test/${key}?sig=1`
// pemakaian: vi.mock("@/lib/storage", () => import("<rel>/tests/storage-fake").then((m) => m.storageMock()));
// lib/images.ts (murni)
export function extractImageIds(markdown: string): string[];          // unik, urutan kemunculan; regex /aksara-image:([A-Za-z0-9_-]+)/g
export function canStudentViewImage(ctx: { role: "TEACHER" | "STUDENT"; materialStatus: MaterialStatus }): boolean;
export type ProcessedImage = { data: Buffer; mimeType: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp"; width: number; height: number };
export function processUpload(bytes: Uint8Array): Promise<{ ok: true; image: ProcessedImage } | { ok: false; error: "UNSUPPORTED" | "TOO_LARGE" }>;
```
Env R2 dibaca di dalam pembuat klien malas (D16), dan error bila env tidak ada. `processUpload`: sniff magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WEBP `RIFF....WEBP`), lalu sharp sesuai D14 dalam `try`.

**Test dulu (lib/images.test.ts, fixture dibuat dengan sharp di test, tanpa file biner di repo):**
- "extractImageIds finds ids in images and links, deduped": `"![a](aksara-image:x1) [b](aksara-image:x1) ![c](aksara-image:y2)"` → `["x1","y2"]`.
- "canStudentViewImage": teacher+DRAFT true; student+PUBLISHED true; student+DRAFT/REVIEWED false.
- "strips EXIF and caps long side at 1600": input JPEG 2400×1200 dengan `.withExif({ IFD0: { Copyright: "Aksara" } })` (pastikan `metadata(input).exif` ada) → output `metadata().exif` undefined, `width===1600`, `height===800`, `mimeType==="image/jpeg"`.
- "keeps PNG as PNG and does not upscale": 300×200 PNG → 300×200 `image/png`.
- "rejects SVG": `Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')` → `UNSUPPORTED`.
- "rejects fake .png": `Buffer.from("bukan png")` → `UNSUPPORTED`.
- "rejects truncated PNG and decompression bombs": 8 byte header PNG saja → `UNSUPPORTED`; PNG 20000×20000 (`sharp({create…}).png({compressionLevel:9})`) → `UNSUPPORTED`, bukan throw.

**`lib/storage.r2.test.ts`:** `describe.skipIf(!process.env.R2_BUCKET)`: put JPEG kecil → `fetch(presignGet(key))` status 200 dan `content-type` image/jpeg → `fetch(\`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}\`)` status 400–499 → `deleteImage`. Kunci `smoke/<uuid>.jpg`.

**Verifikasi:** `bun run test lib/images.test.ts lib/storage.r2.test.ts` (yang R2 tercatat skipped). Commit `feat(images): storage seam and safe image processing`.

## Task 5: `lib/materials.ts`

**Model:** sonnet. **Files:** `lib/materials.ts`, `lib/materials.test.ts`.

**Consumes:** skema Task 1, `writeAudit`, `extractImageIds` (Task 4), `deleteImage` dari `@/lib/storage` (Task 4).

**Produces:**
```ts
export type ImageView = { id: string; altText: string; caption: string | null; sourceReference: string | null; width: number; height: number };
export type MaterialDetail = { id; title; summary; content; examples: string | null; exercises: string | null;
  sourceReference; sourcePages: string | null; status: MaterialStatus; chapterId; subchapterId: string | null;
  chapterTitle: string; subjectName: string; subchapterTitle: string | null; images: ImageView[]; publishedAt: Date | null; updatedAt: Date };
export type MaterialRow = { id; title; status; order; chapterId; chapterTitle; subjectName; updatedAt: Date };
export function canTransition(from: MaterialStatus, to: MaterialStatus): boolean;
export function createMaterial(actorId: string, input: unknown): Promise<{ ok: true; id: string } | Invalid>;
export function updateMaterial(actorId: string, id: string, input: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export function changeMaterialStatus(actorId: string, id: string, to: MaterialStatus): Promise<{ ok: true } | NotFound | { ok: false; error: "BAD_TRANSITION" }>;
export function moveMaterial(id: string, dir: "up" | "down"): Promise<{ ok: true } | NotFound>;
export function deleteMaterial(actorId: string, id: string): Promise<{ ok: true } | NotFound | { ok: false; error: "NOT_DRAFT" }>;
export function listMaterials(f: { subjectId?: string; chapterId?: string; status?: MaterialStatus }): Promise<{ rows: MaterialRow[]; capped: boolean }>;
export function getMaterialForTeacher(id: string): Promise<MaterialDetail | null>;
export function getPublishedMaterial(id: string): Promise<MaterialDetail | null>;   // WHERE id AND status=PUBLISHED
export function listPublishedTree(): Promise<{ id; name; chapters: { id; title; order; materials: { id; title }[] }[] }[]>;
export function countMaterialsByStatus(): Promise<Record<MaterialStatus, number>>;
```
- `ImageView` dibentuk dengan `select` eksplisit, sehingga `storageKey` tidak pernah keluar dari modul ini maupun `lib/images.ts`.
- Validasi input: Zod (Global Constraints); bab harus ada; subbab bila diisi harus `chapterId` sama (`fieldErrors.subchapterId`); setiap `extractImageIds` dari content/examples/exercises ⊆ id `Image` milik materi ini (pada create: himpunan kosong) → `fieldErrors[<field>]` pesan baku.
- `updateMaterial`: bandingkan field lama vs baru. Bila status `PUBLISHED` dan ada yang berubah → satu audit `MATERIAL_UPDATED` `{ fields: string[] }` (nama field saja). Pindah bab → `order = max+1` di bab baru. `updatedById = actorId`.
- `changeMaterialStatus`: baca status di dalam transaksi; `canTransition` false → `BAD_TRANSITION`; `updateMany where {id, status: from}`; ke `PUBLISHED` → `publishedAt = now`; audit `{from, to}`.
- `deleteMaterial`: transaksi (cek `DRAFT`, ambil `storageKey` gambar, hapus Image lalu Material, audit `MATERIAL_DELETED` `{title}`); setelah commit `deleteImage` per kunci dalam `try/catch` yang hanya me-log `imageId`.

**Test dulu (mock storage dengan fake):**
- "DRAFT → PUBLISHED is rejected" (`BAD_TRANSITION`, status tetap DRAFT, 0 audit); "allowed transitions table" (`canTransition` untuk 9 pasangan).
- "publishing writes MATERIAL_STATUS_CHANGED {from:REVIEWED,to:PUBLISHED} and sets publishedAt".
- "editing a published material writes exactly 1 audit with field names only": ubah title+content → 1 baris `MATERIAL_UPDATED`, `metadata.fields` = `["title","content"]`, `JSON.stringify(metadata)` tidak memuat isi baru; simpan ulang tanpa perubahan → tetap 1.
- "editing a DRAFT writes no audit".
- "subchapter from another chapter is rejected" (`fieldErrors.subchapterId`).
- "aksara-image of another material is rejected; own image accepted".
- "whitespace-only title/summary/sourceReference are rejected".
- "getPublishedMaterial returns null for DRAFT and REVIEWED".
- "listPublishedTree hides chapters without a published material and hides draft materials".
- "no storageKey in teacher or student detail": `JSON.stringify(await getMaterialForTeacher(id))` tidak memuat `storageKey` maupun nilai kuncinya.
- "deleteMaterial refuses PUBLISHED; deletes DRAFT with its images and R2 objects" (`objects` fake kosong, 1 audit `MATERIAL_DELETED`).
- "moveMaterial swaps within chapter"; "listMaterials caps at 200".

**Verifikasi:** `bun run test lib/materials.test.ts`. Commit `feat(materials): material domain with publish flow`.

## Task 6: `lib/images.ts` bagian DB

**Model:** sonnet. **Files:** `lib/images.ts`, `lib/images.test.ts`.

**Consumes:** `processUpload`, `canStudentViewImage`, storage (Task 4), `SessionUser` (`lib/auth/session`).

**Produces:**
```ts
export function addImage(actorId: string, input: { materialId: string; altText: string; caption?: string; sourceReference?: string; file: Uint8Array }):
  Promise<{ ok: true; id: string } | Invalid | NotFound | { ok: false; error: "LIMIT" | "UNSUPPORTED" | "TOO_LARGE" }>;
export function updateImageMeta(id: string, input: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export function removeImage(actorId: string, id: string): Promise<{ ok: true } | NotFound>;
export function imageRedirectTarget(user: SessionUser, id: string): Promise<string | null>; // presigned URL atau null
```
- `addImage`: validasi meta → materi ada → `count < 20` (komentar `ponytail:` soal race, karena gurunya cuma satu) → `processUpload` → `putImage` → transaksi insert + audit `IMAGE_ADDED {imageId, materialId}`. Bila transaksi gagal → `deleteImage(key)` best effort, lalu rethrow.
- `removeImage`: transaksi hapus baris + audit `IMAGE_REMOVED {imageId, materialId}`, lalu `deleteImage` best effort.
- `imageRedirectTarget`: ambil `storageKey` + `material.status`; `canStudentViewImage` false atau tidak ada → `null`.

**Test dulu:** "image without alt text is rejected and nothing is stored" (`objects.size===0`, 0 baris); "21st image is rejected with LIMIT"; "stored object has no EXIF" (ambil dari `objects`, `metadata().exif` undefined); "student gets null for an image of a DRAFT material, URL for PUBLISHED; teacher gets URL for DRAFT"; "DB failure after put removes the object" (`vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("db"))` → `addImage` rejects, `objects.size===0`); "removeImage deletes row, object, writes IMAGE_REMOVED; audit metadata contains no storageKey".

**Verifikasi:** `bun run test lib/images.test.ts`. Commit `feat(images): upload, metadata, removal and access check`.

## Task 7: `MaterialView` + Markdown aman

**Model:** haiku. **Files:** `components/material-view.tsx`, `components/material-view.test.ts`, `package.json` (`react-markdown@10.1.0 remark-gfm@4.0.1`).

**Consumes:** `MaterialDetail`, `ImageView` (Task 5).

**Produces:** `export function Markdown({ source, images }: { source: string; images: ImageView[] })` dan `export function MaterialView({ material }: { material: MaterialDetail })`, keduanya Server Component tanpa `"use client"`. `MaterialView` menampilkan h1 judul, ringkasan, bagian "Materi", "Contoh dan Aktivitas" (bila ada), "Latihan" (bila ada), dan "Sumber: {sourceReference}{, sourcePages}". Heading Markdown `#`/`##`/`###` dirender sebagai h2/h3/h4, supaya h1 halaman tetap satu. Styling memakai kelas Tailwind di map `components`, tanpa plugin typography. Gambar dirender `<img loading="lazy" width height className="h-auto max-w-full">` dan keterangan/sumber sebagai `<span className="block text-sm">` (sesuai D1).

**Test dulu (`renderToStaticMarkup(createElement(Markdown, …))`, file `.ts`):**
- "raw HTML is not rendered": `"<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>"` → output tidak cocok `/<script/i` dan `/<img[^>]*onerror/i`.
- "javascript: links are neutralised": `"[x](javascript:alert(1))"` → tidak memuat `href="javascript:`.
- "external links get rel=noopener noreferrer".
- "own aksara-image renders /api/images/<id> with DB alt fallback": `"![](aksara-image:abc)"` + images `[{id:"abc", altText:"Peta"}]` → memuat `src="/api/images/abc"` dan `alt="Peta"`.
- "unknown aksara-image id and external image URLs render text, not <img>".
- "GFM tables render" (`<table`).

**Verifikasi:** `bun run test components/`. Commit `feat(ui): shared MaterialView with safe Markdown`.

## Task 8: Route Handler gambar

**Model:** sonnet. **Files:** `app/api/images/route.ts`, `app/api/images/[id]/route.ts`, `app/api/images/route.test.ts`.

**Consumes:** `requireTeacher`, `requireSession` (`lib/auth/guard`), `addImage`, `imageRedirectTarget` (Task 6).

**Produces:** `POST(req: Request): Promise<Response>` sesuai D18. Field multipart: `file`, `materialId`, `altText`, `caption`, `sourceReference`. JSON gagal `{ ok: false, message, fieldErrors? }`. Kode status: 400 invalid, 404 materi tidak ada, 413 > 4 MB, 403 Origin. `GET(req, { params }: { params: Promise<{ id: string }> })` → 302 `Location` presigned + `Cache-Control: no-store`, atau 404 `no-store`.

**Test dulu (mock `next/headers`, `next/cache`, storage fake):**
- `describe.each` authz: siswa → `POST` = 403 (`expectForbidden`), dan tanpa sesi → redirect `/teacher/login`; tidak ada baris Image.
- "POST without matching Origin is 403 even for the teacher".
- "POST stores image, returns {ok:true,id}, response body has no storageKey".
- "POST rejects SVG, fake PNG, missing alt (400) and >4 MB (413)".
- "GET: student + DRAFT material image → 404; PUBLISHED → 302 with Location from presignGet and Cache-Control no-store; no session → redirect /login; teacher + DRAFT → 302".

**Verifikasi:** `bun run test app/api`. Commit `feat(api): authorized image upload and redirect`.

## Task 9: Halaman guru mapel/bab/subbab

**Model:** haiku. **Files:** `app/(teacher)/teacher/subjects/{page.tsx,actions.ts,actions.test.ts,subject-forms.tsx}`, `app/(teacher)/teacher/layout.tsx` (NAV: "Mapel & Bab" `/teacher/subjects`, "Materi" `/teacher/materials`).

**Produces (actions, semua `requireTeacher()` → `run()` → `revalidatePath("/teacher/subjects")`):** `saveSubjectAction(id: string | null, prev, fd)`, `deleteSubjectAction(id)`, `saveChapterAction(subjectId, id | null, prev, fd)`, `moveChapterAction(id, dir)`, `deleteChapterAction(id)`, `saveSubchapterAction(chapterId, id | null, prev, fd)`, `moveSubchapterAction(id, dir)`, `deleteSubchapterAction(id)`. `IN_USE` → `message` dari domain.

**Halaman:** pohon dari `getSubjectTree()`; form inline (FormField + Feedback) untuk ubah/tambah; hapus memakai ConfirmAction; tombol naik/turun dengan `aria-label` "Naikkan bab {judul}".

**Test dulu:** `describe.each` authz untuk 8 action (siswa → 403, data tidak berubah); "deleteChapterAction on a chapter with materials returns the in-use message".

**Verifikasi:** `bun run test "app/(teacher)/teacher/subjects"`, `bun run lint`. Commit `feat(subjects): teacher subject/chapter page`.

## Task 10: Halaman guru materi + action

**Model:** sonnet. **Files:** `app/(teacher)/teacher/materials/{page.tsx,actions.ts,actions.test.ts,material-form.tsx}`, `new/page.tsx`, `[id]/page.tsx`, `[id]/preview/page.tsx`.

**Produces (actions):** `createMaterialAction(prev, fd)` (sukses → `redirect("/teacher/materials/<id>")` di luar `try`), `updateMaterialAction(id, prev, fd)`, `changeMaterialStatusAction(id, to: MaterialStatus)`, `moveMaterialAction(id, dir)`, `deleteMaterialAction(id)` (sukses → redirect ke daftar). `revalidatePath("/teacher/materials", "layout")`. `values` dikembalikan saat error (Pelajaran Tahap 1).

**Halaman:**
- Daftar: form GET dengan `<select>` mapel/bab/status (berlabel), tabel/kartu responsif dengan Badge status, naik/turun, link ubah/pratinjau, dan teks cap D7.
- `material-form.tsx` (client, dipakai bersama create/edit): select bab dari `listChapterOptions()`, select subbab (semua, berlabel bab; server yang memvalidasi), textarea isi/contoh/latihan dengan `aria-describedby` ke baris bantuan Markdown.
- `[id]`: form + tombol status hanya untuk transisi yang `canTransition` izinkan ("Tandai sudah ditinjau", "Terbitkan", "Kembalikan ke draft", "Tarik dari siswa"), slot panel gambar (Task 11), hapus (bila DRAFT), dan info dibuat/diubah (`formatWita`).
- `preview`: banner "Pratinjau. Status: {status}" + `<MaterialView>`; `getMaterialForTeacher` null → `notFound()`.

**Test dulu:** `describe.each` authz (5 action, siswa → 403); "changeMaterialStatusAction DRAFT→PUBLISHED returns the transition message"; "createMaterialAction keeps values on error".

**Verifikasi:** `bun run test "app/(teacher)/teacher/materials"`, `bun run lint`. Commit `feat(materials): teacher material pages`.

## Task 11: Panel gambar

**Model:** haiku. **Files:** `app/(teacher)/teacher/materials/image-panel.tsx`, `app/(teacher)/teacher/materials/actions.ts` (+test), `[id]/page.tsx`.

**Produces:** `updateImageMetaAction(imageId, prev, fd)`, `removeImageAction(imageId)`. Komponen client `ImagePanel({ materialId, images: ImageView[], referencedIds: string[] })`:
- Form unggah dengan `<input type="file" accept="image/jpeg,image/png,image/webp">`, alt (wajib), keterangan, dan sumber. Submit lewat `fetch("/api/images", { method: "POST", body })`, lalu `router.refresh()`. Status unggah diumumkan via `role="status"`.
- Per gambar: thumbnail `/api/images/<id>`, form meta, kode `![alt](aksara-image:<id>)` dalam `<code>` yang bisa diseleksi, tombol "Salin kode sisip" (`navigator.clipboard.writeText`, umpan balik "Kode disalin."), dan hapus (ConfirmAction). Bila id ada di `referencedIds`, deskripsi konfirmasi ditambah "Gambar ini masih dipakai di isi materi."
- `referencedIds` dihitung di page dari `extractImageIds` ketiga field.

**Test dulu:** authz `describe.each` untuk 2 action; "removeImageAction removes row and object".

**Verifikasi:** `bun run test "app/(teacher)/teacher/materials"`, `bun run lint`. Commit `feat(materials): image panel`.

## Task 12: Halaman siswa + dasbor

**Model:** haiku. **Files:** `app/(student)/student/materials/page.tsx`, `[id]/page.tsx`, `[id]/not-found.tsx`, `app/(student)/student/page.tsx`, `app/(teacher)/teacher/page.tsx`.

- `/student/materials`: `requireStudent()`, lalu `listPublishedTree()` → mapel (h2) → bab (h3) → link materi. Bila kosong: "Belum ada materi. Tunggu gurumu menerbitkannya."
- `/student/materials/[id]`: `requireStudent()`, `getPublishedMaterial(id)`; null → `notFound()`; selain itu `<MaterialView>` + link "Kembali ke daftar materi". `not-found.tsx` memakai pesan baku D17.
- Dasbor siswa: link "Materi pelajaran". Dasbor guru: kartu "Materi" berisi `countMaterialsByStatus()` dengan label teks (bukan warna saja) + link ke `/teacher/materials?status=…`.

**Test:** logikanya sudah tercakup Task 5/6. Untuk halaman cukup verifikasi build: "tidak ada error `blocking-prerender`".

**Verifikasi:** `bun run build`, `bun run lint`. Commit `feat(student): published materials pages and dashboards`.

## Task 13: Env, dokumen, verifikasi akhir

**Model:** haiku. **Files:** `.env.example`, `README.md`, `CLAUDE.md`.

- [ ] `.env.example`: `R2_ACCOUNT_ID=`, `R2_ACCESS_KEY_ID=`, `R2_SECRET_ACCESS_KEY=`, `R2_BUCKET=` (dengan komentar "satu bucket per env, privat").
- [ ] README: checklist R2 (di bawah) + `bun run db:seed:content`.
- [ ] CLAUDE.md: Commands (`db:seed:content`, smoke R2) + Current state (Tahap 2 dibangun; model baru; `lib/storage.ts` satu-satunya yang mengenal R2; test memakai `tests/storage-fake.ts`).
- [ ] Jalankan `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build`. Semua harus lulus. `grep -rn "storageKey" app components` hanya boleh muncul di nol tempat atau di komentar.
- [ ] Commit `docs: Tahap 2 env, R2 checklist, CLAUDE.md`.

### Checklist R2 (dikerjakan pengguna, tidak memblokir Task 0–13)

1. Cloudflare Dashboard → R2 Object Storage → Create bucket `aksara-dev`, lokasi Automatic.
2. Bucket → Settings → Public access: pastikan **R2.dev subdomain Disabled** dan tidak ada Custom Domain.
3. R2 → Manage API tokens → Create API token: permission **Object Read & Write**, "Apply to specific buckets only" → `aksara-dev`.
4. Salin Account ID, Access Key ID, dan Secret ke `.env.local` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=aksara-dev`).
5. Bukti: `bun run test lib/storage.r2.test.ts` lulus (tidak di-skip). Ulangi untuk `aksara-preview`/`aksara-prod` saat deploy, lalu isi env di Vercel.

## Setelah semua task

1. `ponytail:ponytail-review` atas diff branch, fokus keamanan (akses gambar, kebocoran `storageKey`, XSS Markdown, Origin).
2. `superpowers:requesting-code-review` (reviewer opus) untuk seluruh branch.
3. `superpowers:verification-before-completion`: keempat perintah di Task 13 dengan output nyata.
4. `superpowers:finishing-a-development-branch`.
5. Vault: hub `Aksara Project Context.md` (status Tahap 2, risiko terbuka: verifikasi sharp di Preview, setup bucket prod), F03 (tanpa slug; CRUD tanpa audit), F04 (hapus draft, tanpa pagination/cache, `MATERIAL_DELETED`), F13 (Tahap 2 hanya `materialId`; format `storageKey` D13; checksum D16). Tanpa log harian.

## Review Focus

1. **Gambar dihapus padahal masih dirujuk Markdown.** Halaman harus menampilkan "[Gambar tidak tersedia]", bukan error; simpan ulang ditolak dengan pesan baku. Test ditambah ke Task 7 (id tak dikenal) dan Task 5 ("update rejects a reference to a removed image").
2. **Bom dekompresi atau PNG terpotong.** Harus 400 dengan pesan tipe, bukan 500 atau fungsi yang macet (Task 4, test "truncated PNG and decompression bombs").
3. **Sesi siswa kedaluwarsa saat `<img>` dimuat.** `GET /api/images/[id]` harus redirect ke `/login`, bukan 500 (Task 8, kasus "no session").
4. **Field berisi spasi saja.** Ditolak seperti kosong (Task 3 dan Task 5, test whitespace).
5. **Materi pindah bab sementara subbab lama masih terpilih.** Ditolak di server dengan pesan subbab, dan FK komposit menjadi cadangan (Task 1 schema test + Task 5).

## Risiko & cara verifikasi

| Risiko | Verifikasi |
|---|---|
| cacheComponents: `params`/`searchParams`/cookie dibaca di luar `<Suspense>` → build gagal (`blocking-prerender`) | `bun run build` di Task 9–12; pola Tahap 1 (komponen async di dalam Suspense) |
| `forbidden()`/`redirect()` dari guard di Route Handler | Docs `forbidden.md` menyebut Route Handler didukung; dibuktikan test Task 8 |
| sharp di Vercel (linux-x64 glibc) | Prebuilt `@img/sharp-linux-x64`, auto-external. Unggah satu gambar di Preview Vercel (pengguna) |
| AWS SDK v3 ke R2 gagal karena checksum default | D16 + smoke test R2 |
| Batas body: Vercel ±4,5 MB, Server Action 1 MB | Unggah lewat Route Handler, tolak > 4 MB (413) sebelum diproses; test Task 8 |
| Ekstensi atau versi react-markdown v10 di RSC (ESM-only) | Test Task 7 + `bun run build` |

## Sengaja tidak dikerjakan (ponytail)

- Pagination daftar materi (D7) dan `use cache` (D5): volume kecil, sementara cache basi bisa membocorkan draft.
- `Subject.slug` (D12), audit CRUD mapel/bab dan pembuatan materi (D15): tidak ada pemakai dan tidak diminta F12.
- `Image.questionId`/`deletedAt`/CHECK (D4), gambar soal, `QuizQuestionImage`: Tahap 3–4.
- Editor WYSIWYG, sisip di kursor, pratinjau langsung (D6): tombol salin + halaman pratinjau sudah cukup.
- MinIO/emulator (D2), wizard setup (D8), Playwright: tidak menambah bukti dibanding smoke R2.
- Rate limit unggah dan race batas 20 gambar: hanya satu guru (komentar `ponytail:`).
- Impor konten buku: dilarang mengarang isi buku, jadi guru menulis sendiri.
