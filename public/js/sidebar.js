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

            if (!sidebar || !sidebarToggle) {
                console.warn('DIAGNOSTIK: Elemen sidebar atau tombol toggle tidak ditemukan.');
                return;
            }

            const toggleSidebar = () => sidebar.classList.toggle('visible');

            sidebarToggle.addEventListener('click', toggleSidebar);
            if (sidebarClose) {
                sidebarClose.addEventListener('click', () => sidebar.classList.remove('visible'));
            }
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

        /**
         * Menandai item menu yang aktif berdasarkan URL saat ini dan membuka submenu yang relevan.
         */
        const initializeActiveMenuItem = () => {
            const currentPath = window.location.pathname;
            // Mengambil semua link di dalam sidebar yang memiliki href
            const sidebarLinks = document.querySelectorAll('#sidebar a[href]');

            sidebarLinks.forEach(link => {
                // Pastikan link memiliki href dan bukan hanya '#' atau kosong
                if (!link.hasAttribute('href') || link.getAttribute('href') === '#') {
                    return; // Lewati link ini
                }

                // new URL() akan menyelesaikan URL relatif menjadi absolut, lalu kita ambil path-nya.
                // Ini cara yang andal untuk mendapatkan path yang bersih.
                const linkPath = new URL(link.href, window.location.origin).pathname;

                // Mencocokkan path saat ini dengan href link.
                // Menggunakan startsWith agar link '/dashboard' tetap aktif untuk path '/dashboard/details'
                // Pengecualian untuk path root '/' yang harus cocok persis.
                if ((linkPath !== '/' && currentPath.startsWith(linkPath)) || (currentPath === linkPath)) {
                    link.classList.add('active');

                    // Jika link aktif ada di dalam submenu, buka submenu tersebut.
                    // Ini mencari elemen parent dengan ID 'settings-submenu'.
                    const settingsButton = document.getElementById('settings-button');
                    const parentSubmenu = link.closest('#settings-submenu');
                    if (parentSubmenu) {
                        parentSubmenu.classList.remove('hidden');
                        settingsButton.classList.add('active', 'font-bold', 'bg-white/10', 'rounded-xl', 'px-6', 'py-2');

                        // Juga putar panah dropdown-nya.
                        const settingsArrow = document.getElementById('settings-arrow');
                        if (settingsArrow) {
                            settingsArrow.classList.add('rotate-180');
                        }
                    }
                }
            });
        };

        // --- Logika Eksekusi Utama ---
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth >= 993 && sidebar) {
            sidebar.classList.add('visible');
        }

        initializeActiveMenuItem();
        initializeSidebarToggle();
        initializeSidebarDropdown();
        initializeLogout();
    };

    // Tandai bahwa modul sidebar telah di-setup untuk mencegah pemuatan ulang.
    window.App.sidebarInitialized = true;
}
