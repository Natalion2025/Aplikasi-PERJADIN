/**
 * Memuat data pengguna dan menampilkannya di header.
 * Menggunakan data dari server via API.
 */
async function loadHeaderUserData() {
    try {
        console.log('[HEADER] Memuat data pengguna...');
        const response = await fetch('/api/user/session');

        if (!response.ok) {
            if (response.status === 401) {
                console.warn('[HEADER] Sesi tidak valid, redirect ke login');
                window.location.href = '/login';
                return;
            }
            throw new Error(`Gagal mengambil data sesi: ${response.status}`);
        }

        const session = await response.json();
        console.log('[HEADER] Data sesi:', session);

        if (session.user) {
            updateHeaderUI(session.user);
        } else {
            console.warn('[HEADER] Tidak ada data user dalam sesi');
        }
    } catch (error) {
        console.error('[HEADER] Error saat memuat data:', error);
        // Fallback ke data default
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        const userAvatarEl = document.getElementById('user-avatar');

        if (userNameEl) userNameEl.textContent = 'Pengguna';
        if (userRoleEl) userRoleEl.textContent = 'user';
        if (userAvatarEl) userAvatarEl.src = '/img/Gambarprofil.png';
    }
}

/**
 * Memperbarui elemen UI di header dengan data pengguna.
 * @param {object} user - Objek pengguna dengan properti name, role, dan foto_profil.
 */
function updateHeaderUI(user) {
    console.log('[HEADER] Memperbarui UI dengan data:', user);

    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.textContent = user.name || 'Pengguna';
    if (userRoleEl) userRoleEl.textContent = user.role || 'user';
    if (userAvatarEl) {
        // Gunakan avatar pengguna atau gambar default jika tidak ada
        userAvatarEl.src = user.foto_profil ? `/${user.foto_profil}` : '/img/Gambarprofil.png';
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
        userAvatarEl.src = `${avatarUrl}?t=${new Date().getTime()}`;
    }
}

/**
 * Inisialisasi fungsionalitas header.
 */
function initializeHeader() {
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
        console.warn('[HEADER] Elemen menu user tidak ditemukan');
    }

    // Muat data user
    loadHeaderUserData();

    // Listen untuk update avatar
    document.addEventListener('avatarUpdated', handleAvatarUpdate);
}

// NOTE: Inisialisasi sekarang dipanggil secara manual oleh main1.js
// setelah komponen header berhasil dimuat untuk menghindari race condition.