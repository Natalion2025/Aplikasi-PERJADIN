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
    const sppdTableBody = document.getElementById('sppd-table-body');

    // Elemen untuk Tab
    const sptTab = document.getElementById('spt-tab');
    const sppdTab = document.getElementById('sppd-tab');
    const sptPanel = document.getElementById('spt-panel');
    const sppdPanel = document.getElementById('sppd-panel');

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

        sptList.forEach((spt, index) => {
            const row = document.createElement('tr');

            // PERBAIKAN: Tandai pegawai yang dibatalkan dengan coretan
            const canceledPegawaiSet = new Set(spt.pegawai_dibatalkan || []);
            const pegawaiListHtml = (spt.pegawai && spt.pegawai.length > 0) ?
                `<ul>${spt.pegawai.map(nama => {
                    const isCanceled = canceledPegawaiSet.has(nama);
                    const textClass = isCanceled ? 'line-through text-red-500' : 'dark:text-gray-400';
                    const title = isCanceled ? 'Tugas dibatalkan' : '';
                    return `<li class="list-disc ml-4 ${textClass}" title="${title}">${nama}</li>`;
                }).join('')}</ul>`
                : '<span class="text-gray-400">Tidak ada</span>';

            const isCancelled = spt.status === 'dibatalkan';
            const hasReport = spt.laporan_count > 0;

            // Logika untuk tombol/status laporan
            const reportButton = isCancelled
                ? `<span class="text-red-500 font-semibold ml-4">Telah Dibatalkan</span>`
                : (!hasReport)
                    ? `<a href="/buat-laporan?spt_id=${spt.id}" class="text-blue-600 hover:text-blue-900 ml-4" title="Buat Laporan"><i class="fas fa-file-medical"></i></a>`
                    : hasReport
                        ? `<span class="text-gray-400 ml-4 cursor-not-allowed" title="Sudah Dilaporkan"><i class="fas fa-check-circle"></i></span>`
                        : '';

            // Tombol aksi hanya aktif jika SPT belum dibatalkan
            const actionButtons = (role === 'admin' || role === 'superadmin') && !isCancelled
                ? `<a href="/edit-spt/${spt.id}" class="edit-btn text-yellow-600 hover:text-yellow-900 ml-4" title="Edit SPT">
                       <i class="fas fa-edit"></i>
                   </a>
                   <button data-id="${spt.id}" data-nomor="${spt.nomor_surat}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus SPT">
                       <i class="fas fa-trash"></i>
                   </button>
                   <a href="/cetak/visum/${spt.id}" target="_blank"
                        class="py-1 px-2 rounded-xl ml-4 text-green-800 bg-green-100 hover:bg-green-200 transition-colors"
                        title="Cetak Form Visum">
                        <i class="fas fa-print text-green-800"></i> Form Visum
                    </a>`

                : '';

            // Fungsi untuk memotong teks maks 30 karakter tanpa memotong kata
            const truncateText = (text, maxLength = 30) => {
                if (!text) return '';
                if (text.length <= maxLength) return text;
                let truncated = text.substr(0, maxLength);
                return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
            };
            textContent = truncateText(spt.maksud_perjalanan);

            // Bangun isi baris tabel untuk daftar register SPT
            row.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${index + 1}.</div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${spt.nomor_surat}</div>
                    <div class="text-sm text-gray-500">${formatDate(spt.tanggal_surat)}</div>
                </td>
                <td class="px-3 py-4">
                    <div class="text-sm text-gray-900 break-words text-nowrap max-w-xs dark:text-gray-400" title="${spt.maksud_perjalanan}">${truncateText(spt.maksud_perjalanan)}</div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${pegawaiListHtml}
                </td>
                <td class="px-1 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-400">${spt.lokasi_tujuan}</div>
                    <div class="text-sm text-gray-500">${formatDate(spt.tanggal_berangkat)}</div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
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
            row.className = isCancelled ? 'bg-red-50 dark:bg-red-900/20' : '';
            sptTableBody.appendChild(row);
            truncateText();
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

    const renderSppdList = (sppdList) => {
        if (!sppdTableBody) return;
        sppdTableBody.innerHTML = '';

        if (!sppdList || sppdList.length === 0) {
            sppdTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data SPPD yang dibuat.</td></tr>`;
            return;
        }

        sppdList.forEach((sppd, index) => {
            const row = document.createElement('tr');

            // PERBAIKAN: Tambahkan kelas jika SPPD ini terkait dengan pegawai yang dibatalkan
            const rowClass = sppd.is_canceled ? 'bg-red-50 dark:bg-red-900/20' : '';
            row.className = rowClass;

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${index + 1}.</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${sppd.nomor_sppd}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 dark:text-gray-400">${sppd.nomor_surat}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 dark:text-gray-400">${sppd.pegawai_nama}</div>
                    <div class="text-sm text-gray-500">NIP. ${sppd.pegawai_nip}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">
                    ${formatDate(sppd.tanggal_sppd)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/cetak/sppd-detail/${sppd.id}" target="_blank" class="text-green-600 hover:text-green-900" title="Cetak SPPD">
                        <i class="fas fa-print"></i>
                    </a>
                </td>
            `;
            sppdTableBody.appendChild(row);
        });
    };

    const loadSppdList = async () => {
        if (!sppdTableBody) return;
        sppdTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data SPPD...</td></tr>`;
        try {
            const response = await fetch('/api/sppd');
            if (!response.ok) throw new Error('Gagal memuat data SPPD.');
            const result = await response.json();
            renderSppdList(result.data);
        } catch (error) {
            sppdTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    const setupTabs = () => {
        if (!sptTab || !sppdTab) return;

        sptTab.addEventListener('click', () => switchTab(sptTab, sptPanel));
        sppdTab.addEventListener('click', () => switchTab(sppdTab, sppdPanel));

        // Set state awal
        switchTab(sptTab, sptPanel);
    };

    // --- LOGIKA MODAL PANJAR ---

    // Jadikan fungsi ini global agar bisa diakses dari file lain (misal: uang-muka.js)
    window.openPanjarModal = async (data = null) => {
        if (!panjarModal) return;

        rincianBiayaContainer.innerHTML = ''; // Kosongkan rincian
        panjarTanggalInput.value = new Date().toISOString().split('T')[0]; // Set tanggal hari ini
        document.getElementById('panjar-id').value = '';
        panjarForm.reset(); // Pindahkan reset ke sini

        await loadPanjarDropdowns(); // Muat semua opsi dropdown
        panjarSptSelect.dispatchEvent(new Event('change')); // Trigger change untuk reset pelaksana

        if (data && data.id) { // Periksa apakah ada data dan ID (mode edit)
            // === MODE EDIT ===
            document.getElementById('panjar-id').value = data.id;
            document.getElementById('panjar_tempat').value = data.tempat;
            document.getElementById('panjar_tanggal').value = data.tanggal_panjar;
            panjarSptSelect.value = data.spt_id;

            // PERBAIKAN: Trigger 'change' pada SPT untuk memuat SEMUA pegawai terkait dalam mode edit.
            // Event ini akan menjalankan listener yang sudah kita perbaiki sebelumnya.
            await panjarSptSelect.dispatchEvent(new Event('change'));

            // Setelah daftar pelaksana dimuat (tanpa filter), kita bisa set nilainya.
            // Beri jeda singkat untuk memastikan DOM sudah diperbarui oleh event 'change'.
            await new Promise(resolve => setTimeout(resolve, 50));

            panjarBendaharaSelect.value = data.bendahara_id;
            panjarPelaksanaSelect.value = data.pelaksana_id;
            panjarPejabatSelect.value = data.pejabat_id;

            // Isi rincian biaya
            if (data.rincian && data.rincian.length > 0) {
                data.rincian.forEach(item => addRincianBiayaRow(item));
            } else {
                addRincianBiayaRow(); // Tambah baris kosong jika tidak ada rincian
            }

        } else {
            // === MODE TAMBAH BARU ===
            // PERBAIKAN: Atur nilai default SETELAH form di-reset.
            document.getElementById('panjar_tempat').value = 'Nanga Pinoh';
            addRincianBiayaRow(); // Tambah satu baris rincian default
        }

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
    const addRincianBiayaRow = (item = null) => {
        if (!rincianBiayaContainer) return;
        const template = document.getElementById('rincian-biaya-template');
        const newRow = template.content.cloneNode(true);

        if (item) {
            newRow.querySelector('[name="uraian"]').value = item.uraian || '';
            newRow.querySelector('[name="jumlah"]').value = formatCurrency(item.jumlah);
            newRow.querySelector('[name="keterangan"]').value = item.keterangan || '';
        }

        rincianBiayaContainer.appendChild(newRow);
    };

    // Event listener untuk perubahan dropdown SPT di modal panjar
    panjarSptSelect.addEventListener('change', async (e) => {
        const sptId = e.target.value;
        const panjarId = document.getElementById('panjar-id').value;
        const isEditMode = !!panjarId;

        panjarPelaksanaSelect.disabled = true;
        // PERBAIKAN: Ambil elemen tombol simpan dan notifikasi
        const submitBtn = panjarForm.querySelector('button[type="submit"]');
        const submitButton = document.getElementById('submit-panjar-button');
        let panjarNotif = document.getElementById('panjar-pelaksana-notif');
        if (panjarNotif) panjarNotif.classList.add('hidden');
        // PERBAIKAN: Selalu aktifkan tombol simpan di awal setiap kali SPT diganti.
        // Tombol akan dinonaktifkan lagi nanti jika memang diperlukan.
        if (submitBtn) submitBtn.disabled = false;
        if (submitButton) submitButton.disabled = false;

        panjarPelaksanaSelect.innerHTML = '<option value="">-- Memuat... --</option>';
        if (!sptId) {
            panjarPelaksanaSelect.innerHTML = '<option value="">-- Pilih SPT terlebih dahulu --</option>';
            return;
        }

        try {
            const sptRes = await fetch(`/api/spt/${sptId}`);
            if (!sptRes.ok) throw new Error('Gagal mengambil detail pegawai SPT.');
            const sptDetail = await sptRes.json();

            let availablePegawai = sptDetail.pegawai;

            // PERBAIKAN: Hanya lakukan penyaringan jika dalam mode TAMBAH BARU
            if (!isEditMode) {
                const panjarRes = await fetch(`/api/panjar/by-spt/${sptId}`);
                const existingPanjarMap = panjarRes.ok ? await panjarRes.json() : {};
                const pegawaiDenganPanjar = Object.keys(existingPanjarMap);

                // Saring pegawai yang belum memiliki panjar
                availablePegawai = sptDetail.pegawai.filter(p => !pegawaiDenganPanjar.includes(p.pegawai_id.toString()));
            }

            panjarPelaksanaSelect.innerHTML = '<option value="">-- Pilih Pegawai Pelaksana --</option>';
            if (availablePegawai.length > 0) {
                availablePegawai.forEach(p => {
                    const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.pegawai_id);
                    panjarPelaksanaSelect.appendChild(option);
                });
                panjarPelaksanaSelect.disabled = false;
            } else {
                // Berikan pesan yang sesuai tergantung mode
                if (isEditMode) {
                    panjarPelaksanaSelect.innerHTML = '<option value="">-- Tidak ada pegawai di SPT ini --</option>';
                } else {
                    panjarPelaksanaSelect.innerHTML = '<option value="">-- Semua pegawai sudah menerima uang muka --</option>';
                    // PERBAIKAN: Tampilkan notifikasi dan nonaktifkan tombol simpan
                    if (!panjarNotif) {
                        panjarNotif = document.createElement('div');
                        panjarNotif.id = 'panjar-pelaksana-notif';
                        panjarNotif.className = 'mt-2 p-2 text-sm text-center rounded-md';
                        panjarPelaksanaSelect.parentNode.insertBefore(panjarNotif, panjarPelaksanaSelect.nextSibling);
                    }
                    panjarNotif.textContent = 'Semua pegawai terkait nomor surat tugas yang Anda pilih telah menerima uang muka.';
                    panjarNotif.classList.remove('hidden');
                    panjarNotif.classList.add('border', 'border-yellow-300', 'bg-yellow-50', 'text-yellow-700');

                    if (submitBtn) {
                        submitBtn.disabled = true;
                    }; // Nonaktifkan tombol simpan
                    if (submitButton) {
                        submitButton.disabled = true;
                    }; // Nonaktifkan tombol simpan

                    // PERBAIKAN: Pastikan dropdown pegawai juga dinonaktifkan
                    // saat tidak ada pegawai yang tersedia.
                    panjarPelaksanaSelect.disabled = true;
                }
            }
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

    // Fungsi untuk mengalihkan tab
    const switchTab = (selectedTab, selectedPanel) => {
        const tabs = [sptTab, sppdTab];
        const panels = [sptPanel, sppdPanel];

        tabs.forEach(tab => {
            tab.setAttribute('aria-selected', 'false');
            tab.classList.remove('bg-green-100', 'text-green-700', 'dark:text-indigo-500', 'dark:border-indigo-500');
            tab.classList.add('border-transparent', 'dark:hover:text-gray-300');
        });
        panels.forEach(panel => panel.classList.add('hidden'));

        selectedTab.setAttribute('aria-selected', 'true');
        selectedTab.classList.add('bg-green-100', 'text-green-700', 'dark:text-indigo-500', 'dark:border-indigo-500');
        selectedTab.classList.remove('dark:hover:text-gray-300');
        selectedPanel.classList.remove('hidden');
    };

    setupTabs();
    loadSppdList();
})();