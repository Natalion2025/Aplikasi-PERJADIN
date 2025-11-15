(function () {
    // Elemen Modal
    const openModalBtn = document.getElementById('tambah-anggaran-button');
    const modal = document.getElementById('anggaran-modal');
    const closeModalBtn = document.getElementById('close-anggaran-modal-button');
    const cancelBtn = document.getElementById('cancel-anggaran-button');
    const anggaranForm = document.getElementById('anggaran-form');
    const modalTitle = document.getElementById('anggaran-modal-title');
    const anggaranIdInput = document.getElementById('anggaran-id');
    const pptkSelect = document.getElementById('pptk_id');

    // Elemen List/Tabel
    const anggaranTableBody = document.getElementById('anggaran-table-body');
    const paginationContainer = document.getElementById('anggaran-pagination-container');
    const pageLimitSelect = document.getElementById('page-limit-select');


    let currentUserRole = 'user'; // Default role

    // --- Fungsi Helper untuk Format Angka ---
    const formatCurrency = (value) => {
        if (value === null || value === undefined || value === '') return '';
        // Hapus semua karakter non-digit kecuali koma untuk desimal
        const number = parseFloat(String(value).replace(/[^0-9]/g, ''));
        if (isNaN(number)) return '';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const parseCurrency = (value) => {
        // Hapus semua karakter non-digit
        return parseFloat(String(value || '').replace(/[^0-9]/g, '')) || 0;
    };

    // Fungsi untuk membuka modal 
    const openModal = (anggaran = null) => {
        anggaranForm.reset();
        anggaranIdInput.value = '';

        if (anggaran) {
            // Mode Edit
            modalTitle.textContent = 'Edit Anggaran';
            anggaranIdInput.value = anggaran.id;
            document.getElementById('bidang_urusan').value = anggaran.bidang_urusan;
            document.getElementById('program').value = anggaran.program;
            document.getElementById('kegiatan').value = anggaran.kegiatan;
            document.getElementById('sub_kegiatan').value = anggaran.sub_kegiatan;
            // Gabungkan kode dan nama untuk mencocokkan value di <option>
            document.getElementById('mata_anggaran').value = `${anggaran.mata_anggaran_kode} - ${anggaran.mata_anggaran_nama}`;
            document.getElementById('pptk_id').value = anggaran.pptk_id;
            document.getElementById('nilai_anggaran').value = formatCurrency(anggaran.nilai_anggaran);
        } else {
            // Mode Tambah
            modalTitle.textContent = 'Tambah Anggaran Baru';
        }
        modal.classList.remove('hidden');

        // Pastikan input nominal memiliki atribut yang benar untuk formatting
        const nilaiAnggaranInput = document.getElementById('nilai_anggaran');
        nilaiAnggaranInput.setAttribute('inputmode', 'numeric');
        nilaiAnggaranInput.setAttribute('pattern', '[0-9.,]*');
    };

    // Function to close the modal
    const closeModal = () => {
        modal.classList.add('hidden');
        anggaranForm.reset();
        anggaranIdInput.value = '';
    };

    // --- PERMINTAAN: Plugin kustom untuk efek rounded-cap pada Donut Chart ---
    // const roundedCapPlugin = {
    //     id: 'roundedCap',
    //     afterDraw: (chart) => {
    //         if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') {
    //             return;
    //         }

    //         const ctx = chart.ctx;
    //         const dataset = chart.data.datasets[0];
    //         const arcs = chart.getDatasetMeta(0).data;

    //         // Dapatkan nilai radius pembulatan dari konfigurasi dataset (kita menggunakan borderRadius)
    //         const capRadius = dataset.borderRadius;

    //         arcs.forEach(arc => {
    //             // Kita hanya menggambar cap jika ada data dan radius > 0
    //             if (arc.endAngle - arc.startAngle > 0 && capRadius > 0) {

    //                 const { x, y, innerRadius, outerRadius, startAngle, endAngle } = arc.getProps(['x', 'y', 'innerRadius', 'outerRadius', 'startAngle', 'endAngle']);
    //                 const midRadius = (innerRadius + outerRadius) / 2;

    //                 // Dapatkan warna segmen
    //                 ctx.fillStyle = arc.options.backgroundColor;

    //                 // --- Menggambar Cap Awal (Start Angle) ---
    //                 const startX = x + midRadius * Math.cos(startAngle);
    //                 const startY = y + midRadius * Math.sin(startAngle);

    //                 ctx.beginPath();
    //                 ctx.arc(startX, startY, capRadius, 0, Math.PI * 2);
    //                 ctx.fill();

    //                 // --- Menggambar Cap Akhir (End Angle) ---
    //                 const endX = x + midRadius * Math.cos(endAngle);
    //                 const endY = y + midRadius * Math.sin(endAngle);

    //                 ctx.beginPath();
    //                 ctx.arc(endX, endY, capRadius, 0, Math.PI * 2);
    //                 ctx.fill();
    //             }
    //         });
    //     }
    // };

    // --- FUNGSI HELPER BARU: Untuk memecah teks panjang di tooltip ---
    function wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            if (currentLine.length + word.length + 1 < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    function labelFormatter(context) {
        const value = context.raw || 0;
        // Total semua Realisasi dan Sisa dari semua mata anggaran
        const grandTotal = context.dataset.data.reduce((sum, current) => sum + current, 0);
        const persentaseTotal = grandTotal > 0 ? (value / grandTotal) * 100 : 0;
        // Format angka untuk label tooltip
        const formattedValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
        return `Nilai: ${formattedValue} (${persentaseTotal.toFixed(1)}%) dari Total Anggaran Keseluruhan`;
    }

    // Variabel untuk menyimpan instance chart
    let anggaranDonutChart = null;

    // --- PERUBAHAN: Fungsi untuk merender Donut Chart ---
    const renderDonutChart = (anggaranList) => {

        // --- FUNGSI BARU: Helper untuk warna ---
        const colorPalette = [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
            '#858796', '#5a5c69', '#f8f9fc', '#6f42c1', '#fd7e14'
        ];

        const lightenColor = (hex, percent) => {
            hex = hex.replace(/^#/, '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            const newR = Math.min(255, r + (255 - r) * (percent / 100));
            const newG = Math.min(255, g + (255 - g) * (percent / 100));
            const newB = Math.min(255, b + (255 - b) * (percent / 100));

            return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
        };

        const getColorForIndex = (index) => {
            return colorPalette[index % colorPalette.length];
        };

        const ctx = document.getElementById('anggaranDonutChart')?.getContext('2d');
        if (!ctx) {
            console.warn('[DEBUG-CHART] Elemen canvas "anggaranDonutChart" tidak ditemukan. Chart tidak akan dirender.');
            return;
        }

        // PERBAIKAN: Tidak perlu agregasi di sisi klien lagi.
        // Data dari API sudah diagregasi dengan benar.
        const validAnggaranList = anggaranList.filter(a => a && (a.nilai_anggaran || 0) > 0);

        console.log('[DEBUG-CHART] Data yang akan dirender di chart:', validAnggaranList);

        if (!validAnggaranList || validAnggaranList.length === 0) {
            // Jika tidak ada data yang valid, set persentase ke 0%
            document.getElementById('total-realisasi-persen').textContent = `0%`;
            const legendContainer = document.getElementById('donut-chart-legend');
            if (legendContainer) {
                legendContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Belum ada data anggaran untuk ditampilkan.</p>';
            }
            if (anggaranDonutChart) {
                anggaranDonutChart.destroy();
            }
            return;
        }

        // Array baru untuk data chart
        let chartLabels = [];
        let chartData = [];
        let chartColors = [];
        let originalBudgetNames = [];
        let originalDataRealisasi = [];
        let originalDataSisa = [];

        // --- PERUBAHAN LOGIKA: Hanya tampilkan realisasi sebagai segmen berwarna ---
        // 1. Hitung total sisa anggaran dari semua item
        const totalSisaAnggaran = validAnggaranList.reduce((sum, a) => sum + (a.sisa || 0), 0);

        // 2. Buat slice untuk setiap realisasi
        validAnggaranList.forEach((data, index) => {
            const realisasi = data.realisasi || 0;

            // Simpan data asli untuk Legenda
            originalBudgetNames.push(data.mata_anggaran_nama);
            originalDataRealisasi.push(realisasi);
            originalDataSisa.push(data.sisa || 0);

            // Hanya tambahkan slice jika ada realisasi
            if (realisasi > 0) {
                chartLabels.push(`Realisasi ${data.mata_anggaran_nama}`);
                chartData.push(realisasi);
                chartColors.push(getColorForIndex(index));
            }
        });

        // 3. Tambahkan satu slice besar untuk total sisa anggaran
        chartLabels.push('Sisa Anggaran Keseluruhan');
        chartData.push(totalSisaAnggaran);
        chartColors.push('#e9ecef'); // Warna abu-abu netral untuk sisa

        // Hentikan jika tidak ada data sama sekali setelah filtering
        if (chartData.length === 0) {
            document.getElementById('total-realisasi-persen').textContent = `0%`;
            const legendContainer = document.getElementById('donut-chart-legend');
            if (legendContainer) {
                legendContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Nilai anggaran total adalah nol atau data tidak valid.</p>';
            }
            if (anggaranDonutChart) {
                anggaranDonutChart.destroy();
            }
            return;
        }


        // Hitung total keseluruhan dari list original untuk persentase tengah
        const totalAnggaran = anggaranList.reduce((sum, a) => sum + (a.nilai_anggaran || 0), 0);
        const totalRealisasi = anggaranList.reduce((sum, a) => sum + (a.realisasi || 0), 0);
        const totalPersentase = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

        // Update teks di tengah chart
        document.getElementById('total-realisasi-persen').textContent = `${totalPersentase.toFixed(1)}%`;

        // --- PERUBAHAN: Render Legenda di samping Chart ---
        const legendContainer = document.getElementById('donut-chart-legend');
        if (legendContainer) {
            let legendHtml = ''; // Buat string HTML kosong
            if (originalBudgetNames.length > 0) {
                // Tampilkan Legenda berdasarkan Mata Anggaran (gabungan Realisasi dan Sisa)
                originalBudgetNames.forEach((label, index) => {
                    const realisasiValue = originalDataRealisasi[index];
                    const sisaValue = originalDataSisa[index];
                    const baseColor = getColorForIndex(index);
                    const sisaColor = lightenColor(baseColor, 60); // Diperlukan untuk legenda
                    const totalAnggaranMata = realisasiValue + sisaValue;
                    const persentaseRealisasi = totalAnggaranMata > 0 ? (realisasiValue / totalAnggaranMata) * 100 : 0;

                    // PERBAIKAN: Tambahkan HTML ke string, jangan langsung ke innerHTML
                    legendHtml += `
                        <div class="flex flex-col text-sm border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                            <span class="font-semibold text-gray-800 dark:text-white">${label} (Rp ${formatCurrency(totalAnggaranMata)})</span>
                            <div class="flex items-center mt-1">
                                <span class="h-3 w-3 rounded-full mr-2" style="background-color: ${baseColor};"></span>
                                <span class="flex-grow text-gray-600 dark:text-gray-300">Realisasi (${persentaseRealisasi.toFixed(1)}%)</span>
                                <span class="font-medium text-gray-800 dark:text-white">Rp ${formatCurrency(realisasiValue)}</span>
                            </div>
                        </div>`;
                });
            } else {
                legendHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Belum ada data anggaran untuk ditampilkan.</p>';
            }
            // PERBAIKAN: Set innerHTML hanya sekali setelah loop selesai.
            legendContainer.innerHTML = legendHtml;
        }

        if (anggaranDonutChart) {
            anggaranDonutChart.destroy();
        }


        anggaranDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels, // Label yang sudah dipecah (Realisasi: Nama, Sisa: Nama)
                datasets: [{
                    label: 'Realisasi vs Sisa Anggaran',
                    data: chartData, // Data yang sudah dipecah
                    backgroundColor: chartColors, // Warna yang sudah dipecah
                    borderColor: '#ffffff',
                    borderRadius: 25,
                    borderWidth: 2,
                    spacing: -15,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '77%',
                plugins: {
                    legend: {
                        display: false // Sembunyikan legenda asli
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        },
                        callbacks: {
                            title: function (context) {
                                // PERBAIKAN: Gunakan fungsi wrapText untuk memecah judul yang panjang
                                return wrapText(context[0].label, 30); // Batasi sekitar 30 karakter per baris
                            },
                            label: function (context) {
                                return wrapText(labelFormatter(context), 30); // Batasi sekitar 30 karakter per baris
                            },
                        }
                    }
                }
            },
            //plugins: [roundedCapPlugin] // Daftarkan plugin kustom di sini
        });
    };


    // Objek pendukung fitur pagination
    let currentPageLimit = 5;
    let currentPage = 1;
    let currentSearchQuery = '';

    // Fungsi render paginasi generik
    function renderPagination(container, pagination, loadFunction) {

        if (!container) return;
        container.innerHTML = '';

        const { page, totalPages, totalItems } = pagination;
        if (totalItems <= currentPageLimit) return;

        // Untuk menampilkan informasi halaman dan tombol navigasi
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 sm:px-6';

        const pageInfo = document.createElement('div');
        pageInfo.innerHTML = `<p class="text-sm text-gray-700 dark:text-gray-400">
            Menampilkan <span class="font-medium">${page}</span> dari <span class="font-medium">${totalPages}</span><span class="text-sm text-gray-700 dark:text-gray-400"> entri</span>
        </p>`;

        const navButtons = document.createElement('div');
        navButtons.className = 'flex-1 flex justify-end';

        // Tombol navigasi 'Pertama'
        const firstButton = document.createElement('button');
        firstButton.textContent = 'Pertama';
        firstButton.className = 'ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-sky-100 dark:border-gray-600 text-xs rounded-l-2xl text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === 1) {
            firstButton.disabled = true;
            firstButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        firstButton.addEventListener('click', () => loadFunction(1));

        // Tombol navigasi 'Sebelumnya'
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Sebelumnya';
        prevButton.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-sky-100 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === 1) {
            prevButton.disabled = true;
            prevButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        prevButton.addEventListener('click', () => loadFunction(page - 1));

        // Tombol navigasi nomor halaman
        // Container untuk tombol nomor halaman
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.className = 'inline-flex items-center';

        // Membuat tombol nomor halaman sesuai dengan jumlah total halaman
        for (let i = 1; i <= totalPages; i++) {
            const pageNumberButton = document.createElement('button');
            pageNumberButton.textContent = `${i}`;
            pageNumberButton.className = `relative inline-flex items-center px-4 py-2 border border-gray-300 text-xs text-gray-700 dark:text-gray-300 ${i === page ? 'bg-sky-100 dark:bg-slate-600' : 'bg-white dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-slate-600'} `;
            pageNumberButton.addEventListener('click', () => loadFunction(i));
            pageNumbersContainer.appendChild(pageNumberButton);
        }

        // Tombol navigasi 'Berikutnya'
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Berikutnya';
        nextButton.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-sky-100 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === totalPages) {
            nextButton.disabled = true;
            nextButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        nextButton.addEventListener('click', () => loadFunction(page + 1));

        // Tombol navigasi 'Terakhir'
        const lastButton = document.createElement('button');
        lastButton.textContent = 'Terakhir';
        lastButton.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-sky-100 dark:border-gray-600 text-xs rounded-r-2xl text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === totalPages) {
            lastButton.disabled = true;
            lastButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        lastButton.addEventListener('click', () => loadFunction(totalPages));

        navButtons.appendChild(firstButton);
        navButtons.appendChild(prevButton);
        navButtons.appendChild(pageNumbersContainer);
        navButtons.appendChild(nextButton);
        navButtons.appendChild(lastButton);

        wrapper.appendChild(pageInfo);
        wrapper.appendChild(navButtons);
        container.appendChild(wrapper);
    }


    // Fungsi untuk merender daftar anggaran ke dalam tabel
    const renderAnggaranList = (anggaranList, pagination) => {
        anggaranTableBody.innerHTML = ''; // Kosongkan tabel

        if (anggaranList.length === 0) {
            const canManage = currentUserRole === 'admin' || currentUserRole === 'superadmin';
            // Sesuaikan jumlah kolom pada pesan "data kosong" agar sesuai dengan header (bertambah 1 karena ada PPTK)
            const colspan = canManage ? 8 : 7;
            const message = canManage ? 'Belum ada data anggaran. Silakan tambahkan anggaran baru.' : 'Data anggaran belum tersedia.';
            anggaranTableBody.innerHTML = `<tr><td colspan="${colspan}" class="px-6 py-4 text-center text-gray-500">${message}</td></tr>`;
            return;
        }

        anggaranList.forEach((anggaran, index) => {
            const row = document.createElement('tr');
            row.className = 'item'; // Tambahkan kelas 'item' untuk pencarian

            // --- PERUBAHAN: Logika untuk Progress Bar ---
            const realisasi = anggaran.realisasi || 0;
            const nilaiAnggaran = anggaran.nilai_anggaran || 0;
            const persentase = nilaiAnggaran > 0 ? (realisasi / nilaiAnggaran) * 100 : 0;

            let progressBarColor = 'bg-green-500'; // Default color
            if (persentase > 90) {
                progressBarColor = 'bg-red-500';
            } else if (persentase > 75) {
                progressBarColor = 'bg-yellow-500';
            }

            const progressBarHtml = `
                <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div class="${progressBarColor} h-2.5 rounded-full" style="width: ${persentase.toFixed(2)}%"></div>
                </div>`;

            const actionButtons = (currentUserRole === 'admin' || currentUserRole === 'superadmin')
                ? `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                       <button data-id="${anggaran.id}" class="edit-btn text-yellow-600 hover:text-yellow-800" title="Edit Anggaran"><i class="fas fa-edit"></i></button>
                       <button data-id="${anggaran.id}" class="delete-btn text-red-600 hover:text-red-800 ml-4" title="Hapus Anggaran"><i class="fas fa-trash"></i></button>
                   </td>`
                : ''; // Jangan render kolom sama sekali jika bukan admin

            row.innerHTML = `
                <td class="pr-3 pl-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-white">${index + 1}.</div>
                </td>
                <td class="px-3 py-4">
                    <div class="text-sm text-nowrap font-semibold text-gray-900 dark:text-white">${anggaran.program || '-'}</div>
                    <div class="text-sm text-nowrap text-gray-500 dark:text-white">${anggaran.kegiatan || '-'}</div>
                    ${progressBarHtml}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">${anggaran.mata_anggaran_kode}</div>
                    <div class="text-sm text-gray-500 dark:text-white">${anggaran.mata_anggaran_nama}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    Rp ${formatCurrency(anggaran.nilai_anggaran)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    Rp ${formatCurrency(anggaran.realisasi)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${anggaran.sisa < 0 ? 'text-red-500' : 'text-green-600'}">
                    Rp ${formatCurrency(anggaran.sisa)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${anggaran.pptk_nama || '-'}
                </td>
                ${actionButtons}
            `;
            anggaranTableBody.appendChild(row);
        });

        // Setelah merender semua baris, sesuaikan header tabel berdasarkan peran
        const thead = document.querySelector('#anggaran-list-container thead tr');
        if (thead) {
            // Hapus header 'Aksi' yang mungkin ada dari render sebelumnya
            const existingActionHeader = thead.querySelector('.action-header');
            if (existingActionHeader) {
                existingActionHeader.remove();
            }

            // Tambahkan header 'Aksi' hanya jika pengguna adalah admin atau superadmin
            if (currentUserRole === 'admin' || currentUserRole === 'superadmin') {
                const actionHeader = document.createElement('th');
                actionHeader.scope = 'col';
                actionHeader.className = 'relative px-6 py-3 action-header'; // Tambahkan kelas untuk identifikasi
                actionHeader.innerHTML = '<span class="sr-only">Aksi</span>';
                thead.appendChild(actionHeader);
            }
        }

        renderPagination(paginationContainer, pagination, loadAnggaran);
    };




    // Fungsi untuk memuat data anggaran dari server
    const loadAnggaran = async (page = 1, query = '') => {
        currentPage = page;
        try {
            // Ambil data sesi, anggaran, dan pegawai secara bersamaan
            const [sessionRes, anggaranRes, pegawaiRes, allAnggaranResForChart] = await Promise.all([
                fetch('/api/user/session', { cache: 'no-store' }),
                fetch(`/api/anggaran?page=${page}&limit=${currentPageLimit}&q=${query}`, { cache: 'no-store' }),
                fetch('/api/pegawai', { cache: 'no-store' }),
                // Ambil semua data yang cocok dengan query untuk chart
                fetch(`/api/anggaran?limit=0&q=${query}`, { cache: 'no-store' })
            ]);

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                currentUserRole = sessionData.user.role;
                // Tampilkan/sembunyikan tombol "Tambah Anggaran" berdasarkan peran
                if (currentUserRole === 'admin' || currentUserRole === 'superadmin') {
                    openModalBtn.classList.remove('hidden');
                } else {
                    openModalBtn.classList.add('hidden');
                }
            }

            if (!anggaranRes.ok) throw new Error('Gagal memuat data anggaran.');
            currentSearchQuery = query;
            const result = await anggaranRes.json();
            renderAnggaranList(result.data, result.pagination);

            // Render chart menggunakan data yang sudah diambil
            const allAnggaranResult = await allAnggaranResForChart.json();
            renderDonutChart(allAnggaranResult.data || allAnggaranResult);

            // Pindahkan blok ini ke dalam `try`
            if (pegawaiRes.ok) {
                const pegawaiList = await pegawaiRes.json();
                pptkSelect.innerHTML = '<option value="">-- Pilih PPTK --</option>';
                pegawaiList.forEach(p => {
                    const option = new Option(`${p.nama_lengkap} (NIP: ${p.nip})`, p.id);
                    pptkSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error:', error);
            // Sesuaikan colspan untuk pesan error
            const colspan = (currentUserRole === 'admin' || currentUserRole === 'superadmin') ? 8 : 7;
            anggaranTableBody.innerHTML = `<tr><td colspan="${colspan}" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // PERBAIKAN: Bungkus semua logika spesifik halaman Anggaran dalam satu blok kondisi.
    // Ini memastikan kode ini hanya berjalan jika kita berada di halaman Anggaran.
    if (anggaranTableBody) {
        // Handle form submission
        anggaranForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const id = anggaranIdInput.value;
            const formData = new FormData(anggaranForm);
            const data = Object.fromEntries(formData.entries());

            data.nilai_anggaran = parseCurrency(data.nilai_anggaran);
            data.pptk_id = document.getElementById('pptk_id').value;

            const mataAnggaranValue = data.mata_anggaran;
            data.mata_anggaran = mataAnggaranValue;

            const url = id ? `/api/anggaran/${id}` : '/api/anggaran';
            const method = id ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data.');

                closeModal();
                loadAnggaran(currentPage, currentSearchQuery);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });

        // Event delegation untuk tombol Edit dan Hapus
        anggaranTableBody.addEventListener('click', async (event) => {
            const target = event.target;

            const editBtn = target.closest('.edit-btn');
            if (editBtn) {
                const id = editBtn.dataset.id;
                const response = await fetch(`/api/anggaran/${id}`);
                const anggaran = await response.json();
                openModal(anggaran);
            }

            const deleteBtn = target.closest('.delete-btn');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                if (confirm('Apakah Anda yakin ingin menghapus data anggaran ini?')) {
                    try {
                        const response = await fetch(`/api/anggaran/${id}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'Gagal menghapus data.');
                        loadAnggaran();
                    } catch (error) {
                        alert(`Error: ${error.message}`);
                    }
                }
            }
        });

        // Event listeners untuk modal
        if (openModalBtn) openModalBtn.addEventListener('click', () => openModal());
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });

        // Event listener untuk memformat input mata uang secara otomatis
        anggaranForm.addEventListener('input', (e) => {
            if (e.target.id === 'nilai_anggaran') {
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const oldValue = e.target.value;

                e.target.value = formatCurrency(e.target.value);

                const newLength = e.target.value.length;
                const oldLength = oldValue.length;
                e.target.setSelectionRange(start + (newLength - oldLength), end + (newLength - oldLength));
            }
        });

        if (pageLimitSelect) {
            pageLimitSelect.addEventListener('change', (e) => {
                currentPageLimit = parseInt(e.target.value, 10);
                loadAnggaran(1, currentSearchQuery);
            });
        }

        // Listener untuk event pencarian lokal dari header
        document.addEventListener('localSearch', (e) => {
            if (window.location.pathname.includes('/anggaran')) {
                e.preventDefault();
                const { query } = e.detail;
                loadAnggaran(1, query);
            }
        });

        // Inisialisasi halaman Anggaran
        loadAnggaran(1, currentSearchQuery);
    }

    /**
     * FUNGSI GLOBAL: Mengambil data anggaran dari API dan mengisi elemen <select>.
     * Fungsi ini diekspos ke 'window' agar bisa dipanggil dari script lain.
     * @param {string} selectElementId - ID dari elemen <select> yang akan diisi.
     * @param {string} [placeholder='-- Pilih Kode Anggaran --'] - Teks placeholder untuk opsi pertama.
     */
    window.populateAnggaranDropdown = async (selectElementId, placeholder = '-- Pilih Kode Anggaran --') => {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) {
            console.error(`Elemen dropdown dengan ID #${selectElementId} tidak ditemukan.`);
            return;
        }

        // Tampilkan status loading
        selectElement.innerHTML = `<option value="">Memuat data anggaran...</option>`;
        selectElement.disabled = true;

        try {
            // Mengambil semua data anggaran (limit=0)
            const response = await fetch('/api/anggaran?limit=0');
            if (!response.ok) {
                throw new Error(`Gagal mengambil data anggaran: ${response.statusText}`);
            }
            const result = await response.json();
            const anggaranList = result.data || result; // Handle jika API mengembalikan array langsung

            selectElement.innerHTML = `<option value="">${placeholder}</option>`;

            anggaranList.forEach(anggaran => {
                const option = document.createElement('option');
                option.value = anggaran.id;
                option.textContent = `${anggaran.mata_anggaran_kode} - ${anggaran.mata_anggaran_nama}`;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Terjadi kesalahan saat mengisi dropdown anggaran:", error);
            selectElement.innerHTML = `<option value="">Gagal memuat data</option>`;
        } finally {
            selectElement.disabled = false;
        }
    };

})();