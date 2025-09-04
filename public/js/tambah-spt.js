document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form-spt');
    if (!form) return;

    const tanggalBerangkatInput = document.getElementById('tanggal_berangkat');
    const tanggalKembaliInput = document.getElementById('tanggal_kembali');
    const lamaPerjalananInput = document.getElementById('lama_perjalanan');
    const tambahPegawaiBtn = document.getElementById('tambah-pegawai');
    const pegawaiContainer = document.getElementById('pegawai-container');
    const pejabatSelect = document.getElementById('pejabat_pemberi_tugas');

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
        try {
            // Ambil data pejabat dan pegawai secara bersamaan untuk efisiensi
            const [pejabatResponse, pegawaiResponse] = await Promise.all([
                fetch('/api/pejabat'),
                fetch('/api/pegawai')
            ]);

            if (!pejabatResponse.ok) throw new Error('Gagal memuat data pejabat.');
            if (!pegawaiResponse.ok) throw new Error('Gagal memuat data pegawai.');

            const pejabatDaerah = await pejabatResponse.json();
            const semuaPegawai = await pegawaiResponse.json();

            // 1. Siapkan data untuk dropdown "Pejabat Pemberi Tugas"
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

        } catch (error) {
            console.error('Error memuat data untuk formulir:', error);
            alert('Gagal memuat data pilihan. Pastikan Anda terhubung ke server dan coba muat ulang halaman.');
        }
    }

    // --- Fungsi untuk menambah baris pegawai ---
    tambahPegawaiBtn.addEventListener('click', () => {
        const newPegawaiRow = document.createElement('div');
        newPegawaiRow.className = 'flex items-center gap-x-4';
        newPegawaiRow.innerHTML = `
            <select name="pegawai[]" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
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
        // Logika untuk mengirim data ke server akan ditambahkan di sini
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.pegawai = formData.getAll('pegawai[]'); // Mengambil semua pegawai yang dipilih

        console.log('Data yang akan dikirim:', data);
        alert('Fungsi simpan belum diimplementasikan. Cek console log untuk melihat data.');
        // Nanti di sini akan ada fetch() untuk POST ke API server
    });

    // Muat data saat halaman dimuat
    loadOptions();
    // Inisialisasi dropdown lokasi
    initializeLocationSelect();
});