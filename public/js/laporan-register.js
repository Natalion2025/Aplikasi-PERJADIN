(function () {
    const laporanTableBody = document.getElementById('laporan-table-body');
    const pembatalanTableBody = document.getElementById('pembatalan-table-body');
    const laporanPaginationContainer = document.getElementById('laporan-pagination-container');
    const pembatalanPaginationContainer = document.getElementById('pembatalan-pagination-container');
    const pageLimitSelect = document.getElementById('page-limit-select');

    let currentPageLimit = 5;

    // Elemen untuk Modal Pembatalan
    const openPembatalanBtn = document.getElementById('pembatalan-tugas-btn');
    const pembatalanModal = document.getElementById('pembatalan-modal');
    const closePembatalanModalBtn = document.getElementById('close-pembatalan-modal');
    const kembaliPembatalanBtn = document.getElementById('kembali-pembatalan-btn');
    const pembatalanIdInput = document.createElement('input'); // Buat input hidden untuk ID
    const formPembatalan = document.getElementById('form-pembatalan');
    const sptSelectPembatalan = document.getElementById('pembatalan_spt_id');
    const pegawaiSelectPembatalan = document.getElementById('pembatalan_pegawai_id');

    // Elemen untuk Tab
    const laporanTab = document.getElementById('laporan-tab');
    const pembatalanTab = document.getElementById('pembatalan-tab');
    const laporanPanel = document.getElementById('laporan-panel');
    const pembatalanPanel = document.getElementById('pembatalan-panel');
    pembatalanIdInput.type = 'hidden';
    pembatalanIdInput.id = 'pembatalan-id';
    // Tambahkan elemen baru untuk biaya
    const rincianBiayaInput = document.getElementById('pembatalan_rincian_biaya');
    const nominalBiayaInput = document.getElementById('pembatalan_nominal_biaya');
    const panjarToggle = document.getElementById('pembatalan-panjar-toggle');
    // Elemen baru untuk notifikasi dan tombol simpan
    const pembatalanNotif = document.getElementById('pembatalan-pegawai-notif');
    const submitPembatalanBtn = formPembatalan.querySelector('button[type="submit"]');
    let canceledPegawaiForSpt = []; // Cache untuk menyimpan ID pegawai yang sudah dibatalkan


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

    /**
     * Merender komponen paginasi secara dinamis dan konsisten.
     * @param {HTMLElement} container - Elemen div untuk menampung paginasi.
     * @param {object} pagination - Objek paginasi dari API ({ page, totalPages, totalItems, limit }).
     * @param {function} loadFunction - Fungsi yang akan dipanggil saat tombol halaman diklik.
     */
    const renderGlobalPagination = (container, pagination, loadFunction) => {
        if (!container || !pagination) return;
        container.innerHTML = '';

        const { page, totalPages, totalItems, limit } = pagination;
        if (totalItems <= limit) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 sm:px-6';

        const pageInfo = document.createElement('div');
        pageInfo.innerHTML = `<p class="text-sm text-gray-700 dark:text-gray-400">
            Menampilkan <span class="font-medium">${page}</span> dari <span class="font-medium">${totalPages}</span> halaman
        </p>`;

        const navButtons = document.createElement('div');
        navButtons.className = 'flex-1 flex justify-end items-center';

        const createButton = (text, targetPage, isDisabled = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = 'relative inline-flex items-center px-4 py-2 border text-xs font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-600' + (isDisabled ? ' cursor-not-allowed opacity-50' : '');
            if (!isDisabled) button.addEventListener('click', () => loadFunction(targetPage));
            return button;
        };

        navButtons.append(createButton('Pertama', 1, page === 1), createButton('Sebelumnya', page - 1, page === 1), createButton('Berikutnya', page + 1, page === totalPages), createButton('Terakhir', totalPages, page === totalPages));
        wrapper.append(pageInfo, navButtons);
        container.appendChild(wrapper);
    };

    const loadLaporanData = async (page = 1) => {
        laporanTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat...</td></tr>`;
        try {
            const response = await fetch(`/api/laporan?page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) throw new Error('Gagal memuat daftar laporan.');
            const result = await response.json();
            renderLaporanList(result.data, result.pagination);
        } catch (error) {
            laporanTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderLaporanList = (data, pagination) => {
        laporanTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            laporanTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada laporan dibuat.</td></tr>`;
            return;
        }

        data.forEach((laporan, index) => {
            const row = document.createElement('tr');
            row.className = 'item'; // Tambahkan kelas 'item' untuk pencarian
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${index + 1}</td>
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-400">${laporan.judul}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${laporan.nomor_surat}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${formatDate(laporan.tanggal_laporan)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/cetak/laporan/${laporan.id}" target="_blank" class="text-blue-600 hover:text-blue-900" title="Cetak Laporan"><i class="fas fa-print"></i></a>
                    <a href="/edit-laporan/${laporan.id}" class="text-indigo-600 hover:text-indigo-900 ml-4" title="Edit Laporan"><i class="fas fa-edit"></i></a>
                    <button data-id="${laporan.id}" class="delete-laporan-btn text-red-600 hover:text-red-900 ml-4" title="Hapus Laporan"><i class="fas fa-trash"></i></button>
                </td>
            `;
            laporanTableBody.appendChild(row);
        });

        renderGlobalPagination(laporanPaginationContainer, pagination, loadLaporanData);
    };

    const loadCanceledSptData = async (page = 1) => {
        pembatalanTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Memuat...</td></tr>`;
        try {
            const response = await fetch(`/api/spt/canceled?page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) throw new Error('Gagal memuat daftar pembatalan.');
            const result = await response.json();
            renderCanceledSptList(result.data, result.pagination);
        } catch (error) {
            // PERBAIKAN: Sesuaikan colspan karena ada kolom baru
            pembatalanTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderCanceledSptList = (data, pagination) => {
        pembatalanTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            pembatalanTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Tidak ada data pembatalan.</td></tr>`;
            return;
        }

        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item'; // Tambahkan kelas 'item' untuk pencarian
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${index + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${item.nomor_surat}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${formatDate(item.tanggal_pembatalan)}</td>
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-400">${item.pegawai_nama}</td>
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-400">${item.alasan || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/cetak/pembatalan/${item.id}" target="_blank" class="text-blue-600 hover:text-blue-900" title="Cetak Surat Pembatalan"><i class="fas fa-print"></i></a>
                    <button data-id="${item.id}" class="edit-pembatalan-btn text-indigo-600 hover:text-indigo-900 ml-4" title="Edit Pembatalan"><i class="fas fa-edit"></i></button>
                    <button data-id="${item.id}" data-nomor="${item.nomor_surat}" class="delete-pembatalan-btn text-red-600 hover:text-red-900 ml-4" title="Hapus Pembatalan"><i class="fas fa-trash"></i></button>
                </td>
            `;
            pembatalanTableBody.appendChild(row);
        });

        renderGlobalPagination(pembatalanPaginationContainer, pagination, loadCanceledSptData);
    };

    // --- LOGIKA UNTUK TAB ---

    const setupTabs = () => {
        const tabs = [laporanTab, pembatalanTab];
        const panels = [laporanPanel, pembatalanPanel];

        const switchTab = (selectedTab, selectedPanel) => {
            // Reset semua tab dan panel
            tabs.forEach(tab => {
                tab.setAttribute('aria-selected', 'false');
                tab.classList.remove('bg-green-100', 'text-green-800', 'dark:bg-sky-900');
                tab.classList.add('border-transparent', 'dark:hover:text-gray-300', 'dark:border', 'dark:text-gray-300', 'dark:border-gray-700');
            });
            panels.forEach(panel => panel.classList.add('hidden'));

            // Aktifkan tab dan panel yang dipilih
            selectedTab.setAttribute('aria-selected', 'true');
            selectedTab.classList.add('bg-green-100', 'text-green-800', 'dark:bg-sky-900', 'dark:text-gray-300');
            selectedTab.classList.remove('dark:hover:text-gray-300', 'dark:border', 'dark:border-gray-700');
            selectedPanel.classList.remove('hidden');
        };

        laporanTab.addEventListener('click', () => switchTab(laporanTab, laporanPanel));
        pembatalanTab.addEventListener('click', () => {
            switchTab(pembatalanTab, pembatalanPanel);
            loadCanceledSptData(1); // Muat data saat tab diaktifkan
        });

        // Set state awal
        switchTab(laporanTab, laporanPanel);
    };


    // --- LOGIKA UNTUK MODAL PEMBATALAN ---

    const openPembatalanModal = async (id = null) => {
        formPembatalan.reset();
        pembatalanIdInput.value = ''; // Reset ID
        formPembatalan.appendChild(pembatalanIdInput); // Pastikan input ada di form

        const modalTitle = pembatalanModal.querySelector('h3');

        pembatalanModal.style.display = 'flex';
        await loadSptForCancellation(); // Tunggu SPT dimuat

        if (id) {
            modalTitle.textContent = 'Edit Formulir Pembatalan Tugas';
            try {
                // PERBAIKAN: Saat mode edit, aktifkan semua opsi SPT di dropdown
                // agar SPT yang terkait dengan data yang diedit bisa dipilih.
                Array.from(sptSelectPembatalan.options).forEach(opt => {
                    opt.disabled = false;
                });

                const response = await fetch(`/api/pembatalan/${id}`);
                if (!response.ok) throw new Error('Gagal memuat data pembatalan.');
                const data = await response.json();

                pembatalanIdInput.value = data.id;
                sptSelectPembatalan.value = data.spt_id;
                await populatePegawaiDropdown(data.spt_id, data.pegawai_id); // Isi dropdown pegawai dan pilih
                document.getElementById('tempat_pembatalan').value = data.tempat_pembatalan;
                document.getElementById('tanggal_pembatalan').value = data.tanggal_pembatalan;
                document.getElementById('alasan_pembatalan').value = data.alasan;
                // Isi kolom biaya baru
                rincianBiayaInput.value = data.rincian_biaya || '';
                nominalBiayaInput.value = formatCurrency(data.nominal_biaya);
                panjarToggle.checked = false; // Pastikan toggle mati saat edit

            } catch (error) {
                alert(error.message);
                closePembatalanModal();
            }
        } else {
            modalTitle.textContent = 'Formulir Pembatalan Tugas';
            // Kosongkan field biaya saat membuat baru
            rincianBiayaInput.value = '';
            nominalBiayaInput.value = '';
            panjarToggle.checked = false;
            // PERBAIKAN: Saat mode tambah, nonaktifkan SPT yang sudah dibatalkan sepenuhnya.
            Array.from(sptSelectPembatalan.options).forEach(opt => {
                if (opt.text.includes('(Dibatalkan)')) {
                    opt.disabled = true;
                }
            });
            panjarToggle.dispatchEvent(new Event('change'));
        }
    };

    const closePembatalanModal = () => {
        pembatalanModal.style.display = 'none';
    };

    const populatePegawaiDropdown = async (sptId, selectedPegawaiId = null) => {
        pegawaiSelectPembatalan.innerHTML = '<option value="">-- Memuat Pegawai... --</option>';
        pegawaiSelectPembatalan.disabled = true;

        // Reset notifikasi dan cache setiap kali SPT diganti
        pembatalanNotif.classList.add('hidden');
        canceledPegawaiForSpt = [];

        if (!sptId) {
            pegawaiSelectPembatalan.innerHTML = '<option value="">-- Pilih SPT terlebih dahulu --</option>';
            return;
        }

        try {
            // Ambil data SPT dan data penandatangan laporan secara bersamaan
            // PERBAIKAN: Ambil juga data pegawai yang sudah dibatalkan
            const [sptRes, signersRes, canceledRes] = await Promise.all([
                fetch(`/api/spt/${sptId}`),
                fetch(`/api/laporan/signers/by-spt/${sptId}`),
                fetch(`/api/pembatalan/by-spt/${sptId}`) // Panggil API baru
            ]);

            if (!sptRes.ok) throw new Error('Gagal memuat detail pegawai.');
            const sptDetail = await sptRes.json();

            const signerIds = signersRes.ok ? await signersRes.json() : [];
            const signerIdSet = new Set(signerIds.map(id => id.toString()));

            // Simpan data pegawai yang sudah dibatalkan ke cache
            canceledPegawaiForSpt = canceledRes.ok ? await canceledRes.json() : [];

            pegawaiSelectPembatalan.innerHTML = '<option value="">-- Pilih Pegawai --</option>';
            const availablePegawai = sptDetail.pegawai.filter(p => !signerIdSet.has(p.pegawai_id.toString()));

            if (availablePegawai.length === 0) {
                pegawaiSelectPembatalan.innerHTML = '<option value="">-- Semua pegawai sudah melapor --</option>';
            } else {
                availablePegawai.forEach(p => {
                    pegawaiSelectPembatalan.add(new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.pegawai_id));
                });
                if (selectedPegawaiId) pegawaiSelectPembatalan.value = selectedPegawaiId;
                pegawaiSelectPembatalan.disabled = false;
            }
        } catch (error) {
            pegawaiSelectPembatalan.innerHTML = '<option value="">-- Gagal memuat --</option>';
        }
    };

    const loadSptForCancellation = async () => {
        try {
            const response = await fetch('/api/spt');
            if (!response.ok) throw new Error('Gagal memuat data SPT.');
            const spts = await response.json();

            sptSelectPembatalan.innerHTML = '<option value="">-- Pilih SPT --</option>'; // Reset

            // PERBAIKAN: Tampilkan semua SPT di dropdown, tapi beri label pada yang sudah dibatalkan.
            // Ini penting agar mode edit bisa menampilkan SPT yang sudah dipilih sebelumnya.
            spts.forEach(spt => {
                const option = document.createElement('option');
                option.value = spt.id;
                option.textContent = spt.nomor_surat + (spt.status === 'dibatalkan' ? ' (Dibatalkan)' : '');
                sptSelectPembatalan.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Event listener untuk toggle ambil data panjar
    if (panjarToggle) {
        panjarToggle.addEventListener('change', async (e) => {
            const isChecked = e.target.checked;
            const sptId = sptSelectPembatalan.value;
            const pegawaiId = pegawaiSelectPembatalan.value;
            const notifElement = document.getElementById('pembatalan-panjar-notif');

            if (isChecked) {
                if (!pegawaiId) {
                    alert('Pilih pegawai terlebih dahulu!');
                    e.target.checked = false;
                    return;
                }
                try {
                    const res = await fetch(`/api/panjar/by-spt/${sptId}/pegawai/${pegawaiId}`);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message);

                    rincianBiayaInput.value = data.uraian;
                    nominalBiayaInput.value = formatCurrency(data.total);
                    rincianBiayaInput.readOnly = true;
                    nominalBiayaInput.readOnly = true;
                    notifElement.textContent = 'Data uang muka berhasil dimuat.';
                    notifElement.className = 'p-2 text-sm text-center rounded-md border border-green-300 bg-green-50 text-green-700';
                    notifElement.classList.remove('hidden');
                } catch (error) {
                    // Tampilkan notifikasi, bukan alert
                    notifElement.textContent = `Info: ${error.message}`;
                    notifElement.className = 'p-2 text-sm text-center rounded-md border border-yellow-300 bg-yellow-50 text-yellow-700';
                    notifElement.classList.remove('hidden');
                    e.target.checked = false;
                }
            } else {
                rincianBiayaInput.readOnly = false;
                nominalBiayaInput.readOnly = false;
                notifElement.classList.add('hidden');
            }
        });
    }

    // Event listener untuk format currency pada input nominal
    if (nominalBiayaInput) {
        nominalBiayaInput.addEventListener('input', (e) => {
            if (!e.target.readOnly) e.target.value = formatCurrency(e.target.value);
        });
    }

    // Event delegation untuk tombol hapus laporan
    // PERBAIKAN: Pastikan listener hanya berjalan jika elemen tabel ada.
    if (laporanTableBody) {
        laporanTableBody.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-laporan-btn');
            // PERBAIKAN: Hanya proses jika tombol hapus yang diklik. Abaikan klik lain.
            if (!deleteBtn) return;

            e.preventDefault(); // Mencegah aksi default jika tombol ada di dalam <a>
            const id = deleteBtn.dataset.id;
            if (confirm('Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) {
                try {
                    const response = await fetch(`/api/laporan/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    loadLaporanData(); // Muat ulang daftar laporan
                } catch (error) {
                    alert(`Gagal menghapus: ${error.message}`);
                }
            }
        });
    }

    // --- KUMPULAN EVENT LISTENERS ---

    // Event listener untuk membuka modal pembatalan
    openPembatalanBtn.addEventListener('click', () => openPembatalanModal());

    // Event listener untuk menutup modal pembatalan
    closePembatalanModalBtn.addEventListener('click', closePembatalanModal);
    kembaliPembatalanBtn.addEventListener('click', closePembatalanModal);
    pembatalanModal.addEventListener('click', (e) => {
        if (e.target === pembatalanModal) closePembatalanModal();
    });

    // Event listener untuk perubahan dropdown SPT di modal
    sptSelectPembatalan.addEventListener('change', (e) => {
        populatePegawaiDropdown(e.target.value);
    });

    // Event listener untuk perubahan dropdown PEGAWAI di modal
    pegawaiSelectPembatalan.addEventListener('change', (e) => {
        const selectedPegawaiId = e.target.value;
        const isAlreadyCanceled = canceledPegawaiForSpt.includes(parseInt(selectedPegawaiId, 10));

        if (isAlreadyCanceled) {
            pembatalanNotif.textContent = 'Pegawai ini sudah pernah dibuatkan surat pembatalan tugas untuk SPT terkait.';
            pembatalanNotif.className = 'p-2 text-sm text-center rounded-md border border-red-300 bg-red-50 text-red-700';
            pembatalanNotif.classList.remove('hidden');
            submitPembatalanBtn.disabled = true;
            submitPembatalanBtn.classList.add('cursor-not-allowed', 'bg-red-300');
            submitPembatalanBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        } else {
            pembatalanNotif.classList.add('hidden');
            submitPembatalanBtn.disabled = false;
            submitPembatalanBtn.classList.remove('cursor-not-allowed', 'bg-red-300');
            submitPembatalanBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        }
    });

    // Event listener untuk submit form pembatalan
    formPembatalan.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formPembatalan);
        const data = Object.fromEntries(formData.entries());
        data.id = pembatalanIdInput.value;
        // Tambahkan data biaya dan bersihkan formatnya
        data.rincian_biaya = rincianBiayaInput.value;
        data.nominal_biaya = nominalBiayaInput.value.replace(/[^0-9]/g, '');


        const isEditMode = !!data.id;
        const url = isEditMode ? `/api/pembatalan/${data.id}` : '/api/spt/cancel';
        const method = isEditMode ? 'PUT' : 'POST';

        if (isEditMode) {
            const optionToEnable = sptSelectPembatalan.querySelector(`option[value="${data.spt_id}"]`);
            if (optionToEnable) optionToEnable.disabled = false;
        }

        if (!isEditMode && !confirm(`Apakah Anda yakin ingin membatalkan SPT dengan nomor ${sptSelectPembatalan.options[sptSelectPembatalan.selectedIndex].text}?`)) {
            return;
        }

        const submitButton = formPembatalan.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';

        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            closePembatalanModal();
            loadSptForCancellation();
            loadCanceledSptData();
        } catch (error) {
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Batalkan Tugas';
        }
    });

    // Event delegation untuk tombol aksi di tabel pembatalan
    pembatalanTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-pembatalan-btn');
        const deleteBtn = e.target.closest('.delete-pembatalan-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            openPembatalanModal(id);
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const nomor = deleteBtn.dataset.nomor;
            if (confirm(`Apakah Anda yakin ingin menghapus pembatalan untuk SPT "${nomor}"? Status SPT akan dikembalikan menjadi aktif.`)) {
                fetch(`/api/pembatalan/${id}`, { method: 'DELETE' })
                    .then(res => res.ok ? res.json() : Promise.reject(res.json()))
                    .then(result => {
                        alert(result.message);
                        loadCanceledSptData();
                        loadSptForCancellation();
                    })
                    .catch(errPromise => errPromise.then(err => alert(`Gagal menghapus: ${err.message}`)));
            }
        }
    });

    pageLimitSelect.addEventListener('change', (e) => {
        currentPageLimit = parseInt(e.target.value, 10);
        loadLaporanData(1);
        loadCanceledSptData(1);
    });

    setupTabs();
    loadLaporanData();
    loadCanceledSptData();
})();