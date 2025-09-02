document.addEventListener('DOMContentLoaded', () => {
    // --- Seleksi Elemen DOM ---
    const addPegawaiButton = document.getElementById('add-pegawai-button');
    const pegawaiModal = document.getElementById('pegawai-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelButton = document.getElementById('cancel-button');
    const pegawaiForm = document.getElementById('pegawai-form');
    const pegawaiListContainer = document.getElementById('pegawai-list-container');
    const modalTitle = pegawaiModal.querySelector('h3');
    const pageNotification = document.getElementById('page-notification');
    const pegawaiIdInput = document.getElementById('pegawai-id');
    const pangkatSelect = document.getElementById('pangkat');
    const golonganInput = document.getElementById('golongan');

    // --- Konstanta dan State ---
    const API_BASE_URL = '/api/pegawai';
    const pangkatGolonganMap = {
        '': '', // Untuk pilihan kosong
        'Juru Muda': 'I/a',
        'Juru Muda Tingkat I': 'I/b',
        'Juru': 'I/c',
        'Juru Tingkat I': 'I/d',
        'Pengatur Muda': 'II/a',
        'Pengatur Muda Tingkat I': 'II/b',
        'Pengatur': 'II/c',
        'Pengatur Tingkat I': 'II/d',
        'Penata Muda': 'III/a',
        'Penata Muda Tingkat I': 'III/b',
        'Penata': 'III/c',
        'Penata Tingkat I': 'III/d',
        'Pembina': 'IV/a',
        'Pembina Tingkat I': 'IV/b',
        'Pembina Utama Muda': 'IV/c',
        'Pembina Utama Madya': 'IV/d',
        'Pembina Utama': 'IV/e'
    };

    // --- Fungsi Bantuan & Utilitas ---
    /**
     * Menampilkan notifikasi sementara pada elemen yang diberikan.
     * @param {string} message - Pesan yang akan ditampilkan.
     * @param {boolean} [isError=false] - Set true jika ini adalah pesan error untuk styling.
     */
    function showNotification(message, isError = false) {
        if (!pageNotification) return;
        pageNotification.textContent = message;
        pageNotification.classList.remove('hidden');
        pageNotification.classList.toggle('bg-red-100', isError);
        pageNotification.classList.toggle('text-red-700', isError);
        pageNotification.classList.toggle('bg-green-100', !isError);
        pageNotification.classList.toggle('text-green-700', !isError);
        setTimeout(() => {
            pageNotification.textContent = '';
            pageNotification.classList.add('hidden');
        }, 5000);
    }

    /**
     * Memperbarui input 'Golongan' berdasarkan 'Pangkat' yang dipilih.
     */
    const updateGolongan = () => {
        if (pangkatSelect && golonganInput) {
            const selectedPangkat = pangkatSelect.value;
            golonganInput.value = pangkatGolonganMap[selectedPangkat] || '';
        }
    };

    /**
     * Mereset formulir dan memastikan golongan juga direset.
     */
    const resetForm = () => {
        if (pegawaiForm) pegawaiForm.reset();
        if (pegawaiIdInput) pegawaiIdInput.value = ''; // Reset input hidden ID
        if (pangkatSelect) pangkatSelect.value = ''; // Reset dropdown pangkat
        if (golonganInput) golonganInput.value = ''; // Reset input golongan
    };

    const openModal = () => pegawaiModal.classList.remove('hidden');
    const closeModal = () => {
        pegawaiModal.classList.add('hidden');
        resetForm();
    };

    // --- Panggilan API ---
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

    /**
     * Mengambil data pegawai dari server dan me-render ulang daftar.
     */
    const loadAndRenderPegawai = async () => {
        const pegawai = await fetchPegawai();
        renderPegawaiList(pegawai);
    };

    // --- Event Handlers ---
    const handleAddClick = () => {
        resetForm();
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

            // DIAGNOSTIK: Tampilkan data yang diterima dari server di console browser
            console.log('Data pegawai yang diterima untuk diedit:', pegawai);

            resetForm(); // Bersihkan form sebelum diisi

            // --- Mengisi formulir dengan data pegawai ---
            // 1. Set ID pegawai untuk mode edit
            pegawaiIdInput.value = pegawai.id;

            // 2. Set nilai untuk input teks standar
            document.getElementById('nama_lengkap').value = pegawai.nama_lengkap ?? '';
            document.getElementById('nip').value = pegawai.nip ?? '';
            document.getElementById('jabatan').value = pegawai.jabatan ?? '';
            document.getElementById('bidang').value = pegawai.bidang ?? '';

            // 3. Set nilai untuk dropdown 'Pangkat'.
            // Ini adalah langkah kunci untuk memastikan pangkat yang tersimpan ditampilkan.
            if (pangkatSelect) {
                pangkatSelect.value = pegawai.pangkat ?? '';
            }

            // 4. Perbarui 'Golongan' secara otomatis berdasarkan 'Pangkat' yang baru di-set.
            updateGolongan();

            modalTitle.textContent = 'Edit Data Pegawai';
            openModal();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(pegawaiForm);
        const pegawaiData = Object.fromEntries(formData.entries());
        const isEditing = !!pegawaiIdInput.value;

        try {
            await savePegawai(pegawaiData);
            const successMessage = isEditing ? 'Perubahan data pegawai berhasil disimpan' : 'Pegawai baru berhasil ditambahkan.';
            showNotification(successMessage, false);
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
    const init = async () => {
        // DIAGNOSTIK: Periksa apakah elemen notifikasi ada di halaman.
        if (!pageNotification) {
            console.warn('Peringatan: Elemen notifikasi dengan ID "page-notification" tidak ditemukan di HTML. Notifikasi tidak akan muncul.');
        }

        // Pasang event listeners
        if (pangkatSelect) {
            pangkatSelect.addEventListener('change', updateGolongan);
        }
        addPegawaiButton.addEventListener('click', handleAddClick);
        closeModalButton.addEventListener('click', closeModal);
        cancelButton.addEventListener('click', closeModal);
        pegawaiForm.addEventListener('submit', handleFormSubmit);
        pegawaiListContainer.addEventListener('click', handleListContainerClick);

        // Muat data awal
        await loadAndRenderPegawai();
    };

    init();
});