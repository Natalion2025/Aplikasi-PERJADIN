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

    let newFiles = []; // Menyimpan file baru yang akan diupload
    let existingFiles = []; // Menyimpan file yang sudah ada (mode edit)
    let deletedFiles = []; // Menyimpan ID file yang akan dihapus (mode edit)

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
            document.getElementById('transportasi').value = laporan.transportasi;
            document.getElementById('akomodasi').value = laporan.akomodasi;
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

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;

        const formData = new FormData(form);

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
            // Cek apakah ada spt_id di URL (untuk mode tambah dari register)
            const urlParams = new URLSearchParams(window.location.search);
            const sptIdFromUrl = urlParams.get('spt_id');
            if (sptIdFromUrl) {
                sptSelect.value = sptIdFromUrl;
                populateFormFromSpt();
            }
        }
    };

    initializePage();
})();