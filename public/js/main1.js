// =================================================================
// APLIKASI TEMA GLOBAL (DARK/LIGHT MODE)
// =================================================================
// Blok ini dieksekusi sesegera mungkin untuk menghindari "flash" konten terang.
// Ia membaca pengaturan dari localStorage dan menerapkan kelas 'dark' ke <html> jika perlu.
(function () {
    try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.darkMode) {
                document.documentElement.classList.add('dark');
            }
        }
    } catch (e) {
        console.error('Gagal menerapkan tema awal:', e);
    }
})();

(function () {
    // Mencegah wrapper diinstal lebih dari sekali
    if (window.fetch.isWrapped) {
        return;
    }

    console.log(
        '%c[DIAGNOSTIK] ►►► Menginstal global fetch wrapper...',
        'color: purple; font-weight: bold; font-size: 1.1em;'
    );

    const originalFetch = window.fetch;

    async function wrappedFetch(url, options) {
        const newOptions = { ...(options || {}) };
        // Selalu sertakan credentials secara default untuk semua request
        newOptions.credentials = newOptions.credentials || 'include';

        console.log(
            `%c[DIAGNOSTIK FETCH] ► Requesting: ${url}`,
            'color: blue; font-weight: bold;',
            { options: newOptions }
        );

        try {
            const response = await originalFetch(url, newOptions);
            const statusColor = response.ok ? 'color: green;' : 'color: red;';
            console.log(
                `%c[DIAGNOSTIK FETCH] ◄ Response from ${url}: Status ${response.status}`,
                `${statusColor} font-weight: bold;`,
                // Kita clone respons agar body-nya bisa dibaca tanpa mengganggu alur utama
                { response: response.clone() }
            );
            return response;
        } catch (error) {
            console.error(
                `%c[DIAGNOSTIK FETCH] ◄ NETWORK ERROR for ${url}`,
                'color: red; font-weight: bold; font-size: 1.2em;', error
            );
            throw error; // Lempar kembali error agar promise rejection tetap terjadi
        }
    }

    // Tandai bahwa fetch sudah di-wrap
    wrappedFetch.isWrapped = true;
    window.fetch = wrappedFetch;

    console.log(
        '%c[DIAGNOSTIK] ►►► Global fetch wrapper berhasil diinstal.',
        'color: purple; font-weight: bold; font-size: 1.1em;'
    );
})();

/**
 * =================================================================
 * PENANGANAN ERROR GLOBAL
 * =================================================================
 * Blok ini akan menangkap semua error JavaScript yang tidak tertangani di halaman,
 * yang sangat bergunya untuk debugging masalah yang sulit dilacak.
 */
window.addEventListener('error', function (event) {
    console.error(
        '%cFATAL: Terjadi error yang tidak tertangani:',
        'color: red; font-size: 1.2em; font-weight: bold;',
        {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        }
    );
});
window.addEventListener('unhandledrejection', function (event) {
    console.error(
        '%cFATAL: Terjadi promise rejection yang tidak tertangani:',
        'color: red; font-size: 1.2em; font-weight: bold;',
        {
            reason: event.reason
        }
    );
    // Memberi petunjuk kemungkinan penyebab umum
    console.warn('%cPETUNJUK: Promise rejection seringkali disebabkan oleh kegagalan request `fetch` (misalnya, error jaringan, status 404, atau 500) yang tidak ditangani dalam blok .catch() atau try/catch.', 'color: orange;');
});

/**
 * Memuat komponen HTML dari file eksternal ke dalam elemen target.
 * @param {string} url - URL komponen HTML.
 * @param {string} elementId - ID elemen target.
 */
async function loadComponent(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Gagal memuat komponen: ${url}`);
        const text = await response.text();
        const element = document.getElementById(elementId);
        if (element) element.innerHTML = text;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Memuat skrip secara dinamis dan sekuensial.
 * Fungsi ini dibuat idempoten, artinya tidak akan memuat skrip yang sama dua kali.
 * @param {string} src - URL skrip.
 * @returns {Promise<HTMLScriptElement>}
 */
function loadScript(src) {
    // Cek apakah skrip sudah ada di dalam dokumen
    if (document.querySelector(`script[src="${src}"]`)) {
        console.log(`[DIAGNOSTIK] Skrip ${src} sudah ada, melewati pemuatan.`);
        return Promise.resolve(); // Langsung resolve jika sudah ada
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => { console.log(`[DIAGNOSTIK] Skrip ${src} berhasil dimuat.`); resolve(script); };
        script.onerror = () => reject(new Error(`Gagal memuat skrip: ${src}`));
        document.body.appendChild(script);
    });
}

// Fungsi utama untuk mengatur layout dan memeriksa autentikasi
async function setupLayout() {
    // Definisikan namespace global untuk aplikasi jika belum ada
    window.App = window.App || {};

    // 1. Muat komponen statis (header dan sidebar)
    console.log('[DIAGNOSTIK] Memuat komponen header dan sidebar...');
    await Promise.all([
        loadComponent('/components/sidebar.html', 'sidebar'),
        loadComponent('/components/header.html', 'header-container')
    ]);

    // 2. Periksa sesi pengguna
    try {
        console.log('[DIAGNOSTIK] Memeriksa sesi pengguna...');
        // Tidak perlu `{ credentials: 'include' }` lagi, karena sudah ditangani oleh wrapper global
        const response = await fetch('/api/user/session');

        // Jika sesi tidak valid (misalnya, status 401), alihkan ke halaman login
        if (!response.ok) {
            // Log yang lebih detail untuk debugging
            console.error(`[DIAGNOSTIK] Verifikasi sesi gagal (Status: ${response.status}). Mengalihkan ke login.`);
            // PERBAIKAN: Tambahkan parameter ?force=true untuk menghancurkan sesi lama di server
            window.location.href = '/login?force=true';
            return; // Hentikan eksekusi lebih lanjut
        }

        // 3. Jika sesi valid, simpan data pengguna dari respons pertama.
        const sessionData = await response.json();
        const currentUser = sessionData.user;

        if (!currentUser) {
            console.error('[DIAGNOSTIK] Sesi valid tetapi tidak ada data pengguna. Mengalihkan ke login.');
            window.location.href = '/login';
            return;
        }

        // 4. Muat skrip interaktivitas untuk komponen global (sidebar dan header)
        console.log('[DIAGNOSTIK] Memuat skrip sidebar dan header...');
        await Promise.all([
            loadScript('/js/sidebar.js'),
            loadScript('/js/header-logic.js') // Pastikan header-logic.js dimuat
        ]);

        // Panggil inisialisasi sidebar SETELAH skripnya dimuat.
        // Ini mengasumsikan sidebar.js mengekspos fungsi global App.initializeSidebar()
        if (window.App && typeof window.App.initializeSidebar === 'function') {
            window.App.initializeSidebar();
        } else {
            console.warn('DIAGNOSTIK: Fungsi inisialisasi sidebar (App.initializeSidebar) tidak ditemukan.');
        }

        // Panggil inisialisasi header SETELAH skripnya dimuat.
        // Ini memastikan header-logic.js berjalan setelah komponen header ada di DOM.
        // PERBAIKAN: Kirim data pengguna yang sudah didapat ke fungsi inisialisasi.
        if (typeof initializeHeader === 'function') {
            initializeHeader(currentUser);
        } else {
            console.warn('DIAGNOSTIK: Fungsi inisialisasi header (initializeHeader) tidak ditemukan.');
        }

        // 6. Cari dan muat skrip spesifik untuk halaman ini
        console.log('[DIAGNOSTIK] Mencari skrip halaman spesifik...');
        const mainElement = document.querySelector('main[data-page-script]');
        if (mainElement) {
            const pageScriptSrc = mainElement.dataset.pageScript;
            if (pageScriptSrc) {
                try {
                    await loadScript(pageScriptSrc);
                } catch (loadError) {
                    console.error(`[DIAGNOSTIK] Gagal memuat skrip halaman: ${pageScriptSrc}`, loadError);
                    // Tampilkan pesan error di UI untuk pengguna
                    mainElement.innerHTML = `<div class="text-center p-8 text-red-600 font-semibold">Gagal memuat fungsionalitas halaman. Silakan coba muat ulang.</div>`;
                }
            } else {
                console.warn('[DIAGNOSTIK] Atribut data-page-script ditemukan tetapi nilainya kosong.');
            }
        } else {
            console.log('[DIAGNOSTIK] Halaman ini tidak memerlukan skrip spesifik (tidak ada data-page-script).');
        }

        console.log("DIAGNOSTIK: Aplikasi siap.");

        // Dispatch event custom untuk memberi tahu halaman bahwa layout sudah selesai dimuat
        const layoutLoadedEvent = new Event('layout-loaded');
        document.dispatchEvent(layoutLoadedEvent);

    } catch (error) {
        // Jika terjadi error saat fetch sesi (misal, server mati), alihkan ke login
        console.error('[DIAGNOSTIK] Error kritis saat setup layout, mengalihkan ke login.', error);
        window.location.href = '/login';
    }
}

// Jalankan setupLayout saat dokumen HTML selesai dimuat
document.addEventListener('DOMContentLoaded', setupLayout);
