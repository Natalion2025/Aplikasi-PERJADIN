document.addEventListener('DOMContentLoaded', async () => {
    const pageContainer = document.querySelector('.page-container');
    const pathParts = window.location.pathname.split('/');
    const sptId = pathParts[pathParts.length - 1];

    const formatDate = (dateString) => {
        if (!dateString) return '....................................';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    if (!sptId) {
        pageContainer.innerHTML = '<p class="text-center text-red-500">ID Surat Tugas tidak valid.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/cetak/visum/${sptId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat data visum.');
        }
        const data = await response.json();

        // Mengisi data ke dalam template HTML
        const visumHtml = `
            <!-- Section I -->
            <div class="section">
                <div class="section-label">I.</div>
                <div class="section-content-wrapper">
                    <div class="content-block">
                        <!-- Block ini sengaja dikosongkan sesuai layout -->
                    </div>
                    <div class="content-block">
                        <div class="flex text-start space-x-4 text-nowrap">
                            Berangkat dari<br>
                            (Tempat Kedudukan)<br>
                            Ke<br><br>
                            Pada Tanggal<br>
                            <span class="text-wrap">
                                : ${data.tempat_berangkat || '....................................'}<br><br>
                                
                                : ${data.lokasi_tujuan || '....................................'}<br>
                                : ${formatDate(data.tanggal_berangkat)}<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            ${data.kadis_jabatan.toUpperCase() + ' ' + 'KOMUNIKASI' + '<br>' + 'DAN INFORMATIKA KABUPATEN MELAWI' || 'KEPALA DINAS'}<br>
                            <div class="name">${data.kadis_nama || '.................................................'}</div>
                            NIP. ${data.kadis_nip || '............................................'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section II -->
            <div class="section">
                <div class="section-label">II.</div>
                <div class="section-content-wrapper">
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Tiba di<br>
                            Pada Tanggal<br>
                            Kepala<br>
                            <span>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            <div class="name">(.................................................)</div>
                            NIP. ............................................
                        </div>
                    </div>
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Berangkat dari<br>
                            Ke<br>
                            Pada Tanggal<br>
                            Kepala<br>
                            <span>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            <div class="name">(.................................................)</div>
                            NIP. ............................................
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section III -->
            <div class="section">
                <div class="section-label">III.</div>
                <div class="section-content-wrapper">
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Tiba di<br>
                            Pada Tanggal<br>
                            Kepala<br>
                            <span>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            <div class="name">(.................................................)</div>
                            NIP. ............................................
                        </div>
                    </div>
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Berangkat dari<br>
                            Ke<br>
                            Pada Tanggal<br>
                            Kepala<br>
                            <span>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            <div class="name">(.................................................)</div>
                            NIP. ............................................
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section IV -->
            <div class="section">
                <div class="section-label">IV.</div>
                <div class="section-content-wrapper">
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Tiba di<br>
                            Pada Tanggal<br>
                            Kepala<br>
                            <span>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            <div class="name">(.................................................)</div>
                            NIP. ............................................
                        </div>
                    </div>
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Berangkat dari<br>
                            Ke<br>
                            Pada Tanggal<br>
                            Kepala<br>
                            <span>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            <div class="name">(.................................................)</div>
                            NIP. ............................................
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section V -->
            <div class="section">
                <div class="section-label">V.</div>
                <div class="section-content-wrapper">
                    <div class="content-block">
                        <div class="flex space-x-4 text-start">
                            Tiba kembali di<br>
                            (Tempat Kedudukan)<br>
                            Pada Tanggal<br>
                            <span>
                                : ${data.tempat_berangkat || '....................................'}<br><br>

                                : ....................................<br>
                            </span>
                        </div>
                        <div class="signature-box">
                            ${data.kadis_jabatan.toUpperCase() + ' ' + 'KOMUNIKASI' + '<br>' + 'DAN INFORMATIKA KABUPATEN MELAWI' || 'KEPALA DINAS'}<br>
                            <div class="name">${data.kadis_nama || '.................................................'}</div>
                            NIP. ${data.kadis_nip || '............................................'}
                        </div>
                    </div>
                    <div class="content-block text-justify">
                        Telah diperiksa dengan keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.<br>
                        <div class="signature-box">
                            PEJABAT PELAKSANA TEKNIS KEGIATAN <br>
                            <div class="name">${data.pptk_nama || '.................................................'}</div>
                            NIP. ${data.pptk_nip || '............................................'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section VI & VII -->
            <div class="section min-h-[80px]:">
                <div class="section-label">VI.</div>
                <div class="section-content-wrapper">
                    <div class="w-full items-center flex">
                        <div class="flex space-x-4 text-start">
                            Catatan lain-lain: </div>
                    </div>
                </div>
            </div>
                    

            <p class="mt-4 text-start"><strong>VII. PERHATIAN:</strong></p>
            <p class="text-justify">
                PPK yang menerbitkan SPD, Pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita rugi akibat kesalahan, kelalaian dan kelupaannya.
            </p>
        `;

        pageContainer.innerHTML = visumHtml;

        // Otomatis cetak setelah konten dimuat
        setTimeout(() => {
            window.print();
        }, 500);

    } catch (error) {
        pageContainer.innerHTML = `<p class="text-center text-red-500"><strong>Error:</strong> ${error.message}</p>`;
    }
});