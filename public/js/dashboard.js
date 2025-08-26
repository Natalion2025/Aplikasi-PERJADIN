/**
 * Menampilkan notifikasi sementara pada elemen yang diberikan.
 * @param {HTMLElement} element - Elemen HTML untuk menampilkan notifikasi.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} [isError=false] - Set true jika ini adalah pesan error untuk styling.
 */
function showNotification(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
    element.classList.toggle('text-red-500', isError);
    element.classList.toggle('text-green-600', !isError);
    setTimeout(() => {
        element.textContent = '';
        element.classList.add('hidden');
    }, 5000);
}

// Fungsi untuk memuat data spesifik dashboard
const loadDashboardData = async () => {
    try {
        // Pilih elemen setelah komponen dijamin telah dimuat
        const userNameEl = document.getElementById('user-name');
        const totalPerjalananEl = document.getElementById('total-perjalanan');
        const perjalananBulanIniEl = document.getElementById('perjalanan-bulan-ini');

        // Jalankan kedua fetch secara paralel untuk efisiensi
        const [userResponse, statsResponse] = await Promise.all([
            fetch('/api/user/me'),
            fetch('/api/dashboard/stats')
        ]);

        // Handle otentikasi pengguna
        if (!userResponse.ok) {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
            return;
        }

        const user = await userResponse.json();
        if (userNameEl) {
            userNameEl.textContent = user.name;
        }

        // Handle statistik
        if (!statsResponse.ok) {
            throw new Error('Gagal memuat statistik dashboard.');
        }

        const stats = await statsResponse.json();
        if (totalPerjalananEl) totalPerjalananEl.textContent = stats.totalSpt ?? '0';
        if (perjalananBulanIniEl) perjalananBulanIniEl.textContent = stats.sptBulanIni ?? '0';

    } catch (error) {
        console.error('Gagal memuat data dashboard:', error);
        // Tampilkan pesan error di UI jika diperlukan
        const totalPerjalananEl = document.getElementById('total-perjalanan');
        const perjalananBulanIniEl = document.getElementById('perjalanan-bulan-ini');

        if (totalPerjalananEl) totalPerjalananEl.textContent = 'Error';
        if (perjalananBulanIniEl) perjalananBulanIniEl.textContent = 'Error';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Fungsi Inisialisasi Utama ---
    const init = async () => {
        try {
            // 1. Muat dan inisialisasi layout utama (header & sidebar)
            await window.App.loadLayout();

            // 2. Jalankan inisialisasi komponen setelah layout dimuat
            await Promise.all([
                window.App.initializeSidebar(),
                window.App.initializeSidebarDropdown()
            ]);

            // 3. Tandai navigasi aktif untuk halaman ini
            if (window.App.setActiveNav) {
                window.App.setActiveNav('nav-dashboard');
            }

            // 4. Muat data spesifik untuk halaman dashboard
            await loadDashboardData();

            console.log("DIAGNOSTIK: Dashboard berhasil diinisialisasi.");

        } catch (error) {
            console.error('Gagal menginisialisasi dashboard:', error);
        }
    };

    // Jalankan aplikasi
    init();
});