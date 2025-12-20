// public/js/pembayaran.js
(function () {
    // Elemen Modal Bukti Bayar
    const openModalBtn = document.getElementById('buat-bukti-button');
    const modal = document.getElementById('pembayaran-modal');
    const closeModalBtn = document.getElementById('close-pembayaran-modal-button');
    const cancelBtn = document.getElementById('cancel-pembayaran-button');
    const pembayaranForm = document.getElementById('pembayaran-form');
    const modalTitle = document.getElementById('pembayaran-modal-title');
    const pembayaranIdInput = document.getElementById('pembayaran-id');

    // Elemen Modal Pengeluaran Rill
    const openPengeluaranRillBtn = document.getElementById('pengeluaran-rill-button');
    const pengeluaranRillModal = document.getElementById('pengeluaran-rill-modal');
    const closePengeluaranRillBtn = document.getElementById('close-pengeluaran-rill-modal-button');
    const cancelPengeluaranRillBtn = document.getElementById('cancel-pengeluaran-rill-button');
    const pengeluaranRillForm = document.getElementById('pengeluaran-rill-form');
    const pengeluaranSptSelect = document.getElementById('pengeluaran_spt_id');
    const pengeluaranRillIdInput = document.getElementById('pengeluaran-rill-id');
    const pengeluaranPelaksanaSelect = document.getElementById('pengeluaran_pelaksana_id');

    // Elemen Form
    const anggaranSelect = document.getElementById('anggaran_id');
    const sptSelect = document.getElementById('spt_id');
    const pptkSelect = document.getElementById('pptk_id');
    const namaPenerimaTextarea = document.getElementById('nama_penerima');
    const uraianPembayaranTextarea = document.getElementById('uraian_pembayaran');
    const nominalBayarInput = document.getElementById('nominal_bayar');
    const uangHarianInfoContainer = document.getElementById('uang-harian-info-container');
    const uangHarianDetails = document.getElementById('uang-harian-details');
    const uangHarianAnalysisContainer = document.getElementById('uang-harian-analysis');

    // Elemen Tabel Rincian
    const rincianContainer = document.getElementById('rincian-pengeluaran-container');
    const rincianTableBody = document.getElementById('rincian-pengeluaran-body');

    // Elemen List/Tabel
    const pembayaranTableBody = document.getElementById('pembayaran-table-body');
    const pengeluaranRillTableBody = document.getElementById('pengeluaran-rill-table-body');

    // Elemen Tab
    const buktiBayarTab = document.getElementById('bukti-bayar-tab');
    const pengeluaranRillTab = document.getElementById('pengeluaran-rill-tab');
    const buktiBayarPanel = document.getElementById('bukti-bayar-panel');
    const pengeluaranRillPanel = document.getElementById('pengeluaran-rill-panel');

    // Elemen Paginasi
    const pembayaranPaginationContainer = document.getElementById('pembayaran-pagination-container');
    const pengeluaranRillPaginationContainer = document.getElementById('pengeluaran-rill-pagination-container');

    const pageLimitSelect = document.getElementById('page-limit-select');
    let currentPageLimit = 5;
    let currentPage = 1;

    const formatCurrency = (value) => {
        const numberString = String(value || '').replace(/[^0-9-]/g, '');
        const number = parseFloat(numberString);
        if (isNaN(number)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    const formatInputCurrency = (value) => {
        if (!value) return '';
        const number = parseFloat(String(value).replace(/[^0-9]/g, ''));
        return isNaN(number) ? '' : new Intl.NumberFormat('id-ID').format(number);
    };

    const parseCurrency = (value) => {
        const numberString = String(value || '').replace(/[^0-9-]/g, '');
        const number = parseFloat(numberString);
        return isNaN(number) ? 0 : number;
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
        wrapper.className = 'flex items-center justify-between fixed bottom-[-0.35rem] left-[17rem] right-0 bg-[#f5f9fc] dark:bg-slate-800 px-4 py-3 sm:px-6';

        const pageInfo = document.createElement('div');
        pageInfo.innerHTML = `<p class="text-sm text-navy-500 dark:text-gray-400">
            Halaman <span class="font-medium">${page}</span> dari <span class="font-medium">${totalPages}</span>
        </p>`;

        const navButtons = document.createElement('div');
        navButtons.className = 'flex-1 flex justify-end items-center';

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

    // Function to open the modal
    const openModal = () => {
        pembayaranForm.reset();
        pembayaranIdInput.value = '';
        modalTitle.textContent = 'Buat Bukti Pembayaran Baru';
        sptTomSelect.enable();
        anggaranTomSelect.enable(); // Pastikan anggaran bisa dipilih saat buat baru
        pptkTomSelect.enable(); // Pastikan PPTK bisa dipilih saat buat baru
        sptTomSelect.clear();
        clearRincian();
        uangHarianInfoContainer.classList.add('hidden');
        uangHarianAnalysisContainer.innerHTML = '';
        modal.classList.remove('hidden');
    };

    // Fungsi untuk membuka modal dalam mode edit
    const openModalForEdit = async (id) => {
        try {
            const response = await fetch(`/api/pembayaran/${id}`);
            if (!response.ok) throw new Error('Gagal memuat data pembayaran untuk diedit.');
            const data = await response.json();

            pembayaranForm.reset();
            pembayaranIdInput.value = data.id;
            modalTitle.textContent = 'Edit Bukti Pembayaran';

            anggaranTomSelect.setValue(data.anggaran_id);
            sptTomSelect.setValue(data.spt_id);
            pptkTomSelect.setValue(data.pptk_id);
            sptTomSelect.disable();
            anggaranTomSelect.disable(); // Nonaktifkan juga saat edit
            pptkTomSelect.disable(); // Nonaktifkan juga saat edit

            // PERBAIKAN: Trigger change event dan tunggu DOM diperbarui.
            // Ini memastikan elemen rincian sudah ada sebelum kita mengisi panjar.
            sptSelect.dispatchEvent(new Event('change'));
            await new Promise(resolve => setTimeout(resolve, 100)); // Beri jeda singkat untuk render

            // Isi sisa form setelah rincian dimuat
            namaPenerimaTextarea.value = data.nama_penerima;
            uraianPembayaranTextarea.value = data.uraian_pembayaran;

            // Terapkan nilai panjar yang tersimpan
            if (data.panjar_data) {
                const savedPanjarData = JSON.parse(data.panjar_data);
                savedPanjarData.forEach(panjarItem => {
                    const panjarInput = rincianContainer.querySelector(`.panjar-input[data-pegawai-id="${panjarItem.pegawai_id}"]`);
                    if (panjarInput) {
                        panjarInput.value = new Intl.NumberFormat('id-ID').format(panjarItem.nilai_panjar);
                        // Trigger "Terapkan" secara programatik
                        const terapkanBtn = panjarInput.nextElementSibling;
                        if (terapkanBtn && terapkanBtn.classList.contains('terapkan-panjar-btn')) {
                            terapkanBtn.click(); // Simulate click to apply panjar and recalculate
                        }
                    }
                });
            }

            // Hitung ulang total di akhir untuk memastikan nominal bayar sesuai
            recalculateGrandTotal();
            modal.classList.remove('hidden');

        } catch (error) {
            alert(error.message);
        }
    };

    // Function to close the modal
    const closeModal = () => {
        modal.classList.add('hidden');
        pembayaranForm.reset();
        if (anggaranTomSelect) anggaranTomSelect.clear();
        if (sptTomSelect) sptTomSelect.clear();
        if (pptkTomSelect) pptkTomSelect.clear();
        clearRincian();
        uangHarianInfoContainer.classList.add('hidden');
        uangHarianAnalysisContainer.innerHTML = '';
    };

    // --- PERUBAHAN: Fungsi untuk menampilkan modal notifikasi ---
    const showInfoModal = (title, message) => {
        // Hapus modal lama jika ada untuk mencegah duplikasi
        const oldModal = document.getElementById('info-modal-pembayaran');
        if (oldModal) {
            oldModal.remove();
        }

        const modalHtml = `
            <div id="info-modal-pembayaran" class="fixed inset-0 bg-gray-900 bg-opacity-60 z-[1001] flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-auto flex flex-col animate-fadeIn">
                    <div class="flex justify-between items-center p-4 border-b bg-dark-navy rounded-t-lg">
                        <h3 class="text-xl font-semibold text-white">${title}</h3>
                        <button id="close-info-modal-btn" class="text-gray-300 hover:text-white">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="p-6 text-center">
                        <p class="text-gray-700 dark:text-gray-300">${message}</p>
                    </div>
                    <div class="flex justify-end items-center p-4 bg-dark-blue border-t rounded-b-lg">
                        <button id="ok-info-modal-btn" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400">Oke</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('close-info-modal-btn').addEventListener('click', () => document.getElementById('info-modal-pembayaran').remove());
        document.getElementById('ok-info-modal-btn').addEventListener('click', () => document.getElementById('info-modal-pembayaran').remove());
    };

    // Variabel untuk menyimpan data SPT lengkap
    let sptDataMap = new Map();
    // Variabel untuk menyimpan data Anggaran lengkap
    let anggaranDataMap = new Map();

    // Variabel untuk menyimpan instance TomSelect
    let anggaranTomSelect = null;
    let sptTomSelect = null;
    let pptkTomSelect = null;

    // Memuat opsi untuk dropdown
    const loadDropdownOptions = async () => {
        try {
            const [anggaranRes, sptRes, pegawaiRes] = await Promise.all([
                // PERBAIKAN: Gunakan endpoint '/api/anggaran/options' yang mengembalikan data lengkap
                // dengan ID, tanpa agregasi yang salah.
                fetch(`/api/anggaran/options?t=${new Date().getTime()}`),
                fetch('/api/spt?limit=1000'), // PERBAIKAN: Minta hingga 1000 SPT untuk memastikan semua data termuat
                fetch('/api/pegawai')
            ]);

            if (anggaranTomSelect) anggaranTomSelect.destroy();
            if (sptTomSelect) sptTomSelect.destroy();
            if (pptkTomSelect) pptkTomSelect.destroy();

            // Proses Data Anggaran (endpoint baru mengembalikan array langsung)
            const anggaranList = await anggaranRes.json();
            anggaranDataMap.clear(); // Kosongkan map sebelum diisi
            anggaranSelect.innerHTML = '<option value="">-- Pilih Anggaran --</option>';
            anggaranList.forEach(a => {
                // PERBAIKAN: Sesuaikan teks opsi dengan data dari endpoint baru
                const infoKegiatan = [a.kegiatan, a.sub_kegiatan].filter(Boolean).join(' / ');
                const optionText = `${a.mata_anggaran_kode} - ${a.mata_anggaran_nama} (${infoKegiatan || 'Info kegiatan tidak tersedia'})`;
                const option = new Option(optionText, a.id);
                anggaranSelect.appendChild(option);
                anggaranDataMap.set(a.id.toString(), a); // Simpan data anggaran lengkap
            });

            if (!sptRes.ok) throw new Error('Gagal memuat data SPT.');
            const sptResult = await sptRes.json();
            // PERBAIKAN: Ekstrak array 'data' dari respons API yang dipaginasi.
            const sptList = sptResult.data || sptResult; // Fallback jika API mengembalikan array langsung

            sptDataMap.clear();
            sptSelect.innerHTML = '<option value="">-- Pilih SPT --</option>';
            sptList.forEach(spt => { // Sekarang sptList dijamin sebuah array
                const option = new Option(spt.nomor_surat, spt.id);
                sptSelect.appendChild(option);
                pengeluaranSptSelect.appendChild(option.cloneNode(true)); // Clone untuk modal pengeluaran riil
                sptDataMap.set(spt.id.toString(), spt);
            });

            // Load Pegawai untuk PPTK
            if (!pegawaiRes.ok) throw new Error('Gagal memuat data pegawai.');
            const pegawaiList = await pegawaiRes.json();
            pptkSelect.innerHTML = '<option value="">-- Pilih PPTK --</option>';
            pegawaiList.forEach(p => {
                const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.id);
                pptkSelect.appendChild(option);
            });

            anggaranTomSelect = new TomSelect(anggaranSelect, { sortField: { field: "text", direction: "asc" } });
            sptTomSelect = new TomSelect(sptSelect, { sortField: { field: "text", direction: "asc" } });
            pptkTomSelect = new TomSelect(pptkSelect, { sortField: { field: "text", direction: "asc" } });

            // Tambahkan event listener untuk perubahan pada dropdown anggaran
            anggaranTomSelect.on('change', (value) => {
                if (value) {
                    const selectedAnggaran = anggaranDataMap.get(value);
                    if (selectedAnggaran && selectedAnggaran.pptk_id) {
                        pptkTomSelect.setValue(selectedAnggaran.pptk_id);
                        pptkTomSelect.disable(); // Nonaktifkan dropdown PPTK
                    } else {
                        pptkTomSelect.clear();
                        pptkTomSelect.enable(); // Aktifkan jika tidak ada PPTK terkait
                    }
                }
            });


        } catch (error) {
            console.error('Error loading dropdowns:', error);
            alert(error.message);
        }
    };

    // Fungsi untuk merender rincian pengeluaran ke tabel
    const renderRincianPengeluaran = (pengeluaranList, penerimaList, spt_id) => {
        rincianTableBody.innerHTML = '';
        if (!pengeluaranList || pengeluaranList.length === 0) {
            rincianContainer.classList.add('hidden');
            uangHarianInfoContainer.classList.add('hidden');
            return;
        }

        let grandTotalDibayar = 0;
        let counter = 1;

        uangHarianAnalysisContainer.innerHTML = '';
        uangHarianInfoContainer.classList.remove('hidden');
        uangHarianDetails.textContent = `Perhitungan uang harian berdasarkan standar biaya yang berlaku.`;

        // PERBAIKAN: Iterasi langsung pada penerimaList, bukan pengeluaran.
        // Ini memastikan semua pegawai yang berhak (termasuk yang tidak punya input pengeluaran) tetap diproses.
        penerimaList.forEach(penerimaInfo => {
            const pegawaiId = penerimaInfo.id;
            const pengeluaran = pengeluaranList.find(p => p.pegawai_id == pegawaiId) || {};

            const rowsData = [];

            let notifMessage = `<b>${penerimaInfo.nama_lengkap}</b> (Jabatan: ${penerimaInfo.jabatan || 'N/A'}): `;
            let isSuccess = false;
            let uangHarianInfo = { harga_satuan: 0, satuan: 'OH', golongan: 'N/A' };

            if (penerimaInfo && penerimaInfo.uang_harian) {
                uangHarianInfo = penerimaInfo.uang_harian;
                if (uangHarianInfo.harga_satuan > 0) {
                    isSuccess = true;
                    notifMessage += `Berhasil menerapkan standar biaya ${uangHarianInfo.golongan} sebesar ${formatCurrency(uangHarianInfo.harga_satuan)} per ${uangHarianInfo.satuan}.`;
                } else {
                    notifMessage += `GAGAL menemukan standar biaya yang cocok untuk ${uangHarianInfo.golongan}. Tarif diatur ke 0. Periksa data di menu Standar Biaya.`;
                }
            } else {
                notifMessage += `GAGAL menemukan data uang harian. Pastikan pegawai ini dipilih sebagai penandatangan di laporan perjalanan dinas.`;
            }

            const notifElement = document.createElement('p');
            notifElement.innerHTML = notifMessage;
            notifElement.className = isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
            uangHarianAnalysisContainer.appendChild(notifElement);

            // PERBAIKAN FINAL: Cek dengan cara yang lebih robust untuk biaya representasi
            const isKepalaDinas = penerimaInfo.jabatan && penerimaInfo.jabatan.toLowerCase().includes('kepala dinas');
            const hasBiayaRepresentasi = penerimaInfo.biaya_representasi && penerimaInfo.biaya_representasi.harga > 0;

            if (isKepalaDinas) {
                const representasiNotif = document.createElement('p');
                if (hasBiayaRepresentasi) {
                    representasiNotif.innerHTML = `&nbsp;&nbsp;↳ Ditemukan Biaya Representasi (Eselon II) sebesar ${formatCurrency(penerimaInfo.biaya_representasi.harga)} per ${penerimaInfo.biaya_representasi.satuan}.`;
                    representasiNotif.className = 'text-sm text-green-600 dark:text-green-400';
                } else {
                    representasiNotif.innerHTML = `&nbsp;&nbsp;↳ <b>PERINGATAN:</b> Pegawai ini adalah Kepala Dinas tetapi standar biaya representasi tidak ditemukan atau nol. Periksa data di menu Standar Biaya (Tipe D).`;
                    representasiNotif.className = 'text-sm text-yellow-600 dark:text-yellow-400';
                }
                uangHarianAnalysisContainer.appendChild(representasiNotif);
            }

            // PERBAIKAN: Hitung jumlah hari dan total uang harian secara otomatis
            const jumlahHariHarian = (pengeluaran.akomodasi_malam || 0) + 1;
            const uangHarianTotal = uangHarianInfo.harga_satuan * jumlahHariHarian;

            // Tambahkan baris Uang Harian di awal
            rowsData.push({
                uraian: `Uang Harian (${uangHarianInfo.golongan})`,
                harga: uangHarianInfo.harga_satuan,
                satuan: uangHarianInfo.satuan,
                hari: jumlahHariHarian,
                jumlah: uangHarianTotal,
                isUangHarian: true
            });

            // PERBAIKAN FINAL: Tambahkan baris biaya representasi hanya jika ada dan harga > 0
            if (isKepalaDinas && hasBiayaRepresentasi) {
                // Atur jumlah hari representasi = jumlah malam akomodasi + 1.
                // Jika tidak ada akomodasi, defaultnya adalah 1 hari.
                const jumlahHariRepresentasi = (pengeluaran.akomodasi_malam || 0) + 1;
                const totalBiayaRepresentasi = penerimaInfo.biaya_representasi.harga * jumlahHariRepresentasi;
                const uraianRepresentasi = `${penerimaInfo.biaya_representasi.uraian} (Biaya Representasi)`;

                rowsData.push({
                    uraian: uraianRepresentasi,
                    harga: penerimaInfo.biaya_representasi.harga,
                    satuan: penerimaInfo.biaya_representasi.satuan,
                    hari: jumlahHariRepresentasi,
                    jumlah: totalBiayaRepresentasi,
                    isRepresentasi: true
                });
            }

            if (pengeluaran.transportasi_nominal > 0) rowsData.push({ uraian: `Biaya Transportasi (${pengeluaran.transportasi_jenis || 'N/A'})`, harga: pengeluaran.transportasi_nominal, satuan: 'PP', hari: '-', jumlah: pengeluaran.transportasi_nominal });
            if (pengeluaran.akomodasi_nominal > 0) rowsData.push({ uraian: `Biaya Akomodasi (${pengeluaran.akomodasi_jenis || 'N/A'})`, harga: pengeluaran.akomodasi_harga_satuan, satuan: 'Malam', hari: pengeluaran.akomodasi_malam, jumlah: pengeluaran.akomodasi_nominal });
            if (pengeluaran.kontribusi_nominal > 0) rowsData.push({ uraian: `Biaya Kontribusi (${pengeluaran.kontribusi_jenis || 'N/A'})`, harga: pengeluaran.kontribusi_nominal, satuan: 'OK', hari: '-', jumlah: pengeluaran.kontribusi_nominal });
            if (pengeluaran.lain_lain_nominal > 0) rowsData.push({ uraian: `Biaya Lain-lain (${pengeluaran.lain_lain_uraian || 'N/A'})`, harga: pengeluaran.lain_lain_nominal, satuan: 'OK', hari: '-', jumlah: pengeluaran.lain_lain_nominal });

            const rowCount = rowsData.length + 1;

            rowsData.forEach((rowData, index) => {
                const row = document.createElement('tr');
                row.classList.add('rincian-row');
                row.dataset.pegawaiId = pegawaiId;
                if (rowData.isRepresentasi) {
                    row.classList.add('representasi-row');
                }

                let namaTd = '';
                let noTd = '';
                if (index === 0) {
                    noTd = `<td class="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 text-center align-top" rowspan="${rowCount}">${counter++}</td>`;
                    namaTd = `<td class="px-4 py-2 text-sm text-gray-800 dark:text-white align-top" rowspan="${rowCount}">${penerimaInfo.nama_lengkap}</td>`;
                }

                row.innerHTML = `
                    ${noTd}
                    ${namaTd}
                    <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">${rowData.uraian}</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white">${formatCurrency(rowData.harga)}</td>
                    <td class="px-2 py-2 text-sm text-center text-gray-500 dark:text-gray-400">${rowData.satuan}</td>
                    <td class="px-2 py-2 text-sm text-center text-gray-500 dark:text-gray-400">${rowData.hari}</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white jumlah-biaya">${formatCurrency(rowData.jumlah)}</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white nilai-panjar">Rp 0</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white font-medium jumlah-dibayar">${formatCurrency(rowData.jumlah)}</td>
                `;
                rincianTableBody.appendChild(row);
            });

            // Tambah baris untuk Nilai Panjar
            const panjarRow = document.createElement('tr');
            panjarRow.classList.add('panjar-row');
            panjarRow.dataset.pegawaiId = pegawaiId;
            panjarRow.innerHTML = `
                <td colspan="6" class="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-400 font-bold">Nilai Panjar</td>
                <td class="px-4 py-2 text-sm text-right text-red-500 font-bold total-panjar-pegawai" data-pegawai-id="${pegawaiId}">Rp 0</td>
            `;
            rincianTableBody.appendChild(panjarRow);

            // Tambah baris untuk Total Dibayar per Pegawai
            const totalPegawaiRow = document.createElement('tr');
            totalPegawaiRow.classList.add('total-pegawai-row', 'bg-slate-50', 'dark:bg-slate-700');
            totalPegawaiRow.dataset.pegawaiId = pegawaiId;
            totalPegawaiRow.innerHTML = `
                <td colspan="8" class="px-4 py-2 text-right font-bold text-gray-800 dark:text-white bg-green-100 dark:bg-green-800">Jumlah Dibayar</td>
                <td class="px-4 py-2 text-right font-bold text-gray-800 dark:text-white total-dibayar-pegawai bg-green-100 dark:bg-green-800" data-pegawai-id="${pegawaiId}">Rp 0</td>
            `;
            rincianTableBody.appendChild(totalPegawaiRow);
        });

        recalculateGrandTotal();
        rincianContainer.classList.remove('hidden');
    };

    // Fungsi untuk mengambil dan menerapkan data panjar yang sudah ada secara otomatis
    const applyExistingPanjar = async (sptId) => {
        try {
            const response = await fetch(`/api/panjar/by-spt/${sptId}`);
            if (!response.ok) return; // Gagal secara diam-diam jika tidak ada panjar
            const panjarMap = await response.json();

            // Iterasi melalui data panjar yang diterima dari API
            for (const pegawaiId in panjarMap) {
                const panjarValue = panjarMap[pegawaiId] || 0;
                if (panjarValue <= 0) continue;

                // Terapkan nilai panjar ke setiap baris rincian untuk pegawai yang sesuai
                const rincianRows = rincianTableBody.querySelectorAll(`tr.rincian-row[data-pegawai-id="${pegawaiId}"]`);
                const panjarRows = rincianTableBody.querySelectorAll(`tr.panjar-row[data-pegawai-id="${pegawaiId}"] .total-panjar-pegawai`);

                distributePanjar(panjarValue, rincianRows);
                panjarRows.forEach(el => el.textContent = `${formatCurrency(panjarValue)}`);
            }
            // Hitung ulang total keseluruhan setelah semua panjar diterapkan
            recalculateGrandTotal();
        } catch (error) {
            console.warn('Gagal memuat data panjar otomatis:', error);
        }
    };

    // Fungsi untuk menghitung ulang semua total
    const recalculateGrandTotal = () => {
        let grandTotal = 0;

        document.querySelectorAll('tr.rincian-row').forEach(row => {
            const jumlahBiayaEl = row.querySelector('.jumlah-biaya');
            const nilaiPanjarEl = row.querySelector('.nilai-panjar');
            const jumlahDibayarEl = row.querySelector('.jumlah-dibayar');

            const jumlahBiaya = parseFloat(jumlahBiayaEl.textContent.replace(/[^0-9,-]+/g, '')) || 0;
            const nilaiPanjar = parseFloat(nilaiPanjarEl.textContent.replace(/[^0-9,-]+/g, '')) || 0;

            const jumlahDibayar = jumlahBiaya - nilaiPanjar;
            jumlahDibayarEl.textContent = formatCurrency(jumlahDibayar);
        });

        document.querySelectorAll('.total-dibayar-pegawai').forEach(totalEl => {
            const pegawaiId = totalEl.dataset.pegawaiId;
            let totalPegawai = 0;
            document.querySelectorAll(`tr.rincian-row[data-pegawai-id="${pegawaiId}"] .jumlah-dibayar`).forEach(jumlahDibayarEl => {
                totalPegawai += parseFloat(jumlahDibayarEl.textContent.replace(/[^0-9,-]+/g, '')) || 0;
            });
            totalEl.textContent = formatCurrency(totalPegawai);
            grandTotal += totalPegawai;
        });

        document.getElementById('total-dibayar').textContent = formatCurrency(grandTotal);
        nominalBayarInput.value = parseCurrency(formatCurrency(grandTotal));
    };

    const clearRincian = () => {
        rincianTableBody.innerHTML = '';
        rincianContainer.classList.add('hidden');
        uangHarianInfoContainer.classList.add('hidden');
        document.getElementById('total-dibayar').textContent = formatCurrency(0);
        nominalBayarInput.value = '';
    };

    // Event listener untuk perubahan pada dropdown SPT
    sptSelect.addEventListener('change', async (event) => {
        const selectedSptId = event.target.value;
        if (!selectedSptId) {
            namaPenerimaTextarea.value = '';
            uraianPembayaranTextarea.value = '';
            clearRincian();
            uangHarianInfoContainer.classList.add('hidden');
            return;
        }

        // --- LOGIKA BARU: Otomatisasi Pemilihan Anggaran ---
        const selectedSptData = sptDataMap.get(selectedSptId);
        if (selectedSptData && selectedSptData.anggaran_id) {
            // Atur nilai dropdown anggaran dan nonaktifkan
            anggaranTomSelect.setValue(selectedSptData.anggaran_id); // Ini akan memicu event 'change' pada anggaran
            anggaranTomSelect.disable();
        } else {
            // Jika SPT tidak punya anggaran, aktifkan dropdown agar bisa dipilih manual
            anggaranTomSelect.clear();
            anggaranTomSelect.enable();
        }

        const selectedSpt = sptDataMap.get(selectedSptId.toString());
        if (selectedSpt && selectedSpt.maksud_perjalanan) {
            uraianPembayaranTextarea.value = `Pembayaran Perjalanan Dinas dalam rangka ${selectedSpt.maksud_perjalanan}`;
        } else {
            uraianPembayaranTextarea.value = '';
        }

        const isEditMode = !!pembayaranIdInput.value;

        try {
            // Hanya jalankan pengecekan jika BUKAN dalam mode edit
            if (!isEditMode) {
                const paymentCheckResponse = await fetch(`/api/pembayaran/check/by-spt/${selectedSptId}`);
                const paymentCheckResult = await paymentCheckResponse.json();

                if (!paymentCheckResponse.ok || paymentCheckResult.exists) {
                    showInfoModal('Pembayaran Sudah Ada', 'Nama pelaksana pada Surat Tugas ini sudah pernah membuat bukti bayar.');
                    sptTomSelect.clear();
                    namaPenerimaTextarea.value = '';
                    uraianPembayaranTextarea.value = '';
                    clearRincian();
                    uangHarianInfoContainer.classList.add('hidden');
                    return;
                }
            }

            let result;
            if (isEditMode) {
                // --- PERBAIKAN FINAL: Mode Edit ---
                // Selalu panggil endpoint `/api/laporan/by-spt/{id}` untuk mendapatkan data pengeluaran yang sudah diinput
                // di laporan. Endpoint ini sudah dimodifikasi di backend untuk mengembalikan semua pelaksana dari SPT
                // meskipun laporan belum ada, sehingga menjamin semua nama tampil.
                const response = await fetch(`/api/laporan/by-spt/${selectedSptId}`);
                result = await response.json();
                if (!response.ok && response.status !== 404) {
                    throw new Error(result.message || 'Gagal mengambil data rincian untuk mode edit.');
                }
            } else {
                // --- Logika Lama: Mode Tambah Baru ---
                const response = await fetch(`/api/laporan/by-spt/${selectedSptId}`);
                result = await response.json();

                if (!response.ok) {
                    if (response.status === 404) {
                        showInfoModal('Informasi', 'Belum ada laporan yang dibuat untuk SPT ini. Buatlah laporan perjalanan dinas terlebih dahulu.');
                        namaPenerimaTextarea.value = '';
                        clearRincian();
                        uangHarianInfoContainer.classList.add('hidden');
                        return;
                    }
                    throw new Error(result.message || 'Gagal mengambil data penerima.');
                }
            }

            // Logika pengisian form tetap sama karena struktur data 'result' akan konsisten
            if (result.penerima && result.penerima.length > 0) {
                const penerimaText = result.penerima
                    .map(p => `${p.nama_lengkap} - NIP. ${p.nip}`)
                    .join('\n');
                namaPenerimaTextarea.value = penerimaText;
                renderRincianPengeluaran(result.pengeluaran || [], result.penerima, selectedSptId);
                await applyExistingPanjar(selectedSptId);
            } else {
                namaPenerimaTextarea.value = '';
                clearRincian();
            }


        } catch (error) {
            console.error("Gagal mengisi nama penerima:", error);
            alert(error.message);
            namaPenerimaTextarea.value = '';
            uraianPembayaranTextarea.value = '';
            clearRincian();
            uangHarianInfoContainer.classList.add('hidden');
        }
    });

    /**
     * Mendistribusikan nilai panjar ke setiap baris rincian biaya untuk seorang pegawai.
     * @param {number} panjarValue - Total nilai panjar untuk pegawai tersebut.
     * @param {NodeListOf<Element>} rincianRows - Kumpulan elemen <tr> rincian biaya pegawai.
     */
    const distributePanjar = (panjarValue, rincianRows) => {
        if (!rincianRows || rincianRows.length === 0) return;

        const itemCount = rincianRows.length;
        const baseAmount = Math.floor(panjarValue / itemCount);
        let remainder = panjarValue % itemCount;

        rincianRows.forEach((row) => {
            let amountForItem = baseAmount;
            if (remainder > 0) {
                amountForItem += 1;
                remainder--;
            }
            const panjarCell = row.querySelector('.nilai-panjar');
            if (panjarCell) {
                panjarCell.textContent = formatCurrency(amountForItem);
            }
        });
    };

    // Merender daftar pembayaran ke dalam tabel
    const renderPembayaranList = (pembayaranList) => {
        pembayaranTableBody.innerHTML = '';

        if (!pembayaranList || pembayaranList.length === 0) {
            pembayaranTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data pembayaran.</td></tr>`;
            return;
        }

        pembayaranList.forEach((p, index) => {
            const row = document.createElement('tr');
            row.className = 'item'; // Tambahkan kelas 'item' untuk pencarian
            row.innerHTML = `
                <td class="pl-4 pr-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-white">${index + 1}.</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-700 dark:text-white">${p.nomor_surat}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${new Date(p.tanggal_surat).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-white">${p.nomor_bukti}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-300">${new Date(p.tanggal_bukti).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </td>
                <td class="px-3 py-3">
                    <div class="text-sm text-gray-700 dark:text-white">${p.nama_penerima}</div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-white">
                    ${formatCurrency(p.nominal_bayar)}
                </td>
                <td class="pl-3 pr-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${p.id}" class="print-btn text-blue-600 hover:text-blue-900" title="Cetak Bukti">
                        <i class="fas fa-print"></i>
                    </button>
                    <button data-id="${p.id}" class="edit-btn text-indigo-600 hover:text-indigo-900 ml-4" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-id="${p.id}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            pembayaranTableBody.appendChild(row);
        });
    };

    // Memuat data pembayaran dari server
    const loadPembayaran = async (page = 1) => {

        // Guard clause: Jangan jalankan jika elemen tabel tidak ada di halaman ini
        if (!pembayaranTableBody) {
            console.log("Melewati loadPembayaran karena 'pembayaran-table-body' tidak ada di halaman ini.");
            return;
        }

        currentPage = page;
        pembayaranTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Memuat...</td></tr>`;

        if (!pembayaranPaginationContainer) pembayaranPaginationContainer.innerHTML = '';

        try {
            const response = await fetch(`/api/pembayaran?page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) throw new Error('Gagal memuat data pembayaran.');
            const result = await response.json();
            renderPembayaranList(result.data); // FIX: Hanya kirim data list
            renderGlobalPagination(pembayaranPaginationContainer, result.pagination, loadPembayaran); // FIX: Panggil renderPagination di sini
        } catch (error) {
            console.error('Error:', error);
            pembayaranTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // Handle form submission
    pembayaranForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(pembayaranForm);
        const data = Object.fromEntries(formData.entries());

        // PERBAIKAN: Ubah nominal_bayar dari string format ke angka sebelum dikirim
        data.nominal_bayar = parseCurrency(data.nominal_bayar);

        // PERBAIKAN: Jika dalam mode edit, pastikan spt_id disertakan karena dropdown dinonaktifkan.
        const id = pembayaranIdInput.value;
        if (id) {
            // PERBAIKAN: Ambil juga pptk_id secara manual karena dropdown mungkin dinonaktifkan
            if (pptkTomSelect.isDisabled) {
                data.pptk_id = pptkTomSelect.getValue();
            }
            // Ambil juga anggaran_id secara manual karena dropdown dinonaktifkan
            if (anggaranTomSelect.isDisabled) {
                data.anggaran_id = anggaranTomSelect.getValue();
            }
            data.spt_id = sptSelect.value;
        }

        // Kumpulkan data panjar dari setiap input
        const panjarData = [];
        document.querySelectorAll('.panjar-input').forEach(input => {
            const pegawaiId = input.dataset.pegawaiId;
            const nilaiPanjar = parseCurrency(input.value);
            if (pegawaiId && nilaiPanjar > 0) {
                panjarData.push({ pegawai_id: parseInt(pegawaiId), nilai_panjar: nilaiPanjar });
            }
        });
        data.panjar_data = JSON.stringify(panjarData); // Tambahkan ke objek data

        // PERBAIKAN FINAL: Pastikan pptk_id selalu terkirim, bahkan saat form tambah baru
        // dan dropdown dinonaktifkan.
        if (pptkTomSelect && pptkTomSelect.isDisabled) {
            data.pptk_id = pptkTomSelect.getValue();
        }

        // PERBAIKAN: Pastikan anggaran_id juga terkirim saat dropdown dinonaktifkan
        // pada mode tambah baru.
        if (anggaranTomSelect && anggaranTomSelect.isDisabled) {
            data.anggaran_id = anggaranTomSelect.getValue();
        }

        const isEditMode = !!id;
        const url = isEditMode ? `/api/pembayaran/${id}` : '/api/pembayaran';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data.');

            alert(result.message || 'Data berhasil disimpan!');
            closeModal();
            loadPembayaran();
        } catch (error) {
            // PERBAIKAN: Notifikasi error yang lebih jelas untuk debugging
            const debugMessage = `Gagal menyimpan data pembayaran.\n\nError: ${error.message}\n\nData yang dikirim:\n${JSON.stringify(data, null, 2)}`;
            console.error(debugMessage); // Log ke console untuk detail lengkap
            alert(`Error: ${error.message}\n\n(Lihat console browser untuk detail data yang gagal disimpan)`);
        }
    });

    // Event delegation untuk tombol Aksi
    pembayaranTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            openModalForEdit(id);
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus bukti pembayaran ini?')) {
                try {
                    const response = await fetch(`/api/pembayaran/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || 'Gagal menghapus data.');
                    loadPembayaran();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }

        if (target.classList.contains('print-btn')) {
            // PERBAIKAN: Buka halaman cetak di tab baru
            window.open(`/cetak/pembayaran/${id}`, '_blank');
        }
    });

    // --- LOGIKA MODAL PENGELUARAN RILL ---

    const openPengeluaranRillModal = async (id = null) => {
        pengeluaranRillForm.reset();
        pengeluaranRillIdInput.value = '';
        const modalTitle = document.getElementById('pengeluaran-rill-modal-title');

        if (id) {
            // Mode Edit
            modalTitle.textContent = 'Edit Pengeluaran Riil';
            try {
                const response = await fetch(`/api/pengeluaran-riil/${id}`);
                if (!response.ok) throw new Error('Gagal memuat data untuk diedit.');
                const data = await response.json();

                pengeluaranRillIdInput.value = data.id;
                pengeluaranSptSelect.value = data.spt_id;
                // Trigger change untuk memuat pelaksana, lalu pilih pelaksana yang sesuai
                await pengeluaranSptSelect.dispatchEvent(new Event('change'));
                // Beri jeda singkat agar dropdown pelaksana selesai dimuat
                await new Promise(resolve => setTimeout(resolve, 100));
                pengeluaranPelaksanaSelect.value = data.pegawai_id;

                document.getElementById('pengeluaran_uraian').value = data.uraian;
                document.getElementById('pengeluaran_jumlah').value = formatInputCurrency(data.jumlah);

            } catch (error) {
                alert(error.message);
                return; // Jangan buka modal jika data gagal dimuat
            }
        } else {
            // Mode Tambah Baru
            modalTitle.textContent = 'Tambah Pengeluaran Rell';
            pengeluaranPelaksanaSelect.innerHTML = '<option value="">-- Pilih SPT terlebih dahulu --</option>';
            pengeluaranPelaksanaSelect.disabled = true;
        }

        pengeluaranRillModal.classList.remove('hidden');
    };


    const closePengeluaranRillModal = () => {
        pengeluaranRillModal.classList.add('hidden');
    };

    // Event listener untuk perubahan dropdown SPT di modal pengeluaran riil
    pengeluaranSptSelect.addEventListener('change', async (e) => {
        const sptId = e.target.value;
        pengeluaranPelaksanaSelect.innerHTML = '<option value="">-- Memuat... --</option>';
        pengeluaranPelaksanaSelect.disabled = true;

        if (!sptId) {
            pengeluaranPelaksanaSelect.innerHTML = '<option value="">-- Pilih SPT terlebih dahulu --</option>';
            return;
        }

        // PERBAIKAN: Cek apakah laporan sudah dibuat untuk SPT ini
        try {
            const checkResponse = await fetch(`/api/laporan/check/by-spt/${sptId}`);
            const checkResult = await checkResponse.json();
            if (!checkResponse.ok || !checkResult.exists) {
                showInfoModal('Laporan Belum Dibuat', 'Laporan terkait Surat Tugas yang dipilih belum dibuat. Buat laporan terlebih dahulu.');
                // Reset dropdown dan hentikan proses
                e.target.value = '';
                pengeluaranPelaksanaSelect.innerHTML = '<option value="">-- Pilih SPT terlebih dahulu --</option>';
                return;
            }
        } catch (error) {
            alert('Gagal memverifikasi status laporan. Silakan coba lagi.');
            return;
        }

        try {
            const response = await fetch(`/api/spt/${sptId}`);
            if (!response.ok) throw new Error('Gagal mengambil detail pegawai SPT.');
            const sptDetail = await response.json();

            pengeluaranPelaksanaSelect.innerHTML = '<option value="">-- Pilih Pelaksana --</option>';
            sptDetail.pegawai.forEach(p => {
                const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.pegawai_id);
                pengeluaranPelaksanaSelect.appendChild(option);
            });
            pengeluaranPelaksanaSelect.disabled = false;
        } catch (error) {
            console.error("Error fetching SPT details for pengeluaran riil:", error);
            pengeluaranPelaksanaSelect.innerHTML = '<option value="">-- Gagal memuat --</option>';
        }
    });

    // Handle submit form pengeluaran riil
    pengeluaranRillForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = pengeluaranRillIdInput.value;
        const formData = new FormData(pengeluaranRillForm);
        const data = {
            spt_id: formData.get('spt_id'),
            pegawai_id: formData.get('pegawai_id'),
            uraian: formData.get('uraian'),
            jumlah: formData.get('jumlah').replace(/[^0-9]/g, '') // Bersihkan format currency
        };

        const isEditMode = !!id;
        const url = isEditMode ? `/api/pengeluaran-riil/${id}` : '/api/pengeluaran-riil';
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
            closePengeluaranRillModal();
            loadPengeluaranRill(); // Muat ulang data di tab
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // --- LOGIKA TAB PENGELUARAN RILL ---

    const loadPengeluaranRill = async (page = 1) => {
        if (!pengeluaranRillTableBody) {
            console.log("Melewati loadPengeluaranRill karena 'pengeluaran-riil-table-body' tidak ada di halaman ini.");
            return;
        }

        currentPage = page;
        pengeluaranRillTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        if (!pengeluaranRillPaginationContainer) pengeluaranRillPaginationContainer.innerHTML = '';

        try {
            const response = await fetch(`/api/pengeluaran-riil?page=${page}&limit=${currentPageLimit}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memuat data pengeluaran riil.');
            }
            const result = await response.json();
            renderPengeluaranRill(result.data);
            renderGlobalPagination(pengeluaranRillPaginationContainer, result.pagination, loadPengeluaranRill);
        } catch (error) {
            pengeluaranRillTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderPengeluaranRill = (dataList) => {
        pengeluaranRillTableBody.innerHTML = '';
        if (!dataList || dataList.length === 0) {
            pengeluaranRillTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data.</td></tr>`;
            return;
        }

        dataList.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item'; // Tambahkan kelas 'item' untuk pencarian
            row.innerHTML = `
                <td class="pl-4 pr-3 py-3 text-sm text-center text-gray-700 dark:text-gray-400">${index + 1}.</td>
                <td class="px-3 py-3 text-sm text-gray-800 dark:text-gray-400">${item.nama_pegawai}</td>
                <td class="px-3 py-3 text-sm text-gray-800 dark:text-gray-400">${item.uraian}</td>
                <td class="px-3 py-3 text-sm text-left text-gray-800 dark:text-gray-400">${formatCurrency(item.jumlah)}</td>
                <td class="pr-4 pl-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${item.id}" class="print-riil-btn text-blue-600 hover:text-blue-900" title="Cetak">
                        <i class="fas fa-print"></i>
                    </button>
                    <button data-id="${item.id}" class="edit-riil-btn text-indigo-600 hover:text-indigo-900 ml-4" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-id="${item.id}" class="delete-riil-btn text-red-600 hover:text-red-900 ml-4" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            pengeluaranRillTableBody.appendChild(row);
        });
    };


    // Event listeners untuk modal
    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // Event listeners untuk modal pengeluaran riil
    openPengeluaranRillBtn.addEventListener('click', () => openPengeluaranRillModal());
    closePengeluaranRillBtn.addEventListener('click', closePengeluaranRillModal);
    cancelPengeluaranRillBtn.addEventListener('click', closePengeluaranRillModal);
    pengeluaranRillModal.addEventListener('click', (event) => {
        if (event.target === pengeluaranRillModal) closePengeluaranRillModal();
    });
    document.getElementById('pengeluaran_jumlah').addEventListener('input', (e) => {
        e.target.value = formatInputCurrency(e.target.value);
    });

    if (pageLimitSelect) {
        pageLimitSelect.addEventListener('change', (e) => {
            currentPageLimit = parseInt(e.target.value, 10);
            loadPembayaran(1);
            loadPengeluaranRill(1);
            // Jika tab pengeluaran riil punya paginasi, panggil load-nya juga di sini
        });
    }

    // Event delegation untuk tombol aksi di tabel pengeluaran riil
    pengeluaranRillTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        if (target.classList.contains('edit-riil-btn')) {
            openPengeluaranRillModal(id);
        }

        if (target.classList.contains('delete-riil-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus data pengeluaran ini?')) {
                try {
                    const response = await fetch(`/api/pengeluaran-riil/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    loadPengeluaranRill();
                } catch (error) {
                    alert(`Gagal menghapus: ${error.message}`);
                }
            }
        }

        if (target.classList.contains('print-riil-btn')) {
            window.open(`/cetak/pengeluaran-riil/${id}`, '_blank');
        }
    });


    // --- LOGIKA TAB ---
    const switchTab = (selectedTab, selectedPanel) => {
        // Reset semua tab
        [buktiBayarTab, pengeluaranRillTab].forEach(tab => {
            if (tab) {
                tab.setAttribute('aria-selected', 'false');
                tab.classList.remove('bg-green-100', 'text-green-800', 'dark:bg-sky-900');
                tab.classList.add('border-transparent', 'dark:hover:text-gray-300', 'dark:border', 'dark:text-gray-300', 'dark:border-gray-700');
            }
        });

        // Reset semua panel
        [buktiBayarPanel, pengeluaranRillPanel].forEach(panel => {
            if (panel) panel.classList.add('hidden');
        });

        // Aktifkan tab dan panel yang dipilih
        if (selectedTab) {
            selectedTab.setAttribute('aria-selected', 'true');
            selectedTab.classList.add('bg-green-100', 'text-green-800', 'dark:bg-sky-900', 'dark:text-gray-300');
            selectedTab.classList.remove('dark:hover:text-gray-300', 'dark:border', 'dark:border-gray-700');
        }
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
        }
    };

    const setupTabs = () => {
        if (buktiBayarTab) {
            buktiBayarTab.addEventListener('click', () => switchTab(buktiBayarTab, buktiBayarPanel));
        }
        if (pengeluaranRillTab) {
            pengeluaranRillTab.addEventListener('click', () => {
                switchTab(pengeluaranRillTab, pengeluaranRillPanel);
                loadPengeluaranRill();
            });
        }
        // Set tab default saat halaman dimuat
        switchTab(buktiBayarTab, buktiBayarPanel);
    };

    // Inisialisasi halaman
    loadDropdownOptions();
    loadPembayaran();
    setupTabs();
})();