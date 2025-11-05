document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const pathParts = window.location.pathname.split('/');
    const pembayaranId = pathParts[pathParts.length - 1];

    const formatCurrency = (value) => {
        const number = parseFloat(value);
        if (isNaN(number)) return '-';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    try {
        const response = await fetch(`/api/cetak/pembayaran/${pembayaranId}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Gagal memuat data cetak.');
        }
        const data = await response.json();

        let rincianHtml = '';
        let grandTotalBiaya = 0;
        let grandTotalPanjar = 0;
        let grandTotalDibayar = 0;

        data.rincian.forEach((penerima, index) => {
            // Perbaikan: rowspan adalah jumlah item biaya + 1 baris untuk "Jumlah"
            const rowCount = penerima.biaya.length + 1;
            let totalBiayaPegawai = 0;
            let totalPanjarPegawai = penerima.panjar;

            // Loop untuk setiap item biaya
            penerima.biaya.forEach((item, itemIndex) => {
                totalBiayaPegawai += item.jumlah;
                rincianHtml += `
                    <tr>
                        ${itemIndex === 0 ? `<td class="text-center" rowspan="${rowCount}">${index + 1}.</td>` : ''}
                        ${itemIndex === 0 ? `<td rowspan="${rowCount}">${penerima.nama_lengkap}</td>` : ''}
                        <td>${item.uraian}</td>
                        <td class="text-right">${formatCurrency(item.harga)}</td>
                        <td class="text-center">${item.satuan}</td>
                        <td class="text-center">${item.hari}</td>
                        <td class="text-right">${formatCurrency(item.jumlah)}</td>
                        ${itemIndex === 0 ? `<td class="text-right" rowspan="${rowCount}">${formatCurrency(totalPanjarPegawai)}</td>` : ''}
                        ${itemIndex === 0 ? `<td class="text-right" rowspan="${rowCount}">${formatCurrency(penerima.total_dibayar)}</td>` : ''}
                        ${itemIndex === 0 ? `<td class="text-left" rowspan="${rowCount}">${index + 1}.</td>` : ''}
                    </tr>
                `;
            });

            // Perbaikan: Tambahkan baris "Jumlah" untuk setiap pegawai
            rincianHtml += `
                <tr class="font-bold" style="background-color: #f9f9f9;">
                    <td colspan="4" class="font-bold text-right">Jumlah</td>
                    <td class="font-bold text-right">${formatCurrency(totalBiayaPegawai)}</td>
                    <!-- Kolom panjar, jumlah dibayar, dan ttd sudah di-handle oleh rowspan -->
                </tr>
            `;

            // Akumulasi total keseluruhan
            grandTotalBiaya += totalBiayaPegawai;
            grandTotalPanjar += totalPanjarPegawai;
            grandTotalDibayar += penerima.total_dibayar;
        });

        const printContent = `
            <h3 class="text-center font-bold text-lg uppercase">KWITANSI (TANDA BUKTI PEMBAYARAN)</h3>
            <br>
            <table class="no-border text-nowrap" style="margin-bottom: 1rem;">
                <tr>
                    <td class="no-border" style="width: 70%;"></td>
                    <td class="no-border" style="width: 15%;">No. BKU</td>
                    <td class="no-border" style="width: 15%;">: .........................</td>
                </tr>
                <tr>
                    <td class="no-border"></td>
                    <td class="no-border">Tanggal BKU</td>
                    <td class="no-border">: .........................</td>
                </tr>
                <tr>
                    <td class="no-border" style="width: 70%;"></td>
                    <td class="no-border" style="width: 15%;">No. Bukti</td>
                    <td class="no-border" style="width: 15%;">: ${data.pembayaran.nomor_bukti}</td>
                </tr>
                <tr>
                    <td class="no-border"></td>
                    <td class="no-border">Tanggal Bukti</td>
                    <td class="no-border">: ${formatDate(data.pembayaran.tanggal_bukti)}</td>
                </tr>
            </table>

            <table class="no-border" style="margin-bottom: 1rem;">
                <tr>
                    <td class="no-border">Program</td>
                    <td class="no-border">:</td>
                    <td class="no-border">${data.anggaran.program || '-'}</td>
                </tr>
                <tr>
                    <td class="no-border">Kegiatan</td>
                    <td class="no-border">:</td>
                    <td class="no-border">${data.anggaran.kegiatan || '-'}</td>
                </tr>
                 <tr>
                    <td class="no-border text-nowrap">Sub Kegiatan</td>
                    <td class="no-border">:</td>
                    <td class="no-border">${data.anggaran.sub_kegiatan || '-'}</td>
                </tr>
                <tr>
                    <td class="no-border text-nowrap">Kode Rekening</td>
                    <td class="no-border">:</td>
                    <td class="no-border">${data.anggaran.mata_anggaran_kode || '-'}</td>
                </tr>
                 <tr>
                    <td class="no-border text-nowrap">Nama Anggaran</td>
                    <td class="no-border">:</td>
                    <td class="no-border">${data.anggaran.mata_anggaran_nama || '-'}</td>
                </tr>
            </table>

            <p>Sudah terima dari Bendahara Pengeluaran Dinas Komunikasi dan Informatika Kab. Melawi uang sebesar <strong>Rp ${formatCurrency(data.pembayaran.nominal_bayar)}</strong></p>
            <p><em>(${data.terbilang})</em></p>
            <p>Untuk ${data.pembayaran.uraian_pembayaran} kepada ${data.pembayaran.nama_penerima.split('\n')[0]} dan kawan-kawan, sesuai dengan Surat Tugas Nomor: ${data.spt.nomor_surat} tanggal ${formatDate(data.spt.tanggal_surat)}, dengan rincian di bawah ini:</p>
            <br>

            <p class="font-bold">RINCIAN PENGELUARAN:</p>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">No</th>
                        <th rowspan="2">Nama</th>
                        <th rowspan="2">Uraian</th>
                        <th colspan="4">Biaya</th>
                        <th rowspan="2">Panjar</th>
                        <th rowspan="2">Jumlah Dibayar</th>
                        <th rowspan="2">Tanda Tangan Penerima</th>
                    </tr>
                    <tr>
                        <th>Harga</th>
                        <th>Satuan</th>
                        <th>Hari</th>
                        <th>Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    ${rincianHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #e9e9e9;">
                        <td colspan="6" class="font-bold text-right">TOTAL KESELURUHAN</td>
                        <td class="font-bold text-right">${formatCurrency(grandTotalBiaya)}</td>
                        <td class="font-bold text-right">${formatCurrency(grandTotalPanjar)}</td>
                        <td class="font-bold text-right">${formatCurrency(grandTotalDibayar)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            <br>

            <table class="no-border">
                <tr>
                    <td class="no-border text-center" style="width: 33%;">
                        <p>Diketahui oleh,</p>
                        <p>Pejabat Pelaksana Teknis Kegiatan</p>
                        <div class="signature-box"></div>
                        <p class="font-bold underline">${data.pejabat.pptk.nama_lengkap || '(Nama PPTK)'}</p>
                        <p>NIP. ${data.pejabat.pptk.nip || '(NIP PPTK)'}</p>
                    </td>
                    <td class="no-border text-center" style="width: 33%;">
                        <p>Nanga Pinoh, ${formatDate(data.pembayaran.tanggal_bukti)}</p>
                        <p>Bendahara Pengeluaran</p>
                        <div class="signature-box"></div>
                        <p class="font-bold underline">${data.pejabat.bendahara.nama_lengkap || '(Nama Bendahara)'}</p>
                        <p>NIP. ${data.pejabat.bendahara.nip || '(NIP Bendahara)'}</p>
                    </td>
                    <td class="no-border text-center" style="width: 33%;">
                        <p>Setuju dibayar,</p>
                        <p>Pengguna Anggaran</p>
                        <div class="signature-box"></div>
                        <p class="font-bold underline">${data.pejabat.penggunaAnggaran.nama_lengkap || '(Nama Kepala Dinas)'}</p>
                        <p>NIP. ${data.pejabat.penggunaAnggaran.nip || '(NIP Kepala Dinas)'}</p>
                    </td>
                </tr>
            </table>
        `;

        printArea.innerHTML = printContent;

        // Auto print
        setTimeout(() => {
            window.print();
        }, 500);

    } catch (error) {
        printArea.innerHTML = `<div class="text-center p-8 text-red-500"><strong>Error:</strong> ${error.message}</div>`;
        console.error(error);
    }
});