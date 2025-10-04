document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const pathParts = window.location.pathname.split('/');
    const panjarId = pathParts[pathParts.length - 1];

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatCurrency = (value) => {
        const number = parseFloat(value);
        if (isNaN(number)) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const terbilang = (angka) => {
        // Logika terbilang sederhana, bisa diganti dengan library jika perlu
        const bilangan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
        if (angka < 12) return bilangan[angka];
        if (angka < 20) return terbilang(angka - 10) + " belas";
        if (angka < 100) return terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
        if (angka < 200) return "seratus " + terbilang(angka - 100);
        if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
        if (angka < 2000) return "seribu " + terbilang(angka - 1000);
        if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
        if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
        return "Angka terlalu besar";
    };

    try {
        const response = await fetch(`/api/cetak/panjar/${panjarId}`);
        if (!response.ok) throw new Error('Gagal memuat data cetak.');
        const data = await response.json();

        const totalBiaya = data.rincian.reduce((sum, item) => sum + item.jumlah, 0);
        const terbilangStr = terbilang(totalBiaya).replace(/\s+/g, ' ').trim().replace(/^(.)/, c => c.toUpperCase()) + " rupiah";

        const rincianHtml = data.rincian.map((item, index) => `
            <tr>
                <td style="border: 1px solid black; padding: 5px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 5px;">${item.uraian}</td>
                <td style="border: 1px solid black; padding: 5px; text-align: right;">${formatCurrency(item.jumlah)}</td>
                <td style="border: 1px solid black; padding: 5px;">${item.keterangan || ''}</td>
            </tr>
        `).join('');

        const printContent = `
            <div class="kop-surat">
                <h1>PEMERINTAH KABUPATEN MELAWI</h1>
                <h2>DINAS KOMUNIKASI DAN INFORMATIKA</h2>
                <p>Jalan Poros Provinsi Nanga Pinoh - Kota Baru, Km. 7, Telp. (0568) 21005 Fax. (0568) 21490</p>
                <p>NANGA PINOH</p>
            </div>

            <h3 class="judul">RINCIAN BIAYA PERJALANAN DINAS</h3>

            <table class="no-border" style="margin-bottom: 20px;">
                <tr>
                    <td style="width: 15%;">ST Nomor</td>
                    <td style="width: 2%;">:</td>
                    <td>${data.nomor_surat}</td>
                </tr>
                <tr>
                    <td>SPD Nomor</td>
                    <td>:</td>
                    <td>${data.nomor_sppd || 'Belum Dibuat'}</td>
                </tr>
            </table>

            <table style="border: 1px solid black;">
                <thead>
                    <tr>
                        <th style="border: 1px solid black; padding: 5px; font-weight: normal">No.</th>
                        <th style="border: 1px solid black; padding: 5px; font-weight: normal">Uraian</th>
                        <th style="border: 1px solid black; padding: 5px; font-weight: normal">Jumlah (Rp)</th>
                        <th style="border: 1px solid black; padding: 5px; font-weight: normal">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    ${rincianHtml}
                    <tr>
                        <td colspan="2" style="border: 1px solid black; padding: 5px; text-align: center; font-weight: normal;">Jumlah:</td>
                        <td style="border: 1px solid black; padding: 5px; text-align: right; font-weight: bold;">${formatCurrency(totalBiaya)}</td>
                        <td style="border: 1px solid black; padding: 5px;"></td>
                    </tr>
                    <tr>
                        <td colspan="4" style="font-weight: bold; font-style: italic; padding: 5px">Terbilang: <em>${terbilangStr}</em></td>
                    </tr>
                </tbody>
            </table>

            <div style=" flex-direction: row; justify-content: space-between; display: flex; margin-top: 20px;">
                <div style="margin-top: 20px;">Telah dibayar sejumlah <br><span>Rp. ${formatCurrency(totalBiaya)}</span></div>
                <div style="margin-top: 20px;">Nanga Pinoh, ${formatDate(data.tanggal_panjar)}<br>Telah menerima uang sebesar <br><span>Rp. ${formatCurrency(totalBiaya)}</span></div>
            </div>
            

            <table class="no-border" style="margin-top: 40px; text-align: center;">
                <tr>
                    <td style="width: 50%;"></td>
                    <td style="width: 50%;">${data.tempat}, ${formatDate(data.tanggal_panjar)}</td>
                </tr>
                <tr>
                    <td>Bendahara Pengeluaran,</td>
                    <td>Yang Menerima,</td>
                </tr>
                <tr style="height: 80px;"><td colspan="2"></td></tr>
                <tr>
                    <td style="font-weight: normal; text-decoration: underline;">${data.bendahara_nama}</td>
                    <td style="font-weight: normal; text-decoration: underline;">${data.pelaksana_nama}</td>
                </tr>
                <tr>
                    <td>NIP. ${data.bendahara_nip}</td>
                    <td>NIP. ${data.pelaksana_nip}</td>
                </tr>
            </table>

            <table class="no-border" style="margin-top: 40px; text-align: center;">
                <tr>
                    <td style="font-weight: bold">Mengetahui <br> Pejabat Berwenang Pemberi Tugas</td>
                </tr>
                <tr style="height: 80px;"><td></td></tr>
                <tr>
                    <td style="font-weight: normal; text-decoration: underline;">${data.pejabat_nama}</td>
                </tr>
                <tr>
                    <td>NIP. ${data.pejabat_nip}</td>
                </tr>
            </table>
        `;

        printArea.innerHTML = printContent;
        setTimeout(() => window.print(), 500);

    } catch (error) {
        printArea.innerHTML = `<div style="text-align: center; color: red;"><strong>Error:</strong> ${error.message}</div>`;
    }
});