// public/js/anggaran.js
document.addEventListener('DOMContentLoaded', () => {
    // Elemen Modal
    const openModalBtn = document.getElementById('tambah-anggaran-button');
    const modal = document.getElementById('anggaran-modal');
    const closeModalBtn = document.getElementById('close-anggaran-modal-button');
    const cancelBtn = document.getElementById('cancel-anggaran-button');
    const anggaranForm = document.getElementById('anggaran-form');
    const modalTitle = document.getElementById('anggaran-modal-title');
    const anggaranIdInput = document.getElementById('anggaran-id');

    // Elemen List/Tabel
    const anggaranTableBody = document.getElementById('anggaran-table-body');

    let currentUserRole = 'user'; // Default role

    // Function to open the modal
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
            document.getElementById('nilai_anggaran').value = anggaran.nilai_anggaran;
        } else {
            // Mode Tambah
            modalTitle.textContent = 'Tambah Anggaran Baru';
        }
        modal.classList.remove('hidden');
    };

    // Function to close the modal
    const closeModal = () => {
        modal.classList.add('hidden');
        anggaranForm.reset();
        anggaranIdInput.value = '';
    };

    // Fungsi untuk merender daftar anggaran ke dalam tabel
    const renderAnggaranList = (anggaranList) => {
        anggaranTableBody.innerHTML = ''; // Kosongkan tabel

        if (anggaranList.length === 0) {
            const canManage = currentUserRole === 'admin' || currentUserRole === 'superadmin';
            const message = canManage ? 'Belum ada data anggaran. Silakan tambahkan anggaran baru.' : 'Data anggaran belum tersedia.';
            anggaranTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">${message}</td></tr>`;
            return;
        }

        anggaranList.forEach(anggaran => {
            const row = document.createElement('tr');

            // Tombol Aksi (Edit & Hapus) hanya untuk admin/superadmin
            const actionButtons = (currentUserRole === 'admin' || currentUserRole === 'superadmin')
                ? `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                       <button data-id="${anggaran.id}" class="edit-btn text-indigo-600 hover:text-indigo-900">Edit</button>
                       <button data-id="${anggaran.id}" class="delete-btn text-red-600 hover:text-red-900 ml-4">Hapus</button>
                   </td>`
                : '<td class="px-6 py-4"></td>'; // Kolom kosong jika bukan admin

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-white">${anggaran.program || '-'}</div>
                    <div class="text-sm text-gray-500 dark:text-white">${anggaran.kegiatan || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">${anggaran.mata_anggaran_kode}</div>
                    <div class="text-sm text-gray-500 dark:text-white">${anggaran.mata_anggaran_nama}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(anggaran.nilai_anggaran)}
                </td>
                ${actionButtons}
            `;
            anggaranTableBody.appendChild(row);
        });
    };

    // Fungsi untuk memuat data anggaran dari server
    const loadAnggaran = async () => {
        try {
            // Ambil data sesi dan data anggaran secara bersamaan
            const [sessionRes, anggaranRes] = await Promise.all([
                fetch('/api/user/session'),
                fetch('/api/anggaran')
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

            const anggaranList = await anggaranRes.json();
            renderAnggaranList(anggaranList);

        } catch (error) {
            console.error('Error:', error);
            anggaranTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    };

    // Handle form submission
    anggaranForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = anggaranIdInput.value;
        const formData = new FormData(anggaranForm);
        const data = Object.fromEntries(formData.entries());

        // Pisahkan kode dan nama mata anggaran
        const mataAnggaranValue = data.mata_anggaran;
        const [kode, ...namaArray] = mataAnggaranValue.split(' - ');
        data.mata_anggaran = mataAnggaranValue; // Kirim value lengkap

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
            loadAnggaran(); // Muat ulang daftar setelah berhasil
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Event delegation untuk tombol Edit dan Hapus
    anggaranTableBody.addEventListener('click', async (event) => {
        const target = event.target;

        // Handle Edit
        if (target.classList.contains('edit-btn')) {
            const id = target.dataset.id;
            const response = await fetch(`/api/anggaran/${id}`);
            const anggaran = await response.json();
            openModal(anggaran);
        }

        // Handle Delete
        if (target.classList.contains('delete-btn')) {
            const id = target.dataset.id;
            if (confirm('Apakah Anda yakin ingin menghapus data anggaran ini?')) {
                try {
                    const response = await fetch(`/api/anggaran/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || 'Gagal menghapus data.');
                    loadAnggaran(); // Muat ulang daftar
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // Event listeners untuk modal
    openModalBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // Inisialisasi halaman
    loadAnggaran();
});