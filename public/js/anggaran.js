// public/js/anggaran.js
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

    let currentPageLimit = 5;
    let currentPage = 1;


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

    // Fungsi render paginasi generik
    const renderPagination = (container, pagination, loadFunction) => {
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
    };


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
                <td class="px-3 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900 dark:text-white">${anggaran.program || '-'}</div>
                    <div class="text-sm text-gray-500 dark:text-white">${anggaran.kegiatan || '-'}</div>
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
    const loadAnggaran = async (page = 1) => {
        currentPage = page;
        try {
            // Ambil data sesi, anggaran, dan pegawai secara bersamaan
            const [sessionRes, anggaranRes, pegawaiRes] = await Promise.all([
                fetch('/api/user/session'),
                fetch(`/api/anggaran?page=${page}&limit=${currentPageLimit}`),
                fetch('/api/pegawai') // Ambil data pegawai untuk dropdown PPTK
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

            const result = await anggaranRes.json();
            renderAnggaranList(result.data, result.pagination);

            // Isi dropdown PPTK
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

    // Handle form submission
    anggaranForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = anggaranIdInput.value;
        const formData = new FormData(anggaranForm);
        const data = Object.fromEntries(formData.entries());

        // Parse nilai anggaran dari format mata uang ke angka sebelum dikirim
        data.nilai_anggaran = parseCurrency(data.nilai_anggaran);
        data.pptk_id = document.getElementById('pptk_id').value;

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

        // Handle Edit (periksa parent jika ikon yang diklik)
        const editBtn = target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id; // PERBAIKAN: Ambil ID dari tombol, bukan dari target klik
            const response = await fetch(`/api/anggaran/${id}`);
            const anggaran = await response.json();
            openModal(anggaran);
        }

        // Handle Delete (periksa parent jika ikon yang diklik)
        const deleteBtn = target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id; // PERBAIKAN: Ambil ID dari tombol, bukan dari target klik
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

    // Event listener untuk memformat input mata uang secara otomatis
    anggaranForm.addEventListener('input', (e) => {
        if (e.target.id === 'nilai_anggaran') {
            // Simpan posisi kursor
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const oldValue = e.target.value;

            e.target.value = formatCurrency(e.target.value);

            // Kembalikan posisi kursor dengan memperhitungkan penambahan/pengurangan titik
            const newLength = e.target.value.length;
            const oldLength = oldValue.length;
            e.target.setSelectionRange(start + (newLength - oldLength), end + (newLength - oldLength));
        }
    });

    if (pageLimitSelect) {
        pageLimitSelect.addEventListener('change', (e) => {
            currentPageLimit = parseInt(e.target.value, 10);
            loadAnggaran(1);
        });
    }

    // Inisialisasi halaman
    loadAnggaran();
})();