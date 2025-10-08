/**
 * Menampilkan notifikasi di halaman profil.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} [isError=false] - Set true jika ini adalah pesan error.
 */
function showProfileNotification(message, isError = false) {
    const notificationElement = document.getElementById('form-notification');
    if (!notificationElement) return;

    notificationElement.textContent = message;
    notificationElement.classList.remove('hidden', 'bg-red-100', 'bg-green-100', 'text-red-700', 'text-green-700', 'border', 'border-red-300', 'border-green-300', 'p-3', 'rounded');

    if (isError) {
        notificationElement.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-300', 'p-3', 'rounded');
    } else {
        notificationElement.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-300', 'p-3', 'rounded');
    }

    notificationElement.classList.remove('hidden');

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
                // PERBAIKAN: Gunakan path yang benar untuk foto profil
                avatarPreview.src = user.foto_profil ? `/${user.foto_profil}` : '/img/Gambarprofil.png';
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
 * Validasi form sebelum submit
 */
function validateForm(formData) {
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');

    // Validasi password
    if (newPassword || confirmPassword) {
        if (newPassword.length < 6) {
            return 'Password baru minimal harus 6 karakter.';
        }
        if (newPassword !== confirmPassword) {
            return 'Konfirmasi password tidak cocok.';
        }
    }

    // Validasi field wajib
    if (!formData.get('username') || !formData.get('nama_lengkap')) {
        return 'Username dan Nama Lengkap wajib diisi.';
    }

    return null;
}

/**
 * Menginisialisasi semua fungsionalitas di halaman profil.
 */
function initializeProfilePage() {
    console.log('[PROFIL] Inisialisasi halaman profil...');

    // PERBAIKAN: Menggunakan ID form yang benar
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
                // Validasi ukuran file (maks 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showProfileNotification('Ukuran file terlalu besar. Maksimal 5MB.', true);
                    fileInput.value = '';
                    return;
                }

                // Validasi tipe file
                if (!file.type.startsWith('image/')) {
                    showProfileNotification('Hanya file gambar yang diizinkan.', true);
                    fileInput.value = '';
                    return;
                }

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
            console.log('[PROFIL] Form submitted');

            const formData = new FormData(profileForm);

            // PERBAIKAN: Validasi menggunakan formData yang sudah ada
            const validationError = validateForm(formData);
            if (validationError) {
                showProfileNotification(validationError, true);
                return;
            }

            // PERBAIKAN: Tambahkan loading state
            const submitButton = profileForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Menyimpan...';
            submitButton.disabled = true;

            try {
                console.log('[PROFIL] Mengirim data ke server...');
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    body: formData,
                });

                const result = await response.json();
                console.log('[PROFIL] Response dari server:', result);

                if (!response.ok) {
                    throw new Error(result.message || `Gagal menyimpan perubahan. Status: ${response.status}`);
                }

                showProfileNotification('Profil berhasil diperbarui!', false);

                // Muat ulang data sesi yang sudah diperbarui di server
                try {
                    const sessionRes = await fetch('/api/user/session');
                    if (sessionRes.ok) {
                        const sessionData = await sessionRes.json();
                        const updatedUser = sessionData.user;

                        // Kirim event untuk memperbarui header secara real-time
                        if (updatedUser.foto_profil) {
                            const newAvatarUrl = updatedUser.foto_profil;
                            const event = new CustomEvent('avatarUpdated', { detail: { avatarUrl: newAvatarUrl } });
                            document.dispatchEvent(event);
                        }
                    }
                } catch (sessionError) {
                    console.warn('[PROFIL] Gagal memuat ulang sesi:', sessionError);
                }

                // Kosongkan field password
                document.getElementById('new_password').value = '';
                document.getElementById('confirm_password').value = '';

                // Muat ulang data profil
                await loadProfileData();

            } catch (error) {
                console.error('[PROFIL] Error saat menyimpan:', error);
                // PERBAIKAN: Tampilkan pesan error yang lebih informatif
                let errorMessage = error.message || 'Terjadi kesalahan yang tidak diketahui. Periksa koneksi Anda.';

                // Handle network errors
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
                }

                showProfileNotification(errorMessage, true);
            } finally {
                // PERBAIKAN: Reset loading state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    } else {
        console.error('[PROFIL] Form tidak ditemukan dengan ID: profile-form');
        showProfileNotification('Error: Form tidak ditemukan. Silakan refresh halaman.', true);
    }
}

// PERBAIKAN: Pastikan fungsi dijalankan setelah DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProfilePage);
} else {
    initializeProfilePage();
}