document.addEventListener('DOMContentLoaded', async () => {
    const printArea = document.getElementById('print-area');
    const attachmentArea = document.getElementById('attachment-area');
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

        // Parsing penandatangan_ids dengan penanganan error
        let signerIds = [];
        try {
            if (laporan.penandatangan_ids) {
                signerIds = JSON.parse(laporan.penandatangan_ids);
                if (!Array.isArray(signerIds)) {
                    signerIds = [];
                }
            }
        } catch (e) {
            console.error("Failed to parse penandatangan_ids:", e);
            alert("Error: Data penandatangan tidak valid. Laporan mungkin tidak dapat dicetak dengan benar.");
        }

        const allSigners = [];
        if (laporan.pegawai) {
            signerIds.forEach(id => {
                const signerData = laporan.pegawai.find(p => p.pegawai_id == id);
                if (signerData) {
                    allSigners.push({
                        nama: signerData.nama_lengkap,
                        nip: `NIP. ${signerData.nip}`
                    });
                }
            });
        }

        const signatureBlocksHtml = allSigners.map(signer => `
            <div class="signature-block">
                <p style="font-weight: bold; text-decoration: underline;">${signer.nama}</p>
                <p>${signer.nip}</p>
            </div>
        `).join('');

        const imageAttachments = (laporan.lampiran || []).filter(lampiran =>
            /\.(jpg|jpeg|png|gif)$/i.test(lampiran.file_name)
        );

        let lampiranHtml = '';
        if (imageAttachments.length > 0) {
            lampiranHtml = `
                <div class="page-container lampiran-container">
                    <h3 class="lampiran-title">LAMPIRAN LAPORAN - DOKUMENTASI</h3>
                    <div class="lampiran-grid">
                        ${imageAttachments.map(img => `
                            <div class="lampiran-item">
                                <img src="/${img.file_path}" alt="${img.file_name}">
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        const laporanContentHtml = `
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

            <div style="margin-top: 4rem;">
                <p>${laporan.tempat_laporan}, ${formatDate(laporan.tanggal_laporan)}</p>
                <p>Yang Melaksanakan Perjalanan Dinas,</p>
                <div class="signature-container">
                    ${signatureBlocksHtml}
                </div>
            </div>
        `;

        printArea.innerHTML = laporanContentHtml;
        attachmentArea.innerHTML = lampiranHtml;
    };

    const data = await fetchLaporanData();
    renderLaporan(data);

    // Memberi sedikit jeda sebelum mencetak, memastikan semua konten sudah dirender
    setTimeout(() => {
        window.print();
    }, 500);
});