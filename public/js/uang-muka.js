// public/js/uang-muka.js
document.addEventListener('DOMContentLoaded', () => {
    // Definisikan elemen modal panjar di sini juga agar bisa diakses
    const listContainer = document.getElementById('uang-muka-list-container');
    const paginationContainer = document.getElementById('uangMuka-pagination-container');
    const pageLimitSelect = document.getElementById('page-limit-select');

    let currentPageLimit = 5;
    let currentPage = 1;
    let currentSearchQuery = '';

    // Fungsi untuk memformat mata uang
    const formatCurrency = (value) => {
        const number = parseFloat(String(value).replace(/[^0-9]/g, ''));
        return isNaN(number) ? 'Rp 0' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    // Fungsi untuk memformat tanggal
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    /**
     * Merender komponen paginasi secara dinamis dan konsisten.
     * @param {HTMLElement} container - Elemen div untuk menampung paginasi.
     * @param {object} pagination - Objek paginasi dari API ({ page, totalPages, totalItems, limit }).
     * @param {function} loadFunction - Fungsi yang akan dipanggil saat tombol halaman diklik.
     */
    const renderGlobalPagination = (container, pagination, loadFunction) => {
        if (!container || !pagination) return;
        container.innerHTML = '';

        const { page, totalPages, totalItems, limit } = pagination;
        if (totalItems <= limit) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 sm:px-6';

        const pageInfo = document.createElement('div');
        pageInfo.innerHTML = `<p class="text-sm text-navy-500 dark:text-gray-400">
            Halaman <span class="font-medium">${page}</span> dari <span class="font-medium">${totalPages}</span>
        </p>`;

        const navButtons = document.createElement('div');
        navButtons.className = 'flex-1 flex justify-end items-center';

        // Tombol navigasi 'Pertama'
        const firstButton = document.createElement('button');
        firstButton.textContent = 'Pertama';
        firstButton.className = 'ml-3 relative inline-flex items-center px-4 py-2 border border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs rounded-l-2xl text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === 1) {
            firstButton.disabled = true;
            firstButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        firstButton.addEventListener('click', () => loadFunction(1));

        // Tombol navigasi 'Sebelumnya'
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Sebelumnya';
        prevButton.className = 'relative inline-flex items-center px-4 py-2 border border-l-0 border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
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
            pageNumberButton.className = `relative inline-flex items-center px-4 py-2 border border-l-0 border-r-0 border-navy-500 text-xs text-navy-500 dark:text-gray-300 ${i === page ? 'bg-sky-100 dark:bg-slate-600' : 'bg-white dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-slate-600'} `;
            pageNumberButton.addEventListener('click', () => loadFunction(i));
            pageNumbersContainer.appendChild(pageNumberButton);
        }

        // Tombol navigasi 'Berikutnya'
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Berikutnya';
        nextButton.className = 'relative inline-flex items-center px-4 py-2 border border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
        if (page === totalPages) {
            nextButton.disabled = true;
            nextButton.classList.add('cursor-not-allowed', 'opacity-50');
        }
        nextButton.addEventListener('click', () => loadFunction(page + 1));

        // Tombol navigasi 'Terakhir'
        const lastButton = document.createElement('button');
        lastButton.textContent = 'Terakhir';
        lastButton.className = 'relative inline-flex items-center px-4 py-2 border border-l-0 border-navy-500 hover:bg-sky-100 dark:border-gray-600 text-xs rounded-r-2xl text-navy-500 dark:text-gray-300 bg-white dark:bg-slate-700 dark:hover:bg-slate-600';
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
    };

    const renderUangMukaList = (data, pagination) => {
        listContainer.innerHTML = ''; // Kosongkan kontainer utama

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">Belum ada data uang muka yang dibuat.</p>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full item divide-y divide-gray-200 dark:divide-gray-700';
        table.innerHTML = `
            <thead class="bg-gray-50 dark:bg-gray-700">
                <tr class="bg-blue-50 dark:bg-gray-600 dark:text-white">
                    <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No.</th>
                    <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nomor SPT</th>
                    <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                    <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pelaksana</th>
                    <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-nowrap text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Biaya</th>
                    <th scope="col" class="relative px-6 py-3"><span class="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
            </tbody>  
        `;

        const tbody = table.querySelector('tbody');
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item'
            row.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${index + 1}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${item.nomor_surat}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${formatDate(item.tanggal_panjar)}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${item.pelaksana_nama}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">${formatCurrency(item.total_biaya)}</td>
                <td class="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${item.id}" class="print-btn text-blue-600 hover:text-blue-900 ml-4" title="Cetak Bukti"><i class="fas fa-print"></i></button>
                    <button data-id="${item.id}" class="edit-btn text-yellow-600 hover:text-yellow-900 ml-4" title="Edit"><i class="fas fa-edit"></i></button>
                    <button data-id="${item.id}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });

        listContainer.appendChild(table);
        renderGlobalPagination(paginationContainer, pagination, loadUangMuka);
    };

    // Jadikan fungsi ini global agar bisa dipanggil dari spt-register.js
    window.loadUangMuka = async (page = 1, query = '') => {
        currentPage = page;
        currentSearchQuery = query;
        listContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">Memuat data...</p>`;
        try {
            const response = await fetch(`/api/panjar?page=${page}&limit=${currentPageLimit}&q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Gagal memuat data uang muka.');
            const result = await response.json();
            renderUangMukaList(result.data, result.pagination);
        } catch (error) {
            listContainer.innerHTML = `<p class="text-center text-red-500 py-8">${error.message}</p>`;
        }
    };

    // Event delegation untuk tombol aksi
    listContainer.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const id = button.dataset.id;

        if (button.classList.contains('delete-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus data uang muka ini?')) {
                try {
                    const response = await fetch(`/api/panjar/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message); // Beri konfirmasi ke pengguna
                    loadUangMuka(); // Muat ulang daftar
                } catch (error) {
                    alert(`Gagal menghapus: ${error.message}`);
                }
            }
        }

        if (button.classList.contains('edit-btn')) {
            // Logika untuk membuka modal dan mengisi data
            try {
                const response = await fetch(`/api/panjar/${id}`);
                if (!response.ok) {
                    throw new Error('Gagal memuat data untuk diedit.');
                }
                const data = await response.json();

                // Panggil fungsi global openPanjarModal yang ada di spt-register.js
                if (typeof window.openPanjarModal === 'function') {
                    window.openPanjarModal(data, true); // PERBAIKAN: Kirim data dan flag isFromUangMukaPage
                } else {
                    console.error('Fungsi window.openPanjarModal tidak ditemukan. Pastikan spt-register.js dimuat.');
                    alert('Fungsi untuk edit tidak tersedia saat ini.');
                }
            } catch (error) {
                alert(`Gagal membuka form edit: ${error.message}`);
            }
        }

        if (button.classList.contains('print-btn')) {
            window.open(`/cetak/panjar/${id}`, '_blank');
        }

        if (button.classList.contains('pay-btn')) {
            // Logika untuk membuka modal pembayaran
            try {
                const response = await fetch(`/api/panjar/${id}`);
                if (!response.ok) {
                    throw new Error('Gagal memuat data untuk pembayaran.');
                }
                const data = await response.json();

                if (window.app && window.app.pembayaranUangMuka) {
                    window.app.pembayaranUangMuka.openModal(data);
                } else {
                    console.error('Objek window.app.pembayaranUangMuka tidak ditemukan. Pastikan pembayaran-uang-muka.js dimuat.');
                    alert('Fungsi untuk pembayaran tidak tersedia saat ini.');
                }
            } catch (error) {
                alert(`Gagal membuka form pembayaran: ${error.message}`);
            }
        }
    });

    pageLimitSelect.addEventListener('change', (e) => {
        currentPageLimit = parseInt(e.target.value, 10);
        loadUangMuka(1, currentSearchQuery); // Muat ulang dari halaman pertama
    });

    // Listener untuk event pencarian lokal dari header
    document.addEventListener('localSearch', (e) => {
        if (window.location.pathname.includes('/uang-muka')) {
            e.preventDefault(); // Event ditangani
            const { query } = e.detail;
            loadUangMuka(1, query);
        }
    });


    loadUangMuka(1, currentSearchQuery);

});