# Tahap 9: Impor siswa dari Excel + Absensi harian

## Context
The teacher keeps the school's attendance book as an Excel file (`DAFTAR HADIR KELAS 6 2026.xlsx`). Its `NAMA` sheet lists the students: NO INDUK, NISN, NAMA, plus PANGGILAN/CITA-CITA/TB/BB. The `HADIR <BULAN>` sheets hold monthly grids: dates 1–31 plus S/I/A/JML, Sundays and holidays coloured red, and "HS" (hari sekolah) in the header.
Today the app can only add students one at a time. "Hadir" is derived from login (`lib/attendance.ts`).
Goal: (1) the teacher imports the roster from that file; (2) the teacher records H/S/I/A per student per day, with Sundays off automatically, can mark extra holidays, and downloads a monthly sheet in the same shape as the book.

## Decisions (grilled with the user)
- NISN → `nis` (login). NO INDUK → new optional column `User.studentNo` (digits only, unique, not used for login). It can be edited in the add/edit student form and is shown in the student list.
- Import: the teacher picks the class. Only name, NISN and NO INDUK are read; everything else is ignored (minimum student data). Names are kept as written. A preview comes first; rows that already exist are skipped, never updated.
- Attendance: the teacher records H/S/I/A explicitly (stored H, so "belum diisi" is visible). A "Semua hadir" button fills everything, then the teacher changes the exceptions. Editable: today and any past date. Future dates, Sundays and holidays are refused by the server.
- Holidays: Sundays are automatic; the teacher can mark any date as a holiday with a note. Holidays are global, since there is one school.
- Dashboard: an "Absensi <kelas> hari ini belum diisi" task in "Perlu tindakan" and the bell, on school days only.
- Monthly Excel export per class, laid out like the HADIR sheet (no letterhead or signatures).

Defaults I picked (not asked):
- Marking a date as a holiday keeps any existing records but ignores them in recap and export. Removing the holiday brings them back, so no data is lost.
- Students never see attendance.
- No audit entry per attendance mark. There are audit entries for import (count only, no names), holiday changes and export.

## Schema (`prisma/schema.prisma`, one migration `tahap9_import_absensi`)
- `User.studentNo String? @unique` and `attendances Attendance[]`.
- `enum AttendanceStatus { HADIR SAKIT IZIN ALPA }`
- `model Attendance { id, studentId → User (Cascade), date @db.Date, status, recordedById → User, updatedAt; @@unique([studentId, date]); @@index([date]) }`
- `model Holiday { date @id @db.Date, note String, createdById → User, createdAt }`
- After migrating: `bunx prisma generate`.

`ponytail:` Attendance has no `classId`. The monthly export lists the class's *current* members. Add `classId` if students move classes mid-year.

## 1. Student import

**Why parse in the browser:** the teacher's real file is 49.5 MB (one embedded 48 MB PNG), far over Vercel's 4.5 MB request limit. The client reads the file with a lazy `import("exceljs")` (exceljs 4.4.0 is already installed; its `browser` build) and sends only the extracted rows. The server re-validates every row, so the trust boundary stays server-side.

- `lib/student-import.ts` (pure, client-safe, no `server-only`): `findRosterRows(sheets: unknown[][][])` picks the first sheet whose header row has a cell `NAMA`/`NAMA SISWA`. It maps `NISN`/`NIS` and `NO INDUK`/`INDUK` columns, header text normalized (trim, collapse spaces, uppercase). It reads rows until the name cell is empty, coerces numbers to digit strings (NISN keeps leading zeros), and returns `{ displayName, nis, studentNo }[]` or a "header not found" error.
- `lib/students.ts`: add `studentNo` to the existing zod `schema` (empty → null, `/^[0-9]{1,10}$/`, message "No induk hanya angka, paling banyak 10."). Add `User_studentNo_key: "studentNo"` to `INDEXES` → error `STUDENT_NO_TAKEN`. Write it in `createStudent`/`updateStudent`.
- Add `importStudents(actorId, classId, rows, { commit })` in `lib/students.ts`:
  - Cap at 200 rows.
  - Each row goes through the same `parse`.
  - Each row is classified as `NEW`, `EXISTS` (same NISN, same studentNo, or same `loginName` in that class, also duplicates inside the file), or `INVALID` + message.
  - `commit: true` creates all `NEW` rows in one transaction. Audit `STUDENTS_IMPORTED` (metadata `{ classId, created }`) goes in `lib/audit.ts`'s `AuditAction` union. Unique-violation races map to an error, not a 500.
- `app/(teacher)/teacher/students/actions.ts`: `previewImportAction(classId, rows)` and `importStudentsAction(classId, rows)`. Both call `requireTeacher()` and the domain function, then `revalidatePath`.
- `app/(teacher)/teacher/students/import-dialog.tsx` (client): an "Impor dari Excel" button opens a `Dialog`. Inside: class select, `.xlsx` file input, a preview table (Status as icon + text via `components/status.tsx`), and a "Tambahkan N siswa" button. It is added to `students/page.tsx`.
- `student-forms.tsx` and `actions.ts` `input()`: a `studentNo` field ("No. Induk (boleh kosong)"). The list shows it.

## 2. Attendance

- `lib/attendance.ts` (extend; keep `WITA_MS`/`DAY_MS`):
  - `witaToday(now)` returns `YYYY-MM-DD`. `isSunday(date)`.
  - `dayState(date, now)` returns `"OPEN" | "SUNDAY" | "HOLIDAY" | "FUTURE"` plus the holiday note.
  - `getClassDay(classId, date, now)` returns active students of the class (name, NIS) with their status or null, plus `dayState`.
  - `saveAttendance(actorId, { classId, date, marks })` checks:
    - zod input, date `OPEN`;
    - every `studentId` is an active student of that class, else `INVALID`;
    - upserts in one transaction (idempotent).
  - `setHoliday(actorId, date, note)` / `removeHoliday(actorId, date)` (audit `HOLIDAY_SET`/`HOLIDAY_REMOVED`). Sundays and future dates are allowed for holidays.
  - `attendanceToday(now)` keeps its `{ classId, present, total }` shape and adds `recorded` and `open`. `present` now counts `HADIR` records today. Callers: `app/(teacher)/teacher/page.tsx`, `classes/page.tsx`. Copy changes only if needed.
  - `monthRecap(classId, "YYYY-MM", now)` returns days with state, students with per-day status, and S/I/A/JML counts and HS (open days ≤ month end). Used by export.
- Page `app/(teacher)/teacher/attendance/page.tsx` (`?class=&date=`; defaults to the first active class and today WITA):
  - `PageHeader` "Absensi", class select, date input with prev/next day links.
  - A banner for Sunday, holiday ("Libur: <note>" + "Batalkan libur"), or future dates.
  - `attendance-form.tsx` (client): one `fieldset` radio group per student, H/S/I/A, keyboard-navigable, text labels not colour alone. Buttons "Semua hadir" and "Simpan".
  - A "Jadikan hari libur" form with a note.
  - An "Unduh rekap <bulan>" link.
- `app/(teacher)/teacher/attendance/actions.ts`: `saveAttendanceAction`, `setHolidayAction`, `removeHolidayAction`, following the `run()` pattern in `students/actions.ts`.
- Nav: an `{ href: "/teacher/attendance", label: "Absensi" }` entry in `nav-links.tsx` `NAV` (hugeicons calendar icon). Check that the phone bar's `MORE` overflow still fits.

## 3. Monthly export
- `buildAttendanceWorkbook(classId, month)` in `lib/export.ts`, reusing its formula-escape helper:
  - Sheet "Daftar Hadir". Header lines: DAFTAR HADIR SISWA, Kelas, Bulan, HS.
  - Columns NO | NO INDUK | NISN (text) | NAMA SISWA | 1…lastDay | S | I | A | JML.
  - Cells: H = blank (like the book), S/I/A letter, unfilled open day = `-` (legend row "- = belum diisi").
  - Sunday/holiday columns get a red fill; holiday notes are listed under the table.
- Route `app/api/attendance-exports/[classId]/route.ts?month=YYYY-MM`, copying `app/api/exports/[quizId]/route.ts`: `requireTeacher` outside `guarded`, audit `ATTENDANCE_EXPORTED`, `no-store`, filename `absensi-<kelas>-<YYYY-MM>.xlsx`.

## 4. Dashboard
- `lib/dashboard.ts`: `TeacherTask` gains `{ kind: "ATTENDANCE"; classId; className; missing }`. These are active classes with active students where today is `OPEN` and recorded < total, built from `attendanceToday`.
- `lib/task-text.ts`: case → `Absensi ${className} hari ini belum diisi (${missing} siswa)`, href `/teacher/attendance?class=…`. The bell and dashboard pick it up automatically.

## Tests (Vitest, Docker DB; synthetic names only, never the real file)
- `lib/student-import.test.ts`: header detection on a NAMA-shaped grid (title rows above the header, numeric NO INDUK, NISN with a leading zero), a missing header, trailing signature rows ignored.
- `lib/students.test.ts`:
  - studentNo validation and uniqueness;
  - `importStudents` classification (new/exists/in-file duplicate/invalid);
  - commit creates only NEW, plus one audit row.
- `lib/attendance.test.ts`:
  - save refuses future dates, Sundays, holidays, and a student from another class;
  - re-save is idempotent;
  - a holiday hides records;
  - `attendanceToday` counts HADIR;
  - `monthRecap` HS/S/I/A.
- `lib/export.test.ts`: attendance workbook columns, red Sunday column, NISN as text, formula escaping.
- `lib/dashboard.test.ts`: the ATTENDANCE task appears on a school day and disappears when filled or on a Sunday.
- `e2e/`: one flow. Open Absensi → Semua hadir → mark one Sakit → Simpan → reload shows it. Add `/teacher/attendance` to the `e2e/mobile.spec.ts` sweep.

## Docs
- `CLAUDE.md` "Current state": one Tahap 9 sentence (new models, `lib/student-import.ts` is browser-side, browser parse because of the 4.5 MB limit, `attendanceToday` semantics changed).
- Vault hub note only if a decision note is warranted.

## Verification
1. `bun run db:up && bun run db:migrate && bunx prisma generate`
2. `bunx tsc --noEmit && bun run lint && bun run test`
3. `bun run build`: confirm the exceljs chunk loads only on the import dialog (lazy import).
4. `bun run test:e2e` (not alongside Vitest).
5. Manual on `bun dev`: import the real `DAFTAR HADIR KELAS 6 2026.xlsx` into a test class. Expect 14 NEW, re-import → 14 EXISTS. Record a week of attendance, mark 17 Aug as a holiday, download the August export, open it in LibreOffice and compare with the HADIR AGUST 26 sheet.
