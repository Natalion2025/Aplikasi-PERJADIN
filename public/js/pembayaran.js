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
    const uraianPembayaranTextarea = document.getElementById('uraian_pembayaran');
    const nominalBayarInput = document.getElementById('nominal_bayar');
    const uangHarianInfoContainer = document.getElementById('uang-harian-info-container');
    const uangHarianDetails = document.getElementById('uang-harian-details');
    const uangHarianAnalysisContainer = document.getElementById('uang-harian-analysis');

    // Elemen Tabel Rincian
    const rincianContainer = document.getElementById('rincian-pengeluaran-container');
    const rincianTableBody = document.getElementById('rincian-pengeluaran-body');

    // Elemen List/Tabel
    const pembayaranTableBody = document.getElementById('pembayaran-table-body');

    const formatCurrency = (value) => {
        const numberString = String(value || '').replace(/[^0-9-]/g, '');
        const number = parseFloat(numberString);
        if (isNaN(number)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    const parseCurrency = (value) => {
        const numberString = String(value || '').replace(/[^0-9-]/g, '');
        const number = parseFloat(numberString);
        return isNaN(number) ? 0 : number;
    };

    // Function to open the modal
    const openModal = () => {
        pembayaranForm.reset();
        pembayaranIdInput.value = '';
        modalTitle.textContent = 'Buat Bukti Pembayaran Baru';
        sptTomSelect.enable();
        sptTomSelect.clear();
        clearRincian();
        uangHarianInfoContainer.classList.add('hidden');
        uangHarianAnalysisContainer.innerHTML = '';
        modal.classList.remove('hidden');
    };

    // Fungsi untuk membuka modal dalam mode edit
    const openModalForEdit = async (id) => {
        try {
            const response = await fetch(`/api/pembayaran/${id}`);
            if (!response.ok) throw new Error('Gagal memuat data pembayaran untuk diedit.');
            const data = await response.json();

            pembayaranForm.reset();
            pembayaranIdInput.value = data.id;
            modalTitle.textContent = 'Edit Bukti Pembayaran';

            anggaranTomSelect.setValue(data.anggaran_id);
            sptTomSelect.setValue(data.spt_id);
            sptTomSelect.disable();

            // Trigger change event untuk SPT agar rincian pengeluaran dimuat
            // Gunakan Promise untuk menunggu renderRincianPengeluaran selesai
            await new Promise(resolve => {
                sptSelect.addEventListener('change', () => resolve(), { once: true });
                sptSelect.dispatchEvent(new Event('change'));
            });

            // Setelah rincian dimuat, isi form dan terapkan panjar
            // Beri sedikit jeda untuk memastikan DOM sudah sepenuhnya diperbarui
            setTimeout(async () => {
                namaPenerimaTextarea.value = data.nama_penerima;
                uraianPembayaranTextarea.value = data.uraian_pembayaran;
                nominalBayarInput.value = formatCurrency(data.nominal_bayar); // Selalu isi nominal_bayar
                if (!rincianContainer.classList.contains('hidden')) {
                } else {
                    nominalBayarInput.value = data.nominal_bayar;
                }
            }, 500);

            modal.classList.remove('hidden');

            // Terapkan nilai panjar yang tersimpan
            if (data.panjar_data) {
                const savedPanjarData = JSON.parse(data.panjar_data);
                savedPanjarData.forEach(panjarItem => {
                    const panjarInput = rincianContainer.querySelector(`.panjar-input[data-pegawai-id="${panjarItem.pegawai_id}"]`);
                    if (panjarInput) {
                        panjarInput.value = formatCurrency(panjarItem.nilai_panjar);
                        // Trigger the "Terapkan" logic for this input
                        const terapkanBtn = panjarInput.nextElementSibling;
                        if (terapkanBtn && terapkanBtn.classList.contains('terapkan-panjar-btn')) {
                            terapkanBtn.click(); // Simulate click to apply panjar and recalculate
                        }
                    }
                });
            }
        } catch (error) {
            alert(error.message);
        }
    };

    // Function to close the modal
    const closeModal = () => {
        modal.classList.add('hidden');
        pembayaranForm.reset();
        if (anggaranTomSelect) anggaranTomSelect.clear();
        if (sptTomSelect) sptTomSelect.clear();
        clearRincian();
        uangHarianInfoContainer.classList.add('hidden');
        uangHarianAnalysisContainer.innerHTML = '';
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

            if (anggaranTomSelect) anggaranTomSelect.destroy();
            if (sptTomSelect) sptTomSelect.destroy();

            anggaranSelect.innerHTML = '<option value="">-- Pilih Anggaran --</option>';
            anggaranList.forEach(a => {
                const optionText = `${a.mata_anggaran_kode} - ${a.mata_anggaran_nama} (Sub: ${a.sub_kegiatan})`;
                const option = new Option(optionText, a.id);
                anggaranSelect.appendChild(option);
            });

            // Load SPT
            const sptRes = await fetch('/api/spt');
            if (!sptRes.ok) throw new Error('Gagal memuat data SPT.');
            const sptList = await sptRes.json();
            sptDataMap.clear();
            sptSelect.innerHTML = '<option value="">-- Pilih SPT --</option>';
            sptList.forEach(spt => {
                const option = new Option(spt.nomor_surat, spt.id);
                sptSelect.appendChild(option);
                sptDataMap.set(spt.id.toString(), spt);
            });

            anggaranTomSelect = new TomSelect(anggaranSelect, { sortField: { field: "text", direction: "asc" } });
            sptTomSelect = new TomSelect(sptSelect, { sortField: { field: "text", direction: "asc" } });

        } catch (error) {
            console.error('Error loading dropdowns:', error);
            alert(error.message);
        }
    };

    // Fungsi untuk merender rincian pengeluaran ke tabel
    const renderRincianPengeluaran = (pengeluaranList, penerimaList, spt_id) => {
        rincianTableBody.innerHTML = '';
        if (!pengeluaranList || pengeluaranList.length === 0) {
            rincianContainer.classList.add('hidden');
            uangHarianInfoContainer.classList.add('hidden');
            return;
        }

        let grandTotalDibayar = 0;
        let counter = 1;

        uangHarianAnalysisContainer.innerHTML = '';
        uangHarianInfoContainer.classList.remove('hidden');
        uangHarianDetails.textContent = `Perhitungan uang harian berdasarkan standar biaya yang berlaku.`;

        // PERBAIKAN: Iterasi langsung pada penerimaList, bukan pengeluaran.
        // Ini memastikan semua pegawai yang berhak (termasuk yang tidak punya input pengeluaran) tetap diproses.
        penerimaList.forEach(penerimaInfo => {
            const pegawaiId = penerimaInfo.id;
            const pengeluaran = pengeluaranList.find(p => p.pegawai_id == pegawaiId) || {};

            const rowsData = [];

            let notifMessage = `<b>${penerimaInfo.nama_lengkap}</b> (Jabatan: ${penerimaInfo.jabatan || 'N/A'}): `;
            let isSuccess = false;
            let uangHarianInfo = { harga_satuan: 0, satuan: 'OH', golongan: 'N/A' };

            if (penerimaInfo && penerimaInfo.uang_harian) {
                uangHarianInfo = penerimaInfo.uang_harian;
                if (uangHarianInfo.harga_satuan > 0) {
                    isSuccess = true;
                    notifMessage += `Berhasil menerapkan standar biaya ${uangHarianInfo.golongan} sebesar ${formatCurrency(uangHarianInfo.harga_satuan)} per ${uangHarianInfo.satuan}.`;
                } else {
                    notifMessage += `GAGAL menemukan standar biaya yang cocok untuk ${uangHarianInfo.golongan}. Tarif diatur ke 0. Periksa data di menu Standar Biaya.`;
                }
            } else {
                notifMessage += `GAGAL menemukan data uang harian. Pastikan pegawai ini dipilih sebagai penandatangan di laporan perjalanan dinas.`;
            }

            const notifElement = document.createElement('p');
            notifElement.innerHTML = notifMessage;
            notifElement.className = isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
            uangHarianAnalysisContainer.appendChild(notifElement);

            // PERBAIKAN FINAL: Cek dengan cara yang lebih robust untuk biaya representasi
            const isKepalaDinas = penerimaInfo.jabatan && penerimaInfo.jabatan.toLowerCase().includes('kepala dinas');
            const hasBiayaRepresentasi = penerimaInfo.biaya_representasi && penerimaInfo.biaya_representasi.harga > 0;

            if (isKepalaDinas) {
                const representasiNotif = document.createElement('p');
                if (hasBiayaRepresentasi) {
                    representasiNotif.innerHTML = `&nbsp;&nbsp;↳ Ditemukan Biaya Representasi (Eselon II) sebesar ${formatCurrency(penerimaInfo.biaya_representasi.harga)} per ${penerimaInfo.biaya_representasi.satuan}.`;
                    representasiNotif.className = 'text-sm text-green-600 dark:text-green-400';
                } else {
                    representasiNotif.innerHTML = `&nbsp;&nbsp;↳ <b>PERINGATAN:</b> Pegawai ini adalah Kepala Dinas tetapi standar biaya representasi tidak ditemukan atau nol. Periksa data di menu Standar Biaya (Tipe D).`;
                    representasiNotif.className = 'text-sm text-yellow-600 dark:text-yellow-400';
                }
                uangHarianAnalysisContainer.appendChild(representasiNotif);
            }

            // PERBAIKAN: Hitung jumlah hari dan total uang harian secara otomatis
            const jumlahHariHarian = (pengeluaran.akomodasi_malam || 0) + 1;
            const uangHarianTotal = uangHarianInfo.harga_satuan * jumlahHariHarian;

            // Tambahkan baris Uang Harian di awal
            rowsData.push({
                uraian: `Uang Harian (${uangHarianInfo.golongan})`,
                harga: uangHarianInfo.harga_satuan,
                satuan: uangHarianInfo.satuan,
                hari: jumlahHariHarian,
                jumlah: uangHarianTotal,
                isUangHarian: true
            });

            // PERBAIKAN FINAL: Tambahkan baris biaya representasi hanya jika ada dan harga > 0
            if (isKepalaDinas && hasBiayaRepresentasi) {
                // Atur jumlah hari representasi = jumlah malam akomodasi + 1.
                // Jika tidak ada akomodasi, defaultnya adalah 1 hari.
                const jumlahHariRepresentasi = (pengeluaran.akomodasi_malam || 0) + 1;
                const totalBiayaRepresentasi = penerimaInfo.biaya_representasi.harga * jumlahHariRepresentasi;

                rowsData.push({
                    uraian: penerimaInfo.biaya_representasi.uraian,
                    harga: penerimaInfo.biaya_representasi.harga,
                    satuan: penerimaInfo.biaya_representasi.satuan,
                    hari: jumlahHariRepresentasi,
                    jumlah: totalBiayaRepresentasi,
                    isRepresentasi: true
                });
            }

            if (pengeluaran.transportasi_nominal > 0) rowsData.push({ uraian: `Biaya Transportasi (${pengeluaran.transportasi_jenis || 'N/A'})`, harga: pengeluaran.transportasi_nominal, satuan: 'PP', hari: '-', jumlah: pengeluaran.transportasi_nominal });
            if (pengeluaran.akomodasi_nominal > 0) rowsData.push({ uraian: `Biaya Akomodasi (${pengeluaran.akomodasi_jenis || 'N/A'})`, harga: pengeluaran.akomodasi_harga_satuan, satuan: 'Malam', hari: pengeluaran.akomodasi_malam, jumlah: pengeluaran.akomodasi_nominal });
            if (pengeluaran.kontribusi_nominal > 0) rowsData.push({ uraian: `Biaya Kontribusi (${pengeluaran.kontribusi_jenis || 'N/A'})`, harga: pengeluaran.kontribusi_nominal, satuan: 'OK', hari: '-', jumlah: pengeluaran.kontribusi_nominal });
            if (pengeluaran.lain_lain_nominal > 0) rowsData.push({ uraian: `Biaya Lain-lain (${pengeluaran.lain_lain_uraian || 'N/A'})`, harga: pengeluaran.lain_lain_nominal, satuan: 'OK', hari: '-', jumlah: pengeluaran.lain_lain_nominal });

            const rowCount = rowsData.length + 1;

            rowsData.forEach((rowData, index) => {
                const row = document.createElement('tr');
                row.classList.add('rincian-row');
                row.dataset.pegawaiId = pegawaiId;
                if (rowData.isRepresentasi) {
                    row.classList.add('representasi-row');
                }

                let namaTd = '';
                let noTd = '';
                if (index === 0) {
                    noTd = `<td class="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 text-center align-top" rowspan="${rowCount}">${counter++}</td>`;
                    namaTd = `<td class="px-4 py-2 text-sm text-gray-800 dark:text-white align-top" rowspan="${rowCount}">${penerimaInfo.nama_lengkap}</td>`;
                }

                row.innerHTML = `
                    ${noTd}
                    ${namaTd}
                    <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">${rowData.uraian}</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white">${formatCurrency(rowData.harga)}</td>
                    <td class="px-2 py-2 text-sm text-center text-gray-500 dark:text-gray-400">${rowData.satuan}</td>
                    <td class="px-2 py-2 text-sm text-center text-gray-500 dark:text-gray-400">${rowData.hari}</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white jumlah-biaya">${formatCurrency(rowData.jumlah)}</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white nilai-panjar">Rp 0</td>
                    <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-white font-medium jumlah-dibayar">${formatCurrency(rowData.jumlah)}</td>
                `;
                rincianTableBody.appendChild(row);
            });

            // Tambah baris untuk Nilai Panjar
            const panjarRow = document.createElement('tr');
            panjarRow.classList.add('panjar-row');
            panjarRow.dataset.pegawaiId = pegawaiId;
            panjarRow.innerHTML = `
                <td colspan="2" class="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-400 font-bold">Nilai Panjar</td>
                <td class="px-4 py-2 text-sm text-right" colspan="3">
                    <div class="flex items-center justify-end">
                        <input type="text" class="panjar-input w-32 text-center  rounded-md shadow-sm text-sm bg-gray-200 dark:bg-slate-600 dark:border-gray-500 dark:text-white" placeholder="edit" data-pegawai-id="${pegawaiId}" inputmode="numeric">
                        <button type="button" class="terapkan-panjar-btn ml-2 px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600" data-pegawai-id="${pegawaiId}">Terapkan</button>
                    </div>
                </td>
                <td class="px-4 py-2 text-sm text-right text-red-500 font-bold total-panjar-pegawai" data-pegawai-id="${pegawaiId}"></td>
                
            `;
            rincianTableBody.appendChild(panjarRow);

            // Tambah baris untuk Total Dibayar per Pegawai
            const totalPegawaiRow = document.createElement('tr');
            totalPegawaiRow.classList.add('total-pegawai-row', 'bg-slate-50', 'dark:bg-slate-700');
            totalPegawaiRow.dataset.pegawaiId = pegawaiId;
            totalPegawaiRow.innerHTML = `
                <td colspan="8" class="px-4 py-2 text-right font-bold text-gray-800 dark:text-white bg-green-100 dark:bg-green-800">Total Dibayar</td>
                <td class="px-4 py-2 text-right font-bold text-gray-800 dark:text-white total-dibayar-pegawai bg-green-100 dark:bg-green-800" data-pegawai-id="${pegawaiId}">Rp 0</td>
            `;
            rincianTableBody.appendChild(totalPegawaiRow);
        });

        recalculateGrandTotal();
        rincianContainer.classList.remove('hidden');
    };

    // Fungsi untuk menghitung ulang semua total
    const recalculateGrandTotal = () => {
        let grandTotal = 0;

        document.querySelectorAll('tr.rincian-row').forEach(row => {
            const jumlahBiayaEl = row.querySelector('.jumlah-biaya');
            const nilaiPanjarEl = row.querySelector('.nilai-panjar');
            const jumlahDibayarEl = row.querySelector('.jumlah-dibayar');

            const jumlahBiaya = parseFloat(jumlahBiayaEl.textContent.replace(/[^0-9,-]+/g, '')) || 0;
            const nilaiPanjar = parseFloat(nilaiPanjarEl.textContent.replace(/[^0-9,-]+/g, '')) || 0;

            const jumlahDibayar = jumlahBiaya - nilaiPanjar;
            jumlahDibayarEl.textContent = formatCurrency(jumlahDibayar);
        });

        document.querySelectorAll('.total-dibayar-pegawai').forEach(totalEl => {
            const pegawaiId = totalEl.dataset.pegawaiId;
            let totalPegawai = 0;
            document.querySelectorAll(`tr.rincian-row[data-pegawai-id="${pegawaiId}"] .jumlah-dibayar`).forEach(jumlahDibayarEl => {
                totalPegawai += parseFloat(jumlahDibayarEl.textContent.replace(/[^0-9,-]+/g, '')) || 0;
            });
            totalEl.textContent = formatCurrency(totalPegawai);
            grandTotal += totalPegawai;
        });

        document.getElementById('total-dibayar').textContent = formatCurrency(grandTotal);
        nominalBayarInput.value = parseCurrency(formatCurrency(grandTotal));
    };

    const clearRincian = () => {
        rincianTableBody.innerHTML = '';
        rincianContainer.classList.add('hidden');
        uangHarianInfoContainer.classList.add('hidden');
        document.getElementById('total-dibayar').textContent = formatCurrency(0);
        nominalBayarInput.value = '';
    };

    // Event listener untuk perubahan pada dropdown SPT
    sptSelect.addEventListener('change', async (event) => {
        const selectedSptId = event.target.value;
        if (!selectedSptId) {
            namaPenerimaTextarea.value = '';
            uraianPembayaranTextarea.value = '';
            clearRincian();
            uangHarianInfoContainer.classList.add('hidden');
            return;
        }

        const selectedSpt = sptDataMap.get(selectedSptId.toString());
        if (selectedSpt && selectedSpt.maksud_perjalanan) {
            uraianPembayaranTextarea.value = `Pembayaran Perjalanan Dinas dalam rangka ${selectedSpt.maksud_perjalanan}`;
        } else {
            uraianPembayaranTextarea.value = '';
        }

        try {
            const response = await fetch(`/api/laporan/by-spt/${selectedSptId}`);
            const result = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    alert(result.message || 'Belum ada laporan yang dibuat untuk SPT ini. Nama penerima tidak dapat diisi otomatis.');
                    namaPenerimaTextarea.value = '';
                    clearRincian();
                    uangHarianInfoContainer.classList.add('hidden');
                    return;
                }
                throw new Error(result.message || 'Gagal mengambil data penerima.');
            }

            const penerimaText = result.penerima
                .map(p => `${p.nama_lengkap} - NIP. ${p.nip}`)
                .join('\n');

            namaPenerimaTextarea.value = penerimaText;

            renderRincianPengeluaran(result.pengeluaran, result.penerima, selectedSptId);

        } catch (error) {
            console.error("Gagal mengisi nama penerima:", error);
            alert(error.message);
            namaPenerimaTextarea.value = '';
            uraianPembayaranTextarea.value = '';
            clearRincian();
            uangHarianInfoContainer.classList.add('hidden');
        }
    });

    // Event delegation untuk input jumlah hari uang harian
    rincianContainer.addEventListener('input', (e) => {
        // PERBAIKAN: Format input panjar saat diketik
        if (e.target.classList.contains('panjar-input')) {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const oldValue = e.target.value;

            e.target.value = formatCurrency(e.target.value).replace('Rp\u00A0', '');

            const newLength = e.target.value.length;
            const oldLength = oldValue.length;
            e.target.setSelectionRange(start + (newLength - oldLength), end + (newLength - oldLength));
        }
    });

    // Event delegation untuk tombol "Terapkan" panjar
    rincianContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('terapkan-panjar-btn')) {
            const pegawaiId = e.target.dataset.pegawaiId;
            const panjarInput = rincianContainer.querySelector(`.panjar-input[data-pegawai-id="${pegawaiId}"]`);
            const totalPanjarPegawaiEl = rincianContainer.querySelector(`.total-panjar-pegawai[data-pegawai-id="${pegawaiId}"]`);

            const panjarValue = parseCurrency(panjarInput.value);

            const rincianRows = rincianTableBody.querySelectorAll(`tr.rincian-row[data-pegawai-id="${pegawaiId}"]`);
            const panjarRows = rincianTableBody.querySelectorAll(`tr.panjar-row[data-pegawai-id="${pegawaiId}"] .total-panjar-pegawai`);

            if (rincianRows.length > 0) {
                const itemCount = rincianRows.length;
                const baseAmount = Math.floor(panjarValue / itemCount);
                let remainder = panjarValue % itemCount;

                rincianRows.forEach((row, index) => {
                    let amountForItem = baseAmount;
                    if (remainder > 0) {
                        amountForItem += 1;
                        remainder--;
                    }
                    row.querySelector('.nilai-panjar').textContent = formatCurrency(amountForItem);
                });
            }

            panjarRows.forEach(el => el.textContent = `${formatCurrency(panjarValue)}`);

            recalculateGrandTotal();
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
                <td class="px-6 py-4 w-2/5">
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
                    <button data-id="${p.id}" class="edit-btn text-indigo-600 hover:text-indigo-900 ml-4" title="Edit">
                        <i class="fas fa-edit"></i>
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

        // Kumpulkan data panjar dari setiap input
        const panjarData = [];
        document.querySelectorAll('.panjar-input').forEach(input => {
            const pegawaiId = input.dataset.pegawaiId;
            const nilaiPanjar = parseCurrency(input.value);
            if (pegawaiId && nilaiPanjar > 0) {
                panjarData.push({ pegawai_id: parseInt(pegawaiId), nilai_panjar: nilaiPanjar });
            }
        });
        data.panjar_data = JSON.stringify(panjarData); // Tambahkan ke objek data

        const id = pembayaranIdInput.value;
        const isEditMode = !!id;
        const url = isEditMode ? `/api/pembayaran/${id}` : '/api/pembayaran';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data.');

            alert(result.message || 'Data berhasil disimpan!');
            closeModal();
            loadPembayaran();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Event delegation untuk tombol Aksi
    pembayaranTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            openModalForEdit(id);
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus bukti pembayaran ini?')) {
                try {
                    const response = await fetch(`/api/pembayaran/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || 'Gagal menghapus data.');
                    loadPembayaran();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }

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