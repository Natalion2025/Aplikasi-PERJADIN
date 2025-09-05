document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form-spt');
    const pageTitle = document.querySelector('h2'); // Ambil elemen H2 judul
    if (!form) return;

    const tanggalBerangkatInput = document.getElementById('tanggal_berangkat');
    const tanggalKembaliInput = document.getElementById('tanggal_kembali');
    const lamaPerjalananInput = document.getElementById('lama_perjalanan');
    const tambahPegawaiBtn = document.getElementById('tambah-pegawai');
    const pegawaiContainer = document.getElementById('pegawai-container');
    const pejabatSelect = document.getElementById('pejabat_pemberi_tugas');
    const kodeAnggaranSelect = document.getElementById('kode_anggaran');

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
                    options.push({ value: location, text: location, optgroup: group.group });
                });
            });

            new TomSelect('#lokasi_tujuan', {
                create: true, // Izinkan pengguna membuat opsi baru (mengetik lokasi yang tidak ada di daftar)
                sortField: {
                    field: "text",
                    direction: "asc"
                },
                options: options,
                optgroups: optgroups
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
                    id: sekda.id,
                    nama: sekda.nama || sekda.nama_lengkap,
                    jabatan: sekda.jabatan
                });
            }

            const pemberiTugasOptions = pemberiTugas
                // Gunakan 'p.nama || p.nama_lengkap' untuk memastikan nama selalu ada
                .map(p => `<option value="${p.id}">${p.nama || p.nama_lengkap} - ${p.jabatan}</option>`)
                .join('');
            pejabatSelect.innerHTML += pemberiTugasOptions;

            // 2. Siapkan data untuk dropdown "Pegawai yang Diberi Tugas" (kecualikan sekda)
            const pegawaiPelaksana = semuaPegawai.filter(p => !(p.jabatan && p.jabatan.toLowerCase() === 'sekretaris daerah'));

            // Buat logika yang sama untuk pegawai pelaksana
            const pegawaiOptions = pegawaiPelaksana.map(p => `<option value="${p.id}">${p.nama || p.nama_lengkap} (NIP: ${p.nip})</option>`).join('');

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
            const response = await fetch(`/api/spt/${id}`);
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

            // Set radio button sumber dana
            if (spt.sumber_dana) {
                document.querySelector(`input[name="sumber_dana"][value="${spt.sumber_dana}"]`).checked = true;
            }

            // Set lokasi tujuan (TomSelect)
            const lokasiSelect = document.getElementById('lokasi_tujuan').tomselect;
            if (lokasiSelect) {
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
            // Tambahkan baris pegawai sesuai data
            spt.pegawai.forEach(pegawaiId => {
                tambahPegawaiBtn.click(); // Panggil event click untuk membuat baris baru
                const newSelect = pegawaiContainer.lastChild.querySelector('select');
                newSelect.value = pegawaiId;
            });

        } catch (error) {
            alert(error.message);
            window.location.href = '/spt'; // Kembali jika gagal
        }
    }

    // --- Fungsi untuk menambah baris pegawai ---
    tambahPegawaiBtn.addEventListener('click', () => {
        const newPegawaiRow = document.createElement('div');
        newPegawaiRow.className = 'flex items-center gap-x-4';
        newPegawaiRow.innerHTML = `
            <select name="pegawai[]" class="block w-full rounded-md border-0 ps-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <option value="">-- Pilih Pegawai --</option>
                ${pegawaiContainer.dataset.pegawaiOptions || ''}
            </select>
            <button type="button" class="text-red-600 hover:text-red-800" onclick="this.parentElement.remove()">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        pegawaiContainer.appendChild(newPegawaiRow);
    });

    // --- Logika submit form ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.pegawai = formData.getAll('pegawai[]'); // Mengambil semua pegawai yang dipilih

        const url = isEditMode ? `/api/spt/${sptId}` : '/api/spt';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Terjadi kesalahan saat menyimpan data.');
            }

            alert(`Surat Perintah Tugas berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}!`);
            window.location.href = '/spt'; // Arahkan ke halaman register setelah berhasil
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

    initializePage();
});