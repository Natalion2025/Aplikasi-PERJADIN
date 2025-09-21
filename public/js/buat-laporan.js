(function () {
    const form = document.getElementById('form-laporan');
    const sptSelect = document.getElementById('spt_id');
    const pageTitle = document.querySelector('h2');

    // Elemen form yang akan diisi otomatis
    const judulEl = document.getElementById('judul');
    const identitasPelaporEl = document.getElementById('identitas_pelapor');
    const dasarPerjalananEl = document.getElementById('dasar_perjalanan');
    const tujuanPerjalananEl = document.getElementById('tujuan_perjalanan');
    const lamaDanTanggalEl = document.getElementById('lama_dan_tanggal_perjalanan');
    const tempatDikunjungiEl = document.getElementById('tempat_dikunjungi');

    // Elemen untuk upload file
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('lampiran-input');
    const filePreviewList = document.getElementById('file-preview-list');

    // Elemen untuk Rincian Pengeluaran Dinamis
    const transportasiContainer = document.getElementById('transportasi-container');
    const tambahTransportasiBtn = document.getElementById('tambah-transportasi-btn');
    const transportasiTemplate = document.getElementById('transportasi-template');

    const akomodasiContainer = document.getElementById('akomodasi-container');
    const tambahAkomodasiBtn = document.getElementById('tambah-akomodasi-btn');
    const akomodasiTemplate = document.getElementById('akomodasi-template');

    const kontribusiContainer = document.getElementById('kontribusi-container');
    const tambahKontribusiBtn = document.getElementById('tambah-kontribusi-btn');
    const kontribusiTemplate = document.getElementById('kontribusi-template');

    const lainLainContainer = document.getElementById('lain-lain-container');
    const tambahLainLainBtn = document.getElementById('tambah-lain-lain-btn');
    const lainLainTemplate = document.getElementById('lain-lain-template');

    let newFiles = []; // Menyimpan file baru yang akan diupload
    let existingFiles = []; // Menyimpan file yang sudah ada (mode edit)
    let deletedFiles = []; // Menyimpan ID file yang akan dihapus (mode edit)

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

    // Fungsi untuk memuat SPT ke dropdown
    const loadSptOptions = async () => {
        try {
            const response = await fetch('/api/spt');
            if (!response.ok) throw new Error('Gagal memuat data SPT.');
            const spts = await response.json();

            // Filter SPT yang aktif dan belum punya laporan
            const availableSpts = spts.filter(spt => spt.status === 'aktif' && spt.laporan_count === 0);

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

    // Fungsi untuk mengisi data form berdasarkan SPT yang dipilih
    const populateFormFromSpt = async () => {
        const selectedOption = sptSelect.options[sptSelect.selectedIndex];
        const sptId = selectedOption.value;

        if (!sptId) {
            form.reset();
            return;
        }

        try {
            // Ambil detail lengkap dari SPT, termasuk nama pegawai
            const response = await fetch(`/api/spt/${sptId}`);
            if (!response.ok) throw new Error('Gagal memuat detail SPT.');
            const sptDetail = await response.json();

            // Ambil data pegawai utama
            const pegawaiUtamaId = sptDetail.pegawai.find(p => p.is_pengikut === 0)?.pegawai_id;
            if (pegawaiUtamaId) {
                const pegawaiRes = await fetch(`/api/pegawai/${pegawaiUtamaId}`);
                const pegawai = await pegawaiRes.json();
                identitasPelaporEl.value = `${pegawai.nama_lengkap}\nNIP. ${pegawai.nip}\n${pegawai.jabatan}`;
            }

            dasarPerjalananEl.value = sptDetail.dasar_surat;
            tujuanPerjalananEl.value = sptDetail.maksud_perjalanan;
            lamaDanTanggalEl.value = `${sptDetail.lama_perjalanan} hari, dari ${formatDisplayDate(sptDetail.tanggal_berangkat)} s/d ${formatDisplayDate(sptDetail.tanggal_kembali)}`;
            tempatDikunjungiEl.value = sptDetail.lokasi_tujuan;

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Fungsi untuk memuat data laporan yang ada untuk mode edit
    const loadLaporanForEdit = async (id) => {
        try {
            const response = await fetch(`/api/laporan/${id}`);
            if (!response.ok) throw new Error('Gagal memuat data laporan untuk diedit.');
            const laporan = await response.json();

            // Jika SPT terkait tidak ada di daftar opsi (karena sudah punya laporan),
            // kita perlu menambahkannya secara manual agar bisa ditampilkan.
            const sptResponse = await fetch(`/api/spt/${laporan.spt_id}`);
            if (sptResponse.ok) {
                const sptData = await sptResponse.json();
                const option = new Option(sptData.nomor_surat, sptData.id, true, true);
                sptSelect.appendChild(option);
            }

            await loadSptOptions(); // Muat semua opsi SPT dulu

            sptSelect.value = laporan.spt_id;
            document.getElementById('tanggal_laporan').value = formatDate(laporan.tanggal_laporan);
            document.getElementById('tempat_laporan').value = laporan.tempat_laporan;
            judulEl.value = laporan.judul;
            identitasPelaporEl.value = laporan.identitas_pelapor;
            dasarPerjalananEl.value = laporan.dasar_perjalanan;
            tujuanPerjalananEl.value = laporan.tujuan_perjalanan;
            lamaDanTanggalEl.value = laporan.lama_dan_tanggal_perjalanan;
            document.getElementById('deskripsi_kronologis').value = laporan.deskripsi_kronologis;
            tempatDikunjungiEl.value = laporan.tempat_dikunjungi;
            document.getElementById('hasil_dicapai').value = laporan.hasil_dicapai;

            // Isi data transportasi dinamis
            if (laporan.transportasi_jenis) {
                addTransportasiItem({
                    jenis: laporan.transportasi_jenis,
                    perusahaan: laporan.transportasi_perusahaan,
                    nominal: laporan.transportasi_nominal
                });
            }

            // Isi data akomodasi dinamis
            if (laporan.akomodasi_jenis) {
                addAkomodasiItem({
                    jenis: laporan.akomodasi_jenis,
                    nama: laporan.akomodasi_nama,
                    harga_satuan: laporan.akomodasi_harga_satuan,
                    malam: laporan.akomodasi_malam,
                    nominal: laporan.akomodasi_nominal
                });
            }

            // Isi data kontribusi dinamis
            if (laporan.kontribusi_jenis) {
                addKontribusiItem({
                    jenis: laporan.kontribusi_jenis,
                    nominal: laporan.kontribusi_nominal
                });
            }

            // Isi data biaya lain-lain dinamis
            if (laporan.lain_lain_uraian) {
                addLainLainItem({
                    uraian: laporan.lain_lain_uraian,
                    nominal: laporan.lain_lain_nominal
                });
            }
            checkRemoveButtons();

            document.getElementById('kesimpulan').value = laporan.kesimpulan;

            // Tampilkan lampiran yang sudah ada
            if (laporan.lampiran && laporan.lampiran.length > 0) {
                existingFiles = laporan.lampiran;
                renderFilePreviews();
            }

            sptSelect.disabled = true; // Cegah perubahan SPT saat edit

        } catch (error) {
            console.error(error);
            alert(error.message);
            window.location.href = '/laporan';
        }
    };

    // --- FUNGSI-FUNGSI UNTUK FILE UPLOAD ---

    const renderFilePreviews = () => {
        filePreviewList.innerHTML = '';

        // Render file yang sudah ada (mode edit)
        existingFiles.forEach(file => {
            const previewEl = createFilePreviewElement(file.id, file.file_name, `/${file.file_path}`, true);
            filePreviewList.appendChild(previewEl);
        });

        // Render file baru yang akan diupload
        newFiles.forEach((file, index) => {
            const previewEl = createFilePreviewElement(index, file.name, URL.createObjectURL(file), false);
            filePreviewList.appendChild(previewEl);
        });
    };

    const createFilePreviewElement = (id, name, url, isExisting) => {
        const isImage = name.match(/\.(jpeg|jpg|png|gif)$/i);
        const fileExt = name.split('.').pop().toUpperCase();

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600';
        wrapper.dataset.id = id;
        wrapper.dataset.isExisting = isExisting;

        const previewContent = isImage
            ? `<img src="${url}" alt="Preview" class="w-16 h-16 object-cover rounded-md mr-4">`
            : `<div class="w-16 h-16 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded-md mr-4">
                 <span class="text-lg font-bold text-slate-500 dark:text-slate-400">${fileExt}</span>
               </div>`;

        wrapper.innerHTML = `
            <div class="flex items-center flex-grow">
                ${previewContent}
                <div class="flex-grow">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">${name}</p>
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
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFiles(files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
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

            if (isExisting) {
                deletedFiles.push(id); // Tambahkan ID ke daftar hapus
                existingFiles = existingFiles.filter(f => f.id != id); // Hapus dari daftar tampilan
            } else {
                newFiles.splice(id, 1); // Hapus dari array file baru
            }
            renderFilePreviews(); // Render ulang
        }
    });

    // --- FUNGSI UNTUK RINCIAN PENGELUARAN DINAMIS ---

    const addTransportasiItem = (data = {}) => {
        const templateContent = transportasiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.transport-item');
        newItem.querySelector('[name="transportasi_jenis"]').value = data.jenis || 'Bus';
        newItem.querySelector('[name="transportasi_perusahaan"]').value = data.perusahaan || '';
        newItem.querySelector('[name="transportasi_nominal"]').value = formatCurrency(data.nominal);
        transportasiContainer.appendChild(newItem);
        checkRemoveButtons();
    };

    const addAkomodasiItem = (data = {}) => {
        const templateContent = akomodasiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.akomodasi-item');
        newItem.querySelector('[name="akomodasi_jenis"]').value = data.jenis || 'Hotel';
        newItem.querySelector('[name="akomodasi_nama"]').value = data.nama || '';
        newItem.querySelector('[name="akomodasi_harga_satuan"]').value = formatCurrency(data.harga_satuan) || '';
        newItem.querySelector('[name="akomodasi_malam"]').value = data.malam || '';
        akomodasiContainer.appendChild(newItem);
        updateAkomodasiTotal(newItem); // Hitung total jika ada data awal
        checkRemoveButtons();
    };

    const addKontribusiItem = (data = {}) => {
        const templateContent = kontribusiTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.kontribusi-item');
        newItem.querySelector('[name="kontribusi_jenis"]').value = data.jenis || 'Bimbingan Teknis';
        newItem.querySelector('[name="kontribusi_nominal"]').value = formatCurrency(data.nominal);
        kontribusiContainer.appendChild(newItem);
        checkRemoveButtons();
    }

    const addLainLainItem = (data = {}) => {
        const templateContent = lainLainTemplate.content.cloneNode(true);
        const newItem = templateContent.querySelector('.lain-lain-item');
        newItem.querySelector('[name="lain_lain_uraian"]').value = data.uraian || '';
        newItem.querySelector('[name="lain_lain_nominal"]').value = formatCurrency(data.nominal);
        lainLainContainer.appendChild(newItem);
        checkRemoveButtons();
    }

    const checkRemoveButtons = () => {
        const transportItems = transportasiContainer.querySelectorAll('.transport-item');
        transportItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', transportItems.length <= 1);
        });
        const akomodasiItems = akomodasiContainer.querySelectorAll('.akomodasi-item');
        akomodasiItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', akomodasiItems.length <= 1);
        });
        const kontribusiItems = kontribusiContainer.querySelectorAll('.kontribusi-item');
        kontribusiItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', kontribusiItems.length <= 1);
        });
        const lainLainItems = lainLainContainer.querySelectorAll('.lain-lain-item');
        lainLainItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', lainLainItems.length <= 1);
        });
    };

    const updateAkomodasiTotal = (itemElement) => {
        const hargaSatuanEl = itemElement.querySelector('[name="akomodasi_harga_satuan"]');
        const jumlahMalamEl = itemElement.querySelector('[name="akomodasi_malam"]');
        const totalNominalEl = itemElement.querySelector('[name="akomodasi_nominal"]');

        const harga = parseCurrency(hargaSatuanEl.value);
        const malam = parseInt(jumlahMalamEl.value) || 0;

        const total = harga * malam;
        totalNominalEl.value = formatCurrency(total);
    };

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;

        const formData = new FormData(form);

        // Kumpulkan data transportasi dinamis
        const transportasiData = [];
        transportasiContainer.querySelectorAll('.transport-item').forEach(item => {
            transportasiData.push({
                jenis: item.querySelector('[name="transportasi_jenis"]').value,
                perusahaan: item.querySelector('[name="transportasi_perusahaan"]').value,
                nominal: parseCurrency(item.querySelector('[name="transportasi_nominal"]').value)
            });
        });

        // Kumpulkan data akomodasi dinamis
        const akomodasiData = [];
        akomodasiContainer.querySelectorAll('.akomodasi-item').forEach(item => {
            akomodasiData.push({
                jenis: item.querySelector('[name="akomodasi_jenis"]').value,
                nama: item.querySelector('[name="akomodasi_nama"]').value,
                harga_satuan: parseCurrency(item.querySelector('[name="akomodasi_harga_satuan"]').value),
                malam: item.querySelector('[name="akomodasi_malam"]').value,
                nominal: parseCurrency(item.querySelector('[name="akomodasi_nominal"]').value)
            });
        });

        // Kumpulkan data kontribusi dinamis
        const kontribusiData = [];
        kontribusiContainer.querySelectorAll('.kontribusi-item').forEach(item => {
            kontribusiData.push({
                jenis: item.querySelector('[name="kontribusi_jenis"]').value,
                nominal: parseCurrency(item.querySelector('[name="kontribusi_nominal"]').value)
            });
        });

        // Kumpulkan data biaya lain-lain dinamis
        const lainLainData = [];
        lainLainContainer.querySelectorAll('.lain-lain-item').forEach(item => {
            lainLainData.push({
                uraian: item.querySelector('[name="lain_lain_uraian"]').value,
                nominal: parseCurrency(item.querySelector('[name="lain_lain_nominal"]').value)
            });
        });

        // Hapus field-field dinamis yang tidak perlu dikirim secara individual
        formData.delete('transportasi_jenis');
        formData.delete('transportasi_perusahaan');
        formData.delete('transportasi_nominal');
        formData.delete('akomodasi_jenis');
        formData.delete('akomodasi_nama');
        formData.delete('akomodasi_harga_satuan');
        formData.delete('akomodasi_malam');
        formData.delete('akomodasi_nominal');
        formData.delete('kontribusi_jenis');
        formData.delete('kontribusi_nominal');
        formData.delete('lain_lain_uraian');
        formData.delete('lain_lain_nominal');

        // Tambahkan data dinamis ke FormData
        formData.append('transportasi_jenis', transportasiData.length > 0 ? transportasiData[0].jenis : '');
        formData.append('transportasi_perusahaan', transportasiData.length > 0 ? transportasiData[0].perusahaan : '');
        formData.append('transportasi_nominal', transportasiData.length > 0 ? transportasiData[0].nominal : 0);

        formData.append('akomodasi_jenis', akomodasiData.length > 0 ? akomodasiData[0].jenis : '');
        formData.append('akomodasi_nama', akomodasiData.length > 0 ? akomodasiData[0].nama : '');
        formData.append('akomodasi_harga_satuan', akomodasiData.length > 0 ? akomodasiData[0].harga_satuan : 0);
        formData.append('akomodasi_malam', akomodasiData.length > 0 ? akomodasiData[0].malam : 0);
        formData.append('akomodasi_nominal', akomodasiData.length > 0 ? akomodasiData[0].nominal : 0);

        formData.append('kontribusi_jenis', kontribusiData.length > 0 ? kontribusiData[0].jenis : '');
        formData.append('kontribusi_nominal', kontribusiData.length > 0 ? kontribusiData[0].nominal : 0);

        formData.append('lain_lain_uraian', lainLainData.length > 0 ? lainLainData[0].uraian : '');
        formData.append('lain_lain_nominal', lainLainData.length > 0 ? lainLainData[0].nominal : 0);

        if (isEditMode) {
            formData.append('spt_id', sptSelect.value);
            formData.append('deleted_files', JSON.stringify(deletedFiles));
        }

        // Hapus 'lampiran' default dari FormData karena kita akan menambahkannya secara manual
        formData.delete('lampiran');
        // Tambahkan file baru ke FormData
        newFiles.forEach(file => {
            formData.append('lampiran', file);
        });

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        const url = isEditMode ? `/api/laporan/${laporanId}` : '/api/laporan';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            window.location.href = '/laporan';
        } catch (error) {
            alert(`Gagal menyimpan: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan Laporan';
        }
    });

    // Event listener untuk perubahan SPT
    sptSelect.addEventListener('change', populateFormFromSpt);

    // --- LOGIKA UNTUK TAMBAH/HAPUS RINCIAN PENGELUARAN ---
    tambahTransportasiBtn.addEventListener('click', () => addTransportasiItem());
    tambahAkomodasiBtn.addEventListener('click', () => addAkomodasiItem());
    tambahKontribusiBtn.addEventListener('click', () => addKontribusiItem());
    tambahLainLainBtn.addEventListener('click', () => addLainLainItem());

    transportasiContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            e.target.closest('.transport-item').remove();
            checkRemoveButtons();
        }
    });

    akomodasiContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            e.target.closest('.akomodasi-item').remove();
            checkRemoveButtons();
        }
    });

    kontribusiContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            e.target.closest('.kontribusi-item').remove();
            checkRemoveButtons();
        }
    });

    lainLainContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            e.target.closest('.lain-lain-item').remove();
            checkRemoveButtons();
        }
    });

    // Event listener untuk kalkulasi otomatis total akomodasi
    akomodasiContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('akomodasi-calc')) {
            const itemElement = e.target.closest('.akomodasi-item');
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

    // --- AKHIR LOGIKA TRANSPORTASI ---

    // Inisialisasi
    const initializePage = async () => {
        const isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;
        const submitButton = form.querySelector('button[type="submit"]');

        if (isEditMode) {
            pageTitle.textContent = 'Edit Laporan Perjalanan Dinas';
            if (submitButton) submitButton.textContent = 'Simpan Perubahan';
            await loadLaporanForEdit(laporanId);
        } else {
            addTransportasiItem(); // Tambah satu baris default
            addAkomodasiItem(); // Tambah satu baris default
            addKontribusiItem(); // Tambah satu baris default
            addLainLainItem(); // Tambah satu baris default
            await loadSptOptions();
        }
    };

    initializePage();
})();