document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const pathParts = window.location.pathname.split('/');
    // PERBAIKAN: ID di URL bisa jadi ID SPT atau ID SPPD.
    const idFromUrl = pathParts[pathParts.length - 1];
    // Tentukan jenis halaman berdasarkan URL
    const isSppdDetail = window.location.pathname.includes('/cetak/sppd-detail/');

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const formatCurrency = (amount) => {
        if (!amount) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    /**
     * Menentukan tingkat biaya perjalanan dinas berdasarkan jabatan dan golongan.
     * @param {object} pegawai - Objek pegawai yang berisi jabatan dan golongan.
     * @returns {string} Tingkat biaya perjalanan dinas (Golongan B, C, atau D).
     */
    const getTingkatBiaya = (pegawai) => {
        const jabatan = (pegawai.jabatan || '').toLowerCase();
        const golongan = pegawai.golongan || '';

        // Prioritas 1: Golongan B (Pejabat Eselon II atau Golongan IV/c ke atas)
        if (jabatan === 'kepala dinas' || golongan === 'IV/c' || golongan === 'IV/d' || golongan === 'IV/e') {
            return 'Golongan B';
        }

        // Prioritas 2: Golongan C (Pejabat Eselon III)
        if (
            jabatan === 'sekretaris' ||
            jabatan.startsWith('kepala bidang') ||
            jabatan.startsWith('kepala bagian')
        ) {
            return 'Golongan C';
        }

        // Prioritas 3: Golongan D (Pejabat Eselon IV, Staf, dan lainnya)
        // Ini mencakup semua kondisi sisanya, termasuk:
        // - Jabatan seperti Kepala Seksi, Kepala Sub Bagian, dll.
        // - Pegawai dengan golongan I, II, dan III.
        // - Pegawai tanpa jabatan.
        return 'Golongan D';
    };

    const fetchSppdData = async () => {
        try {
            // PERBAIKAN: Gunakan endpoint yang tepat berdasarkan jenis ID dari URL.
            // Endpoint `/api/sppd/by-spt/{id}` sekarang cukup pintar untuk menangani
            // baik ID SPT maupun ID SPPD.
            const idType = isSppdDetail ? 'sppd' : 'spt';
            const apiUrl = `/api/sppd/by-spt/${idFromUrl}?id_type=${idType}`;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memuat data SPPD.');
            }
            return await response.json();
        } catch (error) {
            printArea.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
            return null;
        }
    };

    const renderSurat = (data) => {
        if (!data) return;

        // Ambil sppdList, bukan sppd tunggal
        const {
            sppdList,
            spt,
            pejabat,
            pengikut,
            anggaran,
            penggunaAnggaran } = data;

        if (!sppdList || sppdList.length === 0 || !spt || !pejabat) {
            printArea.innerHTML = `<p class="text-center text-red-500">Data tidak lengkap untuk mencetak SPPD.</p>`;
            return;
        }

        // Buat HTML untuk setiap SPPD dan gabungkan
        const allSppdHtml = sppdList.map(sppd => {
            const pegawai = sppd.pegawai; // Ambil data pegawai dari setiap item SPPD

            return `
            <div style="page-break-after: always;">
            <div class="page-container">
            <div class="kop-surat">
                <img src="/assets/logomelawi.png" alt="Logo Melawi">
                <div class="text-kop">
                    <h1>PEMERINTAH KABUPATEN MELAWI</h1>
                    <h2>SEKRETARIAT DAERAH</h2>
                    <p>Jalan Protokol No. 1 Telp. (0568) 21005 Fax. (0568) 21490</p>
                    <p>NANGA PINOH</p>
                </div>
            </div>

            <div class="flex justify-between mt-4">
                <div></div>
                <div>
                    <p>Lembar ke : 1 (satu)</p>
                    <p>Kode No. : 090</p>
                    <p>Nomor : ${sppd.nomor_sppd || 'N/A'}</p>
                </div>
            </div>

            <div class="judul-sppd">
                <h3>SURAT PERJALANAN DINAS (SPD)</h3>
                <p>(Berdasarkan Surat Perintah Tugas Nomor: ${spt.nomor_surat || ''})</p>
            </div>

            <table class="content-table">
                <tr>
                    <td style="width: 5%;">1.</td>
                    <td style="width: 45%;">Pengguna Anggaran</td>
                    <td colspan="2">${penggunaAnggaran ? penggunaAnggaran.nama_lengkap : 'Kepala Dinas'}</td>
                </tr>
                <tr>
                    <td>2.</td>
                    <td>Nama/NIP Pegawai yang diperintahkan</td>
                    <td colspan="2">${pegawai.nama_lengkap || 'N/A'} <br> ${pegawai.nip || 'N/A'}</td>
                </tr>
                <tr>
                    <td>3.</td>
                    <td>
                        <p>a. Pangkat dan Golongan</p>
                        <p>b. Jabatan/Instansi</p>
                        <p>c. Tingkat Biaya Perjalanan Dinas</p>
                    </td>
                    <td colspan="2">
                        <p>a. ${pegawai.pangkat || '-'} (${pegawai.golongan || '-'})</p>
                        <p>b. ${pegawai.jabatan || '-'}</p>
                        <p>c. ${getTingkatBiaya(pegawai) || '-'}</p>
                    </td>
                </tr>
                <tr>
                    <td>4.</td>
                    <td>Maksud Perjalanan Dinas</td>
                    <td colspan="2">${spt.maksud_perjalanan || ''}</td>
                </tr>
                <tr>
                    <td>5.</td>
                    <td>Alat angkutan yang dipergunakan</td>
                    <td colspan="2">${spt.kendaraan || ''}</td>
                </tr>
                <tr>
                    <td>6.</td>
                    <td>
                        <p>a. Tempat berangkat</p>
                        <p>b. Tempat tujuan</p>
                    </td>
                    <td colspan="2">
                        <p>a. ${spt.tempat_berangkat || 'Nanga Pinoh'}</p>
                        <p>b. ${spt.lokasi_tujuan || ''}</p>
                    </td>
                </tr>
                <tr>
                    <td>7.</td>
                    <td>
                        <p>a. Lama Perjalanan Dinas</p>
                        <p>b. Tanggal berangkat</p>
                        <p>c. Tanggal harus kembali</p>
                    </td>
                    <td colspan="2">
                        <p>a. ${spt.lama_perjalanan || ''} hari</p>
                        <p>b. ${formatDate(spt.tanggal_berangkat)}</p>
                        <p>c. ${formatDate(spt.tanggal_kembali)}</p>
                    </td>
                </tr>
                <tr>
                    <td>8.</td>
                    <td>Pengikut: Nama</td>                   
                    <td>Tanggal Lahir</td>
                    <td colspan="2">Keterangan</td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        ${pengikut && pengikut.length > 0
                    ? pengikut.map((p, index) => `${index + 1}. ${p.nama_lengkap}`).join('<br>')
                    : '-'}
                    </td>
                    <td>${pengikut && pengikut.length > 0
                    ? pengikut.map((p, index) => `${index + 1}. ${p.nip}`).join('<br>')
                    : '-'}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td>9.</td>
                    <td>Pembebanan Anggaran</td>
                    <td colspan="2">
                        <p>a. Instansi : Dinas Komunikasi dan Informatika</p>
                        <p>b. Mata Anggaran : ${anggaran ? anggaran.mata_anggaran_kode : 'Tidak Ditemukan'}</p>
                    </td>
                </tr>
                <tr>
                    <td>10.</td>
                    <td>Keterangan lain-lain</td>
                    <td colspan="2">${spt.keterangan || '-'}</td>
                </tr>
            </table>

            <div class="flex justify-between mt-8">
                <div class="ttd-section">
                    <p>Dikeluarkan di: Nanga Pinoh</p>
                    <p>Pada tanggal: ${formatDate(sppd.tanggal_sppd)}</p>
                    <br><br><br>
                    <p><strong>${pejabat.jabatan || ''}</strong></p>
                    <br><br><br>
                    <p><strong>${pejabat.nama || ''}</strong></p>
                    <p>NIP. ${pejabat.nip || ''}</p>
                </div>
                <div class="ttd-section">
                    <p>PERHATIAN</p>
                    <p>Pegawai yang melakukan perjalanan dinas, harus melaporkan</p>
                    <p>kembali kepada pejabat yang berwenang, memberikan</p>
                    <p>pertanggungjawaban sesuai ketentuan.</p>
                </div>
            </div>
            </div>
            </div>
        `;
        }).join('');

        printArea.innerHTML = allSppdHtml;
    };

    const data = await fetchSppdData();
    renderSurat(data);

    // Auto print after content is loaded
    setTimeout(() => {
        window.print();
    }, 500);
});