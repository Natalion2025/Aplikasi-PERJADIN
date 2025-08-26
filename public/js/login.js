document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (!loginForm) {
        console.error('Elemen form dengan ID "login-form" tidak ditemukan.');
        return;
    }

    const loginButton = loginForm.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('error-message');

    if (!loginButton) {
        console.error('Tombol submit di dalam form login tidak ditemukan.');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.classList.add('hidden');
        }

        // Tambahkan status loading pada tombol
        const originalButtonText = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = `<span class="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full inline-block"></span> Loading...`;

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                window.location.href = '/dashboard';
                return; // Hentikan eksekusi agar tombol tidak di-reset saat redirect berhasil
            } else {
                let errorMsg = 'Terjadi kesalahan. Silakan coba lagi.';
                // Coba parse respons galat sebagai JSON
                try {
                    const result = await response.json();
                    errorMsg = result.message || errorMsg;
                } catch (e) {
                    // Jika respons bukan JSON, gunakan status text
                    errorMsg = `Error: ${response.status} - ${response.statusText || 'Gagal memproses respons server.'}`;
                }

                if (errorMessage) {
                    errorMessage.textContent = errorMsg;
                    errorMessage.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Login request failed:', error);
            if (errorMessage) {
                errorMessage.textContent = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan pastikan server (nodemon) sedang berjalan.';
                errorMessage.classList.remove('hidden');
            }
        } finally {
            // Kembalikan tombol ke keadaan semula setelah selesai
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonText;
        }
    });
});