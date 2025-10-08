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

    // Elemen Modal Pembatalan
    const pembatalanModal = document.getElementById('pembatalan-modal');
    const closePembatalanModalBtn = document.getElementById('close-pembatalan-modal');
    const cancelPembatalanBtn = document.getElementById('cancel-pembatalan-button');
    const pembatalanForm = document.getElementById('pembatalan-form');
    const pembatalanSptIdInput = document.getElementById('pembatalan_spt_id');
    const pembatalanPegawaiSelect = document.getElementById('pembatalan_pegawai_id');

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
            const rowClass = isCancelled ? 'bg-red-50 dark:bg-red-900/20' : '';
            const hasReport = spt.laporan_count > 0;

            // Tombol aksi hanya aktif jika SPT belum dibatalkan
            const actionButtons = (role === 'admin' || role === 'superadmin') && !isCancelled
                ? `<a href="/edit-spt/${spt.id}" class="edit-btn text-yellow-600 hover:text-yellow-900 ml-4" title="Edit SPT">
                       <i class="fas fa-edit"></i>
                   </a>
                   <button data-id="${spt.id}" data-nomor="${spt.nomor_surat}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus SPT">
                       <i class="fas fa-trash"></i>
                   </button>`
                : '';

            // Logika untuk tombol/status laporan
            const reportButton = isCancelled
                ? `<span class="text-red-500 font-semibold ml-4">Telah Dibatalkan</span>`
                : (!hasReport)
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
                    <button data-id="${spt.id}" data-nomor="${spt.nomor_surat}" class="cancel-spt-btn text-orange-500 hover:text-orange-700 ml-4" title="Batalkan Perjalanan">
                        <i class="fas fa-ban"></i>
                    </button>
                    ${reportButton}
                    ${actionButtons}
                </td>
            `;
            row.className = rowClass;
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

    const renderSppdList = (sppdList) => {
        if (!sppdTableBody) return;
        sppdTableBody.innerHTML = '';

        if (!sppdList || sppdList.length === 0) {
            sppdTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data SPPD yang dibuat.</td></tr>`;
            return;
        }

        sppdList.forEach(sppd => {
            const row = document.createElement('tr');

            // PERBAIKAN: Tambahkan kelas jika SPPD ini terkait dengan pegawai yang dibatalkan
            const rowClass = sppd.is_canceled ? 'bg-red-50 dark:bg-red-900/20' : '';
            row.className = rowClass;

            row.innerHTML = `
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

        panjarForm.reset();
        rincianBiayaContainer.innerHTML = ''; // Kosongkan rincian
        panjarTanggalInput.value = new Date().toISOString().split('T')[0]; // Set tanggal hari ini
        document.getElementById('panjar-id').value = '';

        await loadPanjarDropdowns(); // Muat semua opsi dropdown

        if (data) {
            // === MODE EDIT ===
            document.getElementById('panjar-id').value = data.id;
            document.getElementById('panjar_tempat').value = data.tempat;
            document.getElementById('panjar_tanggal').value = data.tanggal_panjar;

            // 1. Set nilai dropdown SPT terlebih dahulu
            panjarSptSelect.value = data.spt_id;

            // 2. Trigger event 'change' secara manual dan TUNGGU hingga selesai
            // Ini akan memuat daftar pelaksana yang sesuai dengan SPT yang dipilih
            await panjarSptSelect.dispatchEvent(new Event('change'));

            // 3. Setelah daftar pelaksana dimuat, baru set nilai untuk dropdown lainnya
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

    // --- LOGIKA MODAL PEMBATALAN ---
    const openPembatalanModal = async (sptId, nomorSurat) => {
        if (!pembatalanModal) return;

        pembatalanForm.reset();
        pembatalanSptIdInput.value = sptId;
        document.getElementById('pembatalan-modal-title').textContent = `Batalkan Perjalanan (SPT: ${nomorSurat})`;
        document.getElementById('pembatalan_tanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('pembatalan_tempat').value = 'Nanga Pinoh';
        document.getElementById('pembatalan_rincian_biaya').readOnly = false;
        document.getElementById('pembatalan_nominal_biaya').readOnly = false;

        // Reset toggle
        const toggle = document.getElementById('pembatalan-panjar-toggle');
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));

        // Isi dropdown pegawai
        pembatalanPegawaiSelect.innerHTML = '<option value="">-- Memuat Pegawai... --</option>';
        try {
            const res = await fetch(`/api/spt/${sptId}`);
            if (!res.ok) throw new Error('Gagal memuat detail SPT');
            const sptDetail = await res.json();

            pembatalanPegawaiSelect.innerHTML = '<option value="">-- Pilih Pegawai --</option>';
            sptDetail.pegawai.forEach(p => {
                const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.pegawai_id);
                pembatalanPegawaiSelect.appendChild(option);
            });

            pembatalanModal.classList.remove('hidden');
        } catch (error) {
            alert(error.message);
        }
    };

    const closePembatalanModal = () => {
        if (pembatalanModal) pembatalanModal.classList.add('hidden');
    };

    // Event listener untuk toggle ambil data panjar
    const pembatalanPanjarToggle = document.getElementById('pembatalan-panjar-toggle');
    if (pembatalanPanjarToggle) {
        pembatalanPanjarToggle.addEventListener('change', async (e) => {
            const isChecked = e.target.checked;
            const rincianInput = document.getElementById('pembatalan_rincian_biaya');
            const nominalInput = document.getElementById('pembatalan_nominal_biaya');
            const notifElement = document.getElementById('pembatalan-panjar-notif');
            const sptId = pembatalanSptIdInput.value;
            const pegawaiId = pembatalanPegawaiSelect.value;

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

                    rincianInput.value = data.uraian;
                    nominalInput.value = formatCurrency(data.total);
                    rincianInput.readOnly = true;
                    nominalInput.readOnly = true;
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
                rincianInput.readOnly = false;
                nominalInput.readOnly = false;
                notifElement.classList.add('hidden');
            }
        });
    }

    // Event listener untuk perubahan dropdown pegawai di modal pembatalan
    const pembatalanPegawaiSelectChange = () => {
        // Reset toggle setiap kali pegawai diganti
        const toggle = document.getElementById('pembatalan-panjar-toggle');
        if (toggle) {
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
        }
    };

    if (pembatalanPegawaiSelect) {
        pembatalanPegawaiSelect.addEventListener('change', pembatalanPegawaiSelectChange);
    }

    // Event listener untuk input manual nominal biaya
    const nominalBiayaInput = document.getElementById('pembatalan_nominal_biaya');
    if (nominalBiayaInput) {
        nominalBiayaInput.addEventListener('input', (e) => {
            // Hanya format jika tidak dalam mode readonly (diambil dari panjar)
            if (!e.target.readOnly) {
                e.target.value = formatCurrency(e.target.value);
            }
        });
    }

    // Event listener untuk input manual rincian biaya
    const rincianBiayaInput = document.getElementById('pembatalan_rincian_biaya');
    if (rincianBiayaInput) {
        rincianBiayaInput.addEventListener('input', (e) => {
            // Jika user mulai mengetik manual, pastikan toggle mati
            const toggle = document.getElementById('pembatalan-panjar-toggle');
            if (toggle && toggle.checked) {
                toggle.checked = false;
                toggle.dispatchEvent(new Event('change'));
            }
        });
    }

    // Handle submit form pembatalan
    if (pembatalanForm) {
        pembatalanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(pembatalanForm);
            const data = Object.fromEntries(formData.entries());
            data.nominal_biaya = data.nominal_biaya.replace(/[^0-9]/g, ''); // Bersihkan format currency

            try {
                const response = await fetch('/api/spt/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                alert(result.message);
                closePembatalanModal();
                loadSptList(); // Muat ulang daftar SPT
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Event delegation untuk tombol hapus
    if (sptTableBody) {
        sptTableBody.addEventListener('click', async (event) => {
            const cancelBtn = event.target.closest('.cancel-spt-btn');
            if (cancelBtn) {
                const id = cancelBtn.dataset.id;
                const nomor = cancelBtn.dataset.nomor;
                openPembatalanModal(id, nomor);
            }

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
    if (closePembatalanModalBtn) closePembatalanModalBtn.addEventListener('click', closePembatalanModal);
    if (cancelPembatalanBtn) cancelPembatalanBtn.addEventListener('click', closePembatalanModal);

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
            tab.classList.remove('text-indigo-600', 'border-indigo-600', 'dark:text-indigo-500', 'dark:border-indigo-500');
            tab.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
        });
        panels.forEach(panel => panel.classList.add('hidden'));

        selectedTab.setAttribute('aria-selected', 'true');
        selectedTab.classList.add('text-indigo-600', 'border-indigo-600', 'dark:text-indigo-500', 'dark:border-indigo-500');
        selectedTab.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
        selectedPanel.classList.remove('hidden');
    };

    setupTabs();
    loadSppdList();
})();