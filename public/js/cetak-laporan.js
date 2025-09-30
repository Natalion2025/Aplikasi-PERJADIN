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
        const totalTransportasi = (laporan.transportasi || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalAkomodasi = (laporan.akomodasi || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalKontribusi = (laporan.kontribusi || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalLainLain = (laporan.lain_lain || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalBiayaLaporan = totalTransportasi + totalAkomodasi + totalKontribusi + totalLainLain;

        let pengeluaranHtml = '';
        // PERBAIKAN: Ubah kondisi untuk memeriksa array biaya yang baru, bukan 'laporan.pengeluaran' yang sudah usang.
        const hasAnyExpense = (laporan.transportasi && laporan.transportasi.length > 0) ||
            (laporan.akomodasi && laporan.akomodasi.length > 0) ||
            (laporan.kontribusi && laporan.kontribusi.length > 0) ||
            (laporan.lain_lain && laporan.lain_lain.length > 0);
        if (hasAnyExpense) {
            pengeluaranHtml = `
                <div class="section-title">V. PENGELUARAN</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11pt;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Uraian</th>
                            <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">Harga Satuan</th>
                            <th style="padding: 6px; border: 1px solid #ddd; text-align: center;">Volume</th>
                            <th style="padding: 6px; border: 1px solid #ddd; text-align: center;">Satuan</th>
                            <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${laporan.pegawai.map(pegawai => {
                const transportasiItems = (laporan.transportasi || []).filter(item => item.pegawai_id === pegawai.pegawai_id);
                const akomodasiItems = (laporan.akomodasi || []).filter(item => item.pegawai_id === pegawai.pegawai_id);
                const kontribusiItems = (laporan.kontribusi || []).filter(item => item.pegawai_id === pegawai.pegawai_id);
                const lainLainItems = (laporan.lain_lain || []).filter(item => item.pegawai_id === pegawai.pegawai_id);
                let rows = `<tr style="background-color: #fafafa;"><td colspan="5" style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${pegawai.nama_lengkap}</td></tr>`;

                transportasiItems.forEach(item => {
                    if (item.nominal > 0) rows += `<tr>
                                    <td style="padding: 6px; border: 1px solid #ddd;">Biaya Transportasi (${item.jenis || ''} ${item.perusahaan || ''})</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">1</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">PP</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                </tr>`;
                });
                akomodasiItems.forEach(item => {
                    if (item.nominal > 0) rows += `<tr>
                                    <td style="padding: 6px; border: 1px solid #ddd;">Biaya Akomodasi (${item.jenis || ''} ${item.nama || ''})</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.harga_satuan)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${item.malam || 1}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">Malam</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                </tr>`;
                });
                kontribusiItems.forEach(item => {
                    if (item.nominal > 0) rows += `<tr>
                                    <td style="padding: 6px; border: 1px solid #ddd;">Biaya Kontribusi (${item.jenis || ''}/kegiatan)</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">1</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">Kegiatan</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                </tr>`;
                });
                lainLainItems.forEach(item => {
                    if (item.nominal > 0) rows += `<tr>
                                    <td style="padding: 6px; border: 1px solid #ddd;">Biaya Lain-lain (${item.uraian || ''})</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">1</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">-</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatAccounting(item.nominal)}</td>
                                </tr>`;
                });
                return rows;
            }).join('')}
                        <tr style="background-color: #f2f2f2; font-weight: bold;">
                            <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total Biaya Keseluruhan</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatAccounting(totalBiayaLaporan)}</td>
                        </tr>
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
            <div class="content-block">Demikian laporan ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya, dan dapat dipertanggungjawabkan.</div>

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