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
    const pageLimitSelect = document.getElementById('page-limit-select'); // Ambil elemen dropdown baru
    let currentPageLimit = 5; // Nilai default
    const sptPaginationContainer = document.getElementById('spt-pagination-container');
    let currentSptPage = 1;
    let currentUserRole = 'user'; // Default role
    const sppdTableBody = document.getElementById('sppd-table-body');
    const sppdPaginationContainer = document.getElementById('sppd-pagination-container');

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
            row.className = 'item' // Tambahkan kelas 'item' untuk pencarian 

            // PERBAIKAN: Tandai pegawai yang dibatalkan dengan coretan
            const canceledPegawaiSet = new Set(spt.pegawai_dibatalkan || []);
            const pegawaiListHtml = (spt.pegawai && Array.isArray(spt.pegawai) && spt.pegawai.length > 0) ?
                `<ul>${spt.pegawai.map(pegawaiObj => { // pegawaiObj adalah {id, nama_lengkap, nip}
                    const isCanceled = canceledPegawaiSet.has(pegawaiObj.nama_lengkap);
                    const textClass = isCanceled ? 'line-through text-red-500' : 'dark:text-gray-400';
                    const title = isCanceled ? 'Tugas dibatalkan' : '';
                    return `<li class="list-disc ml-4 ${textClass}" title="${title}">${pegawaiObj.nama_lengkap}</li>`;
                }).join('')}</ul>`
                : '<span class="text-gray-400">Tidak ada</span>';

            const isCancelled = spt.status === 'dibatalkan';
            const hasReport = spt.laporan_count > 0;
            const hasPayment = spt.pembayaran_count > 0; // Tambahkan pengecekan ini

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
            // Terapkan kelas latar belakang berdasarkan status
            if (isCancelled) {
                row.className = 'item bg-red-50 dark:bg-red-900/20';
            } else if (hasPayment) {
                // PERMINTAAN: Tambahkan background jika sudah ada bukti bayar
                row.className = 'item bg-blue-200 dark:bg-navy-700/50';
            }
            sptTableBody.appendChild(row);
        });
    };

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

    const loadSptList = async (page = 1) => {
        // Guard clause: Jangan jalankan jika elemen tabel tidak ada di halaman ini
        if (!sptTableBody) {
            console.log("Melewati loadSptList karena 'spt-table-body' tidak ada di halaman ini.");
            return;
        }

        currentSptPage = page;
        sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        if (sptPaginationContainer) sptPaginationContainer.innerHTML = '';

        try {
            const [sptRes, sessionRes] = await Promise.all([
                fetch(`/api/spt?page=${page}&limit=${currentPageLimit}`),
                fetch('/api/user/session')
            ]);

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                currentUserRole = sessionData.user.role;
            }

            if (!sptRes.ok) {
                const errorData = await sptRes.json();
                throw new Error(errorData.message || 'Gagal memuat data SPT.');
            }
            const result = await sptRes.json();
            renderSptList(result.data, currentUserRole);
            renderPagination(sptPaginationContainer, result.pagination, loadSptList);

            // Ambil semua data SPT tanpa paginasi untuk modal panjar (jika diperlukan)
            const allSptRes = await fetch('/api/spt?limit=1000'); // Ambil semua
            if (allSptRes.ok) allSptData = (await allSptRes.json()).data;

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
            row.className = 'item'

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

    const loadSppdList = async (page = 1) => {
        if (!sppdTableBody) return;
        sppdTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data SPPD...</td></tr>`;
        if (sppdPaginationContainer) sppdPaginationContainer.innerHTML = '';
        try {
            const response = await fetch(`/api/sppd?page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memuat data SPPD.');
            }
            const result = await response.json();
            renderSppdList(result.data);
            renderPagination(sppdPaginationContainer, result.pagination, loadSppdList);
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
    window.openPanjarModal = async (data = null, isFromUangMukaPage = false) => {
        if (!panjarModal) return;

        rincianBiayaContainer.innerHTML = ''; // Kosongkan rincian
        panjarTanggalInput.value = new Date().toISOString().split('T')[0]; // Set tanggal hari ini
        document.getElementById('panjar-id').value = '';
        panjarForm.reset(); // Pindahkan reset ke sini

        await loadPanjarDropdowns(); // Muat semua opsi dropdown

        if (data && data.id) { // Periksa apakah ada data dan ID (mode edit)
            // === MODE EDIT ===
            document.getElementById('panjar-id').value = data.id;
            document.getElementById('panjar_tempat').value = data.tempat;
            panjarSptSelect.disabled = true; // Nonaktifkan pilihan SPT saat edit
            document.getElementById('panjar_tanggal').value = data.tanggal_panjar;
            panjarSptSelect.value = data.spt_id;

            // PERBAIKAN: Logika untuk memuat dan mengatur nilai pelaksana
            if (!isFromUangMukaPage) {
                // Jika dari halaman SPT Register, cukup trigger 'change' untuk memuat pelaksana.
                // Event listener 'change' akan menangani pengisian dropdown.
                panjarSptSelect.dispatchEvent(new Event('change'));
            } else {
                // Jika dari halaman Uang Muka, kita harus memuat pelaksana secara manual
                // karena event 'change' tidak di-trigger.
                const sptRes = await fetch(`/api/spt/${data.spt_id}`);
                if (sptRes.ok) {
                    const sptDetail = await sptRes.json();
                    panjarPelaksanaSelect.innerHTML = '<option value="">-- Pilih Pegawai Pelaksana --</option>';
                    sptDetail.pegawai.forEach(p => {
                        const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.pegawai_id);
                        panjarPelaksanaSelect.appendChild(option);
                    });
                }
            }

            // Setelah dropdown diisi, baru atur nilainya.
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
            panjarSptSelect.disabled = false; // Aktifkan pilihan SPT saat tambah baru
            panjarSptSelect.dispatchEvent(new Event('change')); // Trigger change untuk reset pelaksana
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
            try { // Ambil semua data SPT tanpa paginasi
                const response = await fetch('/api/spt?limit=1000');
                if (!response.ok) throw new Error('Gagal memuat data SPT untuk modal.');
                allSptData = (await response.json()).data;
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

        // PERBAIKAN: Dapatkan elemen notifikasi dan tombol simpan
        let panjarNotif = document.getElementById('panjar-pelaksana-notif');
        const submitButton = document.getElementById('submit-panjar-button');

        // Sembunyikan notifikasi dan aktifkan tombol simpan setiap kali SPT diganti
        if (panjarNotif) panjarNotif.classList.add('hidden');
        if (submitButton) submitButton.disabled = false;

        // Set status loading pada dropdown pelaksana
        panjarPelaksanaSelect.disabled = true;
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
                    // Buat elemen notifikasi jika belum ada
                    if (!panjarNotif) {
                        panjarNotif = document.createElement('div');
                        panjarNotif.id = 'panjar-pelaksana-notif';
                        panjarNotif.className = 'mt-2 p-2 text-sm text-center rounded-md border border-yellow-300 bg-yellow-50 text-yellow-700';
                        panjarPelaksanaSelect.parentNode.insertBefore(panjarNotif, panjarPelaksanaSelect.nextSibling);
                    }
                    panjarNotif.textContent = 'Semua pegawai terkait nomor surat tugas yang Anda pilih telah menerima uang muka.';
                    panjarNotif.classList.remove('hidden');

                    // Nonaktifkan tombol simpan dan dropdown pelaksana
                    if (submitButton) submitButton.disabled = true;
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

            // PERMINTAAN: Validasi Rincian Biaya
            // Pastikan ada setidaknya satu baris rincian
            if (data.rincian.length === 0) {
                alert('Harap tambahkan setidaknya satu rincian biaya.');
                return;
            }
            // Pastikan uraian dan jumlah pada setiap rincian tidak kosong
            const isRincianValid = data.rincian.every(item => item.uraian.trim() !== '' && item.jumlah > 0);
            if (!isRincianValid) {
                alert('Setiap rincian biaya harus memiliki Uraian dan Jumlah yang valid.');
                return;
            }

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

    // --- LOGIKA MODAL NOTIFIKASI HAPUS ---
    const createDeletionAlertModal = () => {
        const modalId = 'deletion-alert-modal';
        if (document.getElementById(modalId)) return; // Jangan buat jika sudah ada

        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 bg-gray-900 bg-opacity-60 z-[1001] hidden items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-auto flex flex-col">
                    <div class="flex justify-between items-center p-4 border-b bg-dark-navy rounded-t-lg">
                        <h3 class="text-xl font-semibold text-white">Peringatan</h3>
                        <button id="close-deletion-alert-modal" class="text-gray-300 hover:text-white">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="p-6 text-center">
                        <p id="deletion-alert-message" class="text-gray-700 dark:text-gray-300"></p>
                    </div>
                    <div class="flex justify-end items-center p-4 bg-dark-blue border-t rounded-b-lg">
                        <button id="ok-deletion-alert-button" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">Oke</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById(modalId);
        document.getElementById('close-deletion-alert-modal').addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('ok-deletion-alert-button').addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    };

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
                        if (!response.ok) {
                            // Lemparkan error dengan status untuk ditangkap di blok catch
                            const error = new Error(result.message || 'Gagal menghapus data.');
                            error.status = response.status;
                            throw error;
                        }
                        alert(result.message);
                        loadSptList(currentSptPage); // Muat ulang halaman saat ini
                    } catch (error) {
                        if (error.status === 409) { // 409 Conflict: SPT tidak bisa dihapus
                            const modal = document.getElementById('deletion-alert-modal');
                            document.getElementById('deletion-alert-message').textContent = error.message;
                            modal.classList.remove('hidden');
                        } else {
                            alert(`Gagal menghapus: ${error.message}`);
                        }
                    }
                }
            }
        });
    }

    // --- PERBAIKAN: Event listener untuk dropdown Filter batas halaman ---
    if (pageLimitSelect) {
        pageLimitSelect.addEventListener('change', (e) => {
            currentPageLimit = parseInt(e.target.value, 10);
            // Muat ulang kedua daftar dengan batas halaman yang baru, mulai dari halaman pertama
            loadSptList(1);
            loadSppdList(1);
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
        loadSptList(1);
    }

    // Fungsi untuk mengalihkan tab
    const switchTab = (selectedTab, selectedPanel) => {
        const tabs = [sptTab, sppdTab];
        const panels = [sptPanel, sppdPanel];

        tabs.forEach(tab => {
            tab.setAttribute('aria-selected', 'false');
            tab.classList.remove('bg-green-100', 'dark:bg-sky-900', 'text-green-800');
            tab.classList.add('border-transparent', 'dark:hover:text-gray-300', 'dark:border', 'dark:text-gray-300', 'dark:border-gray-700');
        });
        panels.forEach(panel => panel.classList.add('hidden'));

        selectedTab.setAttribute('aria-selected', 'true');
        selectedTab.classList.add('bg-green-100', 'dark:bg-sky-900', 'text-green-800', 'dark:text-gray-300');
        selectedTab.classList.remove('dark:hover:text-gray-300', 'dark:border', 'dark:border-gray-700');
        selectedPanel.classList.remove('hidden');
    };

    setupTabs();
    loadSppdList(1);
    createDeletionAlertModal(); // Buat modal saat halaman dimuat
})();