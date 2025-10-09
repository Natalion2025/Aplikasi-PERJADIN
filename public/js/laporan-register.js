(function () {
    const laporanTableBody = document.getElementById('laporan-table-body');
    const pembatalanTableBody = document.getElementById('pembatalan-table-body');

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

    const renderLaporanList = (laporanList) => {
        laporanTableBody.innerHTML = ''; // Kosongkan tabel

        if (!laporanList || laporanList.length === 0) {
            laporanTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Belum ada data laporan. Silakan buat baru.</td></tr>`;
            return;
        }

        laporanList.forEach(laporan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${laporan.judul}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 dark:text-gray-400">${laporan.nomor_surat}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">
                    ${formatDate(laporan.tanggal_laporan)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <a href="/cetak/laporan/${laporan.id}" target="_blank" class="text-green-600 hover:text-green-900" title="Cetak Laporan"><i class="fas fa-print"></i></a>
                    <a href="/edit-laporan/${laporan.id}" class="text-indigo-600 hover:text-indigo-900" title="Edit Laporan"><i class="fas fa-edit"></i></a>
                    <button data-id="${laporan.id}" class="delete-laporan-btn text-red-600 hover:text-red-900" title="Hapus Laporan"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            laporanTableBody.appendChild(row);
        });
    };

    const loadLaporanData = async () => {
        try {
            const response = await fetch('/api/laporan');
            if (!response.ok) throw new Error('Gagal memuat daftar laporan.');
            const data = await response.json();
            renderLaporanList(data);
        } catch (error) {
            laporanTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderCanceledSptList = (canceledList) => {
        pembatalanTableBody.innerHTML = ''; // Kosongkan tabel

        if (!canceledList || canceledList.length === 0) {
            // PERBAIKAN: Sesuaikan colspan karena ada kolom baru
            pembatalanTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data pembatalan tugas.</td></tr>`;
            return;
        }

        canceledList.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${item.nomor_surat}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">
                    ${formatDate(item.tanggal_pembatalan)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-400">
                    ${item.pegawai_nama}
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 dark:text-gray-400">${item.alasan}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <a href="/cetak/pembatalan/${item.id}" target="_blank" class="text-green-600 hover:text-green-900" title="Cetak Surat Pernyataan"><i class="fas fa-print"></i></a>
                    <button data-id="${item.id}" class="edit-pembatalan-btn text-indigo-600 hover:text-indigo-900" title="Edit Pembatalan"><i class="fas fa-edit"></i></button>
                    <button data-id="${item.id}" data-nomor="${item.nomor_surat}" class="delete-pembatalan-btn text-red-600 hover:text-red-900" title="Hapus Pembatalan"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            pembatalanTableBody.appendChild(row);
        });
    };

    const loadCanceledSptData = async () => {
        try {
            const response = await fetch('/api/spt/canceled');
            if (!response.ok) throw new Error('Gagal memuat daftar pembatalan.');
            const data = await response.json();
            renderCanceledSptList(data);
        } catch (error) {
            // PERBAIKAN: Sesuaikan colspan karena ada kolom baru
            pembatalanTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- LOGIKA UNTUK TAB ---

    const setupTabs = () => {
        const tabs = [laporanTab, pembatalanTab];
        const panels = [laporanPanel, pembatalanPanel];

        const switchTab = (selectedTab, selectedPanel) => {
            // Reset semua tab dan panel
            tabs.forEach(tab => {
                tab.setAttribute('aria-selected', 'false');
                tab.classList.remove('text-indigo-600', 'border-indigo-600', 'dark:text-indigo-500', 'dark:border-indigo-500');
                tab.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
            });
            panels.forEach(panel => panel.classList.add('hidden'));

            // Aktifkan tab dan panel yang dipilih
            selectedTab.setAttribute('aria-selected', 'true');
            selectedTab.classList.add('text-indigo-600', 'border-indigo-600', 'dark:text-indigo-500', 'dark:border-indigo-500');
            selectedTab.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
            selectedPanel.classList.remove('hidden');
        };

        laporanTab.addEventListener('click', () => switchTab(laporanTab, laporanPanel));
        pembatalanTab.addEventListener('click', () => switchTab(pembatalanTab, pembatalanPanel));

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
                option.textContent = spt.status === 'dibatalkan' ? `${spt.nomor_surat} (Dibatalkan)` : spt.nomor_surat;
                // Saat mode tambah, nonaktifkan pilihan SPT yang sudah dibatalkan.
                if (spt.status === 'dibatalkan') {
                    option.disabled = true;
                }
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
    laporanTableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-laporan-btn');
        if (deleteBtn) {
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
        }
    });

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

    setupTabs();
    loadLaporanData();
    loadCanceledSptData();
})();