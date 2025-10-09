document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const pathParts = window.location.pathname.split('/');
    const pembatalanId = pathParts[pathParts.length - 1];

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const formatCurrency = (value) => {
        const number = parseFloat(String(value).replace(/[^0-9]/g, ''));
        if (isNaN(number)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    try {
        const response = await fetch(`/api/cetak/pembatalan/${pembatalanId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat data pembatalan.');
        }
        const data = await response.json();

        const { pembatalan, spt, pejabatPemberiTugas, pelaksana, sppd, anggaran } = data;

        const suratHtml = `
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

            <div class="judul-surat">
                <h3>SURAT PERNYATAAN PEMBATALAN TUGAS PERJALANAN DINAS</h3>
                <p>NOMOR: 090 / ..... / SETDA</p>
            </div>

            <p>Yang bertanda tangan di bawah ini:</p>
            <table class="content-table" style="margin-left: 20px;">
                <tr>
                    <td style="width: 30%;">Nama</td>
                    <td style="width: 5%;">:</td>
                    <td style="font-weight: bold;">${pejabatPemberiTugas.nama}</td>
                </tr>
                <tr>
                    <td>NIP</td>
                    <td>:</td>
                    <td>${pejabatPemberiTugas.nip || '-'}</td>
                </tr>
                <tr>
                    <td>Jabatan</td>
                    <td>:</td>
                    <td>${pejabatPemberiTugas.jabatan}</td>
                </tr>
            </table><br>

            <p style="align: justify">Menyatakan dengan sesungguhnya, bahwa tugas Perjalanan Dinas dengan Surat Tugas nomor: ${spt.nomor_surat} atas nama:</p>
            <table class="content-table" style="margin-left: 20px;">
                <tr>
                    <td style="width: 30%;">Nama</td>
                    <td style="width: 5%;">:</td>
                    <td style="font-weight: bold;">${pelaksana.nama_lengkap}</td>
                </tr>
                <tr>
                    <td>NIP</td>
                    <td>:</td>
                    <td>${pelaksana.nip || '-'}</td>
                </tr>
                <tr>
                    <td>Jabatan</td>
                    <td>:</td>
                    <td>${pelaksana.jabatan}</td>
                </tr>
                <tr>
                    <td>Instansi</td>
                    <td>:</td>
                    <td>Dinas Komunikasi dan Informatika</td>
                </tr>
            </table><br>

            <p style="align: justify">Dibatalkan atau tidak dapat dilaksanakan disebabkan adanya keperluan dinas lainnya yang sangat mendesak / penting dan
                tidak dapat di tunda yaitu <em>${pembatalan.alasan || 'Tidak ada alasan spesifik'}</em>. Sehubungan dengan pembatalan tersebut, pelaksanaan perjalanan dinas
                tidak dapat digantikan oleh pejabat / pegawai negeri lain.</p><br>

            <p style="align: justify">Demikian surat pernyataan ini dibuat dengan sebenarnya dan apabila dikemudian hari ternyata surat pernyataan ini tidak
                benar, saya bertanggung jawab penuh dan bersedia di proses sesuai dengan ketentuan hukum yang berlaku.</p>

            <div class="tanda-tangan">
                <p>${pembatalan.tempat_pembatalan}, ${formatDate(pembatalan.tanggal_pembatalan)}</p>
                <p>Yang Membuat Pernyataan</p>
                <p style="font-weight: bold;">${pejabatPemberiTugas.jabatan},</p>
                <br><br><br><br>
                <p style="font-weight: bold; text-decoration: underline;">${pejabatPemberiTugas.nama}</p>
                <p>NIP. ${pejabatPemberiTugas.nip || '-'}</p>
            </div>

            <div style="page-break-after: always;"></div>

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
            <div class="judul-surat">
                <h3>SURAT PERNYATAAN PEMBEBANAN <br> BIAYA PEMBATALAN PERJALANAN DINAS</h3>
                <p>NOMOR: ......................</p>
            </div>

            <p>Yang bertanda tangan di bawah ini:</p>
            <table class="content-table" style="margin-left: 20px;">
                <tr>
                    <td style="width: 30%;">Nama</td>
                    <td style="width: 5%;">:</td>
                    <td style="font-weight: bold;">${pejabatPemberiTugas.nama}</td>
                </tr>
                <tr>
                    <td>NIP</td>
                    <td>:</td>
                    <td>${pejabatPemberiTugas.nip || '-'}</td>
                </tr>
                <tr>
                    <td>Jabatan</td>
                    <td>:</td>
                    <td>${pejabatPemberiTugas.jabatan}</td>
                </tr>
                 <tr>
                    <td>Instansi</td>
                    <td>:</td>
                    <td>Pemerintah Kabupaten Melawi</td>
                </tr>
            </table><br>

            <p style="text-align: justify;">Menyatakan dengan sesungguhnya, bahwa perjalanan dinas berdasarkan Surat Tugas Nomor: ${spt.nomor_surat} Tanggal ${formatDate(spt.tanggal_surat)} dan SPD Nomor: ${sppd.nomor_sppd} Tanggal ${formatDate(sppd.tanggal_sppd)} atas nama:</p>
            <table class="content-table" style="margin-left: 20px;">
                 <tr>
                    <td style="width: 30%;">Nama</td>
                    <td style="width: 5%;">:</td>
                    <td style="font-weight: bold;">${pelaksana.nama_lengkap}</td>
                </tr>
                <tr>
                    <td>NIP</td>
                    <td>:</td>
                    <td>${pelaksana.nip || '-'}</td>
                </tr>
                <tr>
                    <td>Jabatan</td>
                    <td>:</td>
                    <td>${pelaksana.jabatan}</td>
                </tr>
                <tr>
                    <td>Instansi</td>
                    <td>:</td>
                    <td>Dinas Komunikasi dan Informatika</td>
                </tr>
            </table><br>

            <p style="text-align: justify;">Dibatalkan sesuai dengan surat Pernyataan Pembatalan Tugas Perjalanan Dinas Nomor: 090 / ..... / SETDA Tanggal ${formatDate(pembatalan.tanggal_pembatalan)}.</p><br>
            <p style="text-align: justify;">Berkenaan dengan pembatalan tersebut, biaya transport dan biaya penginapan berupa <strong>${pembatalan.rincian_biaya || '.....'}</strong> yang telah terlanjur dibayarkan atas beban DPA tidak dapat dikembalikan / refund (sebagian / seluruhnya) sebesar <strong>${formatCurrency(pembatalan.nominal_biaya || 0)}</strong>, sehingga dibebankan pada DPA Nomor: ${anggaran.mata_anggaran_kode} Tanggal ...... Organisasi Dinas Komunikasi dan Informatika.</p><br>
            <p style="text-align: justify;">Demikian surat pernyataan ini dibuat dengan sebenarnya dan apabila dikemudian hari ternyata surat pernyataan ini tidak benar dan menimbulkan kerugian Pemerintah Daerah, saya bertanggung jawab penuh dan bersedia menyetorkan kerugian tersebut ke kas Pemerintah Daerah.</p>

            <div class="tanda-tangan">
                <p>${pembatalan.tempat_pembatalan}, ${formatDate(pembatalan.tanggal_pembatalan)}</p>
                <p>Yang Membuat Pernyataan</p>
                <p style="font-weight: bold;">${pejabatPemberiTugas.jabatan},</p>
                <br><br><br><br>
                <p style="font-weight: bold; text-decoration: underline;">${pejabatPemberiTugas.nama}</p>
                <p>NIP. ${pejabatPemberiTugas.nip || '-'}</p>
            </div>
        `;

        printArea.innerHTML = suratHtml;

        // Otomatis cetak setelah konten dimuat
        setTimeout(() => {
            window.print();
        }, 500);

    } catch (error) {
        printArea.innerHTML = `<p class="text-center text-red-500"><strong>Error:</strong> ${error.message}</p>`;
    }
});