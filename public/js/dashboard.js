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
        const totalPerjalananEl = document.getElementById('total-perjalanan');
        const perjalananBulanIniEl = document.getElementById('perjalanan-bulan-ini');

        // Ambil data statistik dashboard
        const statsResponse = await fetch('/api/dashboard/stats');

        // Handle statistik
        if (!statsResponse.ok) {
            throw new Error('Gagal memuat statistik dashboard.');
        }

        const stats = await statsResponse.json();
        if (totalPerjalananEl) totalPerjalananEl.textContent = stats.totalPerjalanan ?? '0';
        if (perjalananBulanIniEl) perjalananBulanIniEl.textContent = stats.perjalananBulanIni ?? '0';

    } catch (error) {
        console.error('Gagal memuat data dashboard:', error);
        // Tampilkan pesan error di UI jika diperlukan
        const totalPerjalananEl = document.getElementById('total-perjalanan');
        const perjalananBulanIniEl = document.getElementById('perjalanan-bulan-ini');

        if (totalPerjalananEl) totalPerjalananEl.textContent = 'Error';
        if (perjalananBulanIniEl) perjalananBulanIniEl.textContent = 'Error';
    }
};

// Panggil fungsi utama secara langsung.
// Skrip ini sekarang dimuat oleh main1.js setelah DOM dan sesi siap.
loadDashboardData();