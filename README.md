# App Sekolah Menabung

Aplikasi web untuk mengelola kegiatan tabungan siswa secara digital.
Frontend: HTML5, CSS3, JavaScript Vanilla, Bootstrap 5.3, Font Awesome, SweetAlert2, Chart.js.
Backend/database: **Google Apps Script (REST API) + Google Sheets** — tanpa MySQL.

---

## 1. Struktur File

```
/index.html              -> redirect otomatis ke login/dashboard
/login.html               -> halaman login
/dashboard.html            -> statistik, grafik, transaksi terbaru
/siswa.html                -> CRUD data siswa (admin)
/kelas.html                -> CRUD data kelas (admin)
/pengguna.html              -> CRUD pengguna/akun (admin)
/transaksi.html              -> form setoran & penarikan (admin, petugas)
/tabungan.html                -> buku tabungan siswa (semua role, siswa hanya lihat miliknya)
/laporan.html                  -> laporan per periode/kelas + export (admin, petugas, wali kelas)
/profil.html                    -> profil & ubah password (semua role)
/pengaturan.html                  -> info konfigurasi sistem (admin)
/assets/css/style.css              -> tema visual aplikasi
/assets/js/api.js                    -> wrapper request ke Google Apps Script
/assets/js/auth.js                    -> session, login guard, role-based access
/assets/js/app.js                      -> util format, loading, toast, dsb.
/Code.gs                                -> backend REST API (Google Apps Script)
```

**Penjelasan tiap file:**
- `api.js` — semua komunikasi ke backend lewat objek `API`. Ubah `API_CONFIG.API_URL` di sini setelah deploy.
- `auth.js` — mengatur session (`sessionStorage`), pembatasan halaman berdasarkan role (`AUTH.requireRole([...])`), dan hashing password sisi klien (SHA-256) sebelum dikirim ke server.
- `app.js` — fungsi bantu: format Rupiah, format tanggal, ID transaksi otomatis, SweetAlert2, dsb.
- `Code.gs` — seluruh endpoint REST API + logika bisnis (perhitungan saldo, validasi, CRUD).

---

## 2. Struktur Google Sheets

Buat 1 Google Spreadsheet, lalu jalankan `setupSheets()` (lihat langkah instalasi) untuk membuat sheet berikut secara otomatis:

### Sheet `Users`
| id | username | password | nama | role | nis | kelasId | status | createdAt |
|----|----------|----------|------|------|-----|---------|--------|-----------|

- `role`: `admin` \| `petugas` \| `walikelas` \| `siswa`
- `password` disimpan dalam bentuk **hash SHA-256**, bukan plaintext.
- `nis` diisi hanya jika role = siswa. `kelasId` diisi hanya jika role = walikelas.

### Sheet `Siswa`
| id | nis | nama | kelasId | jk | namaOrtu | telepon | status | createdAt |
|----|-----|------|---------|----|----|---------|--------|-----------|

### Sheet `Kelas`
| id | nama | waliKelas | tingkat | createdAt |
|----|------|-----------|---------|-----------|

### Sheet `Transaksi`
| id | tanggal | nis | namaSiswa | kelasId | namaKelas | jenis | nominal | saldoSebelum | saldoSetelah | keterangan | petugas | timestamp |
|----|---------|-----|-----------|---------|-----------|-------|---------|--------------|--------------|------------|---------|-----------|

- `jenis`: `setoran` \| `penarikan`
- Setiap transaksi tersimpan **permanen** — riwayat tidak pernah ditimpa/dihapus, sehingga saldo dapat direkonstruksi ulang bila diperlukan.

### Sheet `Saldo`
| nis | namaSiswa | kelasId | saldo | updatedAt |
|-----|-----------|---------|-------|-----------|

Sheet ini menyimpan **saldo berjalan** (running balance) tiap siswa. Nilainya hanya diperbarui oleh server (`Code.gs`), tidak pernah dipercaya dari input browser — mencegah manipulasi saldo dari sisi klien.

### Sheet `LogAktivitas`
| id | waktu | user | aksi | keterangan |
|----|-------|------|------|-------------|

Mencatat aktivitas penting: login, tambah/edit/hapus data, transaksi.

### Sheet `Pengaturan`
| key | value |
|-----|-------|

Menyimpan nama sekolah, tahun ajaran, dan alamat sekolah (dipakai untuk kop laporan/cetak).

---

## 3. Cara Deploy Google Apps Script sebagai Web App

1. Buka [Google Sheets](https://sheets.google.com), buat spreadsheet baru dan beri nama, misalnya **"Database Sekolah Menabung"**.
2. Buka menu **Extensions > Apps Script**.
3. Hapus kode default di `Code.gs`, lalu **salin-tempel** seluruh isi file `Code.gs` dari project ini.
4. Simpan project (nama bebas, misal "API Sekolah Menabung").
5. Di editor Apps Script, pilih fungsi **`setupSheets`** pada dropdown fungsi di toolbar, lalu klik **Run** (▶).
   - Saat diminta izin akses, klik **Review permissions** → pilih akun Google Anda → **Allow**.
   - Fungsi ini akan membuat seluruh sheet, header kolom, dan **data dummy** (akun demo + 3 siswa contoh).
6. Klik tombol **Deploy > New deployment**.
   - Pilih ikon gear ⚙ → pilih tipe **Web app**.
   - **Description**: `API Sekolah Menabung v1`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone`
   - Klik **Deploy**.
7. Salin **Web app URL** yang muncul (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).
8. Setiap kali Anda mengubah `Code.gs`, buat **New deployment** baru (atau gunakan "Manage deployments > Edit > New version") agar perubahan berlaku pada URL yang sama.

---

## 4. Cara Menghubungkan HTML dengan API

Buka file `assets/js/api.js`, lalu ubah baris berikut sesuai URL Web App Anda:

```javascript
const API_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxx/exec"
};
```

Setelah itu, seluruh halaman (`login.html`, `dashboard.html`, dst.) otomatis terhubung ke backend karena semuanya memuat `api.js`.

> Catatan CORS: Apps Script Web App yang dideploy dengan akses **Anyone** secara default mengizinkan permintaan `GET` dan `POST` lintas origin. Permintaan `POST` pada `api.js` sengaja dikirim dengan header `Content-Type: text/plain` agar tidak memicu **CORS preflight** (`OPTIONS`) yang tidak didukung oleh Apps Script.

---

## 5. Instruksi Instalasi (Ringkas)

1. Download/salin seluruh folder proyek ini ke komputer Anda.
2. Deploy backend Google Apps Script mengikuti langkah di bagian 3.
3. Set `API_CONFIG.API_URL` di `assets/js/api.js` mengikuti langkah di bagian 4.
4. Buka `login.html` melalui **static web hosting** (disarankan), misalnya:
   - Upload folder ke Netlify / GitHub Pages / Firebase Hosting, **atau**
   - Jalankan lokal dengan Live Server (VS Code) agar path relatif dan `fetch()` bekerja normal.
5. Login menggunakan akun demo (lihat bagian 6).

---

## 6. Akun Demo (dibuat otomatis oleh `setupSheets()`)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Petugas Tabungan | `petugas1` | `petugas123` |
| Wali Kelas | `wali1` | `wali123` |
| Siswa | `siswa1` | `siswa123` |

---

## 7. Sistem Role & Hak Akses

| Halaman | Admin | Petugas | Wali Kelas | Siswa |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Data Siswa / Kelas / Pengguna | ✅ | ❌ | ❌ | ❌ |
| Transaksi (Setoran/Penarikan) | ✅ | ✅ | ❌ | ❌ |
| Buku Tabungan | ✅ (semua siswa) | ✅ (semua siswa) | ✅ (kelasnya)* | ✅ (miliknya sendiri) |
| Laporan | ✅ | ✅ | ✅ (kelasnya) | ❌ |
| Profil | ✅ | ✅ | ✅ | ✅ |
| Pengaturan | ✅ | ❌ | ❌ | ❌ |

\* Pembatasan wali kelas hanya melihat kelasnya sendiri diterapkan di sisi UI (`laporan.html`, filter kelas otomatis terkunci). Untuk keamanan produksi yang lebih ketat, tambahkan validasi `kelasId` pada endpoint `getTransaksi` di `Code.gs` berdasarkan sesi pengguna yang login.

Pembatasan akses halaman diterapkan lewat `AUTH.requireRole([...])` di setiap file HTML, dan elemen menu memakai atribut `data-role="admin,petugas"` agar otomatis disembunyikan untuk role yang tidak berhak.

---

## 8. Validasi Transaksi

- Nominal setoran/penarikan **harus lebih dari 0**.
- NIS **harus terdaftar** di sheet `Siswa`, jika tidak transaksi ditolak.
- Penarikan **tidak boleh melebihi saldo** — divalidasi dua kali: di frontend (agar responsif) **dan** di backend `Code.gs` (agar tidak bisa dimanipulasi lewat DevTools/Postman).
- ID transaksi dibuat otomatis dan unik (`generateTrxId()` di frontend, dapat ditimpa dengan `generateId()` di backend bila kosong).
- Setiap transaksi mencatat `saldoSebelum` dan `saldoSetelah` sebagai jejak audit.

## 9. Sistem Perhitungan Saldo

```
Saldo = Total Setoran − Total Penarikan
```

Saldo **tidak dihitung ulang dari seluruh riwayat setiap saat** (untuk efisiensi), melainkan disimpan sebagai *running balance* di sheet `Saldo` dan diperbarui setiap ada transaksi baru yang **divalidasi di server**. Karena setiap transaksi tetap tercatat lengkap di sheet `Transaksi`, saldo dapat direkonstruksi ulang kapan saja jika diperlukan audit.

---

## 10. Fitur Cetak

- **Cetak Bukti Transaksi**: setelah setoran/penarikan berhasil, modal bukti transaksi otomatis tampil (`transaksi.html`) dengan tombol cetak (memakai `window.print()` + CSS `@media print`).
- **Cetak Buku Tabungan**: halaman `tabungan.html` memiliki tombol cetak yang otomatis menyembunyikan sidebar/topbar saat mode print (lihat `.no-print` di `style.css`).
- **Export**: buku tabungan & laporan memiliki tombol export ke CSV (dapat dibuka langsung di Excel/Google Sheets). Export PDF disarankan lewat dialog cetak browser ("Simpan sebagai PDF").

---

## 11. Contoh Response JSON API

**GET `?action=getDashboard`**
```json
{
  "success": true,
  "data": {
    "totalSiswa": 3,
    "totalSaldo": 250000,
    "setoranHariIni": 50000,
    "penarikanHariIni": 0,
    "setoranBulanIni": 250000,
    "penarikanBulanIni": 0,
    "grafikHarian": [
      { "tanggal": "11/09", "setoran": 0, "penarikan": 0 },
      { "tanggal": "17/09", "setoran": 50000, "penarikan": 0 }
    ],
    "saldoPerKelas": [
      { "kelas": "6A", "saldo": 150000 },
      { "kelas": "6B", "saldo": 100000 }
    ],
    "transaksiTerbaru": [
      { "id": "SETOR-20260917-AB12C", "tanggal": "2026-09-17", "namaSiswa": "Ahmad Rizki", "jenis": "setoran", "nominal": 50000 }
    ],
    "siswaAktivitasTerbaru": [
      { "nama": "Ahmad Rizki", "nis": "2026001", "kelas": "6A", "saldo": 150000 }
    ]
  }
}
```

**POST `action=tambahSetoran`**
```json
// Request body
{
  "action": "tambahSetoran",
  "id": "SETOR-20260917-AB12C",
  "tanggal": "2026-09-17",
  "nis": "2026001",
  "namaSiswa": "Ahmad Rizki",
  "kelasId": "K001",
  "namaKelas": "6A",
  "nominal": 50000,
  "keterangan": "Tabungan mingguan",
  "petugas": "Budi Santoso"
}
```
```json
// Response
{
  "success": true,
  "message": "Setoran berhasil dicatat.",
  "data": { "id": "SETOR-20260917-AB12C", "saldoAkhir": 150000 }
}
```

**Response error (contoh saldo tidak cukup):**
```json
{ "success": false, "message": "Nominal penarikan melebihi saldo siswa saat ini (50000)." }
```

---

## 12. Contoh Data Dummy

| NIS | Nama | Kelas | Saldo Awal |
|-----|------|-------|-----------|
| 2026001 | Ahmad Rizki | 6A | 0 |
| 2026002 | Putri Ayu Lestari | 6A | 0 |
| 2026003 | Dimas Prasetyo | 6B | 0 |

Silakan lakukan beberapa transaksi setoran melalui `transaksi.html` untuk melihat data & grafik terisi.

---

## 13. Keamanan yang Diterapkan

- Password di-hash **SHA-256** di sisi klien sebelum dikirim, dan disimpan dalam bentuk hash di sheet `Users` (bukan plaintext).
- Session disimpan di `sessionStorage` (hilang saat tab ditutup) — dapat diganti `localStorage` bila ingin "remember me".
- Setiap halaman memanggil `AUTH.requireRole([...])` sehingga role yang tidak berhak otomatis dialihkan.
- Validasi saldo & input **selalu dihitung ulang di server** (`Code.gs`), tidak pernah mempercayai nilai dari browser.
- `doGet`/`doPost` membatasi daftar `action` yang diizinkan (whitelist), menolak endpoint yang tidak dikenal.
- ID transaksi dibuat unik menggunakan UUID (`Utilities.getUuid()`).

**Catatan penting:** SHA-256 tanpa *salt* tetap rentan terhadap serangan rainbow table dibanding bcrypt/scrypt. Untuk produksi skala besar, pertimbangkan menambahkan salt unik per pengguna, atau memindahkan autentikasi ke layanan khusus (mis. Firebase Authentication) jika dibutuhkan tingkat keamanan lebih tinggi daripada yang dapat disediakan Google Apps Script.

---

## 14. Pengembangan Lanjutan yang Disarankan

- Tambahkan endpoint `getPengaturan`/`updatePengaturan` ke UI `pengaturan.html` (endpoint backend sudah tersedia di `Code.gs`).
- Tambahkan pagination di `getSiswa`/`getTransaksi` jika jumlah data sudah sangat besar (ribuan baris) agar performa Apps Script tetap baik.
- Tambahkan pembatasan `kelasId` otomatis di backend untuk role `walikelas` agar tidak bergantung pada validasi UI saja.
- Tambahkan export PDF native (mis. menggunakan Google Apps Script `DriveApp`/`DocumentApp` untuk membuat PDF di server) jika dialog print browser dirasa kurang praktis.
