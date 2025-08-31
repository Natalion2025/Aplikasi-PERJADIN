document.addEventListener('DOMContentLoaded', () => {
    // --- Seleksi Elemen DOM ---
    const addPegawaiButton = document.getElementById('add-pegawai-button');
    const modal = document.getElementById('pegawai-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelButton = document.getElementById('cancel-button');
    const pegawaiForm = document.getElementById('pegawai-form');
    const pegawaiListContainer = document.getElementById('pegawai-list-container');
    const modalTitle = modal.querySelector('h3');
    const formNotification = document.getElementById('form-notification');
    const pegawaiIdInput = document.getElementById('pegawai-id');

    // --- Fungsi Bantuan Notifikasi ---
    /**
     * Menampilkan notifikasi sementara pada elemen yang diberikan.
     * @param {string} message - Pesan yang akan ditampilkan.
     * @param {boolean} [isError=false] - Set true jika ini adalah pesan error untuk styling.
     */
    function showNotification(message, isError = false) {
        if (!formNotification) return;
        formNotification.textContent = message;
        formNotification.classList.remove('hidden');
        formNotification.classList.toggle('bg-red-100', isError);
        formNotification.classList.toggle('text-red-700', isError);
        formNotification.classList.toggle('bg-green-100', !isError);
        formNotification.classList.toggle('text-green-700', !isError);
        setTimeout(() => {
            formNotification.textContent = '';
            formNotification.classList.add('hidden');
        }, 5000);
    }

    // --- Manajemen Modal ---
    const openModal = () => modal.classList.remove('hidden');
    const closeModal = () => {
        modal.classList.add('hidden');
        pegawaiForm.reset();
        pegawaiIdInput.value = '';
        formNotification.classList.add('hidden');
    };

    // --- Panggilan API ---
    const API_BASE_URL = '/api/pegawai';

    const fetchPegawai = async () => {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) throw new Error('Gagal memuat data pegawai.');
            return await response.json();
        } catch (error) {
            console.error(error);
            pegawaiListContainer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
            return [];
        }
    };

    const savePegawai = async (pegawaiData) => {
        const id = pegawaiIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/${id}` : API_BASE_URL;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pegawaiData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Gagal ${id ? 'memperbarui' : 'menyimpan'} data.`);
            }
            return await response.json();
        } catch (error) {
            showNotification(error.message, true);
            throw error; // Lempar kembali error untuk mencegah penutupan modal
        }
    };

    const deletePegawai = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data pegawai ini?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menghapus data.');
            }
            alert('Data pegawai berhasil dihapus.');
            loadAndRenderPegawai();
        } catch (error) {
            console.error(error);
            alert(error.message); // Gunakan alert untuk error penghapusan
        }
    };

    // --- Render Tampilan ---
    const renderPegawaiList = (pegawai) => {
        pegawaiListContainer.innerHTML = ''; // Bersihkan daftar yang ada
        if (!pegawai || pegawai.length === 0) {
            pegawaiListContainer.innerHTML = '<p class="text-gray-500">Belum ada data pegawai.</p>';
            return;
        }

        pegawai.forEach(p => {
            const pegawaiCard = document.createElement('div');
            pegawaiCard.className = 'p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors';
            pegawaiCard.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">${p.nama_lengkap}</p>
                    <p class="text-sm text-gray-600">${p.jabatan || 'N/A'} - NIP: ${p.nip}</p>
                </div>
                <div class="space-x-2">
                    <button data-id="${p.id}" class="edit-btn text-blue-600 hover:text-blue-800" title="Edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button data-id="${p.id}" class="delete-btn text-red-600 hover:text-red-800" title="Hapus">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            pegawaiListContainer.appendChild(pegawaiCard);
        });
    };

    // --- Event Handlers ---
    const handleAddClick = () => {
        pegawaiForm.reset();
        pegawaiIdInput.value = '';
        modalTitle.textContent = 'Tambah Data Pegawai';
        openModal();
    };

    const handleEditClick = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                let serverResponseText = '';
                try {
                    // Coba baca respons sebagai JSON dulu
                    const errorData = await response.json();
                    serverResponseText = errorData.message || JSON.stringify(errorData);
                } catch (jsonError) {
                    // Jika gagal, mungkin respons bukan JSON, coba baca sebagai teks biasa
                    try {
                        serverResponseText = await response.text();
                    } catch (textError) {
                        serverResponseText = 'Tidak dapat membaca respons dari server.';
                    }
                }

                // Log detail error untuk debugging di console developer
                console.error('API Error saat mengambil data pegawai:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    responseBody: serverResponseText,
                });

                // Lemparkan error yang akan ditampilkan ke pengguna
                throw new Error(`Gagal mengambil data pegawai. Server merespons dengan kode error ${response.status}.`);
            }
            const pegawai = await response.json();

            // Isi form dengan data yang diterima
            pegawaiIdInput.value = pegawai.id;
            for (const key in pegawai) {
                const inputElement = document.getElementById(key);
                if (inputElement) {
                    // Gunakan nullish coalescing operator untuk handle nilai null/undefined
                    inputElement.value = pegawai[key] ?? '';
                }
            }

            modalTitle.textContent = 'Edit Data Pegawai';
            openModal();
        } catch (error) {
            // Error yang dilempar dari blok 'try' akan ditangkap di sini
            console.error(error); // Ini akan mencetak stack trace juga
            alert(error.message);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(pegawaiForm);
        const pegawaiData = Object.fromEntries(formData.entries());

        try {
            await savePegawai(pegawaiData);
            showNotification('Data berhasil disimpan!', false);
            closeModal();
            loadAndRenderPegawai();
        } catch (error) {
            // Error sudah ditampilkan oleh fungsi savePegawai
            console.error('Gagal menyimpan:', error);
        }
    };

    const handleListContainerClick = (event) => {
        const editButton = event.target.closest('.edit-btn');
        const deleteButton = event.target.closest('.delete-btn');

        if (editButton) handleEditClick(editButton.dataset.id);
        if (deleteButton) deletePegawai(deleteButton.dataset.id);
    };

    // --- Inisialisasi ---
    const loadAndRenderPegawai = async () => {
        const pegawai = await fetchPegawai();
        renderPegawaiList(pegawai);
    };

    // Pasang event listeners
    addPegawaiButton.addEventListener('click', handleAddClick);
    closeModalButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    pegawaiForm.addEventListener('submit', handleFormSubmit);
    pegawaiListContainer.addEventListener('click', handleListContainerClick);

    // Muat data saat halaman pertama kali dibuka
    loadAndRenderPegawai();
});