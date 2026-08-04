# Deployment staging

Arsitektur staging:

- Web Next.js: Vercel
- API NestJS: Render
- Database: Neon PostgreSQL
- Template dan hasil Excel: private Vercel Blob

## 1. Vercel project dan Blob

1. Di Vercel pilih **Add New > Project**, lalu import repository `guuzenn/certindo-worksheet`.
2. Atur **Root Directory** menjadi `apps/web` dan framework menjadi Next.js.
3. Tambahkan environment sementara `NEXT_PUBLIC_API_URL=https://placeholder.invalid/api`, lalu deploy pertama.
4. Buka tab **Storage**, buat Blob store, dan pilih akses **Private**.
5. Dari pengaturan store salin `BLOB_READ_WRITE_TOKEN` ke `.env` lokal. Jangan commit atau kirim token melalui chat.
6. Jalankan `pnpm --filter @certindo/api storage:upload-templates`.
7. Simpan dua baris URL yang dicetak sebagai `TEMPLATE_EARLY_URL` dan `TEMPLATE_CURRENT_URL`.

## 2. Neon staging

1. Buat branch database baru bernama `staging` pada project Neon.
2. Salin pooled connection string branch tersebut sebagai `DATABASE_URL`.
3. Dari komputer lokal, set `DATABASE_URL` staging sementara lalu jalankan:
   - `pnpm db:migrate:deploy`
   - `pnpm db:seed`
4. Gunakan email dan password admin staging yang berbeda dari default repository.

## 3. Render API

1. Di Render pilih **New > Blueprint** dan hubungkan repository yang sama.
2. Render akan membaca `render.yaml` dan membuat service `certindo-worksheet-api`.
3. Isi secret/environment berikut:
   - `DATABASE_URL`: pooled URL branch Neon staging
   - `JWT_SECRET`: string acak minimal 32 karakter
   - `CORS_ORIGINS`: URL production deployment web Vercel, tanpa trailing slash
   - `BLOB_READ_WRITE_TOKEN`: token private Blob
   - `TEMPLATE_EARLY_URL`: URL hasil upload workbook 0X-94
   - `TEMPLATE_CURRENT_URL`: URL hasil upload workbook 095-163
   - `SEED_ADMIN_EMAIL`: email admin staging
   - `SEED_ADMIN_PASSWORD`: password admin staging yang kuat
4. Deploy dan pastikan `https://<render-host>/api/health` mengembalikan status `ok`.

## 4. Hubungkan web ke API

1. Kembali ke Vercel Project Settings > Environment Variables.
2. Ubah `NEXT_PUBLIC_API_URL` menjadi `https://<render-host>/api`.
3. Redeploy web.
4. Jika URL production Vercel berubah, perbarui `CORS_ORIGINS` di Render lalu redeploy API.

## 5. Smoke test

1. Login dengan akun admin staging.
2. Buat draft FOM-096.
3. Isi identitas, jadikan tabel nominal empat baris, dan tabel keberulangan tiga baris.
4. Simpan draft, generate Excel, lalu download.
5. Buka hasil Excel dan pastikan hanya sheet Depth Gauge yang ada, semua data terisi, serta footer bergeser mengikuti jumlah baris.
6. Ulangi dengan satu baris untuk memastikan pengurangan baris juga benar.

Jangan gunakan database atau kredensial produksi sebelum seluruh smoke test staging lulus.
