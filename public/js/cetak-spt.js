document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const pathParts = window.location.pathname.split('/');
    const sptId = pathParts[pathParts.length - 1];

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const fetchFullData = async () => {
        try {
            const [sptRes, pegawaiRes, pejabatRes] = await Promise.all([
                fetch(`/api/spt/${sptId}`),
                fetch('/api/pegawai'),
                fetch('/api/pejabat')
            ]);

            if (!sptRes.ok || !pegawaiRes.ok || !pejabatRes.ok) {
                throw new Error('Gagal memuat data lengkap untuk pencetakan.');
            }

            const spt = await sptRes.json();
            const allPegawai = await pegawaiRes.json();
            const allPejabat = await pejabatRes.json();

            // Cari detail pegawai yang ditugaskan
            const pegawaiDitugaskan = spt.pegawai.map(pegawaiData => {
                return allPegawai.find(p => p.id === pegawaiData.pegawai_id);
            }).filter(Boolean); // Filter out any undefined results

            // Gabungkan daftar pejabat dan pegawai untuk mencari pemberi tugas
            // Ini penting karena pemberi tugas bisa dari tabel 'pejabat' atau 'pegawai' (misal: Sekda)
            const semuaPemberiTugas = [
                ...allPejabat,
                ...allPegawai.map(p => ({ ...p, nama: p.nama_lengkap })) // Normalisasi properti 'nama'
            ];
            const pejabatPemberiTugas = semuaPemberiTugas.find(p => p.id === spt.pejabat_pemberi_tugas_id);
            if (!pejabatPemberiTugas) {
                throw new Error(`Data Pejabat Pemberi Tugas dengan ID ${spt.pejabat_pemberi_tugas_id} tidak ditemukan.`);
            }

            return { spt, pegawaiDitugaskan, pejabatPemberiTugas };

        } catch (error) {
            printArea.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
            return null;
        }
    };

    const renderSurat = (data) => {
        if (!data) return;

        const { spt, pegawaiDitugaskan, pejabatPemberiTugas } = data;

        const pegawaiHtml = pegawaiDitugaskan.map((p, index) => `
            <tr>
                <td style="width: 5%;">${index + 1}.</td>
                <td style="width: 25%;">Nama</td>
                <td style="width: 5%;">:</td>
                <td style="width: 65%;">${p.nama_lengkap}</td>
            </tr>
            <tr>
                <td></td>
                <td>NIP</td>
                <td>:</td>
                <td>${p.nip}</td>
            </tr>
            <tr>
                <td></td>
                <td>Pangkat/Gol.</td>
                <td>:</td>
                <td>${p.pangkat} / ${p.golongan}</td>
            </tr>
            <tr>
                <td></td>
                <td>Jabatan</td>
                <td>:</td>
                <td>${p.jabatan}</td>
            </tr>
        `).join('');

        printArea.innerHTML = `
            <div class="kop-surat">
                <img src="/assets/logomelawi.png" alt="Logo Melawi">
                <div class="text-kop">
                    <h2>PEMERINTAH KABUPATEN MELAWI</h2>
                    <h1>DINAS KOMUNIKASI DAN INFORMATIKA</h1>
                    <p>Jl. Poros Provinsi Nanga Pinoh – Kota Baru KM. 7,</p>
                    <p>Nanga Pinoh, Kabupaten Melawi, Kode Pos 79672,</p>
                    <p>email dinas_kominfo@melawikab.go.id, website www.melawikab.go.id</p>
                </div>
            </div>

            <div class="judul-spt">
                <h3>SURAT PERINTAH TUGAS</h3>
                <p>Nomor: ${spt.nomor_surat}</p>
            </div>

            <table class="content-table">
                <tr>
                    <td style="width: 15%;">Dasar</td>
                    <td style="width: 5%;">:</td>
                    <td style="width: 80%;">${spt.dasar_surat || '-'}</td>
                </tr>
            </table>

            <h3 style="text-align: center; font-weight: bold; font-size: 12pt; margin-top: 15px; margin-bottom: 15px;">MEMERINTAHKAN:</h3>

            <table class="content-table">
                <tr>
                    <td style="width: 15%;">Kepada</td>
                    <td style="width: 5%;">:</td>
                    <td style="width: 80%;">
                        <table class="content-table">${pegawaiHtml}</table>
                    </td>
                </tr>
                <tr>
                    <td style="width: 15%;">Untuk</td>
                    <td style="width: 5%;">:</td>
                    <td style="width: 80%;">${spt.maksud_perjalanan} ke ${spt.lokasi_tujuan} selama ${spt.lama_perjalanan} hari, dari tanggal ${formatDate(spt.tanggal_berangkat)} s/d ${formatDate(spt.tanggal_kembali)}.</td>
                </tr>
            </table>

            <div class="tanda-tangan">
                <p class="text-left">Ditetapkan di Nanga Pinoh</p>
                <p class="text-left">Pada tanggal ${formatDate(spt.tanggal_surat)}</p>
                <p class="text-left font-bold pb-2">${pejabatPemberiTugas.jabatan},</p>
                <br><br><br><br>
                <p class="text-left text-nowrap font-bold underline">${pejabatPemberiTugas.nama}</p>
            </div>
        `;
    };

    setTimeout(() => {
        window.print();
    }, 500);

    const fullData = await fetchFullData();
    renderSurat(fullData);
});