# Certindo Worksheet

Sistem lembar kerja kalibrasi PT Certindonesia untuk mengelola data klien, mengisi formulir instrumen, menjalankan proses review dan approval, serta menghasilkan workbook Excel dari template resmi.

## Fitur utama

- Katalog 89+ template instrumen dengan schema form dan mapping sel Excel dinamis.
- Pembuatan dan revisi lembar kerja kalibrasi tanpa mengubah style workbook sumber.
- Workflow berbasis role dari `DRAFT` sampai `COMPLETED`, termasuk catatan permintaan perbaikan.
- Manajemen perusahaan klien dan riwayat kalibrasinya.
- Manajemen pengguna dengan role `ADMIN`, `TECHNICIAN`, `REVIEWER`, dan `APPROVER`.
- Pengaturan profil dan perubahan kata sandi.
- Penyimpanan template dan hasil ekspor melalui filesystem lokal atau private Vercel Blob.
- Dashboard ringkasan status kalibrasi dan health check untuk deployment.

## Teknologi

- Next.js 16 dan React 19 untuk aplikasi web.
- NestJS 11 untuk REST API.
- PostgreSQL, Prisma ORM, dan JSONB untuk data formulir dinamis.
- TanStack Query, React Hook Form, dan Zod.
- JSZip untuk manipulasi OOXML workbook.
- Turborepo dan pnpm workspace.

## Struktur proyek

```text
apps/
  api/          NestJS REST API dan engine ekspor OOXML
  web/          Next.js App Router
packages/
  config/       konfigurasi bersama
  types/        kontrak TypeScript lintas aplikasi
  validation/   schema validasi Zod
  ui/           komponen UI bersama
  eslint-config/
  tsconfig/
prisma/         schema, migrasi, katalog instrumen, dan seed
storage/
  templates/    workbook sumber untuk mode local
  generated/    hasil ekspor untuk mode local
```

API menjadi pemilik aturan domain dan akses database. Aplikasi web mengaksesnya melalui REST menggunakan bearer token.

## Prasyarat

- Node.js 20.9 atau lebih baru.
- pnpm 11.
- Database PostgreSQL.
- Dua workbook template sumber jika menggunakan penyimpanan lokal.

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env`.
2. Isi `DATABASE_URL`, `JWT_SECRET`, dan kredensial seed.
3. Pasang dependensi dan siapkan database:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

4. Jalankan seluruh aplikasi:

```bash
pnpm dev
```

Layanan lokal:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`

Kredensial admin awal mengikuti `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`. Jangan gunakan password contoh pada environment bersama.

## Workflow kalibrasi

| Transisi | Role yang diizinkan | Keterangan |
| --- | --- | --- |
| `DRAFT` → `UNDER_REVIEW` | `TECHNICIAN`, `ADMIN` | Mengajukan lembar kerja untuk diperiksa. |
| `UNDER_REVIEW` → `DRAFT` | `REVIEWER`, `APPROVER`, `ADMIN` | Meminta perbaikan; catatan wajib diisi. |
| `UNDER_REVIEW` → `CONFIRMED` | `REVIEWER`, `APPROVER`, `ADMIN` | Menyetujui hasil pemeriksaan. |
| `UNDER_REVIEW` → `COMPLETED` | `APPROVER`, `ADMIN` | Menyetujui dan langsung menyelesaikan dokumen. |
| `CONFIRMED` → `COMPLETED` | `APPROVER`, `ADMIN` | Menerbitkan hasil final. |

Form hanya dapat diubah ketika berstatus `DRAFT`. Perubahan status juga divalidasi kembali di API, sehingga pembatasan tidak hanya bergantung pada UI.

## Environment variables

| Variable | Keterangan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL. |
| `JWT_SECRET` | Rahasia JWT minimal 32 karakter. |
| `JWT_EXPIRES_IN` | Masa berlaku token; default `8h`. |
| `API_PORT` | Port API lokal; default `4000`. |
| `CORS_ORIGINS` | Daftar origin web yang dipisahkan koma. |
| `NEXT_PUBLIC_API_URL` | Base URL API yang dapat diakses browser. |
| `STORAGE_DRIVER` | `local` atau `blob`. |
| `STORAGE_LOCAL_ROOT` | Root penyimpanan saat memakai driver `local`. |
| `BLOB_READ_WRITE_TOKEN` | Token private Vercel Blob untuk driver `blob`. |
| `TEMPLATE_EARLY_URL` | URL workbook template 0X–94 di Blob. |
| `TEMPLATE_CURRENT_URL` | URL workbook template 095–163 di Blob. |
| `SEED_ADMIN_EMAIL` | Email admin yang dibuat oleh seed. |
| `SEED_ADMIN_PASSWORD` | Password awal admin yang dibuat oleh seed. |

Lihat `.env.example` untuk contoh lengkap tanpa kredensial produksi.

## Endpoint API

Semua endpoint selain login dan health check membutuhkan bearer token.

- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`, `/api/auth/change-password`
- Dashboard: `/api/dashboard/summary`
- Kalibrasi: `/api/calibrations`, `/api/calibrations/:id`, `/api/calibrations/:id/status`
- Ekspor: `/api/calibrations/:id/generate`, `/api/calibrations/:id/download`
- Master data: `/api/companies`, `/api/users`, `/api/instrument-forms`
- Health check: `/api/health`

Operasi create, update, delete, dan approval dibatasi lagi berdasarkan role.

## Perintah pengembangan

```bash
pnpm typecheck     # validasi TypeScript seluruh workspace
pnpm test          # unit dan integration tests
pnpm build         # production build web, API, dan packages
pnpm lint          # ESLint seluruh workspace
pnpm db:generate   # generate Prisma Client
pnpm db:migrate    # membuat/menerapkan migrasi development
pnpm db:migrate:deploy # menerapkan migrasi yang sudah ada
pnpm db:seed       # mengisi admin dan katalog template instrumen
```

Gunakan database branch terpisah untuk development, staging, dan production. Setelah mengambil perubahan schema terbaru, jalankan `pnpm db:migrate:deploy` pada environment tujuan sebelum memulai API.

## Deployment

Arsitektur deployment yang didukung adalah Next.js di Vercel, API NestJS di Railway, PostgreSQL di Neon, dan private Vercel Blob untuk template serta hasil ekspor. Instruksi lengkap tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).
