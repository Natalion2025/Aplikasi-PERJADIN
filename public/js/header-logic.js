/**
 * This file contains the logic for the application's header, including user menu, UI updates, and search functionality.
 */

//Function untuk dipanggil di atas
function highlightText(element, searchTerm) { //Fungsi untuk menyorot teks yang sesuai dengan pencarian
    removeHighlights(element); //Hapus highlight sebelumnya

    const regex = new RegExp(`(${searchTerm})`, 'gi'); //Membuat regex untuk pencarian tidak sensitif huruf besar/kecil
    const walker = document.createTreeWalker( //Membuat TreeWalker untuk menelusuri node teks dalam elemen
        element, // Elemen root untuk penelusuran
        NodeFilter.SHOW_TEXT, // Filter hanya node teks
        null, // Tidak ada filter khusus
        false // Tidak menggunakan entity reference expansion
    );

    const textNodes = []; //Array untuk menyimpan node teks yang ditemukan
    let node;
    while (node = walker.nextNode()) { //Iterasi melalui node teks
        textNodes.push(node); //Menambahkan node teks ke array
    }

    textNodes.forEach(textNode => { //Iterasi setiap node teks untuk mencari dan menyorot kecocokan
        const text = textNode.textContent; //Dapatkan konten teks dari node
        if (regex.test(text)) { //Jika ada kecocokan dengan regex
            const newHTML = text.replace(regex, '<mark style="background-color: yellow">$1</mark>'); //Ganti teks yang cocok dengan elemen <mark> untuk menyorot
            const span = document.createElement('span');
            span.innerHTML = newHTML;
            textNode.parentNode.replaceChild(span, textNode); //Ganti node teks asli dengan elemen span yang berisi teks yang disorot
        }
    });
}

function removeHighlights(element) { //Fungsi untuk menghapus highlight dari elemen
    const marks = element.querySelectorAll('mark');
    marks.forEach(mark => { //
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });
}

function updateSearchStats(searchTerm) { //Fungsi untuk memperbarui statistik pencarian
    const visibleItems = document.querySelectorAll('.item:not(.hidden)');
    // PERBAIKAN: Ambil total item langsung dari DOM di dalam fungsi ini
    // untuk menghindari ReferenceError karena 'items' tidak terdefinisi di sini.
    const totalItems = document.querySelectorAll('.item').length;
    // Hapus statistik sebelumnya
    const existingStats = document.querySelector('.search-stats');
    if (existingStats) {
        existingStats.remove();
    }

    if (searchTerm !== '') { //Tampilkan statistik hanya jika ada input pencarian
        const stats = document.createElement('div');
        stats.className = 'search-stats';
        stats.style.cssText = 'padding: 10px; color: #666; font-size: 14px;';
        stats.textContent = `Menampilkan ${visibleItems.length} dari ${totalItems} item`; //Teks statistik pencarian 
        searchFilter.parentNode.appendChild(stats); //Tambahkan statistik di bawah input pencarian
    }
}

/**
 * @typedef {object} UserProfile
 * @property {string} name - Nama lengkap pengguna.
 * @property {string} role - Peran pengguna (misalnya, 'admin', 'user').
 * @property {string|null} foto_profil - Path ke file foto profil, atau null.
 */

/**
 * Memperbarui elemen UI di header dengan data pengguna.
 * @param {object} user - Objek pengguna dengan properti name, role, dan foto_profil.
 * @param {UserProfile} user - Objek pengguna dengan properti name, role, dan foto_profil.
 */
function updateHeaderUI(user) {
    console.log('[HEADER] Memperbarui UI dengan data:', user);

    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.textContent = user.name || 'Pengguna';
    if (userRoleEl) userRoleEl.textContent = user.role || 'user';
    if (userAvatarEl) {
        // PERBAIKAN: Gunakan avatar pengguna atau gambar default yang konsisten jika tidak ada
        userAvatarEl.src = user.foto_profil ? `/${user.foto_profil}` : '/img/default-avatar.png';
    }
}

/**
 * Menangani event 'avatarUpdated' untuk memperbarui avatar di header secara real-time.
 * @param {CustomEvent} e - Event yang dikirim dari halaman profil.
 */
function handleAvatarUpdate(e) {
    const { avatarUrl } = e.detail;
    const userAvatarEl = document.getElementById('user-avatar');
    if (userAvatarEl && avatarUrl) {
        // PERBAIKAN: Tambahkan '/' di depan URL agar menjadi path absolut dari root.
        // Ini untuk menyamakan dengan logika di updateHeaderUI dan mencegah error 404.
        userAvatarEl.src = `/${avatarUrl}?t=${new Date().getTime()}`;
    }
}

/**
 * Inisialisasi fungsionalitas header.
 * @param {UserProfile} user - Objek pengguna yang didapat dari `main1.js`.
 */
function initializeHeader(user) {
    console.log('[HEADER] Inisialisasi header...');

    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');

    // --- Inisialisasi Fungsionalitas Pencarian ---
    const searchFilter = document.getElementById('search-input');
    if (searchFilter) {
        console.log('[HEADER] Inisialisasi fungsionalitas pencarian...');
        searchFilter.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase().trim();
            // PERBAIKAN: Ambil 'items' di dalam event listener agar selalu up-to-date
            const items = document.querySelectorAll('.item');

            items.forEach(item => {
                const itemText = item.textContent.toLowerCase();
                const matchesText = itemText.includes(searchTerm);

                if (searchTerm === '' || matchesText) {
                    item.classList.remove('hidden');
                    if (searchTerm !== '' && matchesText) {
                        item.classList.add('highlighted');
                        highlightText(item, searchTerm);
                    } else {
                        item.classList.remove('highlighted');
                        removeHighlights(item);
                    }
                } else {
                    item.classList.add('hidden');
                    item.classList.remove('highlighted');
                    removeHighlights(item);
                }
            });

            updateSearchStats(searchTerm);
        });

        // Focus pada search box saat halaman load
        // PERBAIKAN: Pindahkan ke sini agar hanya berjalan jika search box ada
        window.addEventListener('load', function () {
            searchFilter.focus();
        });

    } else {
        console.log('[HEADER] Input pencarian (search-input) tidak ditemukan di halaman ini.');
    }


    // --- Inisialisasi Dropdown Menu Pengguna ---
    if (userMenuButton && userMenu) {
        console.log('[HEADER] Menambahkan event listener untuk dropdown menu');

        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });

        // Tutup menu saat klik di luar
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        });

        // Cegah menu tertutup saat klik di dalam menu
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    } else {
        console.warn('[HEADER] Elemen atau ID untuk dropdown menu user tidak ditemukan');
    }

    // Perbarui UI header dengan data yang diterima dari `main1.js`
    updateHeaderUI(user);

    // Listen untuk update avatar
    document.addEventListener('avatarUpdated', handleAvatarUpdate);
}

// NOTE: Inisialisasi sekarang dipanggil secara manual oleh main1.js
// setelah komponen header berhasil dimuat untuk menghindari race condition.