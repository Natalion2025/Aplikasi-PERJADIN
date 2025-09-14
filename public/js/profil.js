/**
 * Menampilkan notifikasi di halaman profil.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} [isError=false] - Set true jika ini adalah pesan error.
 */
function showProfileNotification(message, isError = false) {
    const notificationElement = document.getElementById('form-notification');
    if (!notificationElement) return;

    notificationElement.textContent = message;
    notificationElement.classList.remove('hidden', 'bg-red-100', 'bg-green-100', 'text-red-700', 'text-green-700');

    if (isError) {
        notificationElement.classList.add('bg-red-100', 'text-red-700');
    } else {
        notificationElement.classList.add('bg-green-100', 'text-green-700');
    }

    setTimeout(() => {
        notificationElement.classList.add('hidden');
    }, 5000);
}

/**
 * Memuat data profil pengguna saat ini dan menampilkannya di form.
 */
async function loadProfileData() {
    try {
        console.log('[PROFIL] Memuat data profil...');
        const response = await fetch('/api/user/profile');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mengambil data profil.');
        }

        const data = await response.json();
        console.log('[PROFIL] Data profil:', data);

        if (data.user) {
            const user = data.user;

            // Gunakan ID yang benar dari profil.html
            const usernameInput = document.getElementById('username');
            const namaLengkapInput = document.getElementById('nama_lengkap');
            const nipInput = document.getElementById('nip');
            const jabatanInput = document.getElementById('jabatan');
            const roleInput = document.getElementById('role');
            const avatarPreview = document.getElementById('foto-preview');

            // Isi data ke elemen yang sesuai
            if (usernameInput) usernameInput.value = user.username || '';
            if (namaLengkapInput) namaLengkapInput.value = user.name || '';
            if (nipInput) nipInput.value = user.nip || '';
            if (jabatanInput) jabatanInput.value = user.jabatan || '';
            if (roleInput) roleInput.value = user.role || '';
            if (avatarPreview) {
                avatarPreview.src = user.foto_profil ? `/${user.foto_profil}` : '/img/default-avatar.png';
            }

            // Terapkan aturan UI: Hanya superadmin yang tidak bisa mengubah username-nya.
            if (user.role === 'superadmin') {
                if (usernameInput) {
                    usernameInput.readOnly = true;
                    usernameInput.classList.add('bg-slate-100', 'cursor-not-allowed');
                }
            }
        }
    } catch (error) {
        console.error('[PROFIL] Error saat memuat data:', error);
        showProfileNotification(error.message, true);
    }
}

/**
 * Menginisialisasi semua fungsionalitas di halaman profil.
 */
function initializeProfilePage() {
    console.log('[PROFIL] Inisialisasi halaman profil...');

    const profileForm = document.getElementById('profile-form');
    const fileInput = document.getElementById('foto_profil');
    const avatarPreview = document.getElementById('foto-preview');

    // 1. Muat data pengguna awal
    loadProfileData();

    // 2. Tambahkan listener untuk pratinjau gambar saat file dipilih
    if (fileInput && avatarPreview) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 3. Tambahkan listener untuk submit form
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(profileForm);
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;

            // Validasi password
            if (newPassword || confirmPassword) {
                if (newPassword.length < 6) {
                    showProfileNotification('Password baru minimal harus 6 karakter.', true);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showProfileNotification('Konfirmasi password tidak cocok.', true);
                    return;
                }
                formData.append('newPassword', newPassword);
            }

            try {
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Gagal menyimpan perubahan.');
                }

                showProfileNotification('Profil berhasil diperbarui!', false);

                // Kosongkan field password
                document.getElementById('new_password').value = '';
                document.getElementById('confirm_password').value = '';

                // Muat ulang data
                loadProfileData();

            } catch (error) {
                console.error('[PROFIL] Error saat menyimpan:', error);
                showProfileNotification(error.message, true);
            }
        });
    }
}

// Jalankan inisialisasi setelah DOM dimuat
initializeProfilePage();