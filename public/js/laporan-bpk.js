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
    let currentTransportView = 'berangkat'; // Default view untuk transportasi

    // Elemen filter halaman
    const pageLimitSelect = document.getElementById('page-limit-select');

    // Fungsi untuk format tanggal
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    // Fungsi untuk format mata uang (diperbaiki agar menangani null/undefined)
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'Rp 0';
        const number = parseFloat(String(value).replace(/[^0-9,-]+/g, '').replace(',', '.'));
        return isNaN(number) ? '' : new Intl.NumberFormat('id-ID').format(number);
    };


    // FUNGSI UNTUK DAFTAR INFORMASI DASAR

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
            const truncateText = (text, maxLength = 25) => {
                if (!text) return '-';
                if (text.length <= maxLength) return text;
                let truncated = text.substr(0, maxLength);
                return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
            };

            // Isi baris dengan data
            row.innerHTML = `
            <td class="pl-4 pr-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-center text-gray-700 dark:text-gray-400">${index + 1}.</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nama_lengkap || '-'}</div>
                    <div class="text-sm text-gray-500" title="${item.jabatan}">${truncateText(item.jabatan || '-')}</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400">${item.pangkat || '-'} (${item.golongan || '-'})</div>         
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400">${item.nomor_surat || '-'}</div>
                    <div class="text-sm text-gray-500">${formatDate(item.tanggal_surat)}</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400">${item.nomor_sppd || '-'}</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="Tanggal Mulai">${formatDate(item.tanggal_berangkat)}</div>
                    <div class="text-sm text-gray-500" title="Tanggal Selesai">${formatDate(item.tanggal_kembali)}</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="${item.maksud_perjalanan}">${truncateText(item.maksud_perjalanan)}</div>
            </td>
            <td class="pr-4 pl-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="${item.mata_anggaran_nama}">${truncateText(item.mata_anggaran_nama || '-')}</div>
            </td>
            `;
            basicInfoTableBody.appendChild(row);
        });
    };


    // Mengaktifkan Dropdown Submenu Transportasi
    if (transportArrow && transportSubmenu) {
        transportArrow.addEventListener('click', () => {
            transportSubmenu.classList.toggle('hidden');
            transportArrow.classList.toggle('rotate-180');
            switchTab(transportTab, transportPanel);

        });

        // Menutup submenu saat klik di luar
        document.addEventListener('click', (event) => {
            if (!transportArrow.contains(event.target) && !transportSubmenu.contains(event.target)) {
                transportSubmenu.classList.add('hidden');
                transportArrow.classList.remove('rotate-180');
            }
        });
    }

    // Merender Daftar Transportasi
    const renderTransportList = (transportList, role) => {
        // Guard clause: Jangan lakukan apa-apa jika elemen tabel tidak ada
        if (!transportTableBody) {
            console.warn('DIAGNOSTIK: Elemen tabel untuk transportasi tidak ditemukan.');
            return;
        }

        // Kosongkan isi tabel sebelum merender ulang
        transportTableBody.innerHTML = '';

        // Render setiap item dalam daftar
        if (!transportList || transportList.length === 0) {
            transportTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Belum ada data Transportasi. Cek kembali fitur SPT dan Laporan.</td></tr>`;
            return;
        }

        transportList.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item';

            const truncateText = (text, maxLength = 25) => {
                if (!text) return '-';
                if (text.length <= maxLength) return text;
                let truncated = text.substr(0, maxLength);
                return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
            };

            row.innerHTML = `
                <td class="pl-4 pr-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-center text-gray-700 dark:text-gray-400">${(currentPage - 1) * currentPageLimit + index + 1}.</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nama_lengkap || '-'}</div>
                    <div class="text-sm text-gray-500" title="${item.jabatan}">${truncateText(item.jabatan || '-')}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400">${item.nomor_surat || '-'}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400">${item.perusahaan || '-'}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="Kode Boking">${item.kode_boking || '-'}</div>
                    <div class="text-sm text-gray-500" title="No. Penerbangan">${item.nomor_penerbangan || ''}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="Nomor Tiket">${item.nomor_tiket || '-'}</div>
                    <div class="text-sm text-gray-500" title="Tanggal Tiket">${formatDate(item.tanggal_tiket)}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="Terminal Berangkat">${item.terminal_berangkat || '-'}</div>
                    <div class="text-sm text-gray-500" title="Terminal Tiba">${item.terminal_tiba || '-'}</div>
                </td>
                <td class="pr-4 pl-3 py-3 whitespace-nowrap text-right">
                    <div class="text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.nominal)}</div>
                </td>
            `;
            transportTableBody.appendChild(row);
        });
    };

    // FUNGSI UNTUK DAFTAR PENGINAPAN (YANG SEBELUMNYA HILANG)
    const renderAccomodationList = (accomodationList) => {
        if (!accomodationTableBody) return;
        accomodationTableBody.innerHTML = '';

        if (!accomodationList || accomodationList.length === 0) {
            accomodationTableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-gray-500">Belum ada data Penginapan.</td></tr>`;
            return;
        }

        accomodationList.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item';

            const truncateText = (text, maxLength = 25) => {
                if (!text) return '-';
                if (text.length <= maxLength) return text;
                return text.substr(0, maxLength) + '...';
            };

            row.innerHTML = `
                <td class="pl-4 pr-3 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-400">${(currentPage - 1) * currentPageLimit + index + 1}.</td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nama_lengkap || '-'}</div>
                    <div class="text-sm text-gray-500" title="${item.jabatan}">${truncateText(item.jabatan || '-')}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${item.nomor_surat || '-'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${item.nama_hotel || '-'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${item.lokasi_hotel || '-'}</td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-400" title="Tanggal Check In">${formatDate(item.tanggal_checkIn)}</div>
                    <div class="text-sm text-gray-500" title="Tanggal Check Out">${formatDate(item.tanggal_checkOut)}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-400">${item.malam || '0'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.harga_satuan)}</td>
                <td class="pr-4 pl-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.total_harga)}</td>
            `;
            accomodationTableBody.appendChild(row);
        });
    };

    // FUNGSI UNTUK DAFTAR UANG HARIAN
    const renderMealList = (mealList) => {
        if (!mealTableBody) return;
        mealTableBody.innerHTML = '';

        if (!mealList || mealList.length === 0) {
            mealTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Belum ada data Uang Harian.</td></tr>`;
            return;
        }

        mealList.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item';

            const truncateText = (text, maxLength = 25) => {
                if (!text) return '-';
                if (text.length <= maxLength) return text;
                return text.substr(0, maxLength) + '...';
            };

            row.innerHTML = `
                <td class="pl-4 pr-3 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-400">${(currentPage - 1) * currentPageLimit + index + 1}.</td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nama_lengkap || '-'}</div>
                    <div class="text-sm text-gray-500" title="${item.jabatan}">${truncateText(item.jabatan || '-')}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${item.nomor_surat || '-'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-400">${item.jumlah_hari || '0'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.tarif_satuan)}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.total)}</td>
                <td class="pr-4 pl-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.biaya_representatif)}</td>
            `;
            mealTableBody.appendChild(row);
        });
    };

    const loadMealList = async (page = 1) => {
        if (!mealTableBody) return;
        mealTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Menghitung & Memuat data...</td></tr>`;
        currentPage = page;
        const response = await fetch(`/api/laporan-bpk-apip/uang-harian?page=${page}&limit=${currentPageLimit}`);
        const result = await response.json();
        renderMealList(result.data);
        renderPagination(mealPagination, result.pagination, loadMealList);
    };

    // FUNGSI UNTUK DAFTAR BIAYA LAIN-LAIN
    const renderOtherCostList = (otherCostList) => {
        if (!otherCostTableBody) return;
        otherCostTableBody.innerHTML = '';

        if (!otherCostList || otherCostList.length === 0) {
            otherCostTableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Belum ada data Biaya Lain-lain.</td></tr>`;
            return;
        }

        otherCostList.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item';

            const truncateText = (text, maxLength = 25) => {
                if (!text) return '-';
                if (text.length <= maxLength) return text;
                return text.substr(0, maxLength) + '...';
            };

            row.innerHTML = `
                <td class="pl-4 pr-3 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-400">${(currentPage - 1) * currentPageLimit + index + 1}.</td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-gray-400">${item.nama_lengkap || '-'}</div>
                    <div class="text-sm text-gray-500" title="${item.jabatan}">${truncateText(item.jabatan || '-')}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${item.nomor_surat || '-'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400" title="${item.uraian}">${truncateText(item.uraian || '-')}</td>
                <td class="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-400">${item.jumlah_hari || '0'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.tarif_satuan)}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">${formatCurrency(item.total)}</td>
                <td class="pr-4 pl-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400" title="${item.keterangan}">${truncateText(item.keterangan || '-')}</td>
            `;
            otherCostTableBody.appendChild(row);
        });
    };

    const loadOtherCostList = async (page = 1) => {
        if (!otherCostTableBody) return;
        otherCostTableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        currentPage = page;
        const response = await fetch(`/api/laporan-bpk-apip/lain-lain?page=${page}&limit=${currentPageLimit}`);
        const result = await response.json();
        renderOtherCostList(result.data);
        renderPagination(otherCostPagination, result.pagination, loadOtherCostList);
    };

    const loadTransportList = async (arah = 'berangkat', page = 1) => {
        if (!transportTableBody) return;
        transportTableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        if (transportPagination) transportPagination.innerHTML = '';
        currentPage = page;
        currentTransportView = arah;

        try {
            const response = await fetch(`/api/laporan-bpk-apip/transportasi?arah=${arah}&page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) throw new Error('Gagal memuat data transportasi.');
            const result = await response.json();
            renderTransportList(result.data);
            renderPagination(transportPagination, result.pagination, (p) => loadTransportList(arah, p));
        } catch (error) {
            transportTableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    const loadAccomodationList = async (page = 1) => {
        if (!accomodationTableBody) return;
        accomodationTableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        if (accomodationPagination) accomodationPagination.innerHTML = '';
        currentPage = page;

        try {
            const response = await fetch(`/api/laporan-bpk-apip/akomodasi?page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) throw new Error('Gagal memuat data penginapan.');
            const result = await response.json();
            renderAccomodationList(result.data);
            renderPagination(accomodationPagination, result.pagination, loadAccomodationList);
        } catch (error) {
            accomodationTableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // Fungsi untuk merender paginasi (untuk semua tab)
    const renderPagination = (container, pagination, loadFunction) => {
        if (!container) return;
        container.innerHTML = '';

        const { page, totalPages, totalItems, limit } = pagination;
        // PERBAIKAN: Gunakan `limit` dari objek pagination, bukan `currentPageLimit` dari scope global.
        // Ini memperbaiki anomali di mana paginasi tetap muncul meskipun jumlah item kurang dari limit.
        if (totalItems <= limit) return; // Tidak perlu paginasi jika item lebih sedikit dari limit


        // Untuk menampilkan informasi halaman dan tombol navigasi
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between fixed bottom-[-0.35rem] bg-[#f5f9fc] left-[17rem] right-0 dark:bg-slate-800 px-4 py-3 sm:px-6';

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
        basicInfoTab.addEventListener('click', () => {
            switchTab(basicInfoTab, basicInfopanel);
            loadBasicInfoList(1);
        });
        transportTab.addEventListener('click', (e) => {
            // Mencegah event listener document menutup submenu saat tab diklik
            if (!transportArrow.contains(e.target)) {
                switchTab(transportTab, transportPanel);
                loadTransportList(currentTransportView, 1); // Muat view terakhir atau default
            }
        });
        accomodationTab.addEventListener('click', () => {
            switchTab(accomodationTab, accomodationPanel);
            loadAccomodationList(1);
        });
        mealTab.addEventListener('click', () => {
            switchTab(mealTab, mealPanel);
            loadMealList(1);
        });
        otherTab.addEventListener('click', () => {
            switchTab(otherTab, otherCostPanel);
            loadOtherCostList(1);
        });

        // Event listener untuk submenu transportasi
        departureButton.addEventListener('click', (e) => { e.preventDefault(); loadTransportList('berangkat', 1); });
        arrivalButton.addEventListener('click', (e) => { e.preventDefault(); loadTransportList('kembali', 1); });

        // Inisialisasi tab default pada tempilan pertama kali
        switchTab(basicInfoTab, basicInfopanel);
    };

    // Fungsi untuk filter halaman
    if (pageLimitSelect) {
        pageLimitSelect.addEventListener('change', (e) => {
            currentPageLimit = parseInt(e.target.value, 10);
            currentPage = 1;
            // Panggil ulang fungsi load data untuk tab yang sedang aktif
            if (basicInfopanel.offsetParent !== null) {
                loadBasicInfoList(1);
            } else if (transportPanel.offsetParent !== null) {
                loadTransportList(currentTransportView, 1);
            } else if (accomodationPanel.offsetParent !== null) {
                loadAccomodationList(1);
            } else if (mealPanel.offsetParent !== null) {
                loadMealList(1);
            } else if (otherCostPanel.offsetParent !== null) {
                loadOtherCostList(1);
            }
            // Tambahkan else if untuk tab lain jika sudah diimplementasikan
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

        // Muat data untuk tab yang baru diaktifkan jika tabelnya masih kosong
        if (selectedPanel === transportPanel) {
            if (transportTableBody.innerHTML.trim() === '') {
                loadTransportList('berangkat', 1); // Default ke 'berangkat'
            }
        } else if (selectedPanel === accomodationPanel) {
            if (accomodationTableBody.innerHTML.trim() === '') {
                loadAccomodationList(1);
            }
        } else if (selectedPanel === mealPanel) {
            if (mealTableBody.innerHTML.trim() === '') {
                loadMealList(1);
            }
        } else if (selectedPanel === otherCostPanel) {
            if (otherCostTableBody.innerHTML.trim() === '') {
                loadOtherCostList(1);
            }
        }
    };
    // Inisialisasi setup tab saat halaman dimuat
    setupTabs();

    if (basicInfoTableBody) {
        // Muat data awal untuk Informasi Dasar
        loadBasicInfoList();
    }
})();