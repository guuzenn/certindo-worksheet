# Certindo Worksheet

Aplikasi internal PT Certindonesia untuk mengisi lembar kerja kalibrasi, menjalankan review dan approval, serta menghasilkan workbook Excel dari template resmi.

## Kemampuan utama

- Katalog 89+ formulir instrumen dari workbook `0X-94` dan `095-163`.
- Form identitas dan tabel pengukuran yang dibentuk secara dinamis dari metadata template.
- Ekspor OOXML tanpa mengubah format dan style workbook sumber.
- Workflow kalibrasi berbasis role, lengkap dengan catatan permintaan perbaikan.
- Manajemen perusahaan, pengguna, profil, dan kata sandi.
- Penyimpanan lokal untuk development atau private Vercel Blob untuk staging/production.
- Dashboard operasional dan endpoint health check untuk deployment.

Satu kode formulir dapat memiliki lebih dari satu revisi. Contohnya, Timbangan menggunakan kode resmi `CCI-KAL-FOM-028` dengan revisi `04` dan `05`; masing-masing tetap memiliki sheet dan mapping sel sendiri.

Template dengan revision yang sama juga dapat memiliki varian standar acuan. Mikrometer revision `03` mempertahankan dua template terpisah karena ketertelusuran SI-nya berbeda: `LK-054-IDN / JCC (Taiwan)` dan `LK-032-IDN / LK-070-IDN`.

## Tech stack

- Next.js 16, React 19, Tailwind CSS 4
- NestJS 11 dan REST API
- PostgreSQL dan Prisma ORM
- TanStack Query, React Hook Form, dan Zod
- JSZip untuk manipulasi OOXML
- Turborepo dan pnpm workspace

## Struktur repository

```text
apps/
  api/          NestJS API, aturan domain, storage, dan engine OOXML
  web/          Next.js App Router
packages/
  config/       konfigurasi bersama
  types/        kontrak TypeScript lintas aplikasi
  validation/   schema validasi Zod
  ui/           komponen UI bersama
  eslint-config/
  tsconfig/
prisma/
  migrations/   migrasi database
  schema.prisma schema Prisma
  seed.ts       seed admin dan katalog instrumen
  instrument-forms.ts metadata form dan mapping workbook
storage/
  templates/    workbook sumber untuk driver local
  generated/    hasil ekspor untuk driver local
```

API menjadi pemilik aturan bisnis dan akses database. Web mengakses API menggunakan bearer token.

## Persyaratan

- Node.js 20.9 atau lebih baru
- pnpm 11
- PostgreSQL
- Workbook template sumber untuk penggunaan driver `local`

## Menjalankan secara lokal

Salin environment example dan isi nilai yang diperlukan:

```bash
cp .env.example .env
```

Pada PowerShell:

```powershell
Copy-Item .env.example .env
```

Kemudian siapkan aplikasi dan database:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Layanan lokal:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`

Kredensial admin awal mengikuti `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`. Ganti password contoh sebelum memakai environment bersama.

## Workflow kalibrasi

| Transisi | Role | Keterangan |
| --- | --- | --- |
| `DRAFT` -> `UNDER_REVIEW` | `TECHNICIAN`, `ADMIN` | Mengajukan lembar kerja untuk diperiksa. |
| `UNDER_REVIEW` -> `DRAFT` | `REVIEWER`, `APPROVER`, `ADMIN` | Mengembalikan lembar kerja; catatan perbaikan wajib diisi. |
| `UNDER_REVIEW` -> `CONFIRMED` | `REVIEWER`, `APPROVER`, `ADMIN` | Menyetujui hasil pemeriksaan. |
| `UNDER_REVIEW` -> `COMPLETED` | `APPROVER`, `ADMIN` | Menyetujui sekaligus menyelesaikan dokumen. |
| `CONFIRMED` -> `COMPLETED` | `APPROVER`, `ADMIN` | Menerbitkan hasil final. |

Form hanya dapat diubah ketika berstatus `DRAFT`. API memvalidasi role dan transisi status secara independen dari UI.

## Template dan revision

Metadata template berada di `prisma/instrument-forms.ts`. Setiap entri menentukan:

- kode dan revision formulir;
- workbook dan nama sheet sumber;
- field identitas yang ditampilkan;
- tabel pengukuran dinamis;
- mapping data ke sel Excel.

Kombinasi `code` dan `revision` harus unik. Jika posisi sel berubah antar-revision, gunakan mapping identitas dan tabel yang sesuai untuk revision tersebut. Setelah metadata berubah, jalankan `pnpm db:seed` untuk memperbarui katalog pada database.

Tabel pengukuran schema V2 dapat memakai header bertingkat melalui `children`, sehingga susunan web mengikuti grup kolom pada workbook (misalnya Parameter, UUT 1–5, dan STD 1–5). `layout: 'record-grid'` menyajikan tabel yang lebar sebagai kartu input ringkas tanpa mengubah mapping Excel. `initialRowCount` mengatur jumlah baris awal di web, sedangkan `templateRowCount` mengatur area baris sumber. Gunakan `fixedRows`, `minRows`, dan `maxRows` untuk batas input, serta `preserveTemplateRows` jika area kosong resmi pada workbook harus dipertahankan.

Field pendukung yang secara visual membentuk tabel tersendiri pada workbook dapat diberi `section`, misalnya `Data Standar`. Section ditampilkan sebagai kartu terpisah di web, tetapi tetap diekspor ke alamat sel asli. Data tanda tangan dan approval tidak dimodelkan sebagai input teknisi.

Label field dasar dapat disesuaikan per template melalui `fieldLabels`, sedangkan `instrumentNameDefault` mengatur nilai awal nama alat. Field tambahan mendukung `defaultValue` untuk nilai bawaan workbook dan `exportPrefix`/`exportSuffix` untuk format seperti satuan di dalam tanda kurung. Setiap field yang dapat diisi pada workbook wajib memiliki input web atau sumber data aplikasi yang eksplisit serta mapping sel yang diuji.

Ekspor Excel hanya diizinkan jika metadata form memiliki `mappingVerified: true`. Template yang belum diverifikasi tetap tersedia untuk penyimpanan draft, tetapi UI menampilkan peringatan dan API menolak ekspor. Tandai mapping sebagai terverifikasi hanya setelah header, seluruh leaf column, jumlah baris, dan alamat selnya dicocokkan dengan workbook sumber serta dilindungi test ekspor.

## Environment variables

| Variable | Keterangan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL. |
| `JWT_SECRET` | Rahasia JWT minimal 32 karakter. |
| `JWT_EXPIRES_IN` | Masa berlaku token; default `8h`. |
| `API_PORT` | Port API; default `4000`. |
| `CORS_ORIGINS` | Origin web yang diizinkan, dipisahkan koma. |
| `NEXT_PUBLIC_API_URL` | Base URL API yang dapat diakses browser. |
| `STORAGE_DRIVER` | `local` atau `blob`. |
| `STORAGE_LOCAL_ROOT` | Root penyimpanan untuk driver `local`. |
| `BLOB_READ_WRITE_TOKEN` | Token private Vercel Blob. |
| `TEMPLATE_EARLY_URL` | URL workbook template `0X-94` di Blob. |
| `TEMPLATE_CURRENT_URL` | URL workbook template `095-163` di Blob. |
| `SEED_ADMIN_EMAIL` | Email admin yang dibuat seed. |
| `SEED_ADMIN_PASSWORD` | Password awal admin yang dibuat seed. |

Gunakan `.env.example` sebagai referensi. Jangan commit `.env`, token Blob, connection string, atau kredensial pengguna.

## Endpoint API

Semua endpoint selain login dan health check membutuhkan bearer token.

- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`, `/api/auth/change-password`
- Dashboard: `/api/dashboard/summary`
- Kalibrasi: `/api/calibrations`, `/api/calibrations/:id`, `/api/calibrations/:id/status`
- Ekspor: `/api/calibrations/:id/generate`, `/api/calibrations/:id/download`
- Master data: `/api/companies`, `/api/users`, `/api/instrument-forms`
- Health check: `/api/health`

Operasi create, update, delete, review, dan approval dibatasi berdasarkan role.

## Perintah penting

```bash
pnpm dev                  # menjalankan web dan API
pnpm typecheck            # memeriksa TypeScript seluruh workspace
pnpm test                 # menjalankan seluruh test
pnpm build                # production build
pnpm lint                 # ESLint seluruh workspace
pnpm db:generate          # generate Prisma Client
pnpm db:migrate           # membuat/menerapkan migrasi development
pnpm db:migrate:deploy    # menerapkan migrasi yang sudah tersedia
pnpm db:seed              # memperbarui admin dan katalog template
```

## Deployment staging

Arsitektur staging yang digunakan:

- Web Next.js: Vercel
- API NestJS: Railway
- Database PostgreSQL: branch staging Neon
- Template dan hasil Excel: private Vercel Blob

Urutan deployment:

1. Buat atau pilih branch staging di Neon dan simpan connection string sebagai `DATABASE_URL`.
2. Buat private Blob store di Vercel dan simpan `BLOB_READ_WRITE_TOKEN`.
3. Upload workbook template dengan `pnpm --filter @certindo/api storage:upload-templates`.
4. Simpan URL hasil upload sebagai `TEMPLATE_EARLY_URL` dan `TEMPLATE_CURRENT_URL`.
5. Deploy API ke Railway. Konfigurasi build dan health check dibaca dari `railway.json`.
6. Isi environment API: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, storage, dan URL template.
7. Terapkan database staging:

```bash
pnpm db:migrate:deploy
pnpm db:seed
```

8. Deploy `apps/web` ke Vercel dan arahkan `NEXT_PUBLIC_API_URL` ke URL Railway dengan suffix `/api`.
9. Verifikasi `/api/health`, login, katalog template, workflow status, serta generate/download workbook.

Gunakan branch database dan kredensial yang berbeda untuk development, staging, dan production.
