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
    const kodeAnggaranDisplayEl = document.getElementById('kode_anggaran_display');

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
    };

    // Fungsi untuk memuat SPT ke dropdown
    const loadSptOptions = async () => {
        debugLog('Memulai loadSptOptions');
        try {
            // PERBAIKAN: Menggunakan limit=0 untuk mengambil SEMUA data tanpa paginasi
            // Ini memperbaiki masalah SPT lama (seperti 900/14.12...) tidak muncul di dropdown
            const response = await fetch('/api/spt?limit=0');
            if (!response.ok) throw new Error('Gagal memuat data SPT.');
            const dataResponse = await response.json();

            // Handle jika respons berupa objek dengan properti data (paginasi) atau array langsung
            const spts = Array.isArray(dataResponse) ? dataResponse : (dataResponse.data || []);

            // Filter SPT yang aktif dan belum punya laporan
            const availableSpts = spts.filter(spt => spt.status === 'aktif' && spt.laporan_count === 0);
            debugLog(`SPT tersedia: ${availableSpts.length} dari ${spts.length} total`);

            // Kosongkan opsi lama kecuali default
            sptSelect.innerHTML = '<option value="">-- Pilih SPT --</option>';

            availableSpts.forEach(spt => {
                const option = document.createElement('option');
                option.value = spt.id;
                option.textContent = spt.nomor_surat;
                option.dataset.spt = JSON.stringify(spt);
                sptSelect.appendChild(option);
            });
            return availableSpts;
        } catch (error) {
            console.error(error);
            alert("Gagal memuat opsi SPT: " + error.message);
        }
    };

    // --- FUNGSI: Mengatur visibilitas dan urutan rincian pengeluaran ---
    const updateAndReorderExpenseBlocks = () => {
        debugLog('Memulai updateAndReorderExpenseBlocks');
        const checkedSigners = Array.from(penandatanganContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const allExpenseBlocks = pengeluaranPerPegawaiContainer.querySelectorAll('.pengeluaran-pegawai-item');

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
                pengeluaranPerPegawaiContainer.appendChild(expenseBlock);
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
            // Jangan reset form total jika di mode edit, hanya reset bagian dinamis
            if (!isEditMode) form.reset();

            document.getElementById('rincian-pengeluaran-section').classList.add('hidden');
            accommodationStandards = {};
            if (kodeAnggaranDisplayEl) kodeAnggaranDisplayEl.value = '';
            pengeluaranPerPegawaiContainer.innerHTML = '';
            isLoadingData = false;
            return;
        }

        try {
            const response = await fetch(`/api/spt/${sptId}`);
            if (!response.ok) throw new Error('Gagal memuat detail SPT.');
            const sptDetail = await response.json();

            // Ambil dan tampilkan informasi anggaran
            if (kodeAnggaranDisplayEl) {
                try {
                    const anggaranRes = await fetch(`/api/anggaran/${sptDetail.anggaran_id}`);
                    if (anggaranRes.ok) {
                        const anggaran = await anggaranRes.json();
                        kodeAnggaranDisplayEl.value = `${anggaran.mata_anggaran_kode} - ${anggaran.mata_anggaran_nama}`;
                    } else {
                        kodeAnggaranDisplayEl.value = 'Data anggaran tidak ditemukan.';
                    }
                } catch (e) {
                    kodeAnggaranDisplayEl.value = 'Gagal memuat data anggaran.';
                }
            }

            // Ambil standar biaya akomodasi
            try {
                const standardsRes = await fetch(`/api/spt/${sptId}/accommodation-standards`);
                if (standardsRes.ok) {
                    accommodationStandards = await standardsRes.json();
                } else {
                    accommodationStandards = {};
                }
            } catch (e) {
                accommodationStandards = {};
            }

            // Ambil pegawai
            const semuaPelaksana = (sptDetail.pegawai || []).sort((a, b) => a.is_pengikut - b.is_pengikut);

            penandatanganContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Pilih penandatangan laporan (otomatis dari SPT):</p>';

            if (semuaPelaksana.length > 0) {
                const canceledPegawaiIds = new Set((sptDetail.pegawai_dibatalkan || []).map(p => p.pegawai_id));

                semuaPelaksana.forEach(p => {
                    const isCanceled = canceledPegawaiIds.has(p.pegawai_id);
                    const isDisabled = isCanceled;
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
                });
            } else {
                penandatanganContainer.innerHTML += '<p class="text-sm text-red-500">Tidak ada data pegawai ditemukan pada SPT ini.</p>';
            }

            // Buat form rincian pengeluaran (hanya jika kontainer kosong atau reset)
            document.getElementById('rincian-pengeluaran-section').classList.remove('hidden');

            // Kita reset container pegawai untuk memastikan struktur bersih
            pengeluaranPerPegawaiContainer.innerHTML = '';

            semuaPelaksana.forEach(pegawai => {
                const templateContent = pengeluaranPegawaiTemplate.content.cloneNode(true);
                const pegawaiItem = templateContent.querySelector('.pengeluaran-pegawai-item');

                pegawaiItem.querySelector('.pegawai-name-title').textContent = `Rincian untuk ${pegawai.nama_lengkap}`;
                pegawaiItem.dataset.pegawaiId = pegawai.pegawai_id;
                pegawaiItem.classList.add('hidden');

                // PERBAIKAN KOMPREHENSIF: Inisialisasi setiap kategori dengan satu baris kosong.
                // Ini memastikan bahwa kontainer tidak pernah kosong, mencegah error 'null'.
                addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawai.pegawai_id);
                addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawai.pegawai_id);
                addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawai.pegawai_id);
                addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawai.pegawai_id);


                setupAddButtonListeners(pegawaiItem, pegawai.pegawai_id);
                pengeluaranPerPegawaiContainer.appendChild(pegawaiItem);
            });

            updateAndReorderExpenseBlocks();

            // Isi field text dasar jika belum ada isinya (untuk menghindari overwrite saat edit jika user sudah ubah manual tapi logic ini jalan)
            if (!isEditMode || !dasarPerjalananEl.value) dasarPerjalananEl.value = sptDetail.dasar_surat;
            if (!isEditMode || !tujuanPerjalananEl.value) tujuanPerjalananEl.value = sptDetail.maksud_perjalanan;
            if (!isEditMode || !lamaDanTanggalEl.value) lamaDanTanggalEl.value = `${sptDetail.lama_perjalanan} hari, dari ${formatDisplayDate(sptDetail.tanggal_berangkat)} s/d ${formatDisplayDate(sptDetail.tanggal_kembali)}`;
            if (!isEditMode || !tempatDikunjungiEl.value) tempatDikunjungiEl.value = sptDetail.lokasi_tujuan;

        } catch (error) {
            console.error(error);
            alert("Gagal memuat detail SPT: " + error.message);
        } finally {
            isLoadingData = false;
        }
    };

    // Fungsi untuk memuat data laporan yang ada untuk mode edit
    const loadLaporanForEdit = async (id) => {
        debugLog(`Memulai loadLaporanForEdit untuk ID: ${id}`);
        try {
            // 1. Load dulu semua opsi SPT agar siap
            await loadSptOptions();

            const response = await fetch(`/api/laporan/${id}`);
            if (!response.ok) throw new Error('Gagal memuat data laporan untuk diedit.');
            const laporan = await response.json();

            // 2. Pastikan SPT laporan ini ada di dropdown (karena loadSptOptions memfilter yang sudah ada laporan)
            // Di mode edit, kita PERLU SPT ini muncul.
            const sptOptionExists = sptSelect.querySelector(`option[value="${laporan.spt_id}"]`);
            if (!sptOptionExists) {
                const sptResponse = await fetch(`/api/spt/${laporan.spt_id}`);
                if (sptResponse.ok) {
                    const sptData = await sptResponse.json();
                    const option = new Option(sptData.nomor_surat, sptData.id, true, true);
                    sptSelect.appendChild(option);
                }
            }

            // 3. Set nilai dropdown dan trigger populate
            sptSelect.value = laporan.spt_id;

            // Set field standar
            document.getElementById('tanggal_laporan').value = formatDate(laporan.tanggal_laporan);
            document.getElementById('tempat_laporan').value = laporan.tempat_laporan;
            document.getElementById('judul').value = laporan.judul;

            // 4. Bangun struktur form pegawai (ini akan mereset container pegawai)
            await populateFormFromSpt();

            // 5. Restore Checklist Penandatangan
            let selectedIds = [];
            if (laporan.penandatangan_ids) {
                try {
                    selectedIds = JSON.parse(laporan.penandatangan_ids);
                } catch (e) {
                    console.error("Failed to parse penandatangan_ids:", e);
                }
            }

            if (selectedIds.length > 0) {
                // Uncheck semua dulu
                penandatanganContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                // Check yang tersimpan
                selectedIds.forEach(id => {
                    const cb = penandatanganContainer.querySelector(`input[value="${id}"]`);
                    if (cb) cb.checked = true;
                });
            }

            // 6. Restore Data Text Manual
            dasarPerjalananEl.value = laporan.dasar_perjalanan;
            tujuanPerjalananEl.value = laporan.tujuan_perjalanan;
            lamaDanTanggalEl.value = laporan.lama_dan_tanggal_perjalanan;
            document.getElementById('deskripsi_kronologis').value = laporan.deskripsi_kronologis;
            tempatDikunjungiEl.value = laporan.tempat_dikunjungi;
            document.getElementById('hasil_dicapai').value = laporan.hasil_dicapai;
            document.getElementById('kesimpulan').value = laporan.kesimpulan;

            // 7. Restore Rincian Pengeluaran
            // populateFormFromSpt sudah membuat container kosong untuk setiap pegawai.
            // Sekarang kita isi container tersebut dengan data dari database.

            laporan.pegawai.forEach(pegawai => {
                const pegawaiItem = pengeluaranPerPegawaiContainer.querySelector(`.pengeluaran-pegawai-item[data-pegawai-id="${pegawai.pegawai_id}"]`);

                if (pegawaiItem) {
                    const transportasiData = laporan.transportasi.filter(t => t.pegawai_id == pegawai.pegawai_id);
                    const akomodasiData = laporan.akomodasi.filter(a => a.pegawai_id == pegawai.pegawai_id);
                    const kontribusiData = laporan.kontribusi.filter(k => k.pegawai_id == pegawai.pegawai_id);
                    const lainLainData = laporan.lain_lain.filter(l => l.pegawai_id == pegawai.pegawai_id);

                    // PERBAIKAN KOMPREHENSIF: Bersihkan baris kosong yang dibuat saat inisialisasi
                    // sebelum mengisi dengan data dari database.
                    pegawaiItem.querySelector('.transportasi-container').innerHTML = '';
                    pegawaiItem.querySelector('.akomodasi-container').innerHTML = '';
                    pegawaiItem.querySelector('.kontribusi-container').innerHTML = '';
                    pegawaiItem.querySelector('.lain-lain-container').innerHTML = '';

                    // Isi data dari database. Jika tidak ada data, tambahkan satu baris kosong.
                    if (transportasiData.length > 0) {
                        transportasiData.forEach(item => addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawai.pegawai_id, item));
                    } else addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawai.pegawai_id);
                    if (akomodasiData.length > 0) {
                        akomodasiData.forEach(item => addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawai.pegawai_id, item));
                    } else addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawai.pegawai_id);
                    if (kontribusiData.length > 0) {
                        kontribusiData.forEach(item => addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawai.pegawai_id, item));
                    } else addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawai.pegawai_id);
                    if (lainLainData.length > 0) {
                        lainLainData.forEach(item => addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawai.pegawai_id, item));
                    } else addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawai.pegawai_id);

                    checkRemoveButtons(pegawaiItem);
                }
            });

            // Update visibilitas
            updateAndReorderExpenseBlocks();

            // 8. Tampilkan lampiran
            if (laporan.lampiran && laporan.lampiran.length > 0) {
                existingFiles = laporan.lampiran;
                renderFilePreviews();
            }



            // 9. Matikan dropdown SPT agar user tidak sembarangan ganti SPT saat edit
            sptSelect.disabled = true;

        } catch (error) {
            console.error(error);
            alert("Gagal menyiapkan data edit: " + error.message);
            window.location.href = '/laporan';
        }
    };

    // --- FUNGSI-FUNGSI UNTUK FILE UPLOAD ---

    const renderFilePreviews = () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        objectUrls.clear();

        filePreviewList.innerHTML = '';

        // Render existing files
        existingFiles.forEach(file => {
            filePreviewList.appendChild(createFilePreviewElement(file.id, file.file_name, file.file_path, true));
        });

        // Render new files
        newFiles.forEach((file, index) => {
            const previewEl = createFilePreviewElement(`new-${index}`, file.name, file, false);
            filePreviewList.appendChild(previewEl);
        });
    };

    const createFilePreviewElement = (id, name, filePathOrFileObject, isExisting) => {
        const isImage = name.match(/\.(jpeg|jpg|png|gif|webp)$/i);
        const fileExt = name.split('.').pop().toUpperCase();

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600';
        wrapper.dataset.id = id;
        wrapper.dataset.isExisting = isExisting;
        wrapper.dataset.filename = name;

        let previewSrc;
        if (isExisting) {
            let rawPath = filePathOrFileObject.startsWith('/') ? filePathOrFileObject : '/' + filePathOrFileObject;
            previewSrc = encodeURI(rawPath);
        } else {
            if (!objectUrls.has(filePathOrFileObject)) {
                const newUrl = URL.createObjectURL(filePathOrFileObject);
                objectUrls.set(filePathOrFileObject, newUrl);
            }
            previewSrc = objectUrls.get(filePathOrFileObject);
        }

        const previewContent = isImage ?
            `<img src="${previewSrc}" alt="${name}" class="w-16 h-16 object-cover rounded-md mr-4" onerror="this.src='/images/placeholder-image.svg'">` :
            `<div class="w-16 h-16 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded-md mr-4">
                 <span class="text-lg font-bold text-slate-500 dark:text-slate-400">${fileExt}</span>
               </div>`;

        wrapper.innerHTML = `
            <div class="flex items-center flex-grow">
                ${previewContent}
                <div class="flex-grow">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        ${isExisting ? `<a href="${previewSrc}" target="_blank" class="text-indigo-600 hover:text-indigo-800">${name}</a>` : name}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${isExisting ? 'Tersimpan' : 'Baru'}</p>
                </div>
            </div>
            <button type="button" class="delete-file-btn text-red-500 hover:text-red-700 ml-4 flex-shrink-0">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        return wrapper;
    };

    const handleFiles = (files) => {
        for (const file of files) {
            newFiles.push(file);
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
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFiles(fileInput.files);
            fileInput.value = '';
        }
    });

    filePreviewList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-file-btn');
        if (deleteBtn) {
            const wrapper = deleteBtn.closest('div[data-id]');
            const id = wrapper.dataset.id;
            const isExisting = wrapper.dataset.isExisting === 'true';

            if (isExisting) {
                deletedFiles.push(id);
                existingFiles = existingFiles.filter(f => f.id != id);
            } else {
                const fileIndex = parseInt(id.replace('new-', ''), 10);
                if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < newFiles.length) {
                    const fileObject = newFiles[fileIndex];
                    if (objectUrls.has(fileObject)) {
                        URL.revokeObjectURL(objectUrls.get(fileObject));
                        objectUrls.delete(fileObject);
                    }
                    newFiles.splice(fileIndex, 1);
                }
            }
            renderFilePreviews();
        }
    });

    // --- FUNGSI UNTUK RINCIAN PENGELUARAN DINAMIS ---
    const addTransportasiItem = (container, pegawaiId, data = {}) => {
        const templateContent = transportasiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.transport-item');
        const itemIndex = container.querySelectorAll('.transport-item').length;

        newItem.querySelector('[data-name="jenis"]').value = data.jenis || 'Bus';
        newItem.querySelector('[data-name="perusahaan"]').value = data.perusahaan || '';
        newItem.querySelector('[data-name="kode_boking"]').value = data.kode_boking || '';
        newItem.querySelector('[data-name="nomor_penerbangan"]').value = data.nomor_penerbangan || '';
        newItem.querySelector('[data-name="nomor_tiket"]').value = data.nomor_tiket || '';
        newItem.querySelector('[data-name="tanggal_tiket"]').value = formatDate(data.tanggal_tiket) || '';
        newItem.querySelector('[data-name="terminal_berangkat"]').value = data.terminal_berangkat || '';
        newItem.querySelector('[data-name="terminal_tiba"]').value = data.terminal_tujuan || data.terminal_tiba || '';
        newItem.querySelector('[data-name="nominal"]').value = formatCurrency(data.nominal);

        // Atur radio button untuk arah perjalanan
        if (data.arah_perjalanan) {
            const radioToCheck = newItem.querySelector(`[data-name="arah_perjalanan"][value="${data.arah_perjalanan}"]`);
            if (radioToCheck) {
                radioToCheck.checked = true;
            }
        }

        // PERBAIKAN: Pastikan semua elemen input di dalam item baru mendapatkan nama yang benar.
        // Loop melalui semua elemen yang memiliki atribut 'data-name' sebagai ganti 'name'.
        newItem.querySelectorAll('[data-name]').forEach(el => {
            const fieldName = el.dataset.name;
            if (el.type === 'radio') {
                el.name = `pegawai[${pegawaiId}][transportasi][${itemIndex}][arah_perjalanan]`;
            } else {
                el.name = `pegawai[${pegawaiId}][transportasi][${itemIndex}][${fieldName}]`;
            }
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
    };

    const addAkomodasiItem = (container, pegawaiId, data = {}) => {
        const templateContent = akomodasiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.akomodasi-item');
        const itemIndex = container.querySelectorAll('.akomodasi-item').length;

        newItem.querySelector('[data-name="jenis"]').value = data.jenis || 'Hotel';
        newItem.querySelector('[data-name="nama"]').value = data.nama || '';
        newItem.querySelector('[data-name="lokasi_hotel"]').value = data.lokasi_hotel || '';
        newItem.querySelector('[data-name="tanggal_checkIn"]').value = formatDate(data.tanggal_checkIn) || '';
        newItem.querySelector('[data-name="tanggal_checkOut"]').value = formatDate(data.tanggal_checkOut) || '';
        newItem.querySelector('[data-name="harga_satuan"]').value = formatCurrency(data.harga_satuan) || '';
        newItem.querySelector('[data-name="malam"]').value = data.malam || '';

        updateAkomodasiTotal(newItem);

        newItem.querySelectorAll('[data-name]').forEach(el => {
            const fieldName = el.dataset.name;
            el.name = `pegawai[${pegawaiId}][akomodasi][${itemIndex}][${fieldName}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
    };

    const addKontribusiItem = (container, pegawaiId, data = {}) => {
        const templateContent = kontribusiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.kontribusi-item');
        const itemIndex = container.querySelectorAll('.kontribusi-item').length;

        newItem.querySelector('[data-name="jenis"]').value = data.jenis || 'Bimbingan Teknis';
        newItem.querySelector('[data-name="nominal"]').value = formatCurrency(data.nominal);

        newItem.querySelectorAll('[data-name]').forEach(el => {
            const fieldName = el.dataset.name;
            el.name = `pegawai[${pegawaiId}][kontribusi][${itemIndex}][${fieldName}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
    }

    const addLainLainItem = (container, pegawaiId, data = {}) => {
        const templateContent = lainLainTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.lain-lain-item');
        const itemIndex = container.querySelectorAll('.lain-lain-item').length;

        newItem.querySelector('[data-name="uraian"]').value = data.uraian || '';
        newItem.querySelector('[data-name="tarif_satuan"]').value = formatCurrency(data.tarif_satuan) || '';
        newItem.querySelector('[data-name="jumlah_hari"]').value = data.jumlah_hari || '';
        newItem.querySelector('[data-name="keterangan"]').value = data.keterangan || '';

        updateLainLainTotal(newItem);

        newItem.querySelectorAll('[data-name]').forEach(el => {
            const fieldName = el.dataset.name;
            el.name = `pegawai[${pegawaiId}][lain_lain][${itemIndex}][${fieldName}]`;
        });
        container.appendChild(newItem);
        checkRemoveButtons(container.closest('.pengeluaran-pegawai-item'));
    }

    const checkRemoveButtons = (pegawaiItem) => {
        if (!pegawaiItem) return;
        const types = ['.transport-item', '.akomodasi-item', '.kontribusi-item', '.lain-lain-item'];
        types.forEach(selector => {
            const items = pegawaiItem.querySelectorAll(selector);
            items.forEach((item) => {
                const removeBtn = item.querySelector('.remove-item-btn');
                if (removeBtn) removeBtn.classList.toggle('hidden', items.length <= 1);
            });
        });
    };

    const updateAkomodasiTotal = (itemElement) => {
        if (!itemElement) return;
        const hargaSatuanEl = itemElement.querySelector('[data-name*="harga_satuan"]');
        const jumlahMalamEl = itemElement.querySelector('[data-name*="malam"]');
        const totalNominalEl = itemElement.querySelector('[data-name*="nominal"]');

        const harga = parseCurrency(hargaSatuanEl.value);
        const malam = parseInt(jumlahMalamEl.value) || 0;
        totalNominalEl.value = formatCurrency(harga * malam);
    };

    const updateLainLainTotal = (itemElement) => {
        if (!itemElement) return;
        const tarifSatuanEl = itemElement.querySelector('[data-name*="tarif_satuan"]');
        const jumlahHariEl = itemElement.querySelector('[data-name*="jumlah_hari"]');
        const totalNominalEl = itemElement.querySelector('[data-name*="nominal"]');

        const tarif = parseCurrency(tarifSatuanEl.value);
        const hari = parseInt(jumlahHariEl.value) || 0;
        totalNominalEl.value = formatCurrency(tarif * hari);
    };

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        debugLog('--- PROSES SIMPAN LAPORAN DIMULAI ---');

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';

        try {
            // 1. Validasi Penandatangan
            const selectedSignerIds = Array.from(penandatanganContainer.querySelectorAll('input[name="penandatangan_ids"]:checked'))
                .map(cb => cb.value);

            if (selectedSignerIds.length === 0) {
                debugLog('VALIDASI GAGAL: Tidak ada penandatangan yang dipilih.');
                throw new Error('Pilih minimal satu penandatangan laporan.');
            }

            // 2. Validasi Rincian Pengeluaran
            let missingDetailsFor = [];

            for (const pegawaiId of selectedSignerIds) {
                const expenseBlock = pengeluaranPerPegawaiContainer.querySelector(`.pengeluaran-pegawai-item[data-pegawai-id="${pegawaiId}"]`);
                const signerCheckbox = penandatanganContainer.querySelector(`input[value="${pegawaiId}"]`);
                const signerName = signerCheckbox ? signerCheckbox.nextElementSibling.querySelector('span.font-medium').textContent : `ID ${pegawaiId}`;

                if (expenseBlock) {
                    const nominalInputs = expenseBlock.querySelectorAll('[name$="[nominal]"]');
                    const hasValue = Array.from(nominalInputs).some(input => parseCurrency(input.value) > 0);
                    if (!hasValue) {
                        missingDetailsFor.push(signerName);
                    }
                }
            }

            if (missingDetailsFor.length > 0) {
                debugLog('VALIDASI GAGAL: Rincian pengeluaran kosong untuk:', missingDetailsFor);
                throw new Error(`Validasi Gagal:\n\nHarap isi minimal satu rincian pengeluaran untuk penandatangan berikut:\n- ${missingDetailsFor.join('\n- ')}`);
            }

            // 3. PERBAIKAN UTAMA: Aktifkan dropdown SPT sebentar agar nilainya terbaca oleh FormData.
            // Ini penting karena field disabled tidak terkirim di FormData
            const wasSptDisabled = sptSelect.disabled;
            if (wasSptDisabled) sptSelect.disabled = false;
            debugLog('Membuat FormData. Status SPT disabled sementara:', wasSptDisabled);

            const formData = new FormData(form);

            // Kembalikan status disabled dropdown SPT seperti semula.
            if (wasSptDisabled) sptSelect.disabled = true;
            debugLog('Status SPT disabled dikembalikan.');

            // PERBAIKAN TAMBAHAN: Lakukan double check untuk memastikan spt_id ada di formData.
            // Jika karena suatu alasan (misalnya race condition) masih kosong,
            // kita inject nilainya secara manual dari elemen select.
            if (!formData.get('spt_id')) {
                debugLog('PERINGATAN: spt_id tidak ditemukan di FormData, meng-inject manual.');
                formData.append('spt_id', sptSelect.value);
            }

            // Append data tambahan
            formData.set('penandatangan_ids', JSON.stringify(selectedSignerIds));

            if (isEditMode) formData.append('deleted_files', JSON.stringify(deletedFiles));
            newFiles.forEach(file => formData.append('lampiran', file));

            debugLog('Data tambahan di-append ke FormData:', { penandatangan_ids: selectedSignerIds, deleted_files: deletedFiles, new_files_count: newFiles.length });

            const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;
            const url = isEditMode ? `/api/laporan/${laporanId}` : '/api/laporan';
            const method = isEditMode ? 'PUT' : 'POST';

            // Validasi Pembayaran saat Edit (blokir edit jika sudah dibayar)
            if (isEditMode) {
                debugLog('Mode Edit: Memeriksa status pembayaran...');
                const sptId = formData.get('spt_id');
                try {
                    const checkRes = await fetch(`/api/pembayaran/check/by-spt/${sptId}`);
                    const checkData = await checkRes.json();
                    if (checkRes.ok && checkData.exists) {
                        throw new Error("Aksi Diblokir: Laporan ini tidak dapat diubah karena sudah memiliki bukti bayar terkait. Hapus terlebih dahulu bukti bayar jika ingin mengedit laporan.");
                    }
                } catch (checkError) {
                    if (checkError.message.includes("Aksi Diblokir")) throw checkError;
                    console.warn("Peringatan: Pengecekan bukti bayar gagal, proses dilanjutkan.", checkError);
                }
            }

            // Kirim Data
            debugLog(`Mengirim data ke server...`, { url, method });
            const response = await fetch(url, {
                method: method,
                body: formData,
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || "Gagal menyimpan laporan");
            debugLog('Server merespons dengan sukses:', result);

            // Sukses
            objectUrls.forEach(url => URL.revokeObjectURL(url));
            objectUrls.clear();

            debugLog('--- PROSES SIMPAN LAPORAN SELESAI ---');
            alert(result.message);
            window.location.href = '/laporan';

        } catch (error) {
            debugLog('--- ERROR PADA PROSES SIMPAN ---');
            console.error('Terjadi error saat menyimpan laporan:', error);
            alert(`Gagal menyimpan laporan:\n\n${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan Laporan';
        }
    });

    sptSelect.addEventListener('change', populateFormFromSpt);
    penandatanganContainer.addEventListener('change', updateAndReorderExpenseBlocks);

    const setupAddButtonListeners = (pegawaiItem, pegawaiId) => {
        pegawaiItem.querySelector('.tambah-transportasi-btn').addEventListener('click', () => {
            addTransportasiItem(pegawaiItem.querySelector('.transportasi-container'), pegawaiId);
        });
        pegawaiItem.querySelector('.tambah-akomodasi-btn').addEventListener('click', () => {
            addAkomodasiItem(pegawaiItem.querySelector('.akomodasi-container'), pegawaiId);
        });
        pegawaiItem.querySelector('.tambah-kontribusi-btn').addEventListener('click', () => {
            addKontribusiItem(pegawaiItem.querySelector('.kontribusi-container'), pegawaiId);
        });
        pegawaiItem.querySelector('.tambah-lain-lain-btn').addEventListener('click', () => {
            addLainLainItem(pegawaiItem.querySelector('.lain-lain-container'), pegawaiId);
        });
    };

    pengeluaranPerPegawaiContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const itemToRemove = removeBtn.parentElement.closest('div[class*="-item"]');
            const pegawaiItem = itemToRemove.closest('.pengeluaran-pegawai-item');
            itemToRemove.remove();
            checkRemoveButtons(pegawaiItem);
        }
    });

    pengeluaranPerPegawaiContainer.addEventListener('input', (e) => {
        if (e.target.name && e.target.name.includes('[jenis]')) {
            const selectedValue = e.target.value;
            const itemElement = e.target.closest('.akomodasi-item');

            // Cek apakah ini elemen akomodasi
            if (itemElement) {
                const pegawaiItem = e.target.closest('.pengeluaran-pegawai-item');
                const pegawaiId = pegawaiItem.dataset.pegawaiId;
                const hargaSatuanEl = itemElement.querySelector('[name*="harga_satuan"]');

                if (selectedValue === 'Rumah Warga (30%)') {
                    const standardCost = accommodationStandards[pegawaiId] || 0;
                    const calculatedCost = standardCost * 0.30;
                    hargaSatuanEl.value = formatCurrency(calculatedCost);
                    hargaSatuanEl.readOnly = true;
                    hargaSatuanEl.classList.add('bg-slate-100', 'dark:bg-slate-600', 'cursor-not-allowed');
                } else {
                    hargaSatuanEl.readOnly = false;
                    hargaSatuanEl.classList.remove('bg-slate-100', 'dark:bg-slate-600', 'cursor-not-allowed');
                }
                updateAkomodasiTotal(itemElement);
            }
        } else if (e.target.classList.contains('akomodasi-calc')) {
            const itemElement = e.target.closest('.akomodasi-item');
            updateAkomodasiTotal(itemElement);
        } else if (e.target.classList.contains('lain-lain-calc')) {
            const itemElement = e.target.closest('.lain-lain-item');
            updateLainLainTotal(itemElement);
        }
    });

    form.addEventListener('input', (e) => {
        if (e.target.classList.contains('currency-input')) {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const oldValue = e.target.value;
            e.target.value = formatCurrency(e.target.value);
            const newLength = e.target.value.length;
            const oldLength = oldValue.length;
            e.target.setSelectionRange(start + (newLength - oldLength), end + (newLength - oldLength));
        }
    });

    const initializePage = async () => {
        isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;
        const submitButton = form.querySelector('button[type="submit"]');

        if (isEditMode) {
            pageTitle.textContent = 'Edit Laporan Perjalanan Dinas';
            if (submitButton) submitButton.textContent = 'Simpan Perubahan';

            // Di mode edit, loadLaporanForEdit yang akan memanggil loadSptOptions
            await loadLaporanForEdit(laporanId);
        } else {
            // Di mode create, panggil langsung
            await loadSptOptions();
        }
    };

    window.addEventListener('beforeunload', () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    });

    initializePage();
})();