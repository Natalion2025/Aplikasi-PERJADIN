(function () {
    // --- Elemen Global ---
    const pageNotification = document.getElementById('page-notification');

    // --- Elemen & Logika untuk Pejabat Daerah ---
    const addPejabatButton = document.getElementById('add-pejabat-button');
    const pejabatModal = document.getElementById('pejabat-modal');
    const closePejabatModalButton = document.getElementById('close-pejabat-modal-button');
    const cancelPejabatButton = document.getElementById('cancel-pejabat-button');
    const pejabatForm = document.getElementById('pejabat-form');
    const pejabatModalTitle = document.getElementById('pejabat-modal-title');
    const pejabatIdInput = document.getElementById('pejabat-id');
    const pejabatListContainer = document.getElementById('pejabat-list-container');
    const pejabatFormNotification = document.getElementById('pejabat-form-notification');

    // --- Elemen & Logika untuk Pegawai ---
    const addPegawaiButton = document.getElementById('add-pegawai-button');
    const pegawaiModal = document.getElementById('pegawai-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelButton = document.getElementById('cancel-button');
    const pegawaiForm = document.getElementById('pegawai-form');
    const pegawaiIdInput = document.getElementById('pegawai-id');
    const pegawaiListContainer = document.getElementById('pegawai-list-container');
    const formNotification = document.getElementById('form-notification');
    const pangkatSelect = document.getElementById('pangkat');
    const golonganInput = document.getElementById('golongan');

    // --- Fungsi Notifikasi ---
    const showNotification = (element, message, isError = false) => {
        element.textContent = message;
        element.className = `p-2 rounded-md text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
        element.classList.remove('hidden');
    };

    const hideNotification = (element) => {
        element.classList.add('hidden');
        element.textContent = '';
    };

    // ==================================================
    // LOGIKA UNTUK KEPALA / WK DAERAH (PEJABAT)
    // ==================================================

    const openPejabatModal = (pejabat = null) => {
        hideNotification(pejabatFormNotification);
        pejabatForm.reset();
        if (pejabat) {
            pejabatModalTitle.textContent = 'Edit Data Pejabat';
            pejabatIdInput.value = pejabat.id;
            document.getElementById('pejabat_nama_lengkap').value = pejabat.nama;
            document.getElementById('pejabat_jabatan').value = pejabat.jabatan;
        } else {
            pejabatModalTitle.textContent = 'Tambah Kepala/WK Daerah';
            pejabatIdInput.value = '';
        }
        pejabatModal.classList.remove('hidden');
    };

    const closePejabatModal = () => pejabatModal.classList.add('hidden');

    const renderPejabatList = (pejabatList) => {
        pejabatListContainer.innerHTML = '';
        if (pejabatList.length === 0) {
            pejabatListContainer.innerHTML = '<p class="text-gray-500 dark:text-white">Belum ada data pejabat.</p>';
            return;
        }
        pejabatList.forEach(p => {
            const pejabatCard = document.createElement('div');
            pejabatCard.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
            pejabatCard.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800 dark:text-white">${p.nama}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">${p.jabatan}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-pejabat-btn text-blue-500 hover:text-blue-700" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-pejabat-btn text-red-500 hover:text-red-700" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            pejabatListContainer.appendChild(pejabatCard);
        });
    };

    const loadPejabat = async () => {
        try {
            const response = await fetch('/api/pejabat');
            if (!response.ok) throw new Error('Gagal memuat data');
            const data = await response.json();
            renderPejabatList(data);
        } catch (error) {
            pejabatListContainer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };

    pejabatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = pejabatIdInput.value;
        const formData = new FormData(pejabatForm);
        const data = {
            nama: formData.get('nama'),
            jabatan: formData.get('jabatan')
        };

        const url = id ? `/api/pejabat/${id}` : '/api/pejabat';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data');

            showNotification(pageNotification, `Data pejabat berhasil ${id ? 'diperbarui' : 'disimpan'}.`);
            setTimeout(() => hideNotification(pageNotification), 3000);
            closePejabatModal();
            loadPejabat();
        } catch (error) {
            showNotification(pejabatFormNotification, error.message, true);
        }
    });

    pejabatListContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-pejabat-btn');
        const deleteBtn = e.target.closest('.delete-pejabat-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const response = await fetch(`/api/pejabat/${id}`);
            const pejabat = await response.json();
            openPejabatModal(pejabat);
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Apakah Anda yakin ingin menghapus data pejabat ini?')) {
                try {
                    const response = await fetch(`/api/pejabat/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Gagal menghapus data');
                    showNotification(pageNotification, 'Data pejabat berhasil dihapus.');
                    setTimeout(() => hideNotification(pageNotification), 3000);
                    loadPejabat();
                } catch (error) {
                    showNotification(pageNotification, error.message, true);
                    setTimeout(() => hideNotification(pageNotification), 3000);
                }
            }
        }
    });

    // ==================================================
    // LOGIKA UNTUK PEGAWAI
    // ==================================================

    const pangkatGolonganMap = {
        "Juru Muda": "I/a", "Juru Muda Tingkat I": "I/b", "Juru": "I/c", "Juru Tingkat I": "I/d",
        "Pengatur Muda": "II/a", "Pengatur Muda Tingkat I": "II/b", "Pengatur": "II/c", "Pengatur Tingkat I": "II/d",
        "Penata Muda": "III/a", "Penata Muda Tingkat I": "III/b", "Penata": "III/c", "Penata Tingkat I": "III/d",
        "Pembina": "IV/a", "Pembina Tingkat I": "IV/b", "Pembina Utama Muda": "IV/c", "Pembina Utama Madya": "IV/d", "Pembina Utama": "IV/e"
    };

    const updateGolongan = () => {
        const selectedPangkat = pangkatSelect.value;
        golonganInput.value = pangkatGolonganMap[selectedPangkat] || '';
    };

    const openPegawaiModal = (pegawai = null) => {
        hideNotification(formNotification);
        pegawaiForm.reset();
        if (pegawai) {
            pegawaiIdInput.value = pegawai.id;
            document.getElementById('pegawai_nama_lengkap').value = pegawai.nama_lengkap || pegawai.nama;
            document.getElementById('nip').value = pegawai.nip || '';
            document.getElementById('pangkat').value = pegawai.pangkat || '';
            document.getElementById('jabatan').value = pegawai.jabatan || '';
            document.getElementById('bidang').value = pegawai.bidang || '';
        } else {
            pegawaiIdInput.value = '';
        }
        updateGolongan();
        pegawaiModal.classList.remove('hidden');
    };

    const closePegawaiModal = () => pegawaiModal.classList.add('hidden');

    const renderPegawaiList = (pegawaiList) => {
        pegawaiListContainer.innerHTML = '';
        if (pegawaiList.length === 0) {
            pegawaiListContainer.innerHTML = '<p class="text-gray-500 dark:text-white">Belum ada data pegawai.</p>';
            return;
        }
        pegawaiList.forEach(p => {
            const pegawaiCard = document.createElement('div');
            pegawaiCard.className = 'flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
            pegawaiCard.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800 dark:text-white">${p.nama_lengkap || p.nama || 'Nama tidak tersedia'}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">NIP: ${p.nip || '-'}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-300">${p.jabatan || '-'} - ${p.pangkat || '-'} (${p.golongan || '-'})</p>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button class="edit-pegawai-btn text-blue-500 hover:text-blue-700" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-pegawai-btn text-red-500 hover:text-red-700" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            pegawaiListContainer.appendChild(pegawaiCard);
        });
    };

    const loadPegawai = async () => {
        try {
            const response = await fetch('/api/pegawai');
            if (!response.ok) throw new Error('Gagal memuat data pegawai');
            const data = await response.json();
            renderPegawaiList(data);
        } catch (error) {
            pegawaiListContainer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };

    pegawaiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = pegawaiIdInput.value;
        const formData = new FormData(pegawaiForm);

        // PERBAIKAN: Gunakan nama_lengkap yang sesuai dengan database
        const data = {
            nama_lengkap: formData.get('nama_lengkap'), // Mengambil dari input dengan name="nama_lengkap"
            nip: formData.get('nip'),
            pangkat: formData.get('pangkat'),
            golongan: formData.get('golongan'),
            jabatan: formData.get('jabatan'),
            bidang: formData.get('bidang')
        };

        const url = id ? `/api/pegawai/${id}` : '/api/pegawai';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data');

            showNotification(pageNotification, `Data pegawai berhasil ${id ? 'diperbarui' : 'disimpan'}.`);
            setTimeout(() => hideNotification(pageNotification), 3000);
            closePegawaiModal();
            loadPegawai();
        } catch (error) {
            showNotification(formNotification, error.message, true);
        }
    });

    pegawaiListContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-pegawai-btn');
        const deleteBtn = e.target.closest('.delete-pegawai-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const response = await fetch(`/api/pegawai/${id}`);
            const pegawai = await response.json();
            openPegawaiModal(pegawai);
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Apakah Anda yakin ingin menghapus data pegawai ini?')) {
                try {
                    const response = await fetch(`/api/pegawai/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Gagal menghapus data');
                    showNotification(pageNotification, 'Data pegawai berhasil dihapus.');
                    setTimeout(() => hideNotification(pageNotification), 3000);
                    loadPegawai();
                } catch (error) {
                    showNotification(pageNotification, error.message, true);
                    setTimeout(() => hideNotification(pageNotification), 3000);
                }
            }
        }
    });

    // --- Event Listeners untuk membuka modal ---
    addPejabatButton.addEventListener('click', () => openPejabatModal());
    addPegawaiButton.addEventListener('click', () => openPegawaiModal());

    // --- Event Listeners untuk menutup modal ---
    closePejabatModalButton.addEventListener('click', closePejabatModal);
    cancelPejabatButton.addEventListener('click', closePejabatModal);
    closeModalButton.addEventListener('click', closePegawaiModal);
    cancelButton.addEventListener('click', closePegawaiModal);
    pejabatModal.addEventListener('click', (e) => {
        if (e.target === pejabatModal) closePejabatModal();
    });
    pegawaiModal.addEventListener('click', (e) => {
        if (e.target === pegawaiModal) closePegawaiModal();
    });

    // --- Event Listener untuk Pangkat -> Golongan ---
    pangkatSelect.addEventListener('change', updateGolongan);

    // --- Inisialisasi ---
    loadPejabat();
    loadPegawai();
})();