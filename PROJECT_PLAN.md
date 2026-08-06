# Certindo Worksheet — Project Plan

Dokumen ini adalah sumber kerja utama untuk menyelesaikan katalog formulir Certindo. Jika pengguna mengatakan **"lanjutkan project plan"**, kerjakan item pending berikutnya secara mandiri tanpa meminta instruksi ulang untuk setiap form.

## 1. Tujuan

Menyediakan aplikasi worksheet kalibrasi yang:

- menampilkan seluruh field dan tabel sesuai workbook serta DOCX resmi;
- nyaman diisi tanpa scroll horizontal pada desktop jika secara visual masih masuk akal;
- mengekspor data ke sel Excel yang tepat tanpa merusak format sumber;
- mendukung draft, review, approval, dan download workbook;
- memiliki bukti verifikasi otomatis untuk setiap form yang ditandai `mappingVerified: true`.

## 2. Status Saat Ini

Baseline per 6 Agustus 2026:

| Status | Jumlah |
| --- | ---: |
| Total definisi form | 89 |
| Mapping terverifikasi | 15 |
| Belum terverifikasi | 74 |

Form yang sudah terverifikasi:

| Kode | Revisi | Form |
| --- | --- | --- |
| CCI-KAL-FOM-0XX | 02 | Lembar Kerja Umum |
| CCI-KAL-FOM-010 | 03 | Pressure Gauge |
| CCI-KAL-FOM-027 | 04 | Anak Timbangan |
| CCI-KAL-FOM-028 | 04 | Timbangan |
| CCI-KAL-FOM-028 | 05 | Timbangan |
| CCI-KAL-FOM-033 | 03 | Enklosur |
| CCI-KAL-FOM-053 | 04 | Thermohygrometer |
| CCI-KAL-FOM-054 | 02 | Timer / Stopwatch |
| CCI-KAL-FOM-055 | 04 | Volumetric Glassware |
| CCI-KAL-FOM-056 | 04 | Autoclave |
| CCI-KAL-FOM-057 | 03 | Mikrometer — LK-054-IDN / JCC (Taiwan) |
| CCI-KAL-FOM-057-B | 03 | Mikrometer — LK-032-IDN / LK-070-IDN |
| CCI-KAL-FOM-058 | 00 | Digital Pressure |
| CCI-KAL-FOM-152 | sesuai sumber | Torque Gauge |
| CCI-KAL-FOM-153 | sesuai sumber | Dissolved Oxygen Meter |

Jumlah di atas harus diperbarui setelah setiap batch selesai.

## 3. Kontrak Kerja Mandiri

Untuk setiap perintah **"lanjutkan project plan"**, agen harus:

1. Membaca status repository dan menjaga perubahan pengguna yang sudah ada.
2. Memilih batch pending berikutnya dari urutan pada bagian 5.
3. Menyelesaikan seluruh batch dari inspeksi sumber sampai seed database dan verifikasi.
4. Tidak berhenti untuk meminta persetujuan pada keputusan teknis rutin yang sudah diatur dokumen ini.
5. Memberikan laporan ringkas per batch, bukan meminta QA pengguna per form.
6. Memperbarui status dan catatan batch di dokumen ini.

Agen hanya perlu meminta keputusan pengguna jika:

- workbook dan DOCX resmi berisi struktur atau nilai yang saling bertentangan;
- alamat sel atau arti field tidak dapat ditentukan secara aman dari sumber;
- sebuah form memiliki beberapa revisi/varian tetapi identitas resminya tidak jelas;
- dibutuhkan perubahan produk besar di luar metadata form, engine ekspor, atau layout form;
- dibutuhkan deployment, perubahan data produksi, kredensial, atau tindakan eksternal lain.

Jika DOCX tidak tersedia, workbook adalah sumber utama. Jika DOCX tersedia dan konsisten, gunakan keduanya. Jangan menebak nilai default yang tidak tertulis pada salah satu sumber.

## 4. Definition of Done per Form

Sebuah form hanya boleh diberi `mappingVerified: true` jika semua poin berikut selesai:

- kode, nama, revisi, workbook, dan nama sheet sudah dicocokkan;
- seluruh field identitas yang dapat diisi memiliki input web dan mapping sel;
- label form mengikuti istilah pada sumber;
- nilai bawaan seperti metode, standar, merk, dan keterangan sudah diambil dari sumber;
- seluruh tabel dipisahkan sesuai bagian semantik pada sheet;
- header bertingkat, jumlah kolom, jumlah baris template, dan batas baris sudah benar;
- field pendukung seperti kondisi operasional dan Data Standar tersedia;
- mapping baris pertama dan terakhir setiap tabel sudah diuji;
- format prefix, suffix, dan satuan tidak hilang saat ekspor;
- hasil ekspor hanya menyisakan worksheet target;
- test metadata dan test OOXML lulus;
- typecheck API dan web lulus;
- seed database berhasil dan data hasil seed telah diperiksa;
- `git diff --check` bersih.

## 5. Urutan Eksekusi

Kerjakan dalam batch kecil agar kegagalan mudah dilacak. Urutan default:

### Batch A — kelanjutan workbook 0X–94

- [x] A1: FOM-054 sampai FOM-058, termasuk dua varian FOM-057.
- [ ] A2: FOM-059 sampai FOM-064.
- [ ] A3: FOM-065 sampai FOM-073.
- [ ] A4: FOM-074 sampai FOM-084.
- [ ] A5: FOM-085 sampai FOM-094.

### Batch B — workbook 095–119

- [ ] B1: FOM-095 sampai FOM-100.
- [ ] B2: FOM-101 sampai FOM-106.
- [ ] B3: FOM-107 sampai FOM-112.
- [ ] B4: FOM-113 sampai FOM-119.

### Batch C — workbook 120–151

- [ ] C1: FOM-120 sampai FOM-126.
- [ ] C2: FOM-127 sampai FOM-133.
- [ ] C3: FOM-134 sampai FOM-140.
- [ ] C4: FOM-141 sampai FOM-147.
- [ ] C5: FOM-148 sampai FOM-151 dan varian terkait.

### Batch D — audit katalog penuh

- [ ] Cocokkan ulang jumlah form, kode ganda, revisi, dan sheet yang belum tercakup rentang di atas.
- [ ] Pastikan tidak ada entri `DRAFT-1` tersisa untuk form yang sudah memiliki revisi resmi.
- [ ] Jalankan ekspor sentinel untuk seluruh katalog terverifikasi.
- [ ] Jalankan regression test, typecheck, build, dan lint.
- [ ] Lakukan spot-check visual desktop terhadap form paling lebar di setiap pola layout.

Urutan dapat diubah bila sebuah batch terblokir oleh sumber yang ambigu. Catat form tersebut sebagai blocked, lanjutkan form lain yang aman, lalu laporkan seluruh pertanyaan sekaligus pada akhir batch.

## 6. Workflow Teknis per Batch

### A. Inventaris sumber

1. Baca sheet workbook yang tepat dan catat semua sel non-kosong, merge, header, area data, serta bagian standar.
2. Jika tersedia, baca DOCX dengan kode/revisi yang sama dan cocokkan struktur tabelnya.
3. Catat perbedaan sumber sebelum mengubah metadata.

### B. Implementasi metadata

1. Perbarui `prisma/instrument-forms.ts`.
2. Tetapkan revisi resmi dan tambahkan migrasi revision dari `DRAFT-1` di `prisma/seed.ts` bila perlu.
3. Gunakan `fieldLabels`, `defaultValue`, `section`, `exportPrefix`, dan `exportSuffix` sesuai sumber.
4. Pisahkan tabel berdasarkan bagian semantik; jangan memadatkan dua tabel resmi menjadi satu tabel generik.
5. Aktifkan `mappingVerified: true` hanya setelah tes selesai.

### C. Kebijakan layout web

- Pertahankan card, typography, warna, dan pola input yang sudah digunakan aplikasi.
- Tabel terverifikasi menggunakan layout compact dan `table-fixed` pada desktop.
- Sampai sekitar 11 leaf column, gunakan tabel compact dengan header bertingkat.
- Untuk tabel yang lebih lebar atau berisi beberapa kelompok pembacaan besar, gunakan `layout: 'record-grid'` agar tidak perlu scroll horizontal.
- Header boleh wrap; input numerik dibuat ringkas dan rata tengah.
- Scroll horizontal hanya fallback pada layar kecil, bukan cara utama pada desktop.
- Jangan mengubah layout global untuk memperbaiki satu form bila metadata/layout lokal sudah cukup.

### D. Verifikasi otomatis

Tambahkan atau perluas test untuk memastikan:

- revisi dan status verified benar;
- urutan leaf column benar;
- first row, template row count, dan column mapping benar;
- mapping field statis benar;
- marker pada baris/kolom pertama dan terakhir benar-benar muncul di file ekspor;
- workbook hasil hanya memiliki satu worksheet target.

Perintah minimum:

```powershell
pnpm --filter @certindo/api test
pnpm --filter @certindo/api typecheck
pnpm --filter @certindo/web typecheck
pnpm db:seed
pnpm build
git diff --check
```

`pnpm lint` tetap dijalankan pada audit akhir. Error lint lama yang tidak berkaitan harus dicatat dan diperbaiki sebagai technical debt terpisah, bukan disembunyikan.

## 7. QA Pengguna

QA pengguna bukan syarat per form. Setelah satu batch selesai, pengguna cukup melakukan spot-check pada:

- satu form dengan tabel sederhana;
- satu form dengan header bertingkat;
- satu form paling lebar atau paling kompleks;
- satu hasil ekspor Excel.

Temuan spot-check diterapkan sebagai aturan umum dan regression test agar tidak perlu ditemukan ulang pada form berikutnya.

## 8. Catatan Batch

Tambahkan entri setelah setiap batch:

```text
Tanggal:
Batch:
Form selesai:
Form blocked:
Test/build:
Keputusan layout atau mapping baru:
Pertanyaan untuk pengguna:
```

### 2026-08-06 — Baseline

- Form terverifikasi: 9 dari 89.
- FOM-053 Thermohygrometer Rev.04 selesai berdasarkan workbook dan DOCX.
- Layout compact desktop diterapkan untuk tabel form terverifikasi.
- Batch berikutnya: A1, FOM-054 sampai FOM-058.

### 2026-08-06 — Batch A1

- Form selesai: FOM-054 Rev.02, FOM-055 Rev.04, FOM-056 Rev.04, dua varian FOM-057 Rev.03, dan FOM-058 Rev.00.
- Form blocked: tidak ada.
- Test/build: seluruh test lulus (API 39, web 4, validation 8), typecheck seluruh workspace lulus, production build lulus, seed database berhasil, dan seluruh record A1 terverifikasi dengan `needsTemplateReview: false`.
- Keputusan layout/mapping: 054 dipisah menjadi tabel Standar dan UUT; 055 menjadi tiga kelompok volume tanpa memetakan kolom formula Massa Air; 056 dipisah menjadi Pressure dan Temperature; kedua 057 memakai struktur berbeda sesuai sheet; 058 memakai tabel pressure 18 baris.
- Anomali sumber: sheet workbook `Digital Pressure` untuk FOM-058 menampilkan kode header `CCI-KAL-FOM-149`, tetapi DOCX resmi FOM-058 memiliki struktur pengukuran yang sama. Mapping FOM-058 dikunci berdasarkan kecocokan DOCX tersebut; FOM-149 harus diaudit ulang saat Batch C5.
- Pertanyaan untuk pengguna: tidak ada.
- Batch berikutnya: A2, FOM-059 sampai FOM-064.

### 2026-08-06 — Revisi QA Batch A1

- FOM-055: Ukuran Diameter Dalam dipindahkan dari Identitas Alat ke area sebelum tabel pertama. Setiap blok volume memakai header tiga tingkat, satu nilai volume dengan rowspan delapan data, baris `m₀₀` sampai `m₆`, serta kolom Massa Air yang dihitung dari `R’ − R` tanpa menimpa formula Excel.
- FOM-056: field Range, Resolusi, dan Satuan hanya tampil di header tabel terkait; card Data Pressure/Data Temperature duplikat setelah tabel dihapus melalui aturan renderer global.
- FOM-057-B: Kerataan dan Keparalelan diubah dari kumpulan field menjadi tabel. Urutan web sekarang Kerataan, Keparalelan, Per Nominal, lalu Keberulangan; suffix `garis` dan `mm` dipertahankan saat ekspor.
- FOM-058 dan FOM-010: field satuan penunjukan dipindahkan dari Identitas Alat ke header tabel pressure.
- Test/build: seluruh test lulus (API 39, web 6, validation 8), typecheck seluruh workspace lulus, production build lulus, dan seed database berhasil.

## 9. Kriteria Selesai Proyek

Proyek mapping katalog dinyatakan selesai ketika:

- seluruh form yang memiliki sumber valid sudah `mappingVerified: true`;
- tidak ada form verified tanpa test metadata dan ekspor;
- katalog database sama dengan metadata source code;
- seluruh regression test, typecheck, dan production build lulus;
- lint baseline bersih atau memiliki daftar pengecualian yang disetujui;
- form kompleks dapat diisi di desktop tanpa scroll horizontal yang tidak perlu;
- satu batch QA pengguna terakhir tidak menemukan masalah struktural baru.
