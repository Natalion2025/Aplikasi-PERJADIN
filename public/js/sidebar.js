// Pastikan objek App sudah ada, atau buat jika belum ada.
window.App = window.App || {};

/**
 * Menginisialisasi fungsionalitas interaktif di dalam sidebar,
 * terutama untuk dropdown, dan mencegah "lompatan" scroll.
 * HANYA UNTUK DROPDOWN - fungsi toggle sidebar ada di main.js
 */
window.App.initializeSidebarDropdown = () => {
    const sidebar = document.getElementById('sidebar');

    if (!sidebar) {
        console.error("DIAGNOSTIK: Elemen #sidebar tidak ditemukan. Inisialisasi dibatalkan.");
        return;
    }

    sidebar.addEventListener('click', (event) => {
        // Langkah 1: Simpan posisi scroll saat ini SEBELUM melakukan aksi apa pun.
        const scrollPosition = sidebar.scrollTop;

        // Langkah 2: Jalankan logika untuk dropdown dan link placeholder.
        const dropdownToggle = event.target.closest('.dropdown-toggle');
        if (dropdownToggle) {
            // Mencegah aksi default browser (seperti navigasi untuk tag <a>).
            event.preventDefault();

            const targetId = dropdownToggle.getAttribute('aria-controls');
            if (!targetId) return;

            const dropdownMenu = document.getElementById(targetId);
            if (!dropdownMenu) return;

            const isExpanded = !dropdownMenu.classList.toggle('hidden');
            dropdownToggle.setAttribute('aria-expanded', isExpanded);

            const chevron = dropdownToggle.querySelector('svg:last-of-type');
            if (chevron) {
                chevron.classList.toggle('rotate-180', isExpanded);
            }
        }

        // Juga tangani link placeholder lain yang mungkin ada di dalam menu.
        const link = event.target.closest('a');
        if (link && link.getAttribute('href') === '#') {
            event.preventDefault();
        }

        // Langkah 3: Paksa sidebar kembali ke posisi scroll aslinya.
        requestAnimationFrame(() => {
            sidebar.scrollTop = scrollPosition;
        });
    });

    console.log("DIAGNOSTIK: Event listener pengunci scroll sidebar berhasil diinisialisasi.");
};