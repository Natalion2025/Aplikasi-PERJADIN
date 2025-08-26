document.addEventListener('DOMContentLoaded', () => {
    // --- Deklarasi Variabel ---
    let userNameDisplay, editProfileModal, openModalButton, closeModalButton, cancelModalButton,
        displayName, displayNip, displayJabatan, displayGolongan, displayUsername,
        profileForm, nameInput, nipInput, jabatanInput, golonganInput, usernameInput,
        passwordInput, successMessage, errorMessage;

    // --- Fungsi Helper ---
    function updateProfileDisplays(user) {
        if (userNameDisplay) userNameDisplay.textContent = user.name || '';
        if (displayName) displayName.textContent = user.name || '-';
        if (displayNip) displayNip.textContent = user.nip || '-';
        if (displayJabatan) displayJabatan.textContent = user.jabatan || '-';
        if (displayGolongan) displayGolongan.textContent = user.golongan || '-';
        if (displayUsername) displayUsername.textContent = user.username || '-';
    }

    function showNotification(element, message, isError = false) {
        if (!element) return;
        element.textContent = message;
        element.className = isError ? 'text-red-500 text-sm' : 'text-green-600 text-sm';
        setTimeout(() => {
            element.textContent = '';
        }, 4000);
    }

    // Kontrol Modal
    function openModal() {
        if (editProfileModal) {
            editProfileModal.classList.remove('hidden');
            editProfileModal.classList.add('flex', 'items-center', 'justify-center');
        }
    }

    function closeModal() {
        if (editProfileModal) {
            editProfileModal.classList.add('hidden');
            editProfileModal.classList.remove('flex', 'items-center', 'justify-center');
        }
    }

    // Ambil data profil dan isi form
    const fetchAndDisplayProfile = async () => {
        try {
            const response = await fetch('/api/user/me');
            if (!response.ok) {
                await fetch('/logout', { method: 'POST' });
                window.location.href = '/login';
                return;
            }
            const user = await response.json();

            updateProfileDisplays(user);

            if (nameInput) nameInput.value = user.name || '';
            if (nipInput) nipInput.value = user.nip || '';
            if (jabatanInput) jabatanInput.value = user.jabatan || '';
            if (golonganInput) golonganInput.value = user.golongan || '';
            if (usernameInput) usernameInput.value = user.username || '';

        } catch (error) {
            console.error('Gagal memuat data profil:', error);
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login';
        }
    };

    // Handle submit form profil
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (successMessage) successMessage.textContent = '';
        if (errorMessage) errorMessage.textContent = '';

        const body = {
            name: nameInput.value,
            nip: nipInput.value,
            jabatan: jabatanInput.value,
            golongan: golonganInput.value,
        };

        const password = passwordInput.value;
        if (password) {
            body.password = password;
        }

        try {
            const response = await fetch('/api/user/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const contentType = response.headers.get('content-type');
            if (!response.ok) {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Terjadi kesalahan saat menyimpan profil.');
                } else {
                    throw new Error(`Gagal menyimpan. Sesi Anda mungkin telah berakhir, silakan login kembali.`);
                }
            }

            const result = await response.json();

            showNotification(successMessage, result.message || 'Profil berhasil diperbarui!');
            updateProfileDisplays(body);

            passwordInput.value = '';
            closeModal();

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(errorMessage, error.message, true);
        }
    };

    // --- Fungsi Inisialisasi Utama ---
    const init = async () => {
        try {
            // 1. Muat komponen dinamis (header & sidebar)
            await window.App.loadLayout();

            // 2. Inisialisasi sidebar dan dropdown
            await Promise.all([
                window.App.initializeSidebar(),
                window.App.initializeSidebarDropdown()
            ]);

            // 3. Pilih semua elemen DOM setelah komponen dimuat
            userNameDisplay = document.getElementById('user-name');
            editProfileModal = document.getElementById('edit-profile-modal');
            openModalButton = document.getElementById('open-modal-button');
            closeModalButton = document.getElementById('close-modal-button');
            cancelModalButton = document.getElementById('cancel-modal-button');
            displayName = document.getElementById('display-name');
            displayNip = document.getElementById('display-nip');
            displayJabatan = document.getElementById('display-jabatan');
            displayGolongan = document.getElementById('display-golongan');
            displayUsername = document.getElementById('display-username');
            profileForm = document.getElementById('profile-form');
            nameInput = document.getElementById('name');
            nipInput = document.getElementById('nip');
            jabatanInput = document.getElementById('jabatan');
            golonganInput = document.getElementById('golongan');
            usernameInput = document.getElementById('username');
            passwordInput = document.getElementById('password');
            successMessage = document.getElementById('success-message');
            errorMessage = document.getElementById('error-message');

            // 4. Pasang event listeners
            if (openModalButton) openModalButton.addEventListener('click', openModal);
            if (closeModalButton) closeModalButton.addEventListener('click', closeModal);
            if (cancelModalButton) cancelModalButton.addEventListener('click', closeModal);
            if (editProfileModal) editProfileModal.addEventListener('click', (e) => e.target === editProfileModal && closeModal());
            if (profileForm) profileForm.addEventListener('submit', handleProfileSubmit);

            // 5. Tandai navigasi aktif
            if (window.App.setActiveNav) window.App.setActiveNav('nav-setelan-pengguna');

            // 6. Ambil dan tampilkan data profil awal
            await fetchAndDisplayProfile();

            console.log("DIAGNOSTIK: Halaman profil berhasil diinisialisasi.");

        } catch (error) {
            console.error("Gagal menginisialisasi halaman profil:", error);
        }
    };

    // Jalankan aplikasi
    init();
});