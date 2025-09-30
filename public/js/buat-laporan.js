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
            // Sembunyikan dan kosongkan rincian pengeluaran jika tidak ada SPT dipilih
            document.getElementById('rincian-pengeluaran-section').classList.add('hidden');
            accommodationStandards = {}; // Reset standar biaya
            pengeluaranPerPegawaiContainer.innerHTML = '';
            return;
        }

        try {
            // Ambil detail lengkap dari SPT, termasuk nama pegawai
            const response = await fetch(`/api/spt/${sptId}`);
            if (!response.ok) throw new Error('Gagal memuat detail SPT.');
            const sptDetail = await response.json();

            // Ambil standar biaya akomodasi untuk SPT ini
            try {
                const standardsRes = await fetch(`/api/spt/${sptId}/accommodation-standards`);
                if (standardsRes.ok) {
                    accommodationStandards = await standardsRes.json();
                } else accommodationStandards = {};
            } catch (e) { accommodationStandards = {}; }


            // Ambil semua pegawai yang terlibat (pelaksana dan pengikut)
            // Urutkan agar pelaksana utama (bukan pengikut) selalu di atas.
            const semuaPelaksana = (sptDetail.pegawai || []).sort((a, b) => a.is_pengikut - b.is_pengikut);

            // Kosongkan kontainer dan tambahkan checkbox untuk setiap pelaksana
            penandatanganContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Pilih penandatangan laporan (otomatis dari SPT):</p>';

            if (semuaPelaksana.length > 0) {
                semuaPelaksana.forEach(p => {
                    const isChecked = p.is_pengikut === 0; // Secara default, hanya pelaksana utama yang dicentang
                    const checkboxHtml = `
                        <div class="flex items-start">
                            <input id="signer_${p.pegawai_id}" name="penandatangan_ids" type="checkbox" value="${p.pegawai_id}" ${isChecked ? 'checked' : ''}
                                class="h-4 w-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                            <label for="signer_${p.pegawai_id}" class="ml-3 text-sm">
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

            // Tampilkan section rincian pengeluaran dan buat form untuk setiap pegawai
            document.getElementById('rincian-pengeluaran-section').classList.remove('hidden');
            pengeluaranPerPegawaiContainer.innerHTML = ''; // Kosongkan dulu

            semuaPelaksana.forEach(pegawai => {
                const templateContent = pengeluaranPegawaiTemplate.content.cloneNode(true);
                const pegawaiItem = templateContent.querySelector('.pengeluaran-pegawai-item');

                // Set judul dan ID unik untuk setiap blok pegawai
                pegawaiItem.querySelector('.pegawai-name-title').textContent = `Rincian untuk ${pegawai.nama_lengkap}`;
                pegawaiItem.dataset.pegawaiId = pegawai.pegawai_id;

                // PERUBAHAN: Tidak menambahkan baris biaya secara default. Pengguna akan menambahkannya secara manual.
                // Tambahkan event listener untuk tombol "Tambah" di dalam blok ini
                setupAddButtonListeners(pegawaiItem, pegawai.pegawai_id);

                pengeluaranPerPegawaiContainer.appendChild(pegawaiItem);
            });

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

            sptSelect.value = laporan.spt_id;
            document.getElementById('tanggal_laporan').value = formatDate(laporan.tanggal_laporan);
            document.getElementById('tempat_laporan').value = laporan.tempat_laporan;
            document.getElementById('judul').value = laporan.judul;

            // Panggil populateFormFromSpt untuk membuat checkbox, lalu centang sesuai data yang tersimpan
            await populateFormFromSpt();
            // Penanganan error saat parsing JSON
            let selectedIds = [];
            if (laporan.penandatangan_ids) {
                try {
                    selectedIds = JSON.parse(laporan.penandatangan_ids);
                } catch (e) {
                    console.error("Failed to parse penandatangan_ids:", e);
                    alert("Terjadi kesalahan data penandatangan. Data mungkin tidak ditampilkan dengan benar.");
                }
            }
            if (selectedIds.length > 0) {
                penandatanganContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                selectedIds.forEach(id => {
                    const cb = penandatanganContainer.querySelector(`input[value="${id}"]`);
                    if (cb) cb.checked = true;
                });
            }

            dasarPerjalananEl.value = laporan.dasar_perjalanan;
            tujuanPerjalananEl.value = laporan.tujuan_perjalanan;
            lamaDanTanggalEl.value = laporan.lama_dan_tanggal_perjalanan;
            document.getElementById('deskripsi_kronologis').value = laporan.deskripsi_kronologis;
            tempatDikunjungiEl.value = laporan.tempat_dikunjungi;
            document.getElementById('hasil_dicapai').value = laporan.hasil_dicapai;

            // Isi data transportasi dinamis
            // Tampilkan section rincian pengeluaran dan buat form untuk setiap pegawai
            document.getElementById('rincian-pengeluaran-section').classList.remove('hidden');
            pengeluaranPerPegawaiContainer.innerHTML = ''; // Kosongkan dulu

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

            // Jalankan checkRemoveButtons untuk setiap blok pegawai
            document.querySelectorAll('.pengeluaran-pegawai-item').forEach(checkRemoveButtons);

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

    const addTransportasiItem = (container, pegawaiId, data = {}) => {
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
    };

    const addAkomodasiItem = (container, pegawaiId, data = {}) => {
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
    };

    const addKontribusiItem = (container, pegawaiId, data = {}) => {
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
    }

    const addLainLainItem = (container, pegawaiId, data = {}) => {
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
    }

    const checkRemoveButtons = (pegawaiItem) => {
        if (!pegawaiItem) return;
        const transportItems = pegawaiItem.querySelectorAll('.transport-item');
        transportItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', transportItems.length <= 1);
        });
        const akomodasiItems = pegawaiItem.querySelectorAll('.akomodasi-item');
        akomodasiItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', akomodasiItems.length <= 1);
        });
        const kontribusiItems = pegawaiItem.querySelectorAll('.kontribusi-item');
        kontribusiItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.classList.toggle('hidden', kontribusiItems.length <= 1);
        });
        const lainLainItems = pegawaiItem.querySelectorAll('.lain-lain-item');
        lainLainItems.forEach((item, index) => {
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
    };

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;

        const selectedSignerIds = Array.from(penandatanganContainer.querySelectorAll('input[name="penandatangan_ids"]:checked'))
            .map(cb => cb.value);

        if (selectedSignerIds.length === 0) {
            alert('Pilih minimal satu penandatangan laporan.');
            return;
        }

        const formData = new FormData();

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

        // Simpan penandatangan_ids sebagai string JSON
        formData.append('penandatangan_ids', JSON.stringify(selectedSignerIds));

        // Kumpulkan data pengeluaran dari setiap pegawai
        document.querySelectorAll('.pengeluaran-pegawai-item').forEach(pegawaiItem => {
            const pegawaiId = pegawaiItem.dataset.pegawaiId;

            // PERUBAHAN: Kumpulkan data sebagai array
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

        if (isEditMode) {
            formData.append('deleted_files', JSON.stringify(deletedFiles));
        }

        // Tambahkan file baru
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

    // --- LOGIKA UNTUK TAMBAH/HAPUS/KALKULASI RINCIAN PENGELUARAN (EVENT DELEGATION) ---
    pengeluaranPerPegawaiContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const itemToRemove = removeBtn.parentElement.closest('div[class*="-item"]');
            const pegawaiItem = itemToRemove.closest('.pengeluaran-pegawai-item');
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
        const isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;
        const submitButton = form.querySelector('button[type="submit"]');

        if (isEditMode) {
            pageTitle.textContent = 'Edit Laporan Perjalanan Dinas';
            if (submitButton) submitButton.textContent = 'Simpan Perubahan';
            await loadLaporanForEdit(laporanId);
        } else {
            await loadSptOptions();
        }
    };

    initializePage();
})();