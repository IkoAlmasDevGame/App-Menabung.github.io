/**
 * app.js
 * Fungsi utilitas umum yang dipakai di seluruh halaman
 */

const APP = {
  /** Format angka menjadi Rupiah, mis. 150000 -> "Rp 150.000" */
  formatRupiah(angka) {
    const n = Number(angka) || 0;
    return "Rp " + n.toLocaleString("id-ID");
  },

  /** Format tanggal ISO menjadi format Indonesia, mis. 2026-09-17 -> 17 September 2026 */
  formatTanggal(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  },

  formatTanggalJam(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
      ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  },

  /** Generate ID transaksi unik, mis. TRX-20260917-XXXXX */
  generateTrxId(prefix = "TRX") {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${ymd}-${rand}`;
  },

  /** Tampilkan toast notifikasi kecil */
  toast(icon, title) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  },

  /** Tampilkan loading overlay SweetAlert2 */
  loading(title = "Memproses...") {
    Swal.fire({
      title,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
  },

  closeLoading() {
    Swal.close();
  },

  /** Badge status transaksi */
  badgeJenis(jenis) {
    if (jenis === "setoran") return `<span class="badge bg-success">Setoran</span>`;
    if (jenis === "penarikan") return `<span class="badge bg-danger">Penarikan</span>`;
    return `<span class="badge bg-secondary">${jenis}</span>`;
  },

  /** Render sidebar aktif berdasarkan halaman saat ini */
  setActiveNav() {
    const page = window.location.pathname.split("/").pop();
    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
      if (link.getAttribute("href") === page) {
        link.classList.add("active");
      }
    });
  },

  /** Inisialisasi umum tiap halaman: cek login, tampilkan info user, aktifkan nav */
  initPage(allowedRoles = null) {
    if (allowedRoles) {
      AUTH.requireRole(allowedRoles);
    } else {
      AUTH.requireLogin();
    }
    AUTH.applyRoleVisibility();
    this.setActiveNav();
    const logoutBtn = document.getElementById("btnLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        Swal.fire({
          title: "Keluar dari aplikasi?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Ya, Keluar",
          cancelButtonText: "Batal",
          confirmButtonColor: "#0d6efd"
        }).then(result => {
          if (result.isConfirmed) AUTH.logout();
        });
      });
    }
  },

  /** Debounce sederhana untuk input search */
  debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
};
