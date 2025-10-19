(function () {
    // Elemen Tab dan Panel
    const dayView = document.getElementById('day-view');
    const weekView = document.getElementById('week-view');
    const monthView = document.getElementById('month-view');
    const dayPanel = document.getElementById('day-panel');
    const weekPanel = document.getElementById('week-panel');
    const monthPanel = document.getElementById('month-panel');

    /**
     * Fungsi untuk mengalihkan tab yang aktif.
     * @param {HTMLElement} selectedTab - Tombol tab yang diklik.
     * @param {HTMLElement} selectedPanel - Panel konten yang sesuai dengan tab.
     */
    const switchTab = (selectedTab, selectedPanel) => {
        const tabs = [dayView, weekView, monthView];
        const panels = [dayPanel, weekPanel, monthPanel];

        // 1. Reset semua tab dan panel ke kondisi non-aktif
        tabs.forEach(tab => {
            if (!tab) return;
            tab.setAttribute('aria-selected', 'false');
            // 1a. Hapus kelas aktif dari tombol
            tab.classList.remove('bg-[#DAEF84]', 'dark:bg-yellow-400');
            // 1b. Atur ulang gaya teks di dalam tombol ke kondisi normal
            const textDiv = tab.querySelector('div');
            if (textDiv) textDiv.classList.remove('font-bold', 'dark:text-gray-900');
            if (textDiv) textDiv.classList.add('font-normal', 'dark:text-gray-300');
        });
        panels.forEach(panel => {
            if (panel) panel.classList.add('hidden');
        });

        // 2. Aktifkan tab dan panel yang dipilih
        if (selectedTab) {
            selectedTab.setAttribute('aria-selected', 'true');
            // 2a. Tambahkan kelas aktif ke tombol
            selectedTab.classList.add('bg-[#DAEF84]', 'dark:bg-yellow-400');
            // 2b. Atur gaya teks di dalam tombol menjadi tebal
            const textDiv = selectedTab.querySelector('div');
            if (textDiv) textDiv.classList.remove('font-normal', 'dark:text-gray-300');
            if (textDiv) textDiv.classList.add('font-bold', 'dark:text-gray-900');
        }
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
        }
    };

    const setupTabs = () => {
        if (!dayView || !weekView || !monthView) return;

        // Tambahkan event listener yang memanggil switchTab dengan tab dan panel yang sesuai
        dayView.addEventListener('click', () => switchTab(dayView, dayPanel));
        weekView.addEventListener('click', () => switchTab(weekView, weekPanel));
        monthView.addEventListener('click', () => switchTab(monthView, monthPanel));

        // Atur tab default saat halaman dimuat
        switchTab(dayView, dayPanel);
    };

    setupTabs();
})();