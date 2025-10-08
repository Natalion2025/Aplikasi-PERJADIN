// public/js/uang-muka.js
document.addEventListener('DOMContentLoaded', () => {
    // Definisikan elemen modal panjar di sini juga agar bisa diakses
    const listContainer = document.getElementById('uang-muka-list-container');

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

    const renderUangMukaList = (data) => {
        if (!data || data.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">Belum ada data uang muka yang dibuat.</p>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
        table.innerHTML = `
            <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nomor SPT</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pelaksana</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Biaya</th>
                    <th scope="col" class="relative px-6 py-3"><span class="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
            </tbody>
        `;

        const tbody = table.querySelector('tbody');
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${item.nomor_surat}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formatDate(item.tanggal_panjar)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${item.pelaksana_nama}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${formatCurrency(item.total_biaya)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${item.id}" class="print-btn text-blue-600 hover:text-blue-900" title="Cetak Bukti"><i class="fas fa-print"></i></button>
                    <button data-id="${item.id}" class="edit-btn text-indigo-600 hover:text-indigo-900 ml-4" title="Edit"><i class="fas fa-edit"></i></button>
                    <button data-id="${item.id}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });

        listContainer.innerHTML = '';
        listContainer.appendChild(table);
    };

    // Jadikan fungsi ini global agar bisa dipanggil dari spt-register.js
    window.loadUangMuka = async () => {
        try {
            const response = await fetch('/api/panjar');
            if (!response.ok) throw new Error('Gagal memuat data uang muka.');
            const data = await response.json();
            renderUangMukaList(data);
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
                    alert(result.message);
                    loadUangMuka();
                } catch (error) {
                    alert(`Gagal menghapus: ${error.message}`);
                }
            }
        }

        if (button.classList.contains('edit-btn')) {
            // Logika untuk membuka modal dan mengisi data
            const response = await fetch(`/api/panjar/${id}`);
            if (!response.ok) {
                alert('Gagal memuat data untuk diedit.');
                return;
            }
            const data = await response.json();

            // Panggil fungsi global openPanjarModal yang sudah diekspos dari spt-register.js
            if (typeof window.openPanjarModal === 'function') {
                window.openPanjarModal(data); // Kirim data untuk diisi
            } else {
                alert('Fungsi untuk edit tidak ditemukan.');
            }
        }

        if (button.classList.contains('print-btn')) {
            window.open(`/cetak/panjar/${id}`, '_blank');
        }
    });

    loadUangMuka();
});