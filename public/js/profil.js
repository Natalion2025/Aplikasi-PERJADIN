document.addEventListener('DOMContentLoaded', () => {
    // --- Fungsi Inisialisasi Utama untuk Halaman Profil ---
    const init = async () => {
        // 1. Muat dan inisialisasi layout utama (header & sidebar)
        await window.App.loadLayout();

        // 2. Jalankan inisialisasi komponen setelah layout dimuat
        requestAnimationFrame(() => {
            if (window.App.initializeSidebar) {
                window.App.initializeSidebar();
            }
            if (window.App.initializeSidebarDropdown) {
                window.App.initializeSidebarDropdown();
            }

            // 3. Tandai navigasi aktif untuk halaman ini
            // Ganti 'nav-profil' dengan ID yang sesuai di sidebar.html
            if (window.App.setActiveNav) {
                window.App.setActiveNav('nav-profil');
            }
        });

        // 4. Muat data spesifik untuk halaman profil (jika ada)
        // Contoh: await loadDataProfil();
    };

    // Jalankan aplikasi
    init();
});