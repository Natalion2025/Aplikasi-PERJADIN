// File: e:\Belajar Coding _Programmer\aplikasi-perjadin\public\js\sidebar.js

// Pastikan objek App sudah ada, atau buat jika belum ada.
window.App = window.App || {};

// Definisikan fungsi inisialisasi hanya jika belum ada, untuk mencegah error redeklarasi
// jika skrip ini tidak sengaja dimuat lebih dari sekali.
if (!window.App.sidebarInitialized) {
    /**
     * Fungsi utama untuk menginisialisasi semua fungsionalitas sidebar.
     * Fungsi ini harus dipanggil SETELAH konten HTML sidebar dimuat ke dalam DOM.
     */
    App.initializeSidebar = () => {
        /**
         * Menginisialisasi fungsionalitas toggle untuk membuka/menutup sidebar.
         */
        const initializeSidebarToggle = () => {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebar-toggle'); // Tombol di header
            const sidebarClose = document.getElementById('sidebar-close');   // Tombol di sidebar

            if (!sidebar || !sidebarToggle || !sidebarClose) {
                console.warn('DIAGNOSTIK: Satu atau lebih elemen untuk toggle sidebar tidak ditemukan.');
                return;
            }

            const toggleSidebar = () => sidebar.classList.toggle('visible');

            sidebarToggle.addEventListener('click', toggleSidebar);
            sidebarClose.addEventListener('click', toggleSidebar);
        };

        /**
         * Menginisialisasi fungsionalitas dropdown untuk menu di dalam sidebar.
         */
        const initializeSidebarDropdown = () => {
            const settingsButton = document.getElementById('settings-button');
            const settingsSubmenu = document.getElementById('settings-submenu');
            const settingsArrow = document.getElementById('settings-arrow');

            if (!settingsButton || !settingsSubmenu || !settingsArrow) {
                // Bukan error kritis, halaman mungkin tidak memiliki menu ini.
                return;
            }

            settingsButton.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsSubmenu.classList.toggle('hidden');
                settingsArrow.classList.toggle('rotate-180');
            });
        };

        /**
         * Menginisialisasi tombol logout.
         */
        const initializeLogout = () => {
            const logoutButtons = document.querySelectorAll('#logout-button, #header-logout-button');
            if (logoutButtons === null || logoutButtons.length === 0) {
                console.warn('DIAGNOSTIK: Tombol atau class name untuk logout tidak ditemukan.');
                alert('Tombol logout/class name untuk tombol logout tidak ditemukan.');
                return;
            }
            const handleLogout = async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch('/api/auth/logout', { method: 'POST' });
                    if (response.ok) {
                        window.location.href = '/login';
                    } else {
                        console.error('Gagal melakukan logout.');
                        alert('Gagal melakukan logout. Silakan coba lagi.');
                    }
                } catch (error) {
                    console.error('Error saat logout:', error);
                    alert('Terjadi kesalahan. Silakan coba lagi.');
                }
            };

            logoutButtons.forEach(button => {
                button.addEventListener('click', handleLogout);
            });
        };

        // --- Logika Eksekusi Utama ---
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth >= 993 && sidebar) {
            sidebar.classList.add('visible');
        }

        initializeSidebarToggle();
        initializeSidebarDropdown();
        initializeLogout();
    };

    // Tandai bahwa modul sidebar telah di-setup untuk mencegah pemuatan ulang.
    window.App.sidebarInitialized = true;
}
