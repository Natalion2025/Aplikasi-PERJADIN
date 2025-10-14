const handleDeleteUser = async (event) => {
    const button = event.currentTarget;
    const userId = button.dataset.id;
    const userName = button.dataset.name;

    if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal menghapus pengguna.');
            }

            alert('Pengguna berhasil dihapus.'); // Notifikasi sederhana
            setupPage(); // Muat ulang daftar pengguna

        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error: ${error.message}`);
        }
    }
};

const setupPage = async () => {
    const userListBody = document.getElementById('user-list-body');
    const tambahPenggunaBtn = document.getElementById('tambah-pengguna-btn');
    if (!userListBody || !tambahPenggunaBtn) return;

    try {
        // Ambil sesi dan daftar pengguna secara paralel untuk efisiensi
        const [sessionRes, usersRes] = await Promise.all([
            fetch('/api/user/session'),
            fetch('/api/users')
        ]);

        if (!sessionRes.ok) throw new Error('Gagal memverifikasi sesi pengguna.');
        if (!usersRes.ok) throw new Error('Gagal memuat daftar pengguna.');

        const session = await sessionRes.json();
        const users = await usersRes.json();
        const currentUser = session.user;

        // Tampilkan tombol "Tambah Pengguna" untuk admin & superadmin
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
            tambahPenggunaBtn.classList.remove('hidden');
        }

        userListBody.innerHTML = ''; // Kosongkan isi tabel

        if (users.length === 0) {
            userListBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Tidak ada pengguna yang terdaftar.</td></tr>`;
            return;
        }

        users.forEach(targetUser => {
            let canEdit = false;
            let canDelete = false;

            // Tentukan hak akses berdasarkan peran
            if (currentUser.role === 'superadmin') {
                canEdit = true; // Superadmin bisa edit siapa saja
                if (targetUser.role !== 'superadmin' && targetUser.id !== currentUser.id) {
                    canDelete = true; // Superadmin bisa hapus admin & user, tapi bukan superadmin lain atau diri sendiri
                }
            } else if (currentUser.role === 'admin') {
                if (targetUser.role === 'user') {
                    canEdit = true;
                    canDelete = true; // Admin hanya bisa edit & hapus user
                }
            }

            const editHtml = canEdit ?
                `<a href="/edit-pengguna/${targetUser.id}" class="text-yellow-600 hover:text-yellow-800" title="Edit Pengguna"><i class="fas fa-edit"></i></a>` :
                `<span class="text-gray-400 cursor-not-allowed" title="Tidak dapat mengedit"><i class="fas fa-edit"></i></span>`;

            const deleteHtml = canDelete ?
                `<button data-id="${targetUser.id}" data-name="${targetUser.name}" class="delete-btn text-red-600 hover:text-red-800 ml-4" title="Hapus Pengguna"><i class="fas fa-trash"></i></button>` :
                `<span class="text-gray-400 cursor-not-allowed ml-4" title="Tidak dapat menghapus"><i class="fas fa-trash"></i></span>`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${targetUser.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500 dark:text-gray-400">${targetUser.username}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${targetUser.role === 'superadmin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : (targetUser.role === 'admin' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300')}">
                        ${targetUser.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    ${editHtml}
                    ${deleteHtml}
                </td>
            `;
            userListBody.appendChild(row);
        });

        // Tambahkan event listener ke semua tombol hapus yang baru dibuat
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteUser);
        });

    } catch (error) {
        console.error('Error:', error);
        userListBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
    }
};

// Ganti event listener di akhir file
document.addEventListener('DOMContentLoaded', () => {
    // Tunggu sampai layout selesai dimuat
    if (document.getElementById('user-list-body')) {
        setupPage();

        // Tandai navigasi aktif
        const navPengguna = document.getElementById('nav-pengguna');
        if (navPengguna) {
            navPengguna.setAttribute('aria-current', 'page');
            const settingsSubmenu = document.getElementById('settings-submenu');
            if (settingsSubmenu) {
                settingsSubmenu.classList.remove('hidden');
                const settingsArrow = document.getElementById('settings-arrow');
                if (settingsArrow) {
                    settingsArrow.classList.add('rotate-180');
                }
            }
        }
    }
});