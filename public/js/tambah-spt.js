// Fungsi untuk menampilkan notifikasi
function showNotification(message, isError = false) {
    // Buat elemen notifikasi sederhana
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${isError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Fungsi untuk memuat data user
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

document.addEventListener('DOMContentLoaded', () => {
    const init = async () => {
        try {
            // Tunggu header dan sidebar selesai dimuat
            await new Promise(resolve => setTimeout(resolve, 500));

            // Muat data user
            await loadUserData();

            // Tandai navigasi aktif
            const navTambahSpt = document.getElementById('nav-tambah-spt');
            if (navTambahSpt) {
                navTambahSpt.classList.add('bg-blue-700');
            }

            console.log("Halaman tambah SPT berhasil diinisialisasi.");

        } catch (error) {
            console.error("Gagal menginisialisasi halaman tambah SPT:", error);
        }
    };

    init();
});