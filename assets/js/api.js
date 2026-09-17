const API_CONFIG = {
  API_URL:
    'https://script.google.com/macros/s/AKfycbw2i1kwNdnwBR8ZKcI1Ydk0oZpmsoLmWXpwdG6JJlCtyNWLCEjsVIFu-dPRgJrBvfvUiQ/exec',
}

const API = {
  /**
   * Melakukan request GET ke Apps Script.
   * @param {string} action - nama endpoint, mis. "getSiswa"
   * @param {object} params - query params tambahan
   */
  async get(action, params = {}) {
    const url = new URL(API_CONFIG.API_URL)
    url.searchParams.set('action', action)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    try {
      const res = await fetch(url.toString(), { method: 'GET' })
      const json = await res.json()
      if (!json.success)
        throw new Error(json.message || 'Terjadi kesalahan pada server')
      return json
    } catch (err) {
      this._handleError(err)
      throw err
    }
  },

  /**
   * Melakukan request POST ke Apps Script.
   * Apps Script Web App menerima POST sebagai text/plain (menghindari CORS preflight),
   * sehingga body dikirim sebagai JSON string di dalam form field.
   * @param {string} action - nama endpoint, mis. "tambahSiswa"
   * @param {object} data - payload data
   */
  async post(action, data = {}) {
    try {
      const res = await fetch(API_CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...data }),
      })
      const json = await res.json()
      if (!json.success)
        throw new Error(json.message || 'Terjadi kesalahan pada server')
      return json
    } catch (err) {
      this._handleError(err)
      throw err
    }
  },

  _handleError(err) {
    console.error('API Error:', err)
    Swal.fire({
      icon: 'error',
      title: 'Gagal Terhubung',
      text:
        err.message ||
        'Tidak dapat terhubung ke server. Periksa koneksi atau URL API.',
      confirmButtonColor: '#0d6efd',
    })
  },

  // ---------- Shortcut endpoints ----------
  login: (username, passwordHash) =>
    API.post('login', { username, password: passwordHash }),

  getUsers: () => API.get('getUsers'),
  tambahUser: (data) => API.post('tambahUser', data),
  updateUser: (data) => API.post('updateUser', data),

  getSiswa: (params) => API.get('getSiswa', params),
  tambahSiswa: (data) => API.post('tambahSiswa', data),
  updateSiswa: (data) => API.post('updateSiswa', data),
  hapusSiswa: (id) => API.post('hapusSiswa', { id }),

  getKelas: () => API.get('getKelas'),
  tambahKelas: (data) => API.post('tambahKelas', data),
  updateKelas: (data) => API.post('updateKelas', data),
  hapusKelas: (id) => API.post('hapusKelas', { id }),

  getTransaksi: (params) => API.get('getTransaksi', params),
  tambahSetoran: (data) => API.post('tambahSetoran', data),
  tambahPenarikan: (data) => API.post('tambahPenarikan', data),

  getSaldo: (params) => API.get('getSaldo', params),
  getDashboard: () => API.get('getDashboard'),
}
