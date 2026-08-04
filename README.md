# Certindo Calibration Worksheet

Fondasi monorepo TypeScript untuk sistem lembar kerja kalibrasi PT Certindonesia. Implementasi saat ini mencakup workspace, database, autentikasi, design system, dashboard, CRUD draft kalibrasi, dan katalog template instrumen workbook 0X–94 serta 095–163. Adapter penulisan Excel dan formulir pengukuran dinamis masih dilanjutkan bertahap.

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

Panduan staging Vercel, Render, Neon, dan private Blob tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).

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
- `GET /api/calibrations`
- `GET /api/calibrations/options`
- `GET /api/calibrations/:id`
- `POST /api/calibrations`
- `PATCH /api/calibrations/:id`
- `DELETE /api/calibrations/:id`
- `POST /api/calibrations/:id/generate`
- `GET /api/calibrations/:id/download`
- `GET /api/health`

Endpoint dashboard dan profil membutuhkan bearer token. Login dibatasi lima percobaan per menit per client.

## Database dan riwayat

Schema awal menyediakan `User`, `Company`, `InstrumentForm`, `CalibrationRecord`, dan `CalibrationRevision`, termasuk role `ADMIN`, `TECHNICIAN`, `REVIEWER`, `APPROVER` dan seluruh status workflow. Migrasi tidak memerlukan database lokal; gunakan branch Neon terpisah untuk pengembangan dan produksi.

## Template instrumen

Seed katalog saat ini menghubungkan setiap instrumen aktif ke workbook lokal `storage/templates/Lembar Kerja 0X-94.xlsx` atau `storage/templates/Lembar Kerja 095-163.xlsx` dan nama sheet-nya melalui `mappingJson`. Sheet kosong tidak dimasukkan. Daftar field identitas mengikuti isi setiap sheet dan ditampilkan dalam urutan No. Sertifikat, Nama Alat, Merk, Type/Model, No. Seri, No. Identitas, Kapasitas, lalu Resolusi; field yang tidak ada pada template tidak ditampilkan. Nomor sertifikat selalu memakai prefix tetap `CTD/CAL/`. Template dengan kapasitas minimum/maksimum atau temperatur ruangan awal/tengah/akhir mendapatkan field terpisah sesuai lembar kerja. Template yang metadata sumbernya masih tidak konsisten ditandai `needsTemplateReview` agar tidak dianggap siap ekspor final.

Mapping Torque Gauge sudah mencakup identitas, kondisi ruangan, 10 titik Clockwise, dan 11 titik Counter Clockwise dengan masing-masing lima pembacaan standar. Mapping Dissolved Oxygen Meter mencakup identitas, lokasi kalibrasi, temperatur dan kelembaban awal/akhir, serta empat baris Standar DO dengan pembacaan DO1–DO3. API menghasilkan workbook terisi yang hanya berisi sheet instrumen terpilih tanpa mengubah master multi-sheet, dan UI menyediakan tombol pembuatan sekaligus unduh Excel. Fase berikutnya adalah memperluas mapping dan tabel pengukuran ke jenis alat lain.
