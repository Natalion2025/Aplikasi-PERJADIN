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
    element.classList.remove('text-red-500', 'text-green-600', 'bg-red-100', 'bg-green-100');
    if (isError) {
        element.classList.add('text-red-500', 'bg-red-100');
    } else {
        element.classList.add('text-green-600', 'bg-green-100');
    }
}

const getUserIdFromUrl = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
};

const loadUserDataAndRoles = async () => {
    const userId = getUserIdFromUrl();
    const notificationEl = document.getElementById('form-notification');

    try {
        // Ambil data pengguna dan peran secara paralel
        const [userRes, rolesRes, sessionRes] = await Promise.all([
            fetch(`/api/users/${userId}`),
            fetch('/api/roles'),
            fetch('/api/user/session')
        ]);

        if (!userRes.ok) throw new Error('Gagal memuat data pengguna.');
        if (!rolesRes.ok) throw new Error('Gagal memuat daftar peran.');
        if (!sessionRes.ok) throw new Error('Gagal memuat sesi.');

        const user = await userRes.json();
        const roles = await rolesRes.json();
        const session = await sessionRes.json();
        const currentUserRole = session.user.role;

        // Isi form dengan data pengguna
        document.getElementById('name').value = user.name;
        document.getElementById('username').value = user.username;

        // Isi dan filter dropdown peran
        const roleSelect = document.getElementById('role');
        roleSelect.innerHTML = '';
        roles.forEach(role => {
            // Admin tidak bisa menetapkan peran 'admin' atau 'superadmin'
            if (currentUserRole === 'admin' && (role.value === 'admin' || role.value === 'superadmin')) {
                return;
            }
            const option = document.createElement('option');
            option.value = role.value;
            option.textContent = role.text;
            if (role.value === user.role) {
                option.selected = true;
            }
            roleSelect.appendChild(option);
        });

    } catch (error) {
        showNotification(notificationEl, error.message, true);
    }
};

const handleFormSubmit = async (event) => {
    event.preventDefault();
    const userId = getUserIdFromUrl();
    const form = document.getElementById('edit-user-form');
    const notificationEl = document.getElementById('form-notification');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Hanya kirim password jika diisi
    if (!data.password || data.password.trim() === '') {
        delete data.password;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Gagal menyimpan perubahan.');
        }

        showNotification(notificationEl, 'Perubahan berhasil disimpan. Mengalihkan...', false);
        setTimeout(() => {
            window.location.href = '/pengguna';
        }, 2000);

    } catch (error) {
        showNotification(notificationEl, error.message, true);
    }
};

document.addEventListener('layout-loaded', () => {
    loadUserDataAndRoles();

    const form = document.getElementById('edit-user-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});