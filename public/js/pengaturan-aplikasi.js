(function () {
    const settingsForm = document.getElementById('settings-form');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const languageSelect = document.getElementById('language');
    const notificationEl = document.getElementById('settings-notification');

    const FONT_SIZE_CLASSES = ['text-sm', 'text-base', 'text-lg'];

    // --- Pengaturan Default ---
    const defaultSettings = {
        darkMode: false,
        fontSize: 'base',
        language: 'id',
    };

    /**
     * Menerapkan pengaturan ke elemen-elemen di halaman.
     * @param {object} settings - Objek pengaturan yang akan diterapkan.
     */
    const applySettings = (settings) => {
        // Terapkan Dark Mode
        if (settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Terapkan Ukuran Font
        document.documentElement.classList.remove(...FONT_SIZE_CLASSES);
        document.documentElement.classList.add(`text-${settings.fontSize}`);
    };

    /**
     * Memuat pengaturan dari localStorage atau menggunakan default.
     * @returns {object} Objek pengaturan.
     */
    const loadSettings = () => {
        const savedSettings = localStorage.getItem('appSettings');
        const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;

        // Pastikan semua kunci ada, jika tidak tambahkan dari default
        return { ...defaultSettings, ...settings };
    };

    /**
     * Mengisi form dengan nilai dari pengaturan yang dimuat.
     * @param {object} settings - Objek pengaturan.
     */
    const populateForm = (settings) => {
        // Set toggle Dark Mode
        darkModeToggle.checked = settings.darkMode;

        // Set radio button Ukuran Font
        const fontRadio = document.querySelector(`input[name="fontSize"][value="${settings.fontSize}"]`);
        if (fontRadio) {
            fontRadio.checked = true;
        }

        // Set dropdown Bahasa
        languageSelect.value = settings.language;
    };

    /**
     * Menampilkan notifikasi sementara.
     * @param {string} message - Pesan notifikasi.
     * @param {boolean} [isError=false] - Apakah notifikasi error.
     */
    const showNotification = (message, isError = false) => {
        notificationEl.textContent = message;
        notificationEl.classList.remove('hidden');
        // Hapus kelas lama sebelum menambahkan yang baru
        notificationEl.className = 'p-4 mb-4 text-sm rounded-lg'; // Reset kelas dasar

        if (isError) {
            notificationEl.classList.add('bg-red-100', 'dark:bg-red-900', 'text-red-700', 'dark:text-red-300');
        } else {
            notificationEl.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-700', 'dark:text-green-300');
        }

        setTimeout(() => {
            notificationEl.classList.add('hidden');
        }, 3000);
    };

    // --- Event Listeners ---

    // Simpan saat form di-submit
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(settingsForm);
        const newSettings = {
            darkMode: formData.has('darkMode'),
            fontSize: formData.get('fontSize'),
            language: formData.get('language'),
        };

        localStorage.setItem('appSettings', JSON.stringify(newSettings));
        applySettings(newSettings);
        showNotification('Pengaturan berhasil disimpan!');
        window.scrollTo(0, 0); // Scroll ke atas untuk melihat notifikasi
    });

    // Terapkan perubahan secara instan saat diubah
    settingsForm.addEventListener('change', (e) => {
        const formData = new FormData(settingsForm);
        const currentSettings = {
            darkMode: formData.has('darkMode'),
            fontSize: formData.get('fontSize'),
            language: formData.get('language'),
        };
        applySettings(currentSettings);
    });

    // --- Inisialisasi ---
    const currentSettings = loadSettings();
    populateForm(currentSettings);
    // Terapkan pengaturan saat halaman pertama kali dimuat
    // (Ini penting jika pengguna membuka tab baru)
    applySettings(currentSettings);
})();