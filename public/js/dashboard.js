/**
 * Menampilkan notifikasi sementara pada elemen yang diberikan.
 * @param {HTMLElement} element - Elemen HTML untuk menampilkan notifikasi.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} [isError=false] - Set true jika ini adalah pesan error untuk styling.
 */
function showNotification(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
    element.classList.toggle('text-red-500', isError);
    element.classList.toggle('text-green-600', !isError);
    setTimeout(() => {
        element.textContent = '';
        element.classList.add('hidden');
    }, 5000);
}

// Fungsi untuk memuat data spesifik dashboard
const loadDashboardData = async () => {
    try {
        const totalPerjalananEl = document.getElementById('total-perjalanan');
        const perjalananBulanIniEl = document.getElementById('perjalanan-bulan-ini');
        const tahunAnggaranEl = document.getElementById('tahun-anggaran');

        // Ambil data statistik dashboard
        const statsResponse = await fetch('/api/dashboard/stats');

        // Handle statistik
        if (!statsResponse.ok) {
            throw new Error('Gagal memuat statistik dashboard.');
        }

        const stats = await statsResponse.json();
        if (totalPerjalananEl) totalPerjalananEl.textContent = stats.totalPerjalanan ?? '0';
        if (perjalananBulanIniEl) perjalananBulanIniEl.textContent = stats.perjalananBulanIni ?? '0';
        // PERBAIKAN: Set tahun anggaran ke tahun saat ini
        if (tahunAnggaranEl) tahunAnggaranEl.textContent = new Date().getFullYear();


        // Ambil data anggaran untuk chart
        // PERBAIKAN: Gunakan endpoint /api/anggaran dengan limit=0 untuk mengambil semua data
        // yang relevan untuk chart, sesuai dengan implementasi di halaman anggaran.
        const anggaranResponse = await fetch('/api/anggaran?limit=0');
        if (!anggaranResponse.ok) {
            throw new Error('Gagal memuat data anggaran untuk chart.');
        }
        const anggaranResult = await anggaranResponse.json();
        // API /api/anggaran mengembalikan objek dengan properti 'data'
        // Pastikan untuk meneruskan array yang benar ke fungsi render.
        renderDonutChart(anggaranResult.data || []); // Panggil render chart dengan data

        // PERBAIKAN: Ambil data pegawai yang sedang bertugas dengan mengambil semua SPT
        // dan memfilternya di sisi klien, karena endpoint /api/perjalanan/on-duty tidak ada.
        const allSptResponse = await fetch('/api/spt?limit=0');
        if (!allSptResponse.ok) {
            throw new Error('Gagal memuat data perjalanan untuk daftar pegawai.');
        }
        const allSptResult = await allSptResponse.json();
        const allSpts = allSptResult.data || [];

        // PERBAIKAN: Filter SPT berdasarkan bulan berjalan
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const onDutySptsThisMonth = allSpts.filter(spt => {
            const startDate = new Date(spt.tanggal_berangkat);
            const endDate = new Date(spt.tanggal_kembali);
            // Cek apakah rentang tanggal SPT bersinggungan dengan bulan ini
            return spt.status === 'aktif' && startDate <= endOfMonth && endDate >= startOfMonth;
        });
        renderPegawaiOnDuty(onDutySptsThisMonth);


    } catch (error) {
        console.error('Gagal memuat data dashboard:', error);
        // Tampilkan pesan error di UI jika diperlukan
        const totalPerjalananEl = document.getElementById('total-perjalanan');
        const perjalananBulanIniEl = document.getElementById('perjalanan-bulan-ini');
        const tahunAnggaranEl = document.getElementById('tahun-anggaran');

        if (totalPerjalananEl) totalPerjalananEl.textContent = 'Error';
        if (perjalananBulanIniEl) perjalananBulanIniEl.textContent = 'Error';
        if (tahunAnggaranEl) tahunAnggaranEl.textContent = new Date().getFullYear(); // Tetap tampilkan tahun meski ada error
        // Juga handle error untuk chart jika perlu, misal tampilkan pesan
        renderDonutChart([]); // Render chart kosong
        renderPegawaiOnDuty([]); // Tampilkan pesan error atau kosong di tabel pegawai
    }
};

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

// Variabel untuk menyimpan instance chart di scope global modul
let anggaranDonutChartInstance = null;

// --- PERUBAHAN: Fungsi untuk merender Donut Chart ---
const renderDonutChart = (anggaranList) => {

    // --- FUNGSI BARU: Helper untuk warna ---
    const colorPalette = [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#858796', '#5a5c69', '#f8f9fc', '#6f42c1', '#fd7e14'
    ];


    const getColorForIndex = (index) => {
        return colorPalette[index % colorPalette.length];
    };

    const ctx = document.getElementById('anggaranDonutChart')?.getContext('2d');
    if (!ctx) {
        console.warn('[DEBUG-CHART] Elemen canvas "anggaranDonutChart" tidak ditemukan. Chart tidak akan dirender.');
        return;
    }

    // Pastikan anggaranList adalah array sebelum memfilter
    if (!Array.isArray(anggaranList)) {
        console.error('[DEBUG-CHART] Data anggaran bukan array:', anggaranList);
        anggaranList = []; // Jadikan array kosong untuk mencegah error
    }

    const validAnggaranList = anggaranList.filter(a => a && (a.nilai_anggaran || 0) > 0);

    if (!validAnggaranList || validAnggaranList.length === 0) {
        // Jika tidak ada data yang valid, set persentase ke 0%
        document.getElementById('total-realisasi-persen').textContent = `0%`;
        if (anggaranDonutChartInstance) {
            anggaranDonutChartInstance.destroy();
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
        if (anggaranDonutChartInstance) {
            anggaranDonutChartInstance.destroy();
        }
        return;
    }


    // Hitung total keseluruhan dari list original untuk persentase tengah
    const totalAnggaran = anggaranList.reduce((sum, a) => sum + (a.nilai_anggaran || 0), 0);
    const totalRealisasi = anggaranList.reduce((sum, a) => sum + (a.realisasi || 0), 0);
    const totalPersentase = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

    // Update teks di tengah chart
    document.getElementById('total-realisasi-persen').textContent = `${totalPersentase.toFixed(1)}%`;

    if (anggaranDonutChartInstance) {
        anggaranDonutChartInstance.destroy();
    }


    anggaranDonutChartInstance = new Chart(ctx, {
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

// Fungsi untuk merender daftar pegawai yang sedang bertugas
const renderPegawaiOnDuty = (perjalananList) => {
    const tableBody = document.getElementById('pegawai-on-duty-body');
    if (!tableBody) return;

    // PERBAIKAN: Buat daftar datar dari setiap pegawai di setiap perjalanan
    const onDutyList = [];

    if (Array.isArray(perjalananList)) {
        perjalananList.forEach(perjalanan => {
            if (Array.isArray(perjalanan.pegawai)) {
                perjalanan.pegawai.forEach(p => {
                    if (p && p.nama_lengkap) {
                        onDutyList.push({
                            nama: p.nama_lengkap.trim(),
                            nomor_spt: perjalanan.nomor_surat,
                            tanggal_berangkat: perjalanan.tanggal_berangkat,
                            tanggal_kembali: perjalanan.tanggal_kembali
                        });
                    }
                });
            }
        });
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    if (onDutyList.length > 0) {
        const rowsHtml = onDutyList.map((item, index) => `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">${index + 1}</td>
                <td class="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">${item.nama}</td>
                <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">${item.nomor_spt}</td>
                <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    ${formatDate(item.tanggal_berangkat)} s.d. ${formatDate(item.tanggal_kembali)}
                </td>
            </tr>
        `).join('');
        tableBody.innerHTML = rowsHtml;
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-4 px-4 text-center text-gray-500 dark:text-gray-400">Tidak ada pegawai yang melaksanakan tugas di bulan ini.</td>
            </tr>
        `;
    }
};

// Panggil fungsi utama setelah DOM siap.
// Skrip ini sekarang dimuat oleh main1.js setelah DOM dan sesi siap.
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
});