document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const notification = document.getElementById('notification');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Mencegah form submit standar

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok) {
                    // Jika login berhasil dan server memberikan URL redirect
                    if (result.redirectTo) {
                        window.location.href = result.redirectTo;
                    } else {
                        // Fallback jika redirectTo tidak ada
                        window.location.href = '/dashboard';
                    }
                } else {
                    // Tampilkan pesan error dari server
                    if (notification) {
                        notification.textContent = result.message || 'Terjadi kesalahan.';
                        notification.classList.remove('hidden');
                        notification.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                if (notification) {
                    notification.textContent = 'Tidak dapat terhubung ke server.';
                    notification.classList.remove('hidden');
                    notification.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
                }
            }
        });
    }
});