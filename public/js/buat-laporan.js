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

            sptSelect.disabled = true; // Cegah perubahan SPT saat edit

        } catch (error) {
            console.error(error);
            alert(error.message);
            window.location.href = '/laporan';
        }
    };

    // Event listener untuk form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditMode = window.location.pathname.startsWith('/edit-laporan/');
        const laporanId = isEditMode ? window.location.pathname.split('/').pop() : null;

        // Aktifkan sementara dropdown SPT agar nilainya terkirim
        if (isEditMode) sptSelect.disabled = false;
        const formData = new FormData(form);
        if (isEditMode) sptSelect.disabled = true;

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