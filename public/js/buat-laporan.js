(function () {
    const form = document.getElementById('form-laporan');
    const sptSelect = document.getElementById('spt_id');
    const pageTitle = document.querySelector('h2');

    // Elemen form yang akan diisi otomatis
    const penandatanganContainer = document.getElementById('penandatangan-container');
    const dasarPerjalananEl = document.getElementById('dasar_perjalanan');
    const tujuanPerjalananEl = document.getElementById('tujuan_perjalanan');
    const lamaDanTanggalEl = document.getElementById('lama_dan_tanggal_perjalanan');
    const tempatDikunjungiEl = document.getElementById('tempat_dikunjungi');
    const kodeAnggaranDisplayEl = document.getElementById('kode_anggaran_display'); // Elemen baru

    // Elemen untuk upload file
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('lampiran-input');
    const filePreviewList = document.getElementById('file-preview-list');

    // Elemen Template
    const transportasiTemplate = document.getElementById('transportasi-template');
    const akomodasiTemplate = document.getElementById('akomodasi-template');
    const kontribusiTemplate = document.getElementById('kontribusi-template');
    const lainLainTemplate = document.getElementById('lain-lain-template');
    const pengeluaranPegawaiTemplate = document.getElementById('pengeluaran-pegawai-template');
    const pengeluaranPerPegawaiContainer = document.getElementById('pengeluaran-per-pegawai-container');

    let newFiles = []; // Menyimpan file baru yang akan diupload
    let existingFiles = []; // Menyimpan file yang sudah ada (mode edit)
    let deletedFiles = []; // Menyimpan ID file yang akan dihapus (mode edit)
    let accommodationStandards = {}; // Menyimpan standar biaya akomodasi per pegawai
    let objectUrls = new Map(); // Untuk menyimpan Object URL agar bisa di-revoke
    let isEditMode = false; // Flag untuk mode edit
    let isLoadingData = false; // Flag untuk mencegah pemanggilan berulang

    // --- Fungsi Helper untuk Format Angka ---
    const formatCurrency = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const number = parseFloat(String(value).replace(/[^0-9,-]+/g, '').replace(',', '.'));
        if (isNaN(number)) return '';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const parseCurrency = (value) => {
        return parseFloat(String(value || '').replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0;
    };

    const formatDate = (dateString) => {
        // Handle YYYY-MM-DD format for input type date
        if (dateString && dateString.includes('T')) {
            return dateString.split('T')[0];
        }
        if (!dateString) return '';
        const d = new Date(dateString);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    // --- FUNGSI DEBUGGING ---
    const debugLog = (message, data = null) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[DEBUG ${timestamp}] ${message}`;
        console.log(logMessage);
        if (data) console.log(data);

        // Tambahkan ke elemen debug jika ada (opsional)
        const debugContainer = document.getElementById('debug-container');
        if (debugContainer) {
            const debugEntry = document.createElement('div');
            debugEntry.className = 'text-xs text-gray-500 border-t pt-1 mt-1';
            debugEntry.textContent = logMessage;
            debugContainer.appendChild(debugEntry);

            // Batasi jumlah entri debug
            if (debugContainer.children.length > 50) {
                debugContainer.removeChild(debugContainer.firstChild);
            }
        }
    };

    // Fungsi untuk memuat SPT ke dropdown
    const loadSptOptions = async () => {
        debugLog('Memulai loadSptOptions');
        try {
            const response = await fetch('/api/spt');
            if (!response.ok) throw new Error('Gagal memuat data SPT.');
            const spts = await response.json();

            // Filter SPT yang aktif dan belum punya laporan
            const availableSpts = spts.filter(spt => spt.status === 'aktif' && spt.laporan_count === 0);
            debugLog(`SPT tersedia: ${availableSpts.length} dari ${spts.length} total`);

            availableSpts.forEach(spt => {
                const option = document.createElement('option');
                option.value = spt.id;
                option.textContent = spt.nomor_surat;
                option.dataset.spt = JSON.stringify(spt); // Simpan semua data SPT di dataset
                sptSelect.appendChild(option);
            });
            return availableSpts; // Kembalikan data yang sudah difilter
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // --- FUNGSI BARU: Mengatur visibilitas dan urutan rincian pengeluaran ---
    const updateAndReorderExpenseBlocks = () => {
        debugLog('Memulai updateAndReorderExpenseBlocks');
        const checkedSigners = Array.from(penandatanganContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const allExpenseBlocks = pengeluaranPerPegawaiContainer.querySelectorAll('.pengeluaran-pegawai-item');

        debugLog(`Penandatangan yang dicentang: ${checkedSigners.length}, Total blok: ${allExpenseBlocks.length}`);

        // 1. Sembunyikan semua blok terlebih dahulu
        allExpenseBlocks.forEach(block => {
            block.classList.add('hidden');
        });

        // 2. Tampilkan dan urutkan blok sesuai urutan checkbox yang dicentang
        checkedSigners.forEach(checkbox => {
            const pegawaiId = checkbox.value;
            const expenseBlock = pengeluaranPerPegawaiContainer.querySelector(`.pengeluaran-pegawai-item[data-pegawai-id="${pegawaiId}"]`);
            if (expenseBlock) {
                expenseBlock.classList.remove('hidden');
                pengeluaranPerPegawaiContainer.appendChild(expenseBlock); // Pindahkan ke akhir untuk mengurutkan
                debugLog(`Menampilkan blok untuk pegawai ID: ${pegawaiId}`);
            } else {
                debugLog(`Blok tidak ditemukan untuk pegawai ID: ${pegawaiId}`, { checkedSigners, allExpenseBlocks });
            }
        });
    };

    // Fungsi untuk mengisi data form berdasarkan SPT yang dipilih
    const populateFormFromSpt = async () => {
        if (isLoadingData) {
            debugLog('populateFormFromSpt dibatalkan - sedang loading data');
            return;
        }

        isLoadingData = true;
        debugLog('Memulai populateFormFromSpt');

        const selectedOption = sptSelect.options[sptSelect.selectedIndex];
        const sptId = selectedOption.value;

        if (!sptId) {
            debugLog('Tidak ada SPT yang dipilih, reset form');
            form.reset();
            // Sembunyikan dan kosongkan rincian pengeluaran jika tidak ada SPT dipilih
            document.getElementById('rincian-pengeluaran-section').classList.add('hidden');
            accommodationStandards = {}; // Reset standar biaya
            if (kodeAnggaranDisplayEl) kodeAnggaranDisplayEl.value = ''; // Kosongkan field anggaran
            pengeluaranPerPegawaiContainer.innerHTML = '';
            isLoadingData = false;
            return;
        }

        try {
            debugLog(`Mengambil detail SPT ID: ${sptId}`);
            // Ambil detail lengkap dari SPT, termasuk nama pegawai
            const response = await fetch(`/api/spt/${sptId}`);
            if (!response.ok) throw new Error('Gagal memuat detail SPT.');
            const sptDetail = await response.json();
            debugLog('Detail SPT berhasil diambil', sptDetail);

            // PERBAIKAN: Ambil dan tampilkan informasi anggaran
            if (kodeAnggaranDisplayEl) {
                try {
                    debugLog(`Mengambil data anggaran ID: ${sptDetail.anggaran_id}`);
                    const anggaranRes = await fetch(`/api/anggaran/${sptDetail.anggaran_id}`);
                    if (anggaranRes.ok) {
                        const anggaran = await anggaranRes.json();
                        kodeAnggaranDisplayEl.value = `${anggaran.mata_anggaran_kode} - ${anggaran.mata_anggaran_nama}`;
                        debugLog('Data anggaran berhasil dimuat');
                    } else {
                        kodeAnggaranDisplayEl.value = 'Data anggaran tidak ditemukan.';
                        debugLog('Data anggaran tidak ditemukan');
                    }
                } catch (e) {
                    kodeAnggaranDisplayEl.value = 'Gagal memuat data anggaran.';
                    debugLog('Error mengambil data anggaran', e);
                }
            }

            // Ambil standar biaya akomodasi untuk SPT ini
            try {
                debugLog('Mengambil standar biaya akomodasi');
                const standardsRes = await fetch(`/api/spt/${sptId}/accommodation-standards`);
                if (standardsRes.ok) {
                    accommodationStandards = await standardsRes.json();
                    debugLog('Standar biaya akomodasi berhasil dimuat', accommodationStandards);
                } else {
                    accommodationStandards = {};
                    debugLog('Standar biaya akomodasi tidak ditemukan');
                }
            } catch (e) {
                accommodationStandards = {};
                debugLog('Error mengambil standar biaya akomodasi', e);
            }

            // Ambil semua pegawai yang terlibat (pelaksana dan pengikut)
            // Urutkan agar pelaksana utama (bukan pengikut) selalu di atas.
            const semuaPelaksana = (sptDetail.pegawai || []).sort((a, b) => a.is_pengikut - b.is_pengikut);
            debugLog(`Jumlah pelaksana: ${semuaPelaksana.length}`);

            // Kosongkan kontainer dan tambahkan checkbox untuk setiap pelaksana
            penandatanganContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Pilih penandatangan laporan (otomatis dari SPT):</p>';

            if (semuaPelaksana.length > 0) {
                //Filter pegawai yang dibatalkan agar tidak dapat membuat laporan
                // PERBAIKAN: Buat Set dari ID pegawai yang dibatalkan untuk pengecekan cepat.
                const canceledPegawaiIds = new Set((sptDetail.pegawai_dibatalkan || []).map(p => p.pegawai_id));
                debugLog(`Pegawai yang dibatalkan: ${Array.from(canceledPegawaiIds)}`);

                semuaPelaksana.forEach(p => {
                    const isCanceled = canceledPegawaiIds.has(p.pegawai_id);
                    const isDisabled = isCanceled;
                    // Hanya centang pelaksana utama yang TIDAK dibatalkan
                    const isChecked = p.is_pengikut === 0 && !isCanceled;

                    const disabledClasses = isDisabled ? 'cursor-not-allowed' : '';
                    const labelTitle = isDisabled ? 'Pegawai telah batal tugas' : '';

                    const checkboxHtml = `
                        <div class="flex items-start ${disabledClasses}">
                            <input id="signer_${p.pegawai_id}" name="penandatangan_ids" type="checkbox" value="${p.pegawai_id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}
                                class="h-4 w-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                            <label for="signer_${p.pegawai_id}" class="ml-3 text-sm ${disabledClasses}" title="${labelTitle}">
                                <span class="font-medium text-gray-900 dark:text-gray-200">${p.nama_lengkap}</span>
                                <span class="text-gray-500 dark:text-gray-400 block">NIP. ${p.nip} | ${p.jabatan}</span>
                            </label>
                        </div>
                    `;
                    penandatanganContainer.insertAdjacentHTML('beforeend', checkboxHtml);
                    debugLog(`Checkbox dibuat untuk ${p.nama_lengkap} - checked: ${isChecked}, disabled: ${isDisabled}`);
                });
            } else {
                penandatanganContainer.innerHTML += '<p class="text-sm text-red-500">Tidak ada data pegawai ditemukan pada SPT ini.</p>';
                debugLog('Tidak ada data pegawai ditemukan');
            }

            // Tampilkan section rincian pengeluaran dan buat form untuk setiap pegawai
            document.getElementById('rincian-pengeluaran-section').classList.remove('hidden');
            pengeluaranPerPegawaiContainer.innerHTML = ''; // Kosongkan dulu

            semuaPelaksana.forEach(pegawai => {
                const templateContent = pengeluaranPegawaiTemplate.content.cloneNode(true);
                const pegawaiItem = templateContent.querySelector('.pengeluaran-pegawai-item');

                // Set judul dan ID unik untuk setiap blok pegawai
                pegawaiItem.querySelector('.pegawai-name-title').textContent = `Rincian untuk ${pegawai.nama_lengkap}`;
                pegawaiItem.dataset.pegawaiId = pegawai.pegawai_id;
                // Sembunyikan blok secara default
                pegawaiItem.classList.add('hidden');

                // PERUBAHAN: Tidak menambahkan baris biaya secara default. Pengguna akan menambahkannya secara manual.
                // Tambahkan event listener untuk tombol "Tambah" di dalam blok ini
                setupAddButtonListeners(pegawaiItem, pegawai.pegawai_id);

                pengeluaranPerPegawaiContainer.appendChild(pegawaiItem);
                debugLog(`Blok pengeluaran dibuat untuk ${pegawai.nama_lengkap}`);
            });
            // Panggil fungsi untuk menampilkan rincian yang relevan (pelaksana utama)
            updateAndReorderExpenseBlocks();

            dasarPerjalananEl.value = sptDetail.dasar_surat;
            tujuanPerjalananEl.value = sptDetail.maksud_perjalanan;
            lamaDanTanggalEl.value = `${sptDetail.lama_perjalanan} hari, dari ${formatDisplayDate(sptDetail.tanggal_berangkat)} s/d ${formatDisplayDate(sptDetail.tanggal_kembali)}`;
            tempatDikunjungiEl.value = sptDetail.lokasi_tujuan;

            debugLog('Form berhasil diisi dari SPT');

        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            isLoadingData = false;
        }
    };

    // Fungsi untuk memuat data laporan yang ada untuk mode edit
    const loadLaporanForEdit = async (id) => {
        debugLog(`Memulai loadLaporanForEdit untuk ID: ${id}`);
        try {
            const response = await fetch(`/api/laporan/${id}`);
            if (!response.ok) throw new Error('Gagal memuat data laporan untuk diedit.');
            const laporan = await response.json();
            debugLog('Data laporan berhasil diambil', laporan);

            // Jika SPT terkait tidak ada di daftar opsi (karena sudah punya laporan),
            // kita perlu menambahkannya secara manual agar bisa ditampilkan.
            const sptResponse = await fetch(`/api/spt/${laporan.spt_id}`);
            if (sptResponse.ok) {
                const sptData = await sptResponse.json();
                const option = new Option(sptData.nomor_surat, sptData.id, true, true);
                sptSelect.appendChild(option);
                debugLog(`SPT ${sptData.nomor_surat} ditambahkan ke dropdown`);
            }

            sptSelect.value = laporan.spt_id;
            document.getElementById('tanggal_laporan').value = formatDate(laporan.tanggal_laporan);
            document.getElementById('tempat_laporan').value = laporan.tempat_laporan;
            document.getElementById('judul').value = laporan.judul;

            // Fill/format penandatangan berdasarkan data laporan untuk di alihkan ke cetak-laporan.js
            // Penanganan error saat parsing JSON
            debugLog('Mengisi data penandatangan...');
            let selectedIds = [];
            if (laporan.penandatangan_ids) {
                try {
                    selectedIds = JSON.parse(laporan.penandatangan_ids);
                    debugLog(`ID penandatangan yang diparsing: ${selectedIds}`);
                } catch (e) {
                    console.error("Failed to parse penandatangan_ids:", e);
                    alert("Terjadi kesalahan data penandatangan. Data mungkin tidak ditampilkan dengan benar.");
                }
            }

            // PERBAIKAN UTAMA: Panggil populateFormFromSpt() HANYA SEKALI di sini untuk membuat struktur checkbox
            // sebelum kita mencentangnya. Ini jauh lebih efisien.
            debugLog('Memanggil populateFormFromSpt untuk membuat struktur form');
            await populateFormFromSpt();

            if (selectedIds.length > 0) {
                debugLog(`Mengatur checkbox untuk ${selectedIds.length} penandatangan`);
                penandatanganContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                selectedIds.forEach(id => {
                    const cb = penandatanganContainer.querySelector(`input[value="${id}"]`);
                    if (cb) {
                        cb.checked = true;
                        debugLog(`Checkbox untuk ID ${id} dicentang`);
                    } else {
                        debugLog(`Checkbox untuk ID ${id} tidak ditemukan`);
                    }
                });
            }

            dasarPerjalananEl.value = laporan.dasar_perjalanan;
            tujuanPerjalananEl.value = laporan.tujuan_perjalanan;
            lamaDanTanggalEl.value = laporan.lama_dan_tanggal_perjalanan;
            document.getElementById('deskripsi_kronologis').value = laporan.deskripsi_kronologis;
            tempatDikunjungiEl.value = laporan.tempat_dikunjungi;
            document.getElementById('hasil_dicapai').value = laporan.hasil_dicapai;

            // Isi data transportasi dinamis
            debugLog('Mengisi rincian pengeluaran...');
            // Tampilkan section rincian pengeluaran dan buat form untuk setiap pegawai
            document.getElementById('rincian-pengeluaran-section').classList.remove('hidden');
            pengeluaranPerPegawaiContainer.innerHTML = ''; // Kosongkan dulu

            debugLog(`Jumlah pegawai dalam laporan: ${laporan.pegawai.length}`);
            laporan.pegawai.forEach(pegawai => {
                const templateContent = pengeluaranPegawaiTemplate.content.cloneNode(true);
                const pegawaiItem = templateContent.querySelector('.pengeluaran-pegawai-item');
                pegawaiItem.querySelector('.pegawai-name-title').textContent = `Rincian untuk ${pegawai.nama_lengkap}`;
                pegawaiItem.dataset.pegawaiId = pegawai.pegawai_id;

                // PERUBAHAN: Isi item berdasarkan data array dari tabel baru
                const transportasiData = laporan.transportasi.filter(t => t.pegawai_id == pegawai.pegawai_id);
                const akomodasiData = laporan.akomodasi.filter(a => a.pegawai_id == pegawai.pegawai_id);
                const kontribusiData = laporan.kontribusi.filter(k => k.pegawai_id == pegawai.pegawai_id);
                const lainLainData = laporan.lain_lain.filter(l => l.pegawai_id == pegawai.pegawai_id);

                debugLog(`Data untuk ${pegawai.nama_lengkap}: transportasi=${transportasiData.length}, akomodasi=${akomodasiData.length}, kontribusi=${kontribusiData.length}, lain_lain=${lainLainData.length}`);

                if (transportasiData.length > 0) transportasiData.forEach(item => addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawai.pegawai_id, item));
                else addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawai.pegawai_id);

                if (akomodasiData.length > 0) akomodasiData.forEach(item => addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawai.pegawai_id, item));
                else addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawai.pegawai_id);

                if (kontribusiData.length > 0) kontribusiData.forEach(item => addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawai.pegawai_id, item));
                else addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawai.pegawai_id);

                if (lainLainData.length > 0) lainLainData.forEach(item => addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawai.pegawai_id, item));
                else addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawai.pegawai_id);

                setupAddButtonListeners(pegawaiItem, pegawai.pegawai_id);
                pengeluaranPerPegawaiContainer.appendChild(pegawaiItem);
            });

            // Panggil fungsi untuk menampilkan dan mengurutkan rincian sesuai data yang ada
            updateAndReorderExpenseBlocks();

            // Jalankan checkRemoveButtons untuk setiap blok pegawai
            document.querySelectorAll('.pengeluaran-pegawai-item').forEach(checkRemoveButtons);

            document.getElementById('kesimpulan').value = laporan.kesimpulan;

            // Tampilkan lampiran yang sudah ada
            debugLog('Merender pratinjau file...');
            if (laporan.lampiran && laporan.lampiran.length > 0) {
                existingFiles = laporan.lampiran;
                debugLog(`Ada ${existingFiles.length} file lampiran`);
                renderFilePreviews();
            }
            // Tambahkan log jika tidak ada lampiran
            else {
                debugLog('Tidak ada lampiran untuk dirender.');
            }

            sptSelect.disabled = true; // Cegah perubahan SPT saat edit
            debugLog('LoadLaporanForEdit selesai');

        } catch (error) {
            console.error(error);
            alert(error.message);
            window.location.href = '/laporan';
        }
    };

    // --- FUNGSI-FUNGSI UNTUK FILE UPLOAD ---

    const renderFilePreviews = () => {
        debugLog('Memulai renderFilePreviews');

        // PERBAIKAN: Bersihkan semua Object URL yang ada sebelum me-render ulang.
        // Ini adalah kunci untuk menghentikan flickering gambar.
        debugLog(`Membersihkan ${objectUrls.size} Object URL lama...`);
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        objectUrls.clear();

        filePreviewList.innerHTML = '';
        debugLog(`Rendering ${existingFiles.length} file existing dan ${newFiles.length} file baru`);

        // Render file yang sudah ada (mode edit)
        existingFiles.forEach(file => {
            filePreviewList.appendChild(createFilePreviewElement(file.id, file.file_name, file.file_path, true));
        });

        // Render file baru yang akan diupload
        newFiles.forEach((file, index) => {
            // Gunakan objek File itu sendiri sebagai ID untuk file baru
            const previewEl = createFilePreviewElement(`new-${index}`, file.name, file, false);
            filePreviewList.appendChild(previewEl);
        });
        debugLog('renderFilePreviews selesai');
    };

    // PERBAIKAN UTAMA: Fungsi createFilePreviewElement yang sudah dikoreksi
    const createFilePreviewElement = (id, name, filePathOrFileObject, isExisting) => {
        debugLog(`Membuat preview untuk: ${name} (${isExisting ? 'existing' : 'new'})`);

        const isImage = name.match(/\.(jpeg|jpg|png|gif|webp)$/i);
        const fileExt = name.split('.').pop().toUpperCase();

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600';
        // Simpan ID sebagai string untuk file yang sudah ada, atau referensi File object untuk file baru
        wrapper.dataset.id = id;
        wrapper.dataset.isExisting = isExisting;
        wrapper.dataset.filename = name;

        let previewSrc;
        let previewAlt = name;

        if (isExisting) {
            // **PERBAIKAN:** Pastikan path gambar yang sudah ada memiliki leading slash
            let rawPath = filePathOrFileObject.startsWith('/') ? filePathOrFileObject : '/' + filePathOrFileObject;
            // PERBAIKAN UTAMA: Encode URI untuk menangani karakter seperti spasi pada nama file.
            previewSrc = encodeURI(rawPath);
            debugLog(`Preview existing file: ${previewSrc}`);
        } else {
            // **PERBAIKAN:** Untuk file baru, buat Object URL di sini.
            // Map 'objectUrls' sekarang digunakan untuk melacak URL yang dibuat agar bisa dibersihkan nanti.
            if (!objectUrls.has(filePathOrFileObject)) {
                const newUrl = URL.createObjectURL(filePathOrFileObject);
                objectUrls.set(filePathOrFileObject, newUrl);
                debugLog(`Membuat Object URL baru: ${newUrl} untuk file ${name}`);
            }
            previewSrc = objectUrls.get(filePathOrFileObject);
        }

        // PERBAIKAN: Gunakan path file yang sudah dikoreksi untuk tag <a>
        const fileLink = isExisting ? previewSrc : previewSrc;

        const previewContent = isImage ?
            `<img src="${previewSrc}" alt="${previewAlt}" class="w-16 h-16 object-cover rounded-md mr-4" onerror="console.error('Gagal memuat gambar: ${name}'); this.src='/images/placeholder-image.svg'">` :
            `<div class="w-16 h-16 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded-md mr-4">
                 <span class="text-lg font-bold text-slate-500 dark:text-slate-400">${fileExt}</span>
               </div>`;

        wrapper.innerHTML = `
            <div class="flex items-center flex-grow">
                ${previewContent}
                <div class="flex-grow">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        ${isExisting ? `<a href="${fileLink}" target="_blank" class="text-indigo-600 hover:text-indigo-800">${name}</a>` : name}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${isExisting ? 'Tersimpan' : 'Baru'}</p>
                </div>
            </div>
            <button type="button" class="delete-file-btn text-red-500 hover:text-red-700 ml-4 flex-shrink-0">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        debugLog(`Preview element dibuat untuk: ${name}`);
        return wrapper;
    };

    const handleFiles = (files) => {
        debugLog(`Menangani ${files.length} file baru`);
        for (const file of files) {
            newFiles.push(file);
            debugLog(`File ditambahkan: ${file.name} (${file.size} bytes)`);
        }
        renderFilePreviews();
    };

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('border-indigo-600', 'bg-indigo-50', 'dark:bg-slate-800/50');
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('border-indigo-600', 'bg-indigo-50', 'dark:bg-slate-800/50');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('border-indigo-600', 'bg-indigo-50', 'dark:bg-slate-800/50');
        const files = e.dataTransfer.files;
        debugLog(`File di-drop: ${files.length} file`);
        if (files.length) {
            handleFiles(files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            debugLog(`File dipilih via input: ${fileInput.files.length} file`);
            handleFiles(fileInput.files);
            fileInput.value = ''; // Reset input agar bisa pilih file yang sama lagi
        }
    });

    filePreviewList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-file-btn');
        if (deleteBtn) {
            const wrapper = deleteBtn.closest('div[data-id]');
            const id = wrapper.dataset.id;
            const isExisting = wrapper.dataset.isExisting === 'true';
            const filename = wrapper.dataset.filename;

            debugLog(`Menghapus file: ${filename} (${isExisting ? 'existing' : 'new'})`);

            if (isExisting) {
                deletedFiles.push(id); // Tambahkan ID ke daftar hapus
                existingFiles = existingFiles.filter(f => f.id != id); // Hapus dari daftar tampilan
                debugLog(`File existing ${id} ditandai untuk dihapus`);
            } else {
                // **PERBAIKAN LOGIKA HAPUS FILE BARU**: 
                // Untuk file baru, kita perlu mencari file berdasarkan index
                const fileIndex = parseInt(id.replace('new-', ''), 10);
                if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < newFiles.length) {
                    const fileObject = newFiles[fileIndex];
                    if (objectUrls.has(fileObject)) {
                        URL.revokeObjectURL(objectUrls.get(fileObject)); // Revoke URL
                        objectUrls.delete(fileObject); // Hapus dari Map
                        debugLog(`Object URL untuk ${fileObject.name} di-revoke`);
                    }
                    newFiles.splice(fileIndex, 1); // Hapus dari array file baru
                    debugLog(`File baru ${filename} dihapus dari array`);
                } else {
                    debugLog(`Index file tidak valid: ${fileIndex}`, newFiles);
                }
            }
            renderFilePreviews(); // Render ulang
        }
    });

    // --- FUNGSI UNTUK RINCIAN PENGELUARAN DINAMIS ---

    const addTransportasiItem = (container, pegawaiId, data = {}) => {
        debugLog(`Menambah item transportasi untuk pegawai ${pegawaiId}`, data);
        const templateContent = transportasiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.transport-item');
        const itemIndex = container.querySelectorAll('.transport-item').length;
        // Ambil nilai dan set value SEBELUM mengubah atribut 'name'
        newItem.querySelector('[name="jenis"]').value = data.jenis || 'Bus';
        newItem.querySelector('[name="perusahaan"]').value = data.perusahaan || '';
        newItem.querySelector('[name="nominal"]').value = formatCurrency(data.nominal);
        // Update name attributes to be unique per employee
        newItem.querySelectorAll('[name]').forEach(el => {
            el.name = `pegawai[${pegawaiId}][transportasi][${itemIndex}][${el.name}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
        debugLog(`Item transportasi ke-${itemIndex} ditambahkan`);
    };

    const addAkomodasiItem = (container, pegawaiId, data = {}) => {
        debugLog(`Menambah item akomodasi untuk pegawai ${pegawaiId}`, data);
        const templateContent = akomodasiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.akomodasi-item');
        const itemIndex = container.querySelectorAll('.akomodasi-item').length;
        newItem.querySelector('[name="jenis"]').value = data.jenis || 'Hotel';
        newItem.querySelector('[name="nama"]').value = data.nama || '';
        newItem.querySelector('[name="harga_satuan"]').value = formatCurrency(data.harga_satuan) || '';
        newItem.querySelector('[name="malam"]').value = data.malam || '';
        updateAkomodasiTotal(newItem); // Pindahkan ke sini: Hitung total SEBELUM nama diubah
        newItem.querySelectorAll('[name]').forEach(el => {
            el.name = `pegawai[${pegawaiId}][akomodasi][${itemIndex}][${el.name}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
        debugLog(`Item akomodasi ke-${itemIndex} ditambahkan`);
    };

    const addKontribusiItem = (container, pegawaiId, data = {}) => {
        debugLog(`Menambah item kontribusi untuk pegawai ${pegawaiId}`, data);
        const templateContent = kontribusiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.kontribusi-item');
        const itemIndex = container.querySelectorAll('.kontribusi-item').length;
        newItem.querySelector('[name="jenis"]').value = data.jenis || 'Bimbingan Teknis';
        newItem.querySelector('[name="nominal"]').value = formatCurrency(data.nominal);
        newItem.querySelectorAll('[name]').forEach(el => {
            el.name = `pegawai[${pegawaiId}][kontribusi][${itemIndex}][${el.name}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
        debugLog(`Item kontribusi ke-${itemIndex} ditambahkan`);
    }

    const addLainLainItem = (container, pegawaiId, data = {}) => {
        debugLog(`Menambah item lain-lain untuk pegawai ${pegawaiId}`, data);
        const templateContent = lainLainTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.lain-lain-item');
        const itemIndex = container.querySelectorAll('.lain-lain-item').length;
        newItem.querySelector('[name="uraian"]').value = data.uraian || '';
        newItem.querySelector('[name="nominal"]').value = formatCurrency(data.nominal);
        newItem.querySelectorAll('[name]').forEach(el => {
            el.name = `pegawai[${pegawaiId}][lain_lain][${itemIndex}][${el.name}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
        debugLog(`Item lain-lain ke-${itemIndex} ditambahkan`);
    }

    const checkRemoveButtons = (pegawaiItem) => {
        if (!pegawaiItem) return;
        const transportItems = pegawaiItem.querySelectorAll('.transport-item');
        const akomodasiItems = pegawaiItem.querySelectorAll('.akomodasi-item');
        const kontribusiItems = pegawaiItem.querySelectorAll('.kontribusi-item');
        const lainLainItems = pegawaiItem.querySelectorAll('.lain-lain-item');

        debugLog(`Check remove buttons: transport=${transportItems.length}, akomodasi=${akomodasiItems.length}, kontribusi=${kontribusiItems.length}, lain_lain=${lainLainItems.length}`);

        transportItems.forEach((item) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', transportItems.length <= 1);
        });
        akomodasiItems.forEach((item) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', akomodasiItems.length <= 1);
        });
        kontribusiItems.forEach((item) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', kontribusiItems.length <= 1);
        });
        lainLainItems.forEach((item) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', lainLainItems.length <= 1);
        });
    };

    const updateAkomodasiTotal = (itemElement) => {
        // Perbaikan: Gunakan selector yang lebih fleksibel yang mencari atribut 'name' yang BERAKHIRAN dengan string yang diberikan.
        // Ini akan berfungsi baik sebelum maupun sesudah nama diubah secara dinamis.
        const hargaSatuanEl = itemElement.querySelector('[name$="[harga_satuan]"], [name="harga_satuan"]');
        const jumlahMalamEl = itemElement.querySelector('[name$="[malam]"], [name="malam"]');
        const totalNominalEl = itemElement.querySelector('[name$="[nominal]"], [name="nominal"]');

        const harga = parseCurrency(hargaSatuanEl.value);
        const malam = parseInt(jumlahMalamEl.value) || 0;

        const total = harga * malam;
        totalNominalEl.value = formatCurrency(total);
        debugLog(`Update akomodasi total: ${harga} * ${malam} = ${total}`);
    };

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        debugLog('Form submission dimulai');

        const selectedSignerIds = Array.from(penandatanganContainer.querySelectorAll('input[name="penandatangan_ids"]:checked'))
            .map(cb => cb.value);

        debugLog(`Penandatangan yang dipilih: ${selectedSignerIds}`);

        if (selectedSignerIds.length === 0) {
            alert('Pilih minimal satu penandatangan laporan.');
            debugLog('Validasi gagal: tidak ada penandatangan yang dipilih');
            return;
        }

        // --- VALIDASI BARU: Cek rincian pengeluaran untuk setiap penandatangan ---
        let validationPassed = true;
        let missingDetailsFor = [];

        for (const pegawaiId of selectedSignerIds) {
            const expenseBlock = pengeluaranPerPegawaiContainer.querySelector(`.pengeluaran-pegawai-item[data-pegawai-id="${pegawaiId}"]`);
            const signerCheckbox = penandatanganContainer.querySelector(`input[value="${pegawaiId}"]`);
            const signerName = signerCheckbox ? signerCheckbox.nextElementSibling.querySelector('span.font-medium').textContent : `ID ${pegawaiId}`;

            if (expenseBlock) {
                const nominalInputs = expenseBlock.querySelectorAll('[name$="[nominal]"]');
                const hasValue = Array.from(nominalInputs).some(input => parseCurrency(input.value) > 0);

                if (!hasValue) {
                    validationPassed = false;
                    missingDetailsFor.push(signerName);
                    debugLog(`Validasi gagal untuk ${signerName}: tidak ada rincian pengeluaran`);
                } else {
                    debugLog(`Validasi berhasil untuk ${signerName}: ada rincian pengeluaran`);
                }
            }
        }

        if (!validationPassed) {
            alert(`Validasi Gagal:\n\nHarap isi minimal satu rincian pengeluaran untuk penandatangan berikut:\n- ${missingDetailsFor.join('\n- ')}`);
            return; // Hentikan proses simpan
        }

        // --- PERBAIKAN FINAL: Kumpulkan data form SEBELUM validasi ---
        const formData = new FormData();
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;
        const submitButton = form.querySelector('button[type="submit"]');

        // Ambil data form biasa
        formData.append('spt_id', sptSelect.value);
        formData.append('tanggal_laporan', document.getElementById('tanggal_laporan').value);
        formData.append('tempat_laporan', document.getElementById('tempat_laporan').value);
        formData.append('judul', document.getElementById('judul').value);
        formData.append('dasar_perjalanan', dasarPerjalananEl.value);
        formData.append('tujuan_perjalanan', tujuanPerjalananEl.value);
        formData.append('lama_dan_tanggal_perjalanan', lamaDanTanggalEl.value);
        formData.append('deskripsi_kronologis', document.getElementById('deskripsi_kronologis').value);
        formData.append('tempat_dikunjungi', tempatDikunjungiEl.value);
        formData.append('hasil_dicapai', document.getElementById('hasil_dicapai').value);
        formData.append('kesimpulan', document.getElementById('kesimpulan').value);
        formData.append('penandatangan_ids', JSON.stringify(selectedSignerIds));

        debugLog('Data form dasar dikumpulkan');

        // Kumpulkan data pengeluaran dari setiap pegawai
        document.querySelectorAll('.pengeluaran-pegawai-item').forEach(pegawaiItem => {
            const pegawaiId = pegawaiItem.dataset.pegawaiId;
            pegawaiItem.querySelectorAll('.transport-item').forEach((item, index) => {
                formData.append(`pegawai[${pegawaiId}][transportasi][${index}][jenis]`, item.querySelector('[name$="[jenis]"]').value);
                formData.append(`pegawai[${pegawaiId}][transportasi][${index}][perusahaan]`, item.querySelector('[name$="[perusahaan]"]').value);
                formData.append(`pegawai[${pegawaiId}][transportasi][${index}][nominal]`, parseCurrency(item.querySelector('[name$="[nominal]"]').value));
            });
            pegawaiItem.querySelectorAll('.akomodasi-item').forEach((item, index) => {
                formData.append(`pegawai[${pegawaiId}][akomodasi][${index}][jenis]`, item.querySelector('[name$="[jenis]"]').value);
                formData.append(`pegawai[${pegawaiId}][akomodasi][${index}][nama]`, item.querySelector('[name$="[nama]"]').value);
                formData.append(`pegawai[${pegawaiId}][akomodasi][${index}][harga_satuan]`, parseCurrency(item.querySelector('[name$="[harga_satuan]"]').value));
                formData.append(`pegawai[${pegawaiId}][akomodasi][${index}][malam]`, item.querySelector('[name$="[malam]"]').value);
                formData.append(`pegawai[${pegawaiId}][akomodasi][${index}][nominal]`, parseCurrency(item.querySelector('[name$="[nominal]"]').value));
            });
            pegawaiItem.querySelectorAll('.kontribusi-item').forEach((item, index) => {
                formData.append(`pegawai[${pegawaiId}][kontribusi][${index}][jenis]`, item.querySelector('[name$="[jenis]"]').value);
                formData.append(`pegawai[${pegawaiId}][kontribusi][${index}][nominal]`, parseCurrency(item.querySelector('[name$="[nominal]"]').value));
            });
            pegawaiItem.querySelectorAll('.lain-lain-item').forEach((item, index) => {
                formData.append(`pegawai[${pegawaiId}][lain_lain][${index}][uraian]`, item.querySelector('[name$="[uraian]"]').value);
                formData.append(`pegawai[${pegawaiId}][lain_lain][${index}][nominal]`, parseCurrency(item.querySelector('[name$="[nominal]"]').value));
            });
        });

        debugLog('Data pengeluaran dikumpulkan');

        if (isEditMode) {
            formData.append('deleted_files', JSON.stringify(deletedFiles));
            debugLog(`File yang dihapus: ${deletedFiles.length}`);
        }
        newFiles.forEach(file => formData.append('lampiran', file));
        debugLog(`File baru: ${newFiles.length}`);

        // --- PERBAIKAN: Pindahkan deklarasi variabel ke sini, sebelum digunakan ---
        const url = isEditMode ? `/api/laporan/${laporanId}` : '/api/laporan';
        const method = isEditMode ? 'PUT' : 'POST';

        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        // --- PERUBAHAN: Validasi sebelum menyimpan ---
        if (isEditMode) {
            const sptId = formData.get('spt_id'); // Ambil dari formData yang sudah dibuat
            try {
                debugLog(`Memeriksa bukti bayar untuk SPT ${sptId}`);
                const checkRes = await fetch(`/api/pembayaran/check/by-spt/${sptId}`);
                const checkData = await checkRes.json();
                if (checkRes.ok && checkData.exists) {
                    // Tampilkan modal dan hentikan proses
                    showBlockerModal("Aksi Diblokir", "Hapus terlebih dahulu daftar bukti bayar terkait");
                    // Kembalikan kondisi tombol simpan
                    submitButton.disabled = false;
                    submitButton.textContent = 'Simpan Perubahan';
                    debugLog('Simpan dibatalkan: ada bukti bayar terkait');
                    return; // Hentikan eksekusi fungsi submit
                }
            } catch (checkError) {
                // Jika pengecekan gagal, log error tapi biarkan proses lanjut agar tidak memblokir pengguna
                console.warn("Peringatan: Pengecekan bukti bayar gagal, proses penyimpanan dilanjutkan.", checkError);
                debugLog('Peringatan: Pengecekan bukti bayar gagal', checkError);
            }
        }

        try {
            debugLog(`Mengirim request ${method} ke ${url}`);
            const response = await fetch(url, {
                method: method,
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            // Bersihkan Object URL setelah upload berhasil
            debugLog(`Membersihkan ${objectUrls.size} Object URL`);
            objectUrls.forEach(url => URL.revokeObjectURL(url));
            objectUrls.clear();

            debugLog('Simpan berhasil', result);
            alert(result.message);
            window.location.href = '/laporan';
        } catch (error) {
            debugLog('Error saat menyimpan', error);
            alert(`Gagal menyimpan: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan Laporan';
        }
    });

    // Event listener untuk perubahan SPT
    sptSelect.addEventListener('change', populateFormFromSpt);

    // Event listener untuk checkbox penandatangan (menggunakan event delegation)
    penandatanganContainer.addEventListener('change', updateAndReorderExpenseBlocks);

    const setupAddButtonListeners = (pegawaiItem, pegawaiId) => {
        debugLog(`Setup add button listeners untuk pegawai ${pegawaiId}`);
        pegawaiItem.querySelector('.tambah-transportasi-btn').addEventListener('click', () => {
            debugLog(`Tambah transportasi untuk pegawai ${pegawaiId}`);
            addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawaiId);
        });
        pegawaiItem.querySelector('.tambah-akomodasi-btn').addEventListener('click', () => {
            debugLog(`Tambah akomodasi untuk pegawai ${pegawaiId}`);
            addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawaiId);
        });
        pegawaiItem.querySelector('.tambah-kontribusi-btn').addEventListener('click', () => {
            debugLog(`Tambah kontribusi untuk pegawai ${pegawaiId}`);
            addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawaiId);
        });
        pegawaiItem.querySelector('.tambah-lain-lain-btn').addEventListener('click', () => {
            debugLog(`Tambah lain-lain untuk pegawai ${pegawaiId}`);
            addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawaiId);
        });
    };

    // --- LOGIKA UNTUK TAMBAH/HAPUS/KALKULASI RINCIAN PENGELUARAN (EVENT DELEGATION) ---
    pengeluaranPerPegawaiContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const itemToRemove = removeBtn.parentElement.closest('div[class*="-item"]');
            const pegawaiItem = itemToRemove.closest('.pengeluaran-pegawai-item');
            debugLog(`Menghapus item: ${itemToRemove.className}`);
            itemToRemove.remove();
            checkRemoveButtons(pegawaiItem);
        }
    });

    // Event listener untuk kalkulasi otomatis total akomodasi
    pengeluaranPerPegawaiContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('akomodasi-calc')) {
            const itemElement = e.target.closest('.akomodasi-item');
            updateAkomodasiTotal(itemElement);
        }

        // PERUBAHAN: Logika untuk perhitungan otomatis biaya "Rumah Warga"
        if (e.target.name && e.target.name.endsWith('[jenis]')) {
            const selectedValue = e.target.value;
            const itemElement = e.target.closest('.akomodasi-item');
            const pegawaiItem = e.target.closest('.pengeluaran-pegawai-item');
            const pegawaiId = pegawaiItem.dataset.pegawaiId;
            const hargaSatuanEl = itemElement.querySelector('[name$="[harga_satuan]"]');

            debugLog(`Jenis akomodasi diubah: ${selectedValue} untuk pegawai ${pegawaiId}`);

            if (selectedValue === 'Rumah Warga (30%)') {
                const standardCost = accommodationStandards[pegawaiId] || 0;
                const calculatedCost = standardCost * 0.30;
                hargaSatuanEl.value = formatCurrency(calculatedCost);
                hargaSatuanEl.readOnly = true;
                hargaSatuanEl.classList.add('bg-slate-100', 'dark:bg-slate-600', 'cursor-not-allowed');
                debugLog(`Biaya rumah warga dihitung: ${standardCost} * 30% = ${calculatedCost}`);
            } else {
                hargaSatuanEl.readOnly = false;
                hargaSatuanEl.classList.remove('bg-slate-100', 'dark:bg-slate-600', 'cursor-not-allowed');
                debugLog(`Biaya akomodasi manual diaktifkan`);
            }
            // Hitung ulang total setelah mengubah harga satuan
            updateAkomodasiTotal(itemElement);
        }
    });

    // Event listener untuk memformat input mata uang secara otomatis
    form.addEventListener('input', (e) => {
        if (e.target.classList.contains('currency-input')) {
            // Simpan posisi kursor
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const oldValue = e.target.value;
            e.target.value = formatCurrency(e.target.value);
            // Kembalikan posisi kursor dengan memperhitungkan penambahan/pengurangan titik
            const newLength = e.target.value.length;
            const oldLength = oldValue.length;
            e.target.setSelectionRange(start + (newLength - oldLength), end + (newLength - oldLength));
        }
    });

    // Inisialisasi
    const initializePage = async () => {
        debugLog('Memulai inisialisasi halaman');
        isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;
        const submitButton = form.querySelector('button[type="submit"]');

        debugLog(`Mode: ${isEditMode ? 'Edit' : 'Buat Baru'}, ID: ${laporanId || 'N/A'}`);

        if (isEditMode) {
            pageTitle.textContent = 'Edit Laporan Perjalanan Dinas';
            if (submitButton) submitButton.textContent = 'Simpan Perubahan';
            await loadLaporanForEdit(laporanId);
        } else {
            await loadSptOptions();
        }

        debugLog('Inisialisasi halaman selesai');
    };

    // Panggil initializePage dan pastikan untuk membersihkan Object URL saat navigasi/penutupan
    window.addEventListener('beforeunload', () => {
        debugLog(`Membersihkan ${objectUrls.size} Object URL sebelum unload`);
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    });

    // Tambahkan debug container jika tidak ada
    if (!document.getElementById('debug-container')) {
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debug-container';
        debugContainer.className = 'fixed bottom-0 right-0 w-80 h-40 bg-black bg-opacity-80 text-white text-xs p-2 overflow-auto z-50 hidden';
        document.body.appendChild(debugContainer);

        // Tombol toggle debug (opsional)
        const debugToggle = document.createElement('button');
        debugToggle.textContent = 'Debug';
        debugToggle.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-2 py-1 rounded text-xs z-50';
        debugToggle.addEventListener('click', () => {
            debugContainer.classList.toggle('hidden');
        });
        document.body.appendChild(debugToggle);
    }

    initializePage();
})();
