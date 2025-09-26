document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form-spt');
    const pageTitle = document.querySelector('h2'); // Ambil elemen H2 judul
    if (!form) return;

    const tanggalBerangkatInput = document.getElementById('tanggal_berangkat');
    const tanggalKembaliInput = document.getElementById('tanggal_kembali');
    const lamaPerjalananInput = document.getElementById('lama_perjalanan');
    const tambahPegawaiBtn = document.getElementById('tambah-pegawai');
    const cancelButton = document.getElementById('cancel-button'); // Ambil tombol Batal dengan ID
    const pegawaiContainer = document.getElementById('pegawai-container');
    const pejabatSelect = document.getElementById('pejabat_pemberi_tugas');
    const kodeAnggaranSelect = document.getElementById('kode_anggaran');
    let pegawaiCounter = 1; // Untuk unique ID dan name pada baris pegawai

    let isEditMode = false;
    let sptId = null;

    // --- Fungsi untuk menghitung lama perjalanan ---
    function calculateDuration() {
        const startDate = tanggalBerangkatInput.value;
        const endDate = tanggalKembaliInput.value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end < start) {
                lamaPerjalananInput.value = '';
                alert('Tanggal kembali tidak boleh sebelum tanggal berangkat.');
                tanggalKembaliInput.value = '';
                return;
            }

            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Termasuk hari berangkat dan kembali
            lamaPerjalananInput.value = diffDays;
        } else {
            lamaPerjalananInput.value = '';
        }
    }

    tanggalBerangkatInput.addEventListener('change', calculateDuration);
    tanggalKembaliInput.addEventListener('change', calculateDuration);

    // --- Fungsi untuk inisialisasi dropdown lokasi tujuan ---
    async function initializeLocationSelect() {
        try {
            const response = await fetch('/data/locations.json');
            if (!response.ok) throw new Error('Gagal memuat data lokasi.');
            const locationGroups = await response.json();

            const options = [];
            const optgroups = [];

            locationGroups.forEach(group => {
                optgroups.push({ id: group.group, name: group.group });
                group.locations.forEach(location => {
                    // FINAL FIX: Differentiate value based on group type.
                    // If the group is a province (doesn't contain 'Kecamatan'), the value is the province name.
                    // If the group is a kecamatan, the value is the specific village/location name.
                    const isProvinsiGroup = !group.group.toLowerCase().includes('kecamatan');
                    // PERBAIKAN: Nilai yang disimpan adalah teks yang ditampilkan. Ini membuat data konsisten.
                    // Backend akan menangani pemisahan nama provinsi dari format "Kota, Provinsi".
                    const text = `${location}, ${group.group}`;
                    const value = text;


                    options.push({ value: value, text: text, optgroup: group.group });
                });
            });

            new TomSelect('#lokasi_tujuan', {
                create: true,
                sortField: {
                    field: "text",
                    direction: "asc"
                },
                options: options,
                optgroups: optgroups,
                // PERBAIKAN: Gunakan render.item untuk memastikan tampilan yang benar
                render: {
                    item: function (item, escape) {
                        return '<div>' + escape(item.text) + '</div>';
                    },
                    option: function (item, escape) {
                        return '<div>' + escape(item.text) + '</div>';
                    }
                }
            });
        } catch (error) {
            console.error("Error initializing location select:", error);
        }
    }

    // --- Fungsi untuk memuat data pegawai dan pejabat ---
    async function loadOptions() {
        kodeAnggaranSelect.innerHTML = '<option value="">-- Memuat Anggaran... --</option>';
        try {
            // Ambil semua data yang diperlukan secara bersamaan untuk efisiensi
            const [pejabatResponse, pegawaiResponse, anggaranResponse] = await Promise.all([
                fetch('/api/pejabat'),
                fetch('/api/pegawai'),
                fetch('/api/anggaran')
            ]);

            if (!pejabatResponse.ok) throw new Error('Gagal memuat data pejabat.');
            if (!pegawaiResponse.ok) throw new Error('Gagal memuat data pegawai.');
            if (!anggaranResponse.ok) throw new Error('Gagal memuat data anggaran.');

            const pejabatDaerah = await pejabatResponse.json();
            const semuaPegawai = await pegawaiResponse.json();
            const semuaAnggaran = await anggaranResponse.json();

            // 1. Siapkan data untuk dropdown "Pejabat Pemberi Tugas" (Kepala Daerah & Sekda)
            const sekda = semuaPegawai.find(p => p.jabatan && p.jabatan.toLowerCase() === 'sekretaris daerah');
            const pemberiTugas = [...pejabatDaerah];
            if (sekda) {
                // Tambahkan sekda ke daftar pemberi tugas jika ditemukan
                // Pastikan nama yang valid (dari 'nama' atau 'nama_lengkap') disalin
                pemberiTugas.push({
                    id: sekda.id, // Gunakan 'nama_lengkap' yang konsisten
                    nama: sekda.nama_lengkap,
                    jabatan: sekda.jabatan
                });
            }

            const pemberiTugasOptions = pemberiTugas
                // Gunakan 'p.nama || p.nama_lengkap' untuk memastikan nama selalu ada
                .map(p => `<option value="${p.id}">${p.nama || p.nama_lengkap} - ${p.jabatan}</option>`)
                .join('');
            pejabatSelect.innerHTML += pemberiTugasOptions;

            // 2. Siapkan data untuk dropdown "Pegawai yang Diberi Tugas"
            const pegawaiPelaksana = semuaPegawai.filter(p => !(p.jabatan && p.jabatan.toLowerCase() === 'sekretaris daerah'));

            // Buat logika yang sama untuk pegawai pelaksana
            const pegawaiOptions = pegawaiPelaksana.map(p => `<option value="${p.id}">${p.nama_lengkap} (NIP: ${p.nip})</option>`).join('');

            // Simpan template untuk baris pegawai baru
            pegawaiContainer.dataset.pegawaiOptions = pegawaiOptions;

            // Isi select pegawai yang pertama kali muncul di halaman
            const firstPegawaiSelect = pegawaiContainer.querySelector('select');
            if (firstPegawaiSelect) {
                firstPegawaiSelect.innerHTML += pegawaiOptions;
            }

            // 3. Siapkan data untuk dropdown "Kode Mata Anggaran"
            if (semuaAnggaran.length > 0) {
                const anggaranOptions = semuaAnggaran.map(a => {
                    // Gabungkan kegiatan dan sub kegiatan untuk deskripsi yang lebih informatif
                    const infoKegiatan = [a.kegiatan, a.sub_kegiatan].filter(Boolean).join(' / ');
                    const optionText = `${a.mata_anggaran_kode} - ${a.mata_anggaran_nama} (${infoKegiatan || 'Informasi kegiatan tidak tersedia'})`;
                    return `<option value="${a.id}">${optionText}</option>`;
                })
                    .join(''); // Gabungkan semua string <option> menjadi satu
                kodeAnggaranSelect.innerHTML = `<option value="">-- Pilih Mata Anggaran --</option>${anggaranOptions}`;
            } else {
                kodeAnggaranSelect.innerHTML = '<option value="">-- Belum ada data anggaran --</option>';
                kodeAnggaranSelect.disabled = true;
            }

            // 4. Inisialisasi TomSelect untuk dropdown anggaran setelah opsi dimuat
            // Ini akan memperbaiki masalah UI di mana dropdown terlalu lebar
            if (window.TomSelect) {
                new TomSelect(kodeAnggaranSelect, { sortField: { field: "text", direction: "asc" } });
            }

        } catch (error) {
            console.error('Error memuat data untuk formulir:', error);
            alert('Gagal memuat data pilihan. Pastikan Anda terhubung ke server dan coba muat ulang halaman.');
        }
    }

    // --- Fungsi untuk mengisi form dalam mode edit ---
    async function populateFormForEdit(id) {
        try {
            const response = await fetch(`/api/spt/${id}`); // This API returns the saved `lokasi_tujuan`
            if (!response.ok) throw new Error('Gagal memuat data SPT untuk diedit.');
            const spt = await response.json();

            // Isi semua field
            document.getElementById('nomor_surat').value = spt.nomor_surat;
            document.getElementById('tanggal_surat').value = spt.tanggal_surat;
            document.getElementById('dasar_surat').value = spt.dasar_surat;
            document.getElementById('pejabat_pemberi_tugas').value = spt.pejabat_pemberi_tugas_id;
            document.getElementById('maksud_perjalanan').value = spt.maksud_perjalanan;
            document.getElementById('tanggal_berangkat').value = spt.tanggal_berangkat;
            document.getElementById('tanggal_kembali').value = spt.tanggal_kembali;
            document.getElementById('lama_perjalanan').value = spt.lama_perjalanan;
            document.getElementById('kendaraan').value = spt.kendaraan;
            document.getElementById('tempat_berangkat').value = spt.tempat_berangkat || 'Nanga Pinoh';
            document.getElementById('keterangan').value = spt.keterangan || '';

            // Set radio button sumber dana
            if (spt.sumber_dana) {
                document.querySelector(`input[name="sumber_dana"][value="${spt.sumber_dana}"]`).checked = true;
            }

            // PERBAIKAN: Mengisi TomSelect lokasi tujuan
            const lokasiSelect = document.getElementById('lokasi_tujuan').tomselect;
            if (lokasiSelect && spt.lokasi_tujuan) {
                // PERBAIKAN MODE EDIT: Tambahkan opsi yang tersimpan di database ke dalam daftar
                // TomSelect, lalu atur nilainya. Ini memastikan data lama tidak hilang
                // dan ditampilkan dengan benar.
                lokasiSelect.addOption({ value: spt.lokasi_tujuan, text: spt.lokasi_tujuan });
                lokasiSelect.setValue(spt.lokasi_tujuan);
            }

            // Set kode anggaran (TomSelect)
            const anggaranSelect = document.getElementById('kode_anggaran').tomselect;
            if (anggaranSelect) {
                anggaranSelect.setValue(spt.anggaran_id);
            }

            // Hapus baris pegawai default
            pegawaiContainer.innerHTML = '';
            // Tambahkan baris pegawai sesuai data dari server
            spt.pegawai.forEach(pegawaiData => addPegawaiRow(pegawaiData));

        } catch (error) {
            alert(error.message);
            window.location.href = '/spt'; // Kembali jika gagal
        }
    }

    /**
     * Menambah baris pegawai baru ke dalam form.
     * Jika data disediakan, baris akan diisi dengan data tersebut (untuk mode edit).
     * @param {object} [data={}] - Data pegawai yang akan diisikan.
     */
    const addPegawaiRow = (data = {}) => {
        const newIndex = pegawaiCounter++;
        const newPegawaiRow = document.createElement('div');
        newPegawaiRow.className = 'flex items-center gap-x-4';
        newPegawaiRow.innerHTML = `
            <select name="pegawai[${newIndex}][id]" class="block flex-grow rounded-md border-0 ps-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <option value="">-- Pilih Pegawai --</option>
                ${pegawaiContainer.dataset.pegawaiOptions || ''}
            </select>
            <div class="flex items-center space-x-4 flex-shrink-0">
                <div class="flex items-center">
                    <input id="pengikut_${newIndex}_bukan" name="pegawai[${newIndex}][pengikut]" type="radio" value="0"
                        class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600">
                    <label for="pengikut_${newIndex}_bukan" class="ml-2 block text-sm font-medium text-gray-900 dark:text-gray-300">Bukan Pengikut</label>
                </div>
                <div class="flex items-center">
                    <input id="pengikut_${newIndex}_ya" name="pegawai[${newIndex}][pengikut]" type="radio" value="1" checked
                        class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600">
                    <label for="pengikut_${newIndex}_ya" class="ml-2 block text-sm font-medium text-gray-900 dark:text-gray-300">Pengikut</label>
                </div>
            </div>
            <button type="button" class="text-red-600 hover:text-red-800" onclick="this.parentElement.remove()">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        pegawaiContainer.appendChild(newPegawaiRow);

        // Jika ada data (mode edit), isi nilainya
        if (data.pegawai_id) {
            const newSelect = newPegawaiRow.querySelector('select');
            const radioName = newSelect.name.replace('[id]', '[pengikut]');
            const radioToCheck = newPegawaiRow.querySelector(`input[name="${radioName}"][value="${data.is_pengikut}"]`);

            newSelect.value = data.pegawai_id;
            if (radioToCheck) radioToCheck.checked = true;
        }
    };

    // --- Fungsi untuk menambah baris pegawai ---
    tambahPegawaiBtn.addEventListener('click', () => addPegawaiRow());

    // --- Logika submit form ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        try {
            // Siapkan data pegawai dengan format yang benar
            const pegawaiData = [];
            const pegawaiSelects = pegawaiContainer.querySelectorAll('select[name^="pegawai"]');

            pegawaiSelects.forEach(select => {
                const pegawaiId = select.value;
                // Cari radio button yang dicentang di dalam baris (parent element) yang sama
                const row = select.closest('.flex.items-center.gap-x-4');
                const checkedRadio = row ? row.querySelector('input[type="radio"]:checked') : null;
                const pengikutValue = checkedRadio ? checkedRadio.value : '0'; // Default ke '0' (Bukan Pengikut) jika tidak ada yang dipilih

                if (pegawaiId) {
                    pegawaiData.push({
                        id: pegawaiId,
                        pengikut: pengikutValue
                    });
                }
            });

            if (pegawaiData.length === 0) {
                throw new Error('Minimal satu pegawai harus dipilih.');
            }

            // Siapkan data form
            const formData = {
                nomor_surat: document.getElementById('nomor_surat').value,
                tanggal_surat: document.getElementById('tanggal_surat').value,
                dasar_surat: document.getElementById('dasar_surat').value,
                pejabat_pemberi_tugas_id: document.getElementById('pejabat_pemberi_tugas').value,
                maksud_perjalanan: document.getElementById('maksud_perjalanan').value,
                lokasi_tujuan: document.getElementById('lokasi_tujuan').value, // Ambil nilai yang sudah diperbaiki
                tanggal_berangkat: document.getElementById('tanggal_berangkat').value,
                tanggal_kembali: document.getElementById('tanggal_kembali').value,
                lama_perjalanan: document.getElementById('lama_perjalanan').value,
                sumber_dana: document.querySelector('input[name="sumber_dana"]:checked')?.value,
                kendaraan: document.getElementById('kendaraan').value,
                anggaran_id: document.getElementById('kode_anggaran').value,
                tempat_berangkat: document.getElementById('tempat_berangkat').value,
                keterangan: document.getElementById('keterangan').value,
                pegawai: pegawaiData
            };

            // Validasi data wajib
            const requiredFields = [
                'nomor_surat', 'tanggal_surat', 'dasar_surat', 'pejabat_pemberi_tugas_id',
                'maksud_perjalanan', 'lokasi_tujuan', 'tempat_berangkat', 'tanggal_berangkat', 'tanggal_kembali',
                'lama_perjalanan', 'sumber_dana', 'kendaraan', 'anggaran_id'
            ];

            for (const field of requiredFields) {
                if (!formData[field]) {
                    throw new Error(`Field ${field} harus diisi.`);
                }
            }

            const url = isEditMode ? `/api/spt/${sptId}` : '/api/spt';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Terjadi kesalahan saat menyimpan data.');
            }

            alert(`Surat Perintah Tugas berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}!`);
            window.location.href = '/spt';
        } catch (error) {
            console.error('Error saat menyimpan SPT:', error);
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan SPT';
        }
    });

    // Muat data saat halaman dimuat
    async function initializePage() {
        await loadOptions(); // Tunggu opsi dimuat
        await initializeLocationSelect(); // Tunggu lokasi dimuat

        const pathParts = window.location.pathname.split('/');
        if (window.location.pathname.startsWith('/edit-spt/')) {
            isEditMode = true;
            sptId = pathParts[pathParts.length - 1];
            if (pageTitle) pageTitle.textContent = 'Edit Surat Perintah Tugas (SPT)';
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = 'Simpan Perubahan';

            populateFormForEdit(sptId);
        }
    }

    // --- Fungsi untuk tombol Batal ---
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Arahkan pengguna kembali ke halaman register SPT
            window.location.href = '/spt';
        });
    }

    initializePage();
});