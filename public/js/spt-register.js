(function () {
    const sptTableBody = document.getElementById('spt-table-body');
    let currentUserRole = 'user'; // Default role

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const renderSptList = (sptList, role) => {
        sptTableBody.innerHTML = ''; // Kosongkan tabel

        if (!sptList || sptList.length === 0) {
            sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data Surat Tugas. Silakan buat baru.</td></tr>`;
            return;
        }

        sptList.forEach(spt => {
            const row = document.createElement('tr');

            const pegawaiListHtml = spt.pegawai_ditugaskan.length > 0
                ? `<ul>${spt.pegawai_ditugaskan.map(nama => `<li class="list-disc ml-4 dark:text-gray-400">${nama}</li>`).join('')}</ul>`
                : '<span class="text-gray-400">Tidak ada</span>';

            const isCancelled = spt.status === 'dibatalkan';
            const hasReport = spt.laporan_count > 0;

            const actionButtons = (role === 'admin' || role === 'superadmin')
                ? `<a href="/edit-spt/${spt.id}" class="edit-btn text-yellow-600 hover:text-yellow-900 ml-4">Edit</a>
                   <button data-id="${spt.id}" data-nomor="${spt.nomor_surat}" class="delete-btn text-red-600 hover:text-red-900 ml-4">Hapus</button>`
                : '';

            const reportButton = (!isCancelled && !hasReport)
                ? `<a href="/buat-laporan?spt_id=${spt.id}" class="text-blue-600 hover:text-blue-900 ml-4">Buat Laporan</a>`
                : hasReport
                    ? `<span class="text-gray-400 ml-4 cursor-not-allowed">Sudah Dilaporkan</span>`
                    : '';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-400">${spt.nomor_surat}</div>
                    <div class="text-sm text-gray-500">${formatDate(spt.tanggal_surat)}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 break-words max-w-xs dark:text-gray-400">${spt.maksud_perjalanan}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${pegawaiListHtml}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-400">${spt.lokasi_tujuan}</div>
                    <div class="text-sm text-gray-500">${formatDate(spt.tanggal_berangkat)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/cetak/spt/${spt.id}" target="_blank" class="text-indigo-600 hover:text-indigo-900">Cetak</a>
                    <a href="/cetak/sppd/${spt.id}" target="_blank" class="text-green-600 hover:text-green-900 ml-4">Cetak SPD</a>
                    ${reportButton}
                    ${actionButtons}
                </td>
            `;
            sptTableBody.appendChild(row);
        });
    };

    const loadSptData = async () => {
        sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>`;
        try {
            const [sptRes, sessionRes] = await Promise.all([
                fetch('/api/spt'),
                fetch('/api/user/session')
            ]);

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                currentUserRole = sessionData.user.role;
            }

            if (!sptRes.ok) throw new Error('Gagal memuat data SPT.');
            const data = await sptRes.json();
            renderSptList(data, currentUserRole);
        } catch (error) {
            sptTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // Event delegation untuk tombol hapus
    sptTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const id = event.target.dataset.id;
            const nomor = event.target.dataset.nomor;
            if (confirm(`Apakah Anda yakin ingin menghapus SPT dengan nomor "${nomor}"?`)) {
                try {
                    const response = await fetch(`/api/spt/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    loadSptData(); // Muat ulang data setelah berhasil
                } catch (error) {
                    alert(`Gagal menghapus: ${error.message}`);
                }
            }
        }
    });

    loadSptData();
})();