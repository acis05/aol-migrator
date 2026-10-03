# AOL Migrator ACIS — Journal Voucher MVP

Aplikasi web untuk migrasi **Jurnal Voucher / Jurnal Umum** dari satu database Accurate Online ke database Accurate Online lain.

## Fitur
- OAuth Authorization Code untuk koneksi Source dan Target terpisah.
- Pilih database melalui `db-list.do`, lalu `open-db.do` untuk host + `X-Session-ID`.
- Token OAuth disimpan terenkripsi AES-256-GCM di PostgreSQL dan refresh otomatis mendekati expiry.
- Membaca Journal Voucher via `list.do` + `detail.do`, lalu menulis target via `bulk-save.do` maksimal 100 transaksi/request.
- Log job dan error per transaksi.
- Proteksi agar Source DB != Target DB.
- Railway-ready (`railway.json`, `Dockerfile`, health check).

## Penting sebelum produksi
Endpoint baca `/api/journal-voucher/list.do` dan `/detail.do` mengikuti pola API Accurate Online dan membutuhkan scope `journal_voucher_view`. Endpoint tulis `/api/journal-voucher/bulk-save.do` menggunakan scope `journal_voucher_save`. Cocokkan kembali field response `detail.do` dengan dokumentasi Developer AOL milik aplikasi Anda sebelum migrasi produksi. Uji dahulu pada database dummy/backup.

Versi MVP ini **tidak menyalin `id` internal source** ke target. Nomor jurnal dipertahankan jika tersedia. Referensi seperti akun, customer/vendor, employee, project, department, branch, dan klasifikasi harus sudah tersedia di target dengan nomor/nama yang sesuai; modul mapping master akan ditambahkan pada fase berikutnya.

## Local
1. `cp .env.example .env.local`
2. Buat PostgreSQL dan isi `DATABASE_URL`.
3. Generate key: `openssl rand -hex 32` → `TOKEN_ENCRYPTION_KEY`.
4. Daftarkan callback Accurate: `http://localhost:3000/api/oauth/callback`.
5. Isi `AOL_CLIENT_ID`, `AOL_CLIENT_SECRET`, dan callback.
6. `npm install && npm run dev`.

## Deploy Railway
1. Push repo ini ke GitHub.
2. Railway → New Project → Deploy from GitHub Repo.
3. Tambahkan service PostgreSQL.
4. Set env: `DATABASE_URL` (Railway reference), `APP_URL=https://<domain>`, `AOL_CLIENT_ID`, `AOL_CLIENT_SECRET`, `AOL_REDIRECT_URI=https://<domain>/api/oauth/callback`, `AOL_SCOPES=journal_voucher_view journal_voucher_save`, `TOKEN_ENCRYPTION_KEY`.
5. Di Developer Accurate, tambahkan URL callback Railway yang sama persis.
6. Deploy. Tabel dibuat otomatis saat aplikasi pertama diakses.

## Arsitektur berikutnya
Untuk produksi skala besar, pindahkan migrasi panjang dari HTTP request ke worker/queue agar job >5 menit tidak tergantung request web. Tambahkan license server `DB Pair + Module + Expiry`, idempotency/duplicate detection, dry-run, reconciliation, mapping master, dan retry granular.


## Cakupan jurnal
- `journal_voucher_only` aktif: membaca `/api/journal-voucher/list.do` dengan `filter.transDate` dan pagination `sp.page`/`sp.pageSize`, lalu detail via `/detail.do`.
- `all_transaction_journals` sudah tersedia sebagai pilihan UI tetapi sengaja belum dieksekusi. Endpoint `/api/journal-voucher` adalah resource Jurnal Umum, bukan endpoint seluruh jurnal otomatis dari semua modul. Tambahkan endpoint sumber seluruh jurnal sebelum mengaktifkan mode ini.

## Railway Docker note (v2.2)
The Dockerfile does not require `/app/public` in the runner image, so deployment remains valid even if GitHub does not contain a `public` directory. The builder also creates `public` defensively before `next build`.
