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

    const formatAccounting = (number) => {
        if (number === null || number === undefined) return '-';
        return number.toLocaleString('id-ID', {
            style: 'decimal',
            minimumFractionDigits: 0,
        });
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

        // Ambil total biaya dari laporan pengeluaran
        const totalTransportasi = laporan.pengeluaran.reduce((sum, pengeluaran) => sum + (pengeluaran.transportasi_nominal || 0), 0);
        const totalAkomodasi = laporan.pengeluaran.reduce((sum, pengeluaran) => sum + (pengeluaran.akomodasi_nominal || 0), 0);
        const totalKontribusi = laporan.pengeluaran.reduce((sum, pengeluaran) => sum + (pengeluaran.kontribusi_nominal || 0), 0);
        const totalLainLain = laporan.pengeluaran.reduce((sum, pengeluaran) => sum + (pengeluaran.lain_lain_nominal || 0), 0);
        const totalBiayaLaporan = totalTransportasi + totalAkomodasi + totalKontribusi + totalLainLain;

        let pengeluaranHtml = '';
        if (laporan.pengeluaran && laporan.pengeluaran.length > 0) {
            pengeluaranHtml = `
                <div class="section-title">V. PENGELUARAN</div>
                <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Nama Pegawai</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Transportasi</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Akomodasi</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Kontribusi</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Lain-lain</th>
                    </tr>
                </thead>
                <tbody>
                    ${laporan.pegawai.map(pegawai => {
                const pengeluaran = laporan.pengeluaran.find(p => p.pegawai_id === pegawai.pegawai_id) || {};
                return `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${pegawai.nama_lengkap}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${pengeluaran.transportasi_nominal ? formatAccounting(pengeluaran.transportasi_nominal) : '-'}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${pengeluaran.akomodasi_nominal ? formatAccounting(pengeluaran.akomodasi_nominal) : '-'}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${pengeluaran.kontribusi_nominal ? formatAccounting(pengeluaran.kontribusi_nominal) : '-'}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${pengeluaran.lain_lain_nominal ? formatAccounting(pengeluaran.lain_lain_nominal) : '-'}</td>
                                </tr>
                            `;
            }).join('')}
                    <tr><td style="padding: 8px; border: 1px solid #ddd;font-weight: bold;" colspan="5">Total Biaya Keseluruhan : <span style="float:right;">Rp ${formatAccounting(totalBiayaLaporan)}</span></td></tr>
                </tbody>
                </table>
            `;
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
                <tr><td>c. Waktu dan Tempat</td><td>:</td><td>${laporan.lama_dan_tanggal_perjalanan} di ${laporan.tempat_dikunjungi || laporan.tujuan_perjalanan}</td></tr>
            </table>

            <div class="section-title">II. KEGIATAN YANG DILAKSANAKAN</div>
            <div class="content-block">${nl2br(laporan.deskripsi_kronologis)}</div>

            <div class="section-title">III. HASIL YANG DICAPAI</div>
            <div class="content-block">${nl2br(laporan.hasil_dicapai)}</div>

            <div class="section-title">IV. KESIMPULAN DAN SARAN</div>
            <div class="content-block">${nl2br(laporan.kesimpulan)}</div>

            <!-- Sisipkan tabel pengeluaran di sini -->
            ${pengeluaranHtml}

            <div class="section-title">VI. PENUTUP</div>
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