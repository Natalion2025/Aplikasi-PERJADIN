/**
 * Script untuk mengelola notifikasi pada header.
 * Menampilkan jumlah SPT yang masih berjalan/belum dilaporkan untuk user yang login.
 */
(function () {
    // Fungsi inisialisasi yang menunggu elemen header tersedia
    function initNotification() {
        const badge = document.getElementById('notification-badge');
        const icon = document.getElementById('notifications');

        // Jika elemen belum ada (karena header dimuat dinamis), coba lagi nanti
        if (!badge || !icon) {
            setTimeout(initNotification, 500);
            return;
        }

        fetchNotificationCount(badge, icon);
    }

    // Fungsi mengambil data dari backend
    async function fetchNotificationCount(badge, icon) {
        try {
            // Endpoint ini harus mengembalikan JSON: { count: <jumlah> }
            // Logika Backend: Hitung SPT dimana (status != 'selesai' OR belum ada di tabel laporan) AND pelaksana_id = current_user
            const response = await fetch('/api/spt/active-count');

            if (response.ok) {
                const data = await response.json();
                const count = data.count || 0;

                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                    icon.title = `Anda memiliki ${count} Surat Tugas yang belum dilaporkan`;
                } else {
                    badge.classList.add('hidden');
                    icon.title = 'Tidak ada notifikasi baru';
                }
            }
        } catch (error) {
            console.warn('[Notifikasi] Gagal memuat data notifikasi:', error);
        }
    }

    // Jalankan saat DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotification);
    } else {
        initNotification();
    }
})();