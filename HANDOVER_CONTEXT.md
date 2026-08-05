# 🚀 HANDOVER CONTEXT & PROJECT ROADMAP

> **Project Repository**: `certindo-worksheet`  
> **Tech Stack**: Next.js 14+ (App Router), NestJS (REST API), Prisma ORM (PostgreSQL), Turborepo monorepo, Tailwind/Vanilla CSS, TanStack Query, React Hook Form + Zod, JSZip (OOXML Excel Generator).  
> **Last Commit**: `871ab79` (`feat: add User Settings and Profile page and change password API`)  
> **Branch**: `main` (Remote: `https://github.com/guuzenn/certindo-worksheet.git`)

---

## 📌 Status Terakhir Sistem & Kualitas Kode

- `pnpm typecheck` ➔ **100% PASSED** (0 TypeScript error di 9 packages).
- `pnpm test` ➔ **100% PASSED** (Seluruh unit test workbook OOXML, validation, & healthcheck lulus).
- Database Seed ➔ **100% PASSED** (`pnpm db:seed` berhasil mengeksekusi 89+ template instrumen).

---

## ✅ Fitur yang Telah Selesai Dibangun (Completed Features)

### 1. Template & Excel OOXML Generation Engine (100% Mapped)
- Merekam **89+ Form Tambahan (FOM)** dari template Excel (`Lembar Kerja 0X-94.xlsx` & `Lembar Kerja 095-163.xlsx`).
- Mengatur `measurementTables` (Tabel Pengukuran Dinamis) dan `cellMappings` lengkap di `prisma/instrument-forms.ts`.
- Engine ekspor Excel backend NestJS (`ooxml-workbook.service.ts`) yang presisi tanpa mengubah style Excel original.

### 2. Railway Deployment & Healthcheck Resiliency
- Menambahkan `@SkipThrottle()` pada `HealthController` (`/api/health`) untuk mencegah readiness probe Railway terkena HTTP 429 rate limit.
- Menangani koneksi Prisma `$connect()` secara tangguh pada startup server API (`prisma.service.ts`).
- Mengimpor `AuthModule` ke seluruh NestJS feature modules (`InstrumentFormsModule`, `CompaniesModule`, `UsersModule`) untuk menyelesaikan NestJS Dependency Injection `JwtAuthGuard`/`JwtService`.

### 3. Katalog Template Instrumen (`/instrument-forms`)
- Halaman katalog template dengan kartu statistik, pencarian, filter, modal detail schema & cell mappings, serta aksi langsung **"Gunakan Template"** yang otomatis mengarahkan ke form kalibrasi baru.

### 4. Manajemen Perusahaan Klien (`/companies`)
- REST API CRUD NestJS (`/api/companies`) & UI Next.js (`/companies`).
- Pencarian real-time, kartu informasi klien, modal Tambah/Edit Perusahaan, dan modal Detail Riwayat Kalibrasi Klien.
- Perlindungan hapus jika perusahaan sudah memiliki lembar kerja.

### 5. Manajemen Pengguna & Hak Akses Staf (`/users`)
- REST API CRUD NestJS (`/api/users`) & UI Next.js (`/users`).
- Pengelolaan 4 Role/Peran Staf: `ADMIN`, `TECHNICIAN`, `REVIEWER`, `APPROVER`.
- Fitur Reset Password staf dengan enkripsi `bcrypt.hash`.
- Perlindungan hapus jika akun pengguna sudah pernah menerbitkan lembar kerja.

### 6. Pengaturan Profil & Keamanan Kata Sandi (`/settings`)
- REST API NestJS (`/api/auth/profile` & `/api/auth/change-password`) & UI Next.js (`/settings`).
- Kartu Profil Pengguna saat ini.
- Form ubah Nama Pengguna dan Form Ubah Kata Sandi dengan verifikasi kata sandi lama (`bcrypt.compare`).

### 7. Sleek Confirm Delete Modal (`ConfirmDeleteModal`)
- Komponen modal `ConfirmDeleteModal` interaktif menggantikan `window.confirm(...)` bawaan browser di seluruh halaman tabel/list.

---

## 🎯 Tugas Selanjutnya yang Perlu Dikerjakan (Next Tasks for Codex / AI)

### ✍️ Fitur **Approval Workflow Kalibrasi (Status Transition & Role Permissions)**

#### 1. Perubahan Status Prisma Schema
Enum `CalibrationStatus` di `prisma/schema.prisma` saat ini memiliki nilai:
- `DRAFT` (Baru dibuat oleh teknisi)
- `UNDER_REVIEW` (Dalam pemeriksaan reviewer)
- `CONFIRMED` (Disetujui oleh supervisor/approver)
- `POSTPONED` (Ditunda)
- `COMPLETED` (Selesai/Diterbitkan)

#### 2. Backend API Endpoint (`calibrations.service.ts` & `calibrations.controller.ts`)
Buat endpoint transition status: `PATCH /api/calibrations/:id/status`:
- **Submit for Review** (`DRAFT` ➔ `UNDER_REVIEW`): Dijalankan oleh `TECHNICIAN` atau `ADMIN`.
- **Approve Calibration** (`UNDER_REVIEW` ➔ `CONFIRMED` / `COMPLETED`): Dijalankan oleh `REVIEWER`, `APPROVER`, atau `ADMIN`.
- **Request Revision / Return to Draft** (`UNDER_REVIEW` ➔ `DRAFT`): Menolak dengan catatan revisi.

#### 3. Frontend UI Component Updates (`calibrations-list.tsx` & `calibration-form.tsx`)
- **Tabel List Kalibrasi (`/calibrations`)**:
  - Tampilkan tombol aksi sesuai role user saat ini (Teknisi = "Ajukan Peninjauan", Reviewer = "Setujui" / "Minta Perbaikan").
- **Form Kalibrasi (`/calibrations/[id]/edit`)**:
  - Kunci/Disable seluruh input form jika status lembar kerja sudah `CONFIRMED` atau `COMPLETED` (Status Lock Protection).

---

## 🛠️ Gotchas & Rule Penting Pengkodean

1. **NestJS Guard Dependency Rule**: Setiap NestJS module yang menggunakan `@UseGuards(JwtAuthGuard)` WAJIB mengimpor `AuthModule` di metadata `@Module({ imports: [PrismaModule, AuthModule] })`.
2. **Prisma findMany optional condition Rule**: Dengan `exactOptionalPropertyTypes: true`, jangan melempar `where: undefined`. Gunakan pola `...(term ? { where: { ... } } : {})`.
3. **Zod Input Schema Rule**: Jangan gunakan `z.preprocess` pada optional string jika tidak ingin tipe input Zod berubah menjadi `unknown`. Gunakan `z.string().trim().email().or(z.literal('')).optional()`.
