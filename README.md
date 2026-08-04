# Certindo Calibration Worksheet

Fondasi monorepo TypeScript untuk sistem lembar kerja kalibrasi PT Certindonesia. Implementasi saat ini mencakup **Phase 1–2**: workspace, database, autentikasi, design system, application shell, dan dashboard. Dynamic form, CRUD kalibrasi, adapter Excel, serta formulir Torque Gauge akan dilanjutkan pada Phase 3–6.

## Arsitektur

```text
apps/
  api/          NestJS REST API (runtime independen)
  web/          Next.js App Router (deploy ke Vercel)
packages/
  config/       token desain dan konfigurasi bersama
  types/        kontrak TypeScript lintas aplikasi
  validation/   validasi Zod lintas aplikasi
  ui/           komponen UI bergaya shadcn yang disesuaikan
  eslint-config/
  tsconfig/
prisma/         schema, migrasi, dan seed
storage/
  templates/    master template lokal (tidak masuk Git)
  generated/    hasil generate lokal (tidak masuk Git)
```

Web dan API tidak digabungkan ke satu runtime. API menjadi pemilik aturan domain dan database; web berkomunikasi melalui REST. PostgreSQL JSONB disiapkan untuk schema formulir, mapping Excel, dan data kalibrasi agar penambahan instrumen tidak memerlukan tabel baru.

## Prasyarat

- Node.js 20.9 atau lebih baru
- pnpm 11
- Database PostgreSQL Neon

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env` dan isi `DATABASE_URL` serta `JWT_SECRET`.
2. Pasang dependensi: `pnpm install`.
3. Generate Prisma Client: `pnpm db:generate`.
4. Terapkan migrasi: `pnpm db:migrate`.
5. Isi data awal: `pnpm db:seed`.
6. Jalankan web dan API: `pnpm dev`.

Web tersedia di `http://localhost:3000`, API di `http://localhost:4000/api`, dan health check di `http://localhost:4000/api/health`.

Data admin awal mengikuti `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`. Ganti password seed sebelum menggunakan environment bersama.

## Environment

- `DATABASE_URL`: connection string PostgreSQL Neon dengan SSL.
- `JWT_SECRET`: rahasia acak minimal 32 karakter.
- `JWT_EXPIRES_IN`: masa berlaku JWT, default `8h`.
- `API_PORT`: port NestJS, default `4000`.
- `CORS_ORIGINS`: daftar origin dipisahkan koma.
- `NEXT_PUBLIC_API_URL`: base URL API yang dapat diakses browser.
- `STORAGE_DRIVER`: `local` sekarang; `s3` akan tersedia melalui abstraksi storage pada fase Excel.
- `STORAGE_LOCAL_ROOT`: root storage pengembangan lokal.

## Perintah kualitas

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Endpoint saat ini

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/health`

Endpoint dashboard dan profil membutuhkan bearer token. Login dibatasi lima percobaan per menit per client.

## Database dan riwayat

Schema awal menyediakan `User`, `Company`, `InstrumentForm`, `CalibrationRecord`, dan `CalibrationRevision`, termasuk role `ADMIN`, `TECHNICIAN`, `REVIEWER`, `APPROVER` dan seluruh status workflow. Migrasi tidak memerlukan database lokal; gunakan branch Neon terpisah untuk pengembangan dan produksi.

## Fase berikutnya

Phase 3 akan mendefinisikan `FormSchema`/`ExcelMapping` dengan Zod, renderer formulir dinamis, dan measurement table keyboard-friendly. Setelah itu CRUD dan revision history, abstraksi storage/Excel, Torque Gauge CCI-KAL-FOM-152, pengujian integrasi, serta dokumentasi deployment akan ditambahkan secara inkremental.
