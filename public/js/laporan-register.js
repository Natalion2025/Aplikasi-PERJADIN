(function () {
    const laporanTableBody = document.getElementById('laporan-table-body');

    // Elemen untuk Modal Pembatalan
    const openPembatalanBtn = document.getElementById('pembatalan-tugas-btn');
    const pembatalanModal = document.getElementById('pembatalan-modal');
    const closePembatalanModalBtn = document.getElementById('close-pembatalan-modal');
    const kembaliPembatalanBtn = document.getElementById('kembali-pembatalan-btn');
    const formPembatalan = document.getElementById('form-pembatalan');
    const sptSelectPembatalan = document.getElementById('pembatalan_spt_id');


    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const renderLaporanList = (laporanList) => {
        laporanTableBody.innerHTML = ''; // Kosongkan tabel

        if (!laporanList || laporanList.length === 0) {
            laporanTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Belum ada data laporan. Silakan buat baru.</td></tr>`;
            return;
        }

        laporanList.forEach(laporan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${laporan.judul}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 dark:text-gray-400">${laporan.nomor_surat}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">
                    ${formatDate(laporan.tanggal_laporan)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <a href="/cetak/laporan/${laporan.id}" target="_blank" class="text-green-600 hover:text-green-900" title="Cetak Laporan"><i class="fas fa-print"></i></a>
                    <a href="/edit-laporan/${laporan.id}" class="text-indigo-600 hover:text-indigo-900" title="Edit Laporan"><i class="fas fa-edit"></i></a>
                    <button data-id="${laporan.id}" class="delete-laporan-btn text-red-600 hover:text-red-900" title="Hapus Laporan"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            laporanTableBody.appendChild(row);
        });
    };

    const loadLaporanData = async () => {
        const response = await fetch('/api/laporan');
        const data = await response.json();
        renderLaporanList(data);
    };

    // --- LOGIKA UNTUK MODAL PEMBATALAN ---

    const openPembatalanModal = () => {
        formPembatalan.reset();
        document.getElementById('tanggal_pembatalan').valueAsDate = new Date(); // Set tanggal hari ini
        pembatalanModal.style.display = 'flex';
        loadSptForCancellation();
    };

    const closePembatalanModal = () => {
        pembatalanModal.style.display = 'none';
    };

    const loadSptForCancellation = async () => {
        try {
            const response = await fetch('/api/spt');
            if (!response.ok) throw new Error('Gagal memuat data SPT.');
            const spts = await response.json();

            sptSelectPembatalan.innerHTML = '<option value="">-- Pilih SPT --</option>'; // Reset

            // Filter hanya SPT yang masih aktif
            const sptsAktif = spts.filter(spt => spt.status !== 'dibatalkan');

            sptsAktif.forEach(spt => {
                const option = document.createElement('option');
                option.value = spt.id;
                option.textContent = spt.nomor_surat;
                sptSelectPembatalan.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    formPembatalan.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formPembatalan);
        const data = Object.fromEntries(formData.entries());

        if (!confirm(`Apakah Anda yakin ingin membatalkan SPT dengan nomor ${sptSelectPembatalan.options[sptSelectPembatalan.selectedIndex].text}?`)) {
            return;
        }

        const submitButton = formPembatalan.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';

        try {
            const response = await fetch('/api/spt/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            closePembatalanModal();
        } catch (error) {
            alert(`Gagal membatalkan: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Batalkan Tugas';
        }
    });

    // Event Listeners untuk Modal Pembatalan
    openPembatalanBtn.addEventListener('click', openPembatalanModal);
    closePembatalanModalBtn.addEventListener('click', closePembatalanModal);
    kembaliPembatalanBtn.addEventListener('click', closePembatalanModal);
    pembatalanModal.addEventListener('click', (e) => {
        if (e.target === pembatalanModal) closePembatalanModal();
    });

    // Event delegation untuk tombol hapus laporan
    laporanTableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-laporan-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) {
                try {
                    const response = await fetch(`/api/laporan/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    loadLaporanData(); // Muat ulang daftar laporan
                } catch (error) {
                    alert(`Gagal menghapus: ${error.message}`);
                }
            }
        }
    });

    loadLaporanData();
})();