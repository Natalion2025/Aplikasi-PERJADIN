document.addEventListener('DOMContentLoaded', function () {
    // --- Bagian Notifikasi ---
    const showNotification = (message, isError = false) => {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notifId = 'notif-' + Date.now();
        const bgColor = isError ? 'bg-red-500' : 'bg-green-500';

        const notification = document.createElement('div');
        notification.id = notifId;
        notification.className = `relative flex items-center p-4 text-white ${bgColor} rounded-lg shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0`;
        notification.innerHTML = `<div class="ml-3 text-sm font-medium">${message}</div>`;

        container.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        });

        setTimeout(() => {
            notification.classList.add('opacity-0');
            notification.addEventListener('transitionend', () => notification.remove(), { once: true });
        }, 5000);
    };

    // Fungsi untuk mengambil dan menampilkan data user
    const loadUserData = async () => {
        const userNameElement = document.getElementById('user-name');
        try {
            const response = await fetch('/api/user/me');
            if (response && response.ok) {
                const user = await response.json();
                if (userNameElement) userNameElement.textContent = user.name || 'Pengguna';
            } else if (response) {
                console.error('Sesi tidak valid, mengalihkan ke halaman login.');
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Terjadi kesalahan saat memuat data pengguna:', error);
            if (userNameElement) userNameElement.textContent = 'Error';
        }
    };

    // Fungsi untuk menangani submit form
    const handleSptSubmit = async (e) => {
        e.preventDefault();
        const sptForm = document.getElementById('spt-form');
        const simpanButton = sptForm.querySelector('button[type="submit"]');
        const originalButtonHTML = simpanButton.innerHTML;

        simpanButton.disabled = true;
        simpanButton.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Menyimpan...</span>`;

        const formData = new FormData(sptForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/spt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (response.ok) {
                showNotification('Data SPT berhasil disimpan!');
                sptForm.reset();
            } else {
                throw new Error(result.message || 'Gagal menyimpan SPT.');
            }
        } catch (error) {
            console.error('Terjadi kesalahan:', error);
            showNotification(`Error: ${error.message}`, true);
        } finally {
            simpanButton.disabled = false;
            simpanButton.innerHTML = originalButtonHTML;
        }
    };

    // --- Fungsi Inisialisasi Utama ---
    const init = async () => {
        // 1. Muat komponen dinamis (header & sidebar) menggunakan fungsi terpusat
        await window.App.loadLayout();

        // 2. Pasang event listener setelah layout dimuat
        requestAnimationFrame(() => {
            if (window.App.initializeSidebar) window.App.initializeSidebar();
            if (window.App.initializeSidebarDropdown) window.App.initializeSidebarDropdown();

            const sptForm = document.getElementById('spt-form');
            if (sptForm) {
                sptForm.addEventListener('submit', handleSptSubmit);
            }

            // 3. Tandai navigasi aktif
            if (window.App.setActiveNav) window.App.setActiveNav('nav-tambah-spt');
        });

        // 4. Muat data spesifik untuk halaman ini
        await loadUserData();
    };

    // Jalankan aplikasi
    init();
});