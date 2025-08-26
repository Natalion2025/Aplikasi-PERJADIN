document.addEventListener('DOMContentLoaded', () => {
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
                window.App.setActiveNav('nav-setelan-pengguna');
            }

            console.log("DIAGNOSTIK: Halaman setelan berhasil diinisialisasi.");

        } catch (error) {
            console.error("Gagal menginisialisasi halaman setelan:", error);
        }
    };

    init();
});