document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-user-form');
    const roleSelect = document.getElementById('role');
    const notificationEl = document.getElementById('form-notification');

    if (!form) return;

    /**
     * Menampilkan notifikasi pada form.
     * @param {string} message - Pesan yang akan ditampilkan.
     * @param {boolean} isError - True jika notifikasi adalah error.
     */
    const showNotification = (message, isError = false) => {
        notificationEl.textContent = message;
        notificationEl.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
        if (isError) {
            notificationEl.classList.add('bg-red-100', 'text-red-700');
        } else {
            notificationEl.classList.add('bg-green-100', 'text-green-700');
        }
    };

    /**
     * Memuat daftar peran (roles) dari API dan mengisinya ke dalam dropdown.
     */
    const loadRoles = async () => {
        try {
            const response = await fetch('/api/roles');
            if (!response.ok) {
                throw new Error('Gagal memuat daftar peran.');
            }
            const roles = await response.json();

            // Ambil sesi untuk menentukan peran yang bisa dipilih
            const sessionRes = await fetch('/api/user/session');
            const sessionData = await sessionRes.json();
            const currentUserRole = sessionData.user.role;

            roleSelect.innerHTML = '<option value="">-- Pilih Peran --</option>';
            roles.forEach(role => {
                // Admin tidak bisa membuat Superadmin
                if (currentUserRole === 'admin' && role.value === 'superadmin') {
                    return;
                }
                const option = document.createElement('option');
                option.value = role.value;
                option.textContent = role.text;
                roleSelect.appendChild(option);
            });

        } catch (error) {
            showNotification(error.message, true);
        }
    };

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal menambah pengguna.');
            }

            alert('Pengguna baru berhasil ditambahkan!');
            window.location.href = '/pengguna'; // Redirect ke halaman daftar pengguna

        } catch (error) {
            showNotification(error.message, true);
            submitButton.disabled = false;
            submitButton.textContent = 'Tambah Pengguna';
        }
    });

    // Inisialisasi halaman
    loadRoles();
});