// public/js/spt-register.js
(function () {
    const panjarModal = document.getElementById('panjar-modal');
    const openPanjarModalBtn = document.getElementById('tambah-panjar-button');
    const closePanjarModalBtn = document.getElementById('close-panjar-modal');
    const cancelPanjarBtn = document.getElementById('cancel-panjar-button');
    const panjarForm = document.getElementById('panjar-form');

    // Elemen Form Panjar
    const panjarSptSelect = document.getElementById('panjar_spt_id');
    const panjarBendaharaSelect = document.getElementById('panjar_bendahara_id');
    const panjarPelaksanaSelect = document.getElementById('panjar_pelaksana_id');
    const panjarPejabatSelect = document.getElementById('panjar_pejabat_id');
    const rincianBiayaContainer = document.getElementById('rincian-biaya-container');
    const panjarTanggalInput = document.getElementById('panjar_tanggal');
    const tambahRincianBtn = document.getElementById('tambah-rincian-biaya');

    let allSptData = []; // Cache untuk data SPT

    // Elemen spesifik untuk halaman Register SPT
    const sptTableBody = document.getElementById('spt-table-body');
    let currentUserRole = 'user'; // Default role

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

    const renderSptList = (sptList, role) => {
        // Guard clause: Jangan lakukan apa-apa jika elemen tabel tidak ada
        if (!sptTableBody) {
            console.warn("Elemen 'spt-table-body' tidak ditemukan. Fungsi renderSptList dilewati.");
            return;
        }

        sptTableBody.innerHTML = ''; // Kosongkan tabel

        if (!sptList || sptList.length === 0) {
            sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data Surat Tugas. Silakan buat baru.</td></tr>`;
            return;
        }

        allSptData = sptList; // Simpan data untuk digunakan di modal panjar

        sptList.forEach(spt => {
            const row = document.createElement('tr');

            // PERBAIKAN: Gunakan properti 'spt.pegawai' yang dikirim dari API.
            const pegawaiListHtml = (spt.pegawai && spt.pegawai.length > 0)
                ? `<ul>${spt.pegawai.map(nama => `<li class="list-disc ml-4 dark:text-gray-400">${nama}</li>`).join('')}</ul>`
                : '<span class="text-gray-400">Tidak ada</span>';

            const isCancelled = spt.status === 'dibatalkan';
            const hasReport = spt.laporan_count > 0;

            const actionButtons = (role === 'admin' || role === 'superadmin')
                ? `<a href="/edit-spt/${spt.id}" class="edit-btn text-yellow-600 hover:text-yellow-900 ml-4" title="Edit SPT">
                       <i class="fas fa-edit"></i>
                   </a>
                   <button data-id="${spt.id}" data-nomor="${spt.nomor_surat}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus SPT">
                       <i class="fas fa-trash"></i>
                   </button>`
                : '';

            const reportButton = (!isCancelled && !hasReport)
                ? `<a href="/buat-laporan?spt_id=${spt.id}" class="text-blue-600 hover:text-blue-900 ml-4" title="Buat Laporan"><i class="fas fa-file-medical"></i></a>`
                : hasReport
                    ? `<span class="text-gray-400 ml-4 cursor-not-allowed" title="Sudah Dilaporkan"><i class="fas fa-check-circle"></i></span>`
                    : '';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${spt.nomor_surat}</div>
                    <div class="text-sm text-gray-500">${formatDate(spt.tanggal_surat)}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 break-words max-w-xs dark:text-gray-400">${spt.maksud_perjalanan}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${pegawaiListHtml}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-400">${spt.lokasi_tujuan}</div>
                    <div class="text-sm text-gray-500">${formatDate(spt.tanggal_berangkat)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/cetak/spt/${spt.id}" target="_blank" class="text-indigo-600 hover:text-indigo-900" title="Cetak SPT">
                        <i class="fas fa-print"></i>
                    </a>
                    <a href="/cetak/sppd/${spt.id}" target="_blank" class="text-green-600 hover:text-green-900 ml-4" title="Cetak SPPD">
                        <i class="fas fa-file-alt"></i>
                    </a>
                    ${reportButton}
                    ${actionButtons}
                </td>
            `;
            sptTableBody.appendChild(row);
        });
    };

    const loadSptList = async () => {
        // Guard clause: Jangan jalankan jika elemen tabel tidak ada di halaman ini
        if (!sptTableBody) {
            console.log("Melewati loadSptList karena 'spt-table-body' tidak ada di halaman ini.");
            return;
        }

        sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        try {
            const [sptRes, sessionRes] = await Promise.all([
                fetch('/api/spt'),
                fetch('/api/user/session')
            ]);

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                currentUserRole = sessionData.user.role;
            }

            if (!sptRes.ok) throw new Error('Gagal memuat data SPT.');
            const data = await sptRes.json();
            renderSptList(data, currentUserRole);
            allSptData = data; // Simpan data untuk digunakan di modal panjar
        } catch (error) {
            if (!sptTableBody) return; // Cek lagi untuk menghindari error jika user pindah halaman
            sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- LOGIKA MODAL PANJAR ---

    const openPanjarModal = () => {
        if (!panjarModal) return;

        panjarForm.reset();
        rincianBiayaContainer.innerHTML = ''; // Kosongkan rincian
        addRincianBiayaRow(); // Tambah satu baris rincian default
        panjarTanggalInput.value = new Date().toISOString().split('T')[0]; // Set tanggal hari ini
        loadPanjarDropdowns();
        panjarModal.classList.remove('hidden');
    };

    const closePanjarModal = () => {
        if (!panjarModal) return;
        panjarModal.classList.add('hidden');
    };

    // Fungsi untuk memuat semua data dropdown untuk modal panjar
    const loadPanjarDropdowns = async () => {
        // Jika tidak ada data SPT yang dimuat (misal di halaman uang-muka), fetch datanya.
        if (allSptData.length === 0) {
            try {
                const response = await fetch('/api/spt');
                if (!response.ok) throw new Error('Gagal memuat data SPT untuk modal.');
                allSptData = await response.json();
            } catch (error) {
                console.error(error);
            }
        }
        try {
            // 1. Isi dropdown SPT dari data yang sudah di-cache
            panjarSptSelect.innerHTML = '<option value="">-- Pilih SPT --</option>';
            allSptData.forEach(spt => {
                const option = document.createElement('option');
                option.value = spt.id;
                option.textContent = `${spt.nomor_surat} (Tujuan: ${spt.lokasi_tujuan})`;
                panjarSptSelect.appendChild(option);
            });

            // 2. Ambil data pegawai dan pejabat
            const [pegawaiRes, pejabatRes] = await Promise.all([
                fetch('/api/pegawai'),
                fetch('/api/pejabat')
            ]);

            if (!pegawaiRes.ok) throw new Error('Gagal memuat data pegawai.');
            if (!pejabatRes.ok) throw new Error('Gagal memuat data pejabat.');

            const semuaPegawai = await pegawaiRes.json();
            const semuaPejabat = await pejabatRes.json();

            // 3. Isi dropdown Bendahara
            panjarBendaharaSelect.innerHTML = '<option value="">-- Pilih Bendahara --</option>';
            const bendahara = semuaPegawai.find(p => p.jabatan && p.jabatan.toLowerCase().includes('bendahara pengeluaran'));
            if (bendahara) {
                const option = new Option(`${bendahara.nama_lengkap} (NIP: ${bendahara.nip})`, bendahara.id);
                panjarBendaharaSelect.appendChild(option);
            }

            // 4. Isi dropdown Pejabat Berwenang
            panjarPejabatSelect.innerHTML = '<option value="">-- Pilih Pejabat --</option>';
            // PERMINTAAN: Hanya tampilkan pegawai dengan jabatan "Kepala Dinas"
            const kepalaDinas = semuaPegawai.filter(p => p.jabatan && p.jabatan.toLowerCase() === 'kepala dinas');
            kepalaDinas.forEach(p => {
                const option = new Option(`${p.nama_lengkap} - ${p.jabatan}`, p.id);
                panjarPejabatSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Error loading panjar dropdowns:", error);
            alert('Gagal memuat data untuk form panjar. ' + error.message);
        }
    };

    // Fungsi untuk menambah baris rincian biaya
    const addRincianBiayaRow = () => {
        if (!rincianBiayaContainer) return;
        const template = document.getElementById('rincian-biaya-template');
        const newRow = template.content.cloneNode(true);
        rincianBiayaContainer.appendChild(newRow);
    };

    // Event listener untuk perubahan dropdown SPT di modal panjar
    panjarSptSelect.addEventListener('change', async (e) => {
        const sptId = e.target.value;
        panjarPelaksanaSelect.innerHTML = '<option value="">-- Memuat... --</option>';
        if (!sptId) {
            panjarPelaksanaSelect.innerHTML = '<option value="">-- Pilih SPT terlebih dahulu --</option>';
            return;
        }

        try {
            // Ambil detail pegawai untuk SPT yang dipilih
            const response = await fetch(`/api/spt/${sptId}`);
            if (!response.ok) throw new Error('Gagal mengambil detail pegawai SPT.');
            const sptDetail = await response.json();

            panjarPelaksanaSelect.innerHTML = '<option value="">-- Pilih Pegawai Pelaksana --</option>';
            sptDetail.pegawai.forEach(p => {
                const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.pegawai_id);
                panjarPelaksanaSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Error fetching SPT details for panjar:", error);
            panjarPelaksanaSelect.innerHTML = '<option value="">-- Gagal memuat --</option>';
        }
    });

    // Event delegation untuk tombol hapus rincian dan format currency
    if (rincianBiayaContainer) {
        rincianBiayaContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-rincian-btn')) {
                e.target.closest('.rincian-item').remove();
            }
        });

        rincianBiayaContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('currency-input')) {
                e.target.value = formatCurrency(e.target.value);
            }
        });
    }

    // Handle submit form panjar
    if (panjarForm) {
        panjarForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(panjarForm);
            const data = {
                tempat: formData.get('tempat'),
                tanggal_panjar: formData.get('tanggal_panjar'),
                spt_id: formData.get('spt_id'),
                bendahara_id: formData.get('bendahara_id'),
                pelaksana_id: formData.get('pelaksana_id'),
                pejabat_id: formData.get('pejabat_id'),
                rincian: [],
                id: document.getElementById('panjar-id').value
            };

            const rincianItems = rincianBiayaContainer.querySelectorAll('.rincian-item');
            rincianItems.forEach(item => {
                data.rincian.push({
                    uraian: item.querySelector('[name="uraian"]').value,
                    jumlah: item.querySelector('[name="jumlah"]').value.replace(/[^0-9]/g, ''),
                    keterangan: item.querySelector('[name="keterangan"]').value,
                });
            });

            const isEditMode = !!data.id;
            const url = isEditMode ? `/api/panjar/${data.id}` : '/api/panjar';
            const method = isEditMode ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data.');

                alert(result.message);
                closePanjarModal();

                // Jika kita berada di halaman uang muka, muat ulang daftarnya
                if (window.location.pathname.includes('/uang-muka')) {
                    // Asumsikan ada fungsi global untuk memuat ulang
                    if (typeof window.loadUangMuka === 'function') {
                        window.loadUangMuka();
                    }
                }

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Event delegation untuk tombol hapus
    if (sptTableBody) {
        sptTableBody.addEventListener('click', async (event) => {
            const deleteBtn = event.target.closest('.delete-btn');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                const nomor = deleteBtn.dataset.nomor;
                if (confirm(`Apakah Anda yakin ingin menghapus SPT dengan nomor "${nomor}"?`)) {
                    try {
                        const response = await fetch(`/api/spt/${id}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        alert(result.message);
                        loadSptList(); // Muat ulang data setelah berhasil
                    } catch (error) {
                        alert(`Gagal menghapus: ${error.message}`);
                    }
                }
            }
        });
    }

    // Event listeners untuk modal panjar
    if (openPanjarModalBtn) openPanjarModalBtn.addEventListener('click', openPanjarModal);
    if (closePanjarModalBtn) closePanjarModalBtn.addEventListener('click', closePanjarModal);
    if (cancelPanjarBtn) cancelPanjarBtn.addEventListener('click', closePanjarModal);
    if (tambahRincianBtn) tambahRincianBtn.addEventListener('click', addRincianBiayaRow);

    // Inisialisasi: Memuat daftar SPT saat halaman dibuka
    // Hanya panggil jika kita berada di halaman yang benar
    if (sptTableBody) {
        loadSptList();
    }
})();