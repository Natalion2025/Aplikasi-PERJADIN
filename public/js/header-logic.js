document.addEventListener('DOMContentLoaded', () => {
    const searchFilter = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    // Fungsi untuk mengirimkan event localSearch
    const dispatchLocalSearch = (searchTerm) => {
        const event = new CustomEvent('localSearch', {
            detail: { query: searchTerm }
        });
        document.dispatchEvent(event);
        console.log(`[HEADER SEARCH] Dispatched 'localSearch' event with query: "${searchTerm}"`);
    };

    // Event listener untuk tombol pencarian
    searchButton.addEventListener('click', () => {
        const searchTerm = searchFilter.value.toLowerCase().trim();
        dispatchLocalSearch(searchTerm);
    });

    // Event listener untuk input pencarian (saat mengetik)
    searchFilter.addEventListener('input', () => {
        const searchTerm = this.value.toLowerCase().trim();
        // Hanya dispatch jika searchTerm tidak kosong untuk menghindari terlalu banyak request
        // atau biarkan dispatch jika searchTerm kosong untuk mereset tampilan
        dispatchLocalSearch(searchTerm);
    });

    // Focus pada search box saat halaman load
    window.addEventListener('load', function () {
        searchFilter.focus();
    });
});


/**
 * @typedef {object} UserProfile
 * @property {string} name - Nama lengkap pengguna.
 * @property {string} role - Peran pengguna (misalnya, 'admin', 'user').
 * @property {string|null} foto_profil - Path ke file foto profil, atau null.
 */

/**
 * Memperbarui elemen UI di header dengan data pengguna.
 * @param {object} user - Objek pengguna dengan properti name, role, dan foto_profil.
 * @param {UserProfile} user - Objek pengguna dengan properti name, role, dan foto_profil.
 */
function updateHeaderUI(user) {
    console.log('[HEADER] Memperbarui UI dengan data:', user);

    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.textContent = user.name || 'Pengguna';
    if (userRoleEl) userRoleEl.textContent = user.role || 'user';
    if (userAvatarEl) {
        // PERBAIKAN: Gunakan avatar pengguna atau gambar default yang konsisten jika tidak ada
        userAvatarEl.src = user.foto_profil ? `/${user.foto_profil}` : '/img/default-avatar.png';
    }
}

/**
 * Menangani event 'avatarUpdated' untuk memperbarui avatar di header secara real-time.
 * @param {CustomEvent} e - Event yang dikirim dari halaman profil.
 */
function handleAvatarUpdate(e) {
    const { avatarUrl } = e.detail;
    const userAvatarEl = document.getElementById('user-avatar');
    if (userAvatarEl && avatarUrl) {
        // PERBAIKAN: Tambahkan '/' di depan URL agar menjadi path absolut dari root.
        // Ini untuk menyamakan dengan logika di updateHeaderUI dan mencegah error 404.
        userAvatarEl.src = `/${avatarUrl}?t=${new Date().getTime()}`;
    }
}

/**
 * Inisialisasi fungsionalitas header.
 * @param {UserProfile} user - Objek pengguna yang didapat dari `main1.js`.
 */
function initializeHeader(user) {
    console.log('[HEADER] Inisialisasi header...');

    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');

    if (userMenuButton && userMenu) {
        console.log('[HEADER] Menambahkan event listener untuk dropdown menu');

        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });

        // Tutup menu saat klik di luar
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        });

        // Cegah menu tertutup saat klik di dalam menu
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    } else {
        console.warn('[HEADER] Elemen atau ID untuk dropdown menu user tidak ditemukan');
    }

    // Perbarui UI header dengan data yang diterima dari `main1.js`
    updateHeaderUI(user);

    // Listen untuk update avatar
    document.addEventListener('avatarUpdated', handleAvatarUpdate);
}

// NOTE: Inisialisasi sekarang dipanggil secara manual oleh main1.js
// setelah komponen header berhasil dimuat untuk menghindari race condition.