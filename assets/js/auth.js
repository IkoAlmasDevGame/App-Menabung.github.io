/**
 * auth.js
 * Mengelola autentikasi & session pengguna (App Sekolah Menabung)
 * Session disimpan di sessionStorage (bisa diganti localStorage jika ingin "remember me")
 */

const AUTH = {
  SESSION_KEY: "asm_session",

  /** Simpan sesi user setelah login berhasil */
  setSession(user) {
    const session = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role, // admin | petugas | walikelas | siswa
      nis: user.nis || null,
      kelasId: user.kelasId || null,
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  /** Ambil data sesi aktif */
  getSession() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** Cek apakah user sudah login */
  isLoggedIn() {
    return !!this.getSession();
  },

  /** Logout & hapus sesi */
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.href = "login.html";
  },

  /** Wajib login untuk mengakses halaman ini. Panggil di setiap halaman (kecuali login.html) */
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
    }
  },

  /**
   * Batasi akses halaman berdasarkan role.
   * @param {string[]} allowedRoles - contoh: ["admin","petugas"]
   */
  requireRole(allowedRoles) {
    this.requireLogin();
    const session = this.getSession();
    if (!allowedRoles.includes(session.role)) {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Anda tidak memiliki izin untuk mengakses halaman ini.",
        confirmButtonColor: "#0d6efd"
      }).then(() => {
        window.location.href = "dashboard.html";
      });
    }
  },

  /** Tampilkan/sembunyikan elemen menu berdasarkan role (elemen diberi atribut data-role="admin,petugas") */
  applyRoleVisibility() {
    const session = this.getSession();
    if (!session) return;
    document.querySelectorAll("[data-role]").forEach(el => {
      const roles = el.getAttribute("data-role").split(",").map(r => r.trim());
      if (!roles.includes(session.role)) {
        el.style.display = "none";
      }
    });
    document.querySelectorAll(".user-display-name").forEach(el => el.textContent = session.nama);
    document.querySelectorAll(".user-display-role").forEach(el => el.textContent = ROLE_LABEL[session.role] || session.role);
  }
};

const ROLE_LABEL = {
  admin: "Administrator",
  petugas: "Petugas Tabungan",
  walikelas: "Wali Kelas",
  siswa: "Siswa"
};

// Simple hashing helper (client-side, agar password tidak plaintext saat dikirim).
// Catatan: ini BUKAN pengganti hashing server-side yang aman (mis. bcrypt),
// namun mencegah password terlihat polos di request/log sederhana.
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
