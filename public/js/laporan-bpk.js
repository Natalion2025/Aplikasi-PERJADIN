(function () {
    // Elemen tab
    const registerTab = document.getElementById('register-tab');
    const basicInfoTab = document.getElementById('basicInfo-tab');
    const transportTab = document.getElementById('transport-tab');
    const accomodationTab = document.getElementById('accomodation-tab');
    const mealTab = document.getElementById('meal-tab');
    const otherTab = document.getElementById('other-tab');

    // Elemen Submenu
    const transportArrow = document.getElementById('transport-arrow');
    const transportSubmenu = document.getElementById('transport-submenu');
    const departureButton = document.getElementById('departure-button');
    const arrivalButton = document.getElementById('arrival-button');

    // Elemen panel, tabel dan paginasi
    const registerTabContent = document.getElementById('register-tab-content');
    const basicInfopanel = document.getElementById('basicInfo-panel');
    const basicInfoTableBody = document.getElementById('basicInfo-table-body');
    const basicInfoPagination = document.getElementById('basicInfo-pagination-container');
    const transportPanel = document.getElementById('transport-panel');
    const transportTableBody = document.getElementById('transport-table-body');
    const transportPagination = document.getElementById('transport-pagination-container');
    const accomodationPanel = document.getElementById('accomodation-panel');
    const accomodationTableBody = document.getElementById('accomodation-table-body');
    const accomodationPagination = document.getElementById('accomodation-pagination-container');
    const mealPanel = document.getElementById('meal-panel');
    const mealTableBody = document.getElementById('meal-table-body');
    const mealPagination = document.getElementById('meal-pagination-container');
    const otherCostPanel = document.getElementById('otherCost-panel');
    const otherCostTableBody = document.getElementById('otherCost-table-body');
    const otherCostPagination = document.getElementById('otherCost-pagination-container');

    let currentPageLimit = 5;
    let currentPage = 1;

    // Elemen filter halaman
    const pageLimitSelect = document.getElementById('page-limit-select');

    // Fungsi untuk format tanggal
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    // Fungsi untuk format mata uang
    const formatCurrency = (value) => {
        if (!value) return '';
        const number = parseFloat(String(value).replace(/[^0-9]/g, ''));
        return isNaN(number) ? '' : new Intl.NumberFormat('id-ID').format(number);
    };

    const renderBasicInfoList = (basicInfoList, role) => {
        // Guard clause: Jangan lakukan apa-apa jika elemen tabel tidak ada
        if (!basicInfoTableBody) {
            console.warn('DIAGNOSTIK: Elemen tabel untuk informasi dasar tidak ditemukan.');
            return;
        }

        // Kosongkan isi tabel sebelum merender ulang
        basicInfoTableBody.innerHTML = '';

        // Render setiap item dalam daftar
        if (!basicInfoList || basicInfoList.length === 0) {
            basicInfoTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Belum ada data Informasi Dasar. Cek kembali fitur SPT dan Laporan.</td></tr>`;
            return;
        }

        basicInfoList.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item'; // Tambahkan kelas 'item' untuk pencarian


            // Fungsi untuk memotong teks maks 30 karakter tanpa memotong kata
            const truncateText = (text, maxLength = 30) => {
                if (!text) return '-';
                if (text.length <= maxLength) return text;
                let truncated = text.substr(0, maxLength);
                return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
            };

            // Isi baris dengan data
            row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${index + 1}.</div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nama_lengkap || '-'}</div>
                    <div class="text-sm text-gray-500">${truncateText(item.jabatan || '-')}</div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.pangkat || '-'}</div>         
            </td>
            <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nomor_surat || '-'}</div>
                    <div class="text-sm text-gray-500">${formatDate(item.tanggal_surat)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nomor_sppd || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${formatDate(item.tanggal_berangkat)} <br> ${formatDate(item.tanggal_kembali)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${truncateText(item.maksud_perjalanan)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${truncateText(item.mata_anggaran_nama || '-')}</div>
            </td>
            `;
            basicInfoTableBody.appendChild(row);
        });
    };

    // Fungsi untuk merender paginasi
    const renderPagination = (container, pagination, loadFunction) => {
        if (!container) return;
        container.innerHTML = '';

        const { page, totalPages, totalItems, currentPageLimit } = pagination;
        // PERBAIKAN: Gunakan currentPageLimit dinamis
        if (totalItems <= currentPageLimit) return; // Tidak perlu paginasi jika item lebih sedikit dari limit


        // Untuk menampilkan informasi halaman dan tombol navigasi
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 sm:px-6';

        const pageInfo = document.createElement('div');
        pageInfo.innerHTML = `<p class="text-sm text-navy-500 dark:text-gray-400">
            Halaman <span class="font-medium">${page}</span> dari <span class="font-medium">${totalPages}</span>
        </p>`;

        const navButtons = document.createElement('div');
        navButtons.className = 'flex-1 flex justify-end';

        // Tombol navigasi 'Pertama'
        const firstButton = document.createElement('button');
        firstButton.textContent = 'Pertama';
        firstButton.className = 'ml-3 relative inline-flex items-center px-4 py-2 border border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs rounded-l-2xl text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === 1) {
            firstButton.disabled = true;
            firstButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        firstButton.addEventListener('click', () => loadFunction(1));

        // Tombol navigasi 'Sebelumnya'
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Sebelumnya';
        prevButton.className = 'relative inline-flex items-center px-4 py-2 border border-l-0 border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === 1) {
            prevButton.disabled = true;
            prevButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        prevButton.addEventListener('click', () => loadFunction(page - 1));

        // Tombol navigasi nomor halaman
        // Container untuk tombol nomor halaman
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.className = 'inline-flex items-center';

        // Membuat tombol nomor halaman sesuai dengan jumlah total halaman
        for (let i = 1; i <= totalPages; i++) {
            const pageNumberButton = document.createElement('button');
            pageNumberButton.textContent = `${i}`;
            pageNumberButton.className = `relative inline-flex items-center px-4 py-2 border border-l-0 border-r-0 border-navy-500 text-xs text-navy-500 dark:text-gray-300 ${i === page ? 'bg-sky-100 dark:bg-slate-600' : 'bg-white dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-slate-600'} `;
            pageNumberButton.addEventListener('click', () => loadFunction(i));
            pageNumbersContainer.appendChild(pageNumberButton);
        }

        // Tombol navigasi 'Berikutnya'
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Berikutnya';
        nextButton.className = 'relative inline-flex items-center px-4 py-2 border border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === totalPages) {
            nextButton.disabled = true;
            nextButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        nextButton.addEventListener('click', () => loadFunction(page + 1));

        // Tombol navigasi 'Terakhir'
        const lastButton = document.createElement('button');
        lastButton.textContent = 'Terakhir';
        lastButton.className = 'relative inline-flex items-center px-4 py-2 border border-l-0 border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs rounded-r-2xl text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === totalPages) {
            lastButton.disabled = true;
            lastButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        lastButton.addEventListener('click', () => loadFunction(totalPages));

        navButtons.appendChild(firstButton);
        navButtons.appendChild(prevButton);
        navButtons.appendChild(pageNumbersContainer);
        navButtons.appendChild(nextButton);
        navButtons.appendChild(lastButton);

        wrapper.appendChild(pageInfo);
        wrapper.appendChild(navButtons);
        container.appendChild(wrapper);
    };


    const loadBasicInfoList = async (page = 1) => {
        // Guard clause: Jangan jalankan jika elemen tabel tidak ada di halaman ini
        if (!basicInfoTableBody) {
            console.log('DIAGNOSTIK: Elemen tabel untuk informasi dasar tidak ditemukan. Melewati pemuatan data.');
            return;
        }
        basicInfoTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        if (basicInfoPagination) basicInfoPagination.innerHTML = '';

        try {
            const [basicInfoRes, sessionRes] = await Promise.all([
                fetch(`/api/laporan-bpk-apip?page=${page}&limit=${currentPageLimit}`),
                fetch('/api/user/session')
            ]);
            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                currentUserRole = sessionData.role;
            }
            if (!basicInfoRes.ok) {
                const errorData = await basicInfoRes.json();
                throw new Error(errorData.message || 'Gagal memuat data Informasi Dasar.');
            }
            const result = await basicInfoRes.json();
            renderBasicInfoList(result.data, currentUserRole);
            renderPagination(basicInfoPagination, result.pagination, loadBasicInfoList);
        } catch (error) {
            if (!basicInfoTableBody) return;
            basicInfoTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // Fungsi untuk mengatur tampilan panel dan tabel berdasarkan tab yang dipilih
    const setupTabs = () => {
        if (!basicInfoTab || !transportTab || !accomodationTab || !mealTab || !otherTab) return;
        basicInfoTab.addEventListener('click', () => switchTab(basicInfoTab, basicInfopanel));
        transportTab.addEventListener('click', () => switchTab(transportTab, transportPanel));
        accomodationTab.addEventListener('click', () => switchTab(accomodationTab, accomodationPanel));
        mealTab.addEventListener('click', () => switchTab(mealTab, mealPanel));
        otherTab.addEventListener('click', () => switchTab(otherTab, otherCostPanel));

        // Inisialisasi tab default pada tempilan pertama kali
        switchTab(basicInfoTab, basicInfopanel);
    };

    // Fungsi untuk filter halaman
    if (pageLimitSelect) {
        pageLimitSelect.addEventListener('change', (e) => {
            currentPageLimit = parseInt(e.target.value, 10);
            currentPage = 1;
            // Panggil ulang fungsi untuk memuat data dengan limit baru
            loadBasicInfoList();
        });
    }

    // Fungsi untuk beralih antar tab
    const switchTab = (selectedTab, selectedPanel) => {
        const tabs = [basicInfoTab, transportTab, accomodationTab, mealTab, otherTab];
        const panels = [basicInfopanel, transportPanel, accomodationPanel, mealPanel, otherCostPanel];

        // Ketika mengalihkan tab, sembunyikan semua panel dan set semua tab ke tidak terpilih
        tabs.forEach(tab => {
            tab.setAttribute('aria-selected', 'false');
            tab.classList.remove('bg-green-100', 'dark:bg-sky-900', 'text-green-800');
            tab.classList.add('border-transparent', 'dark:hover:text-gray-300', 'dark:border', 'dark:text-gray-300', 'dark:border-gray-700');
        });
        panels.forEach(panel => panel.classList.add('hidden'));

        // Tampilkan panel yang dipilih dan set tab sebagai terpilih
        selectedTab.setAttribute('aria-selected', 'true');
        selectedTab.classList.add('bg-green-100', 'dark:bg-sky-900', 'text-green-800', 'dark:text-gray-300');
        selectedTab.classList.remove('dark:hover:text-gray-300', 'dark:border', 'dark:border-gray-700');
        selectedPanel.classList.remove('hidden');
    };
    // Inisialisasi setup tab saat halaman dimuat
    setupTabs();

    if (basicInfoTableBody) {
        // Muat data awal untuk Informasi Dasar
        loadBasicInfoList();
    }
})();