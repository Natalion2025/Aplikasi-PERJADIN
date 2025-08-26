document.addEventListener('DOMContentLoaded', () => {
    // --- Fungsi Inisialisasi Utama untuk Halaman Setelan ---
    const init = async () => {
        // 1. Muat dan inisialisasi layout utama (header & sidebar)
        // Ini adalah langkah krusial yang harus selalu ada di setiap halaman.
        await window.App.loadLayout();

        // 2. Jalankan inisialisasi komponen setelah layout dimuat
        requestAnimationFrame(() => {
            // Inisialisasi fungsionalitas buka/tutup sidebar
            if (window.App.initializeSidebar) {
                window.App.initializeSidebar();
            }
            // Inisialisasi fungsionalitas dropdown di dalam sidebar
            if (window.App.initializeSidebarDropdown) {
                window.App.initializeSidebarDropdown();
            }

            // 3. Tandai navigasi aktif untuk halaman ini
            // Ganti 'nav-setelan' dengan ID yang sesuai di sidebar.html
            if (window.App.setActiveNav) {
                window.App.setActiveNav('nav-setelan');
            }
        });

        // 4. Muat data spesifik untuk halaman setelan (jika ada)
        // Contoh: await loadPengaturanPengguna();
    };

    // Jalankan aplikasi
    init();
});