document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const pathParts = window.location.pathname.split('/');
    const laporanId = pathParts[pathParts.length - 1];

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const fetchLaporanData = async () => {
        try {
            const response = await fetch(`/api/laporan/${laporanId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memuat data laporan.');
            }
            return await response.json();
        } catch (error) {
            printArea.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
            return null;
        }
    };

    const renderLaporan = (laporan) => {
        if (!laporan) return;

        const nl2br = (str) => (str || '').replace(/(\r\n|\n\r|\r|\n)/g, '<br>');

        const pelaporName = (laporan.identitas_pelapor || '').split('\n')[0];
        const pelaporNip = (laporan.identitas_pelapor || '').split('\n')[1];

        printArea.innerHTML = `
            <div class="judul-laporan">
                <h3>LAPORAN HASIL PERJALANAN DINAS</h3>
            </div>

            <div class="section-title">I. PENDAHULUAN</div>
            <table style="width: 100%; vertical-align: top;">
                <tr><td style="width: 25%;">a. Dasar Perjalanan</td><td style="width: 2%;">:</td><td>${nl2br(laporan.dasar_perjalanan)}</td></tr>
                <tr><td>b. Maksud dan Tujuan</td><td>:</td><td>${nl2br(laporan.tujuan_perjalanan)}</td></tr>
                <tr><td>c. Waktu dan Tempat</td><td>:</td><td>${laporan.lama_dan_tanggal_perjalanan} di ${laporan.tempat_dikunjungi}</td></tr>
            </table>

            <div class="section-title">II. KEGIATAN YANG DILAKSANAKAN</div>
            <div class="content-block">${nl2br(laporan.deskripsi_kronologis)}</div>

            <div class="section-title">III. HASIL YANG DICAPAI</div>
            <div class="content-block">${nl2br(laporan.hasil_dicapai)}</div>

            <div class="section-title">IV. KESIMPULAN DAN SARAN</div>
            <div class="content-block">${nl2br(laporan.kesimpulan)}</div>

            <div class="section-title">V. PENUTUP</div>
            <div class="content-block">Demikian laporan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</div>

            <div style="margin-top: 4rem; text-align: right; width: 50%; margin-left: 50%;">
                <p>${laporan.tempat_laporan}, ${formatDate(laporan.tanggal_laporan)}</p>
                <p>Yang Melaksanakan Perjalanan Dinas,</p>
                <div style="height: 80px;"></div>
                <p style="font-weight: bold; text-decoration: underline;">${pelaporName}</p>
                <p>${pelaporNip || ''}</p>
            </div>
        `;
    };

    const data = await fetchLaporanData();
    renderLaporan(data);

    setTimeout(() => {
        window.print();
    }, 500);
});