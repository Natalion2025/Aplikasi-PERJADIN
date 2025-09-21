// public/js/pembayaran.js
(function () {
    // Elemen Modal
    const openModalBtn = document.getElementById('buat-bukti-button');
    const modal = document.getElementById('pembayaran-modal');
    const closeModalBtn = document.getElementById('close-pembayaran-modal-button');
    const cancelBtn = document.getElementById('cancel-pembayaran-button');
    const pembayaranForm = document.getElementById('pembayaran-form');
    const modalTitle = document.getElementById('pembayaran-modal-title');
    const pembayaranIdInput = document.getElementById('pembayaran-id');

    // Elemen Form
    const anggaranSelect = document.getElementById('anggaran_id');
    const sptSelect = document.getElementById('spt_id');
    const namaPenerimaTextarea = document.getElementById('nama_penerima');

    // Elemen List/Tabel
    const pembayaranTableBody = document.getElementById('pembayaran-table-body');

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);

    // Function to open the modal
    const openModal = () => {
        pembayaranForm.reset();
        pembayaranIdInput.value = '';
        modalTitle.textContent = 'Buat Bukti Pembayaran Baru';
        namaPenerimaTextarea.readOnly = false; // Pastikan bisa diedit jika manual
        modal.classList.remove('hidden');
    };

    // Function to close the modal
    const closeModal = () => {
        modal.classList.add('hidden');
        pembayaranForm.reset();
    };

    // Variabel untuk menyimpan data SPT lengkap
    let sptDataMap = new Map();
    // Variabel untuk menyimpan instance TomSelect
    let anggaranTomSelect = null;
    let sptTomSelect = null;

    // Memuat opsi untuk dropdown
    const loadDropdownOptions = async () => {
        try {
            // Load Anggaran
            const anggaranRes = await fetch('/api/anggaran');
            if (!anggaranRes.ok) throw new Error('Gagal memuat data anggaran.');
            const anggaranList = await anggaranRes.json();

            // Hancurkan instance TomSelect yang lama jika ada
            if (anggaranTomSelect) anggaranTomSelect.destroy();
            if (sptTomSelect) sptTomSelect.destroy();

            // Load Anggaran
            anggaranSelect.innerHTML = '<option value="">-- Pilih Anggaran --</option>';
            anggaranList.forEach(a => {
                // Menambahkan sub_kegiatan ke dalam teks opsi untuk memberikan konteks lebih
                const optionText = `${a.mata_anggaran_kode} - ${a.mata_anggaran_nama} (Sub: ${a.sub_kegiatan})`;
                const option = new Option(optionText, a.id);
                anggaranSelect.appendChild(option);
            });

            // Load SPT
            const sptRes = await fetch('/api/spt');
            if (!sptRes.ok) throw new Error('Gagal memuat data SPT.');
            const sptList = await sptRes.json();
            sptDataMap.clear(); // Kosongkan map sebelum diisi ulang
            sptSelect.innerHTML = '<option value="">-- Pilih SPT --</option>';
            sptList.forEach(spt => {
                const option = new Option(spt.nomor_surat, spt.id);
                sptSelect.appendChild(option);
                sptDataMap.set(spt.id.toString(), spt); // Simpan data lengkap SPT
            });

            // Inisialisasi TomSelect setelah opsi dimuat
            anggaranTomSelect = new TomSelect(anggaranSelect, { sortField: { field: "text", direction: "asc" } });
            sptTomSelect = new TomSelect(sptSelect, { sortField: { field: "text", direction: "asc" } });

        } catch (error) {
            console.error('Error loading dropdowns:', error);
            alert(error.message);
        }
    };

    // Event listener untuk perubahan pada dropdown SPT
    sptSelect.addEventListener('change', (event) => {
        const selectedSptId = event.target.value;
        const selectedSpt = sptDataMap.get(selectedSptId);

        if (selectedSpt && selectedSpt.pegawai && selectedSpt.pegawai.length > 0) {
            // Format daftar pegawai menjadi string (nama - nip) per baris
            const penerimaText = selectedSpt.pegawai
                .map(p => `${p.nama_lengkap} - NIP. ${p.nip}`)
                .join('\n');
            namaPenerimaTextarea.value = penerimaText;
        } else {
            // Kosongkan jika tidak ada SPT yang dipilih atau tidak ada pegawai
            namaPenerimaTextarea.value = '';
        }
    });

    // Merender daftar pembayaran ke dalam tabel
    const renderPembayaranList = (pembayaranList) => {
        pembayaranTableBody.innerHTML = '';

        if (pembayaranList.length === 0) {
            pembayaranTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data pembayaran.</td></tr>`;
            return;
        }

        pembayaranList.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-white">${p.nomor_bukti}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ${new Date(p.tanggal_bukti).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${p.nama_penerima}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${p.uraian_pembayaran}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${formatCurrency(p.nominal_bayar)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${p.id}" class="print-btn text-blue-600 hover:text-blue-900" title="Cetak Bukti">
                        <i class="fas fa-print"></i>
                    </button>
                    <button data-id="${p.id}" class="delete-btn text-red-600 hover:text-red-900 ml-4" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            pembayaranTableBody.appendChild(row);
        });
    };

    // Memuat data pembayaran dari server
    const loadPembayaran = async () => {
        try {
            const response = await fetch('/api/pembayaran');
            if (!response.ok) throw new Error('Gagal memuat data pembayaran.');
            const pembayaranList = await response.json();
            renderPembayaranList(pembayaranList);
        } catch (error) {
            console.error('Error:', error);
            pembayaranTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // Handle form submission
    pembayaranForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(pembayaranForm);
        const data = Object.fromEntries(formData.entries());

        // Untuk saat ini, kita hanya handle pembuatan baru
        const url = '/api/pembayaran';
        const method = 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data.');

            alert('Bukti pembayaran berhasil disimpan!');
            closeModal();
            loadPembayaran(); // Muat ulang daftar setelah berhasil
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Event delegation untuk tombol Aksi
    pembayaranTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        // Handle Delete
        if (target.classList.contains('delete-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus bukti pembayaran ini?')) {
                try {
                    const response = await fetch(`/api/pembayaran/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || 'Gagal menghapus data.');
                    loadPembayaran(); // Muat ulang daftar
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }

        // Handle Print (TODO)
        if (target.classList.contains('print-btn')) {
            alert(`Fitur cetak untuk bukti ID: ${id} belum diimplementasikan.`);
        }
    });

    // Event listeners untuk modal
    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // Inisialisasi halaman
    loadDropdownOptions();
    loadPembayaran();
})();