/**
 * ============================================================================
 *  App Sekolah Menabung - Code.gs
 *  Backend REST API menggunakan Google Apps Script + Google Sheets
 * ============================================================================
 *
 *  CARA DEPLOY (ringkas, lihat README.md untuk detail):
 *  1. Buat Google Sheets baru, lalu buka Extensions > Apps Script.
 *  2. Salin seluruh isi file ini ke Code.gs pada project Apps Script.
 *  3. Jalankan fungsi setupSheets() sekali (dari editor Apps Script) untuk
 *     membuat seluruh sheet & header otomatis, beserta data admin default.
 *  4. Klik Deploy > New deployment > pilih tipe "Web app".
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  5. Salin URL Web App yang dihasilkan ke assets/js/api.js (API_CONFIG.API_URL)
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// KONFIGURASI
// ---------------------------------------------------------------------------
const SHEET_USERS = "Users";
const SHEET_SISWA = "Siswa";
const SHEET_KELAS = "Kelas";
const SHEET_TRANSAKSI = "Transaksi";
const SHEET_SALDO = "Saldo";
const SHEET_LOG = "LogAktivitas";
const SHEET_PENGATURAN = "Pengaturan";

function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ---------------------------------------------------------------------------
// SETUP AWAL - jalankan fungsi ini sekali secara manual dari editor Apps Script
// ---------------------------------------------------------------------------
function setupSheets() {
  const ss = getSS();

  const struktur = {
    [SHEET_USERS]: ["id", "username", "password", "nama", "role", "nis", "kelasId", "status", "createdAt"],
    [SHEET_SISWA]: ["id", "nis", "nama", "kelasId", "jk", "namaOrtu", "telepon", "status", "createdAt"],
    [SHEET_KELAS]: ["id", "nama", "waliKelas", "tingkat", "createdAt"],
    [SHEET_TRANSAKSI]: ["id", "tanggal", "nis", "namaSiswa", "kelasId", "namaKelas", "jenis", "nominal", "saldoSebelum", "saldoSetelah", "keterangan", "petugas", "timestamp"],
    [SHEET_SALDO]: ["nis", "namaSiswa", "kelasId", "saldo", "updatedAt"],
    [SHEET_LOG]: ["id", "waktu", "user", "aksi", "keterangan"],
    [SHEET_PENGATURAN]: ["key", "value"]
  };

  Object.keys(struktur).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    sheet.clear();
    sheet.appendRow(struktur[sheetName]);
    sheet.setFrozenRows(1);
  });

  // ---- Data awal: Kelas ----
  const kelasSheet = ss.getSheetByName(SHEET_KELAS);
  kelasSheet.appendRow(["K001", "6A", "Ibu Siti Aminah", "2026/2027", new Date()]);
  kelasSheet.appendRow(["K002", "6B", "Bapak Ahmad Fauzi", "2026/2027", new Date()]);

  // ---- Data awal: Users (password sudah di-hash SHA-256) ----
  const usersSheet = ss.getSheetByName(SHEET_USERS);
  usersSheet.appendRow(["U001", "admin", sha256Hash("admin123"), "Administrator Sekolah", "admin", "", "", "aktif", new Date()]);
  usersSheet.appendRow(["U002", "petugas1", sha256Hash("petugas123"), "Budi Santoso", "petugas", "", "", "aktif", new Date()]);
  usersSheet.appendRow(["U003", "wali1", sha256Hash("wali123"), "Siti Aminah", "walikelas", "", "K001", "aktif", new Date()]);
  usersSheet.appendRow(["U004", "siswa1", sha256Hash("siswa123"), "Ahmad Rizki", "siswa", "S001", "", "aktif", new Date()]);

  // ---- Data awal: Siswa ----
  const siswaSheet = ss.getSheetByName(SHEET_SISWA);
  siswaSheet.appendRow(["S001", "2026001", "Ahmad Rizki", "K001", "L", "Bapak Hendra", "081234567890", "aktif", new Date()]);
  siswaSheet.appendRow(["S002", "2026002", "Putri Ayu Lestari", "K001", "P", "Ibu Sari", "081234567891", "aktif", new Date()]);
  siswaSheet.appendRow(["S003", "2026003", "Dimas Prasetyo", "K002", "L", "Bapak Joko", "081234567892", "aktif", new Date()]);

  // ---- Data awal: Saldo (mengikuti data siswa) ----
  const saldoSheet = ss.getSheetByName(SHEET_SALDO);
  saldoSheet.appendRow(["2026001", "Ahmad Rizki", "K001", 0, new Date()]);
  saldoSheet.appendRow(["2026002", "Putri Ayu Lestari", "K001", 0, new Date()]);
  saldoSheet.appendRow(["2026003", "Dimas Prasetyo", "K002", 0, new Date()]);

  // ---- Pengaturan default ----
  const pengaturanSheet = ss.getSheetByName(SHEET_PENGATURAN);
  pengaturanSheet.appendRow(["namaSekolah", "SD Negeri 1 Contoh"]);
  pengaturanSheet.appendRow(["tahunAjaran", "2026/2027"]);
  pengaturanSheet.appendRow(["alamatSekolah", "Jl. Pendidikan No. 1"]);

  SpreadsheetApp.getUi().alert("Setup selesai! Sheet & data dummy berhasil dibuat.");
}

// Helper hashing SHA-256 (dipakai saat setup data dummy)
function sha256Hash(text) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  return rawHash.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// ENTRY POINT: GET & POST
// ---------------------------------------------------------------------------
function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  let params = {};
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, message: "Body request tidak valid (harus JSON)." });
  }
  return handleRequest({ parameter: params }, "POST");
}

function handleRequest(e, method) {
  const action = e.parameter.action;
  if (!action) return jsonResponse({ success: false, message: "Parameter 'action' wajib diisi." });

  const allowedGet = ["getUsers", "getSiswa", "getKelas", "getTransaksi", "getSaldo", "getDashboard", "getPengaturan"];
  const allowedPost = ["login", "tambahSiswa", "updateSiswa", "hapusSiswa", "tambahKelas", "updateKelas",
    "hapusKelas", "tambahSetoran", "tambahPenarikan", "updateUser", "tambahUser", "updatePengaturan"];

  if (method === "GET" && allowedGet.indexOf(action) === -1) {
    return jsonResponse({ success: false, message: "Endpoint GET tidak dikenali atau tidak diizinkan." });
  }
  if (method === "POST" && allowedPost.indexOf(action) === -1) {
    return jsonResponse({ success: false, message: "Endpoint POST tidak dikenali atau tidak diizinkan." });
  }

  try {
    switch (action) {
      case "login": return apiLogin(e.parameter);
      case "getUsers": return apiGetUsers();
      case "tambahUser": return apiTambahUser(e.parameter);
      case "updateUser": return apiUpdateUser(e.parameter);

      case "getSiswa": return apiGetSiswa(e.parameter);
      case "tambahSiswa": return apiTambahSiswa(e.parameter);
      case "updateSiswa": return apiUpdateSiswa(e.parameter);
      case "hapusSiswa": return apiHapusSiswa(e.parameter);

      case "getKelas": return apiGetKelas();
      case "tambahKelas": return apiTambahKelas(e.parameter);
      case "updateKelas": return apiUpdateKelas(e.parameter);
      case "hapusKelas": return apiHapusKelas(e.parameter);

      case "getTransaksi": return apiGetTransaksi(e.parameter);
      case "tambahSetoran": return apiTambahSetoran(e.parameter);
      case "tambahPenarikan": return apiTambahPenarikan(e.parameter);

      case "getSaldo": return apiGetSaldo(e.parameter);
      case "getDashboard": return apiGetDashboard();

      case "getPengaturan": return apiGetPengaturan();
      case "updatePengaturan": return apiUpdatePengaturan(e.parameter);

      default:
        return jsonResponse({ success: false, message: "Action tidak ditemukan." });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: "Terjadi kesalahan server: " + err.message });
  }
}

// ---------------------------------------------------------------------------
// UTILITAS UMUM
// ---------------------------------------------------------------------------
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheetName) {
  const sheet = getSS().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter(row => row.some(cell => cell !== "" && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function generateId(prefix) {
  return prefix + "-" + Utilities.getUuid().split("-")[0].toUpperCase();
}

function logAktivitas(user, aksi, keterangan) {
  const sheet = getSS().getSheetByName(SHEET_LOG);
  sheet.appendRow([generateId("LOG"), new Date(), user, aksi, keterangan]);
}

function cariBarisById(sheet, idColName, id) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf(idColName);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return { rowIndex: i + 1, headers, row: data[i] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
function apiLogin(p) {
  const username = p.username;
  const password = p.password; // sudah dalam bentuk hash SHA-256 dari client

  if (!username || !password) {
    return jsonResponse({ success: false, message: "Username dan password wajib diisi." });
  }

  const users = sheetToObjects(SHEET_USERS);
  const user = users.find(u => u.username === username);

  if (!user) return jsonResponse({ success: false, message: "Username tidak ditemukan." });
  if (user.status && user.status !== "aktif") return jsonResponse({ success: false, message: "Akun tidak aktif. Hubungi administrator." });
  if (String(user.password) !== String(password)) return jsonResponse({ success: false, message: "Password salah." });

  logAktivitas(username, "LOGIN", "Login berhasil");

  return jsonResponse({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nis: user.nis || null,
      kelasId: user.kelasId || null
    }
  });
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
function apiGetUsers() {
  const users = sheetToObjects(SHEET_USERS).map(u => {
    delete u.password; // jangan kirim password ke client
    return u;
  });
  return jsonResponse({ success: true, data: users });
}

function apiTambahUser(p) {
  if (!p.username || !p.password || !p.nama || !p.role) {
    return jsonResponse({ success: false, message: "Data pengguna tidak lengkap." });
  }
  const sheet = getSS().getSheetByName(SHEET_USERS);
  const existing = sheetToObjects(SHEET_USERS).find(u => u.username === p.username);
  if (existing) return jsonResponse({ success: false, message: "Username sudah digunakan." });

  const id = generateId("U");
  sheet.appendRow([id, p.username, p.password, p.nama, p.role, p.nis || "", p.kelasId || "", p.status || "aktif", new Date()]);
  logAktivitas(p.username, "TAMBAH_USER", "Menambahkan pengguna baru: " + p.username);
  return jsonResponse({ success: true, message: "Pengguna berhasil ditambahkan.", data: { id } });
}

function apiUpdateUser(p) {
  if (!p.id) return jsonResponse({ success: false, message: "ID pengguna wajib diisi." });
  const sheet = getSS().getSheetByName(SHEET_USERS);
  const found = cariBarisById(sheet, "id", p.id);
  if (!found) return jsonResponse({ success: false, message: "Pengguna tidak ditemukan." });

  const { rowIndex, headers } = found;
  const updateField = (name, value) => {
    if (value === undefined || value === null || value === "") return;
    const col = headers.indexOf(name) + 1;
    if (col > 0) sheet.getRange(rowIndex, col).setValue(value);
  };
  updateField("username", p.username);
  updateField("password", p.password);
  updateField("nama", p.nama);
  updateField("role", p.role);
  updateField("nis", p.nis);
  updateField("kelasId", p.kelasId);
  updateField("status", p.status);

  logAktivitas(p.username || p.id, "UPDATE_USER", "Memperbarui data pengguna: " + p.id);
  return jsonResponse({ success: true, message: "Data pengguna berhasil diperbarui." });
}

// ---------------------------------------------------------------------------
// SISWA
// ---------------------------------------------------------------------------
function apiGetSiswa(p) {
  const siswaList = sheetToObjects(SHEET_SISWA);
  const kelasList = sheetToObjects(SHEET_KELAS);
  const saldoList = sheetToObjects(SHEET_SALDO);

  let hasil = siswaList.map(s => {
    const kelas = kelasList.find(k => String(k.id) === String(s.kelasId));
    const saldoObj = saldoList.find(sd => String(sd.nis) === String(s.nis));
    return {
      id: s.id,
      nis: s.nis,
      nama: s.nama,
      kelasId: s.kelasId,
      namaKelas: kelas ? kelas.nama : "-",
      jk: s.jk,
      namaOrtu: s.namaOrtu,
      telepon: s.telepon,
      status: s.status,
      saldo: saldoObj ? Number(saldoObj.saldo) : 0
    };
  });

  if (p.nis) hasil = hasil.filter(s => String(s.nis) === String(p.nis));
  if (p.kelasId) hasil = hasil.filter(s => String(s.kelasId) === String(p.kelasId));

  return jsonResponse({ success: true, data: hasil });
}

function apiTambahSiswa(p) {
  if (!p.nis || !p.nama || !p.kelasId) {
    return jsonResponse({ success: false, message: "NIS, nama, dan kelas wajib diisi." });
  }
  const existing = sheetToObjects(SHEET_SISWA).find(s => String(s.nis) === String(p.nis));
  if (existing) return jsonResponse({ success: false, message: "NIS sudah terdaftar." });

  const sheet = getSS().getSheetByName(SHEET_SISWA);
  const id = generateId("S");
  sheet.appendRow([id, p.nis, p.nama, p.kelasId, p.jk || "L", p.namaOrtu || "", p.telepon || "", "aktif", new Date()]);

  // Buat baris saldo awal = 0
  const saldoSheet = getSS().getSheetByName(SHEET_SALDO);
  saldoSheet.appendRow([p.nis, p.nama, p.kelasId, 0, new Date()]);

  logAktivitas("system", "TAMBAH_SISWA", "Menambahkan siswa baru: " + p.nama + " (" + p.nis + ")");
  return jsonResponse({ success: true, message: "Siswa berhasil ditambahkan.", data: { id } });
}

function apiUpdateSiswa(p) {
  if (!p.id) return jsonResponse({ success: false, message: "ID siswa wajib diisi." });
  const sheet = getSS().getSheetByName(SHEET_SISWA);
  const found = cariBarisById(sheet, "id", p.id);
  if (!found) return jsonResponse({ success: false, message: "Siswa tidak ditemukan." });

  const { rowIndex, headers } = found;
  const updateField = (name, value) => {
    if (value === undefined || value === null || value === "") return;
    const col = headers.indexOf(name) + 1;
    if (col > 0) sheet.getRange(rowIndex, col).setValue(value);
  };
  updateField("nis", p.nis);
  updateField("nama", p.nama);
  updateField("kelasId", p.kelasId);
  updateField("jk", p.jk);
  updateField("namaOrtu", p.namaOrtu);
  updateField("telepon", p.telepon);
  updateField("status", p.status);

  // Sinkronkan nama/kelas di sheet Saldo juga
  if (p.nis) {
    const saldoSheet = getSS().getSheetByName(SHEET_SALDO);
    const foundSaldo = cariBarisById(saldoSheet, "nis", p.nis);
    if (foundSaldo && p.nama) saldoSheet.getRange(foundSaldo.rowIndex, foundSaldo.headers.indexOf("namaSiswa") + 1).setValue(p.nama);
    if (foundSaldo && p.kelasId) saldoSheet.getRange(foundSaldo.rowIndex, foundSaldo.headers.indexOf("kelasId") + 1).setValue(p.kelasId);
  }

  logAktivitas("system", "UPDATE_SISWA", "Memperbarui data siswa: " + p.id);
  return jsonResponse({ success: true, message: "Data siswa berhasil diperbarui." });
}

function apiHapusSiswa(p) {
  if (!p.id) return jsonResponse({ success: false, message: "ID siswa wajib diisi." });
  const sheet = getSS().getSheetByName(SHEET_SISWA);
  const found = cariBarisById(sheet, "id", p.id);
  if (!found) return jsonResponse({ success: false, message: "Siswa tidak ditemukan." });

  sheet.deleteRow(found.rowIndex);
  logAktivitas("system", "HAPUS_SISWA", "Menghapus siswa: " + p.id);
  return jsonResponse({ success: true, message: "Siswa berhasil dihapus." });
}

// ---------------------------------------------------------------------------
// KELAS
// ---------------------------------------------------------------------------
function apiGetKelas() {
  const kelasList = sheetToObjects(SHEET_KELAS);
  const siswaList = sheetToObjects(SHEET_SISWA);
  const saldoList = sheetToObjects(SHEET_SALDO);

  const hasil = kelasList.map(k => {
    const siswaKelas = siswaList.filter(s => String(s.kelasId) === String(k.id));
    const totalSaldo = siswaKelas.reduce((total, s) => {
      const saldoObj = saldoList.find(sd => String(sd.nis) === String(s.nis));
      return total + (saldoObj ? Number(saldoObj.saldo) : 0);
    }, 0);
    return {
      id: k.id,
      nama: k.nama,
      waliKelas: k.waliKelas,
      tingkat: k.tingkat,
      jumlahSiswa: siswaKelas.length,
      totalSaldo
    };
  });
  return jsonResponse({ success: true, data: hasil });
}

function apiTambahKelas(p) {
  if (!p.nama || !p.waliKelas) return jsonResponse({ success: false, message: "Nama kelas dan wali kelas wajib diisi." });
  const sheet = getSS().getSheetByName(SHEET_KELAS);
  const id = generateId("K");
  sheet.appendRow([id, p.nama, p.waliKelas, p.tingkat || "", new Date()]);
  logAktivitas("system", "TAMBAH_KELAS", "Menambahkan kelas baru: " + p.nama);
  return jsonResponse({ success: true, message: "Kelas berhasil ditambahkan.", data: { id } });
}

function apiUpdateKelas(p) {
  if (!p.id) return jsonResponse({ success: false, message: "ID kelas wajib diisi." });
  const sheet = getSS().getSheetByName(SHEET_KELAS);
  const found = cariBarisById(sheet, "id", p.id);
  if (!found) return jsonResponse({ success: false, message: "Kelas tidak ditemukan." });

  const { rowIndex, headers } = found;
  const updateField = (name, value) => {
    if (value === undefined || value === null || value === "") return;
    const col = headers.indexOf(name) + 1;
    if (col > 0) sheet.getRange(rowIndex, col).setValue(value);
  };
  updateField("nama", p.nama);
  updateField("waliKelas", p.waliKelas);
  updateField("tingkat", p.tingkat);

  logAktivitas("system", "UPDATE_KELAS", "Memperbarui kelas: " + p.id);
  return jsonResponse({ success: true, message: "Data kelas berhasil diperbarui." });
}

function apiHapusKelas(p) {
  if (!p.id) return jsonResponse({ success: false, message: "ID kelas wajib diisi." });
  const siswaTerkait = sheetToObjects(SHEET_SISWA).filter(s => String(s.kelasId) === String(p.id));
  if (siswaTerkait.length > 0) {
    return jsonResponse({ success: false, message: "Kelas tidak dapat dihapus karena masih memiliki siswa." });
  }
  const sheet = getSS().getSheetByName(SHEET_KELAS);
  const found = cariBarisById(sheet, "id", p.id);
  if (!found) return jsonResponse({ success: false, message: "Kelas tidak ditemukan." });

  sheet.deleteRow(found.rowIndex);
  logAktivitas("system", "HAPUS_KELAS", "Menghapus kelas: " + p.id);
  return jsonResponse({ success: true, message: "Kelas berhasil dihapus." });
}

// ---------------------------------------------------------------------------
// TRANSAKSI (SETORAN & PENARIKAN) + PERHITUNGAN SALDO
// ---------------------------------------------------------------------------
function apiGetTransaksi(p) {
  let data = sheetToObjects(SHEET_TRANSAKSI);

  if (p.nis) data = data.filter(t => String(t.nis) === String(p.nis));
  if (p.kelasId) data = data.filter(t => String(t.kelasId) === String(p.kelasId));
  if (p.jenis) data = data.filter(t => t.jenis === p.jenis);
  if (p.dari) data = data.filter(t => formatTanggalISO(t.tanggal) >= p.dari);
  if (p.sampai) data = data.filter(t => formatTanggalISO(t.tanggal) <= p.sampai);

  // Urutkan dari yang terbaru
  data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  data = data.map(t => ({ ...t, tanggal: formatTanggalISO(t.tanggal) }));

  return jsonResponse({ success: true, data });
}

function formatTanggalISO(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(value).slice(0, 10);
}

/** Mengambil saldo saat ini dari sheet Saldo (bukan dari input client) */
function getSaldoSiswa(nis) {
  const saldoList = sheetToObjects(SHEET_SALDO);
  const s = saldoList.find(x => String(x.nis) === String(nis));
  return s ? Number(s.saldo) : null;
}

function updateSaldoSiswa(nis, namaSiswa, kelasId, saldoBaru) {
  const sheet = getSS().getSheetByName(SHEET_SALDO);
  const found = cariBarisById(sheet, "nis", nis);
  if (found) {
    sheet.getRange(found.rowIndex, found.headers.indexOf("saldo") + 1).setValue(saldoBaru);
    sheet.getRange(found.rowIndex, found.headers.indexOf("updatedAt") + 1).setValue(new Date());
  } else {
    sheet.appendRow([nis, namaSiswa, kelasId, saldoBaru, new Date()]);
  }
}

function apiTambahSetoran(p) {
  if (!p.nis || !p.nominal || Number(p.nominal) <= 0) {
    return jsonResponse({ success: false, message: "NIS dan nominal setoran (harus > 0) wajib diisi." });
  }

  const siswa = sheetToObjects(SHEET_SISWA).find(s => String(s.nis) === String(p.nis));
  if (!siswa) return jsonResponse({ success: false, message: "NIS siswa tidak terdaftar." });

  const saldoSebelum = getSaldoSiswa(p.nis) || 0;
  const nominal = Number(p.nominal);
  const saldoSetelah = saldoSebelum + nominal;

  const id = p.id || generateId("SETOR");
  const trxSheet = getSS().getSheetByName(SHEET_TRANSAKSI);
  trxSheet.appendRow([
    id, p.tanggal || new Date(), p.nis, p.namaSiswa || siswa.nama, p.kelasId || siswa.kelasId,
    p.namaKelas || "", "setoran", nominal, saldoSebelum, saldoSetelah,
    p.keterangan || "", p.petugas || "system", new Date()
  ]);

  updateSaldoSiswa(p.nis, p.namaSiswa || siswa.nama, p.kelasId || siswa.kelasId, saldoSetelah);
  logAktivitas(p.petugas || "system", "SETORAN", `Setoran ${nominal} untuk NIS ${p.nis}`);

  return jsonResponse({ success: true, message: "Setoran berhasil dicatat.", data: { id, saldoAkhir: saldoSetelah } });
}

function apiTambahPenarikan(p) {
  if (!p.nis || !p.nominal || Number(p.nominal) <= 0) {
    return jsonResponse({ success: false, message: "NIS dan nominal penarikan (harus > 0) wajib diisi." });
  }

  const siswa = sheetToObjects(SHEET_SISWA).find(s => String(s.nis) === String(p.nis));
  if (!siswa) return jsonResponse({ success: false, message: "NIS siswa tidak terdaftar." });

  const saldoSebelum = getSaldoSiswa(p.nis) || 0;
  const nominal = Number(p.nominal);

  // VALIDASI KRITIS: saldo tidak boleh minus. Dihitung ulang di server, bukan percaya nilai dari client.
  if (nominal > saldoSebelum) {
    return jsonResponse({ success: false, message: "Nominal penarikan melebihi saldo siswa saat ini (" + saldoSebelum + ")." });
  }

  const saldoSetelah = saldoSebelum - nominal;
  const id = p.id || generateId("TARIK");
  const trxSheet = getSS().getSheetByName(SHEET_TRANSAKSI);
  trxSheet.appendRow([
    id, p.tanggal || new Date(), p.nis, p.namaSiswa || siswa.nama, p.kelasId || siswa.kelasId,
    p.namaKelas || "", "penarikan", nominal, saldoSebelum, saldoSetelah,
    p.keterangan || "", p.petugas || "system", new Date()
  ]);

  updateSaldoSiswa(p.nis, p.namaSiswa || siswa.nama, p.kelasId || siswa.kelasId, saldoSetelah);
  logAktivitas(p.petugas || "system", "PENARIKAN", `Penarikan ${nominal} untuk NIS ${p.nis}`);

  return jsonResponse({ success: true, message: "Penarikan berhasil dicatat.", data: { id, saldoAkhir: saldoSetelah } });
}

// ---------------------------------------------------------------------------
// SALDO
// ---------------------------------------------------------------------------
function apiGetSaldo(p) {
  let data = sheetToObjects(SHEET_SALDO);
  if (p.nis) data = data.filter(s => String(s.nis) === String(p.nis));
  return jsonResponse({ success: true, data });
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
function apiGetDashboard() {
  const siswaList = sheetToObjects(SHEET_SISWA);
  const saldoList = sheetToObjects(SHEET_SALDO);
  const kelasList = sheetToObjects(SHEET_KELAS);
  const trxList = sheetToObjects(SHEET_TRANSAKSI).map(t => ({ ...t, tanggal: formatTanggalISO(t.tanggal) }));

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const firstDayOfMonth = Utilities.formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), Session.getScriptTimeZone(), "yyyy-MM-dd");

  const totalSiswa = siswaList.length;
  const totalSaldo = saldoList.reduce((a, s) => a + Number(s.saldo), 0);

  const setoranHariIni = trxList.filter(t => t.jenis === "setoran" && t.tanggal === today).reduce((a, t) => a + Number(t.nominal), 0);
  const penarikanHariIni = trxList.filter(t => t.jenis === "penarikan" && t.tanggal === today).reduce((a, t) => a + Number(t.nominal), 0);
  const setoranBulanIni = trxList.filter(t => t.jenis === "setoran" && t.tanggal >= firstDayOfMonth).reduce((a, t) => a + Number(t.nominal), 0);
  const penarikanBulanIni = trxList.filter(t => t.jenis === "penarikan" && t.tanggal >= firstDayOfMonth).reduce((a, t) => a + Number(t.nominal), 0);

  // Grafik 7 hari terakhir
  const grafikHarian = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const tgl = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    grafikHarian.push({
      tanggal: Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM"),
      setoran: trxList.filter(t => t.jenis === "setoran" && t.tanggal === tgl).reduce((a, t) => a + Number(t.nominal), 0),
      penarikan: trxList.filter(t => t.jenis === "penarikan" && t.tanggal === tgl).reduce((a, t) => a + Number(t.nominal), 0)
    });
  }

  // Saldo per kelas
  const saldoPerKelas = kelasList.map(k => {
    const siswaKelas = siswaList.filter(s => String(s.kelasId) === String(k.id));
    const total = siswaKelas.reduce((a, s) => {
      const so = saldoList.find(x => String(x.nis) === String(s.nis));
      return a + (so ? Number(so.saldo) : 0);
    }, 0);
    return { kelas: k.nama, saldo: total };
  });

  // Transaksi terbaru (5 terakhir)
  const transaksiTerbaru = trxList
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  // Siswa dengan aktivitas terbaru (berdasarkan transaksi terbaru, unik per siswa)
  const nisUnik = [...new Set(transaksiTerbaru.map(t => t.nis))];
  const siswaAktivitasTerbaru = nisUnik.slice(0, 5).map(nis => {
    const s = siswaList.find(x => String(x.nis) === String(nis));
    const so = saldoList.find(x => String(x.nis) === String(nis));
    const kelas = kelasList.find(k => String(k.id) === String(s ? s.kelasId : ""));
    return { nama: s ? s.nama : nis, nis, kelas: kelas ? kelas.nama : "-", saldo: so ? Number(so.saldo) : 0 };
  });

  return jsonResponse({
    success: true,
    data: {
      totalSiswa, totalSaldo, setoranHariIni, penarikanHariIni, setoranBulanIni, penarikanBulanIni,
      grafikHarian, saldoPerKelas, transaksiTerbaru, siswaAktivitasTerbaru
    }
  });
}

// ---------------------------------------------------------------------------
// PENGATURAN
// ---------------------------------------------------------------------------
function apiGetPengaturan() {
  const data = sheetToObjects(SHEET_PENGATURAN);
  const obj = {};
  data.forEach(row => obj[row.key] = row.value);
  return jsonResponse({ success: true, data: obj });
}

function apiUpdatePengaturan(p) {
  const sheet = getSS().getSheetByName(SHEET_PENGATURAN);
  const data = sheet.getDataRange().getValues();
  Object.keys(p).forEach(key => {
    if (key === "action") return;
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(p[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, p[key]]);
  });
  return jsonResponse({ success: true, message: "Pengaturan berhasil disimpan." });
}
