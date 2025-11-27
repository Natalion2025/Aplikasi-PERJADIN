(function () {
    // Elemen Tab dan Panel
    const dayView = document.getElementById('day-view');
    const weekView = document.getElementById('week-view');
    const monthView = document.getElementById('month-view');
    const dayPanel = document.getElementById('day-panel');
    const weekPanel = document.getElementById('week-panel');
    const monthPanel = document.getElementById('month-panel');

    // State untuk tanggal saat ini
    let currentDate = new Date();
    // State untuk menyimpan data event/perjalanan dinas
    let allEvents = [];
    // Template untuk tooltip event
    const eventTooltipTemplate = document.getElementById('event-tooltip-template');

    // --- ELEMEN SIDE CALENDAR ---
    const sideCalendarTitle = document.getElementById('side-calendar-month-year');
    const sideCalendarPrevBtn = document.getElementById('side-calendar-prev');
    const sideCalendarNextBtn = document.getElementById('side-calendar-next');
    const sideCalendarDaysContainer = document.getElementById('side-calendar-days');
    const sideSelectedDayText = document.getElementById('side-calendar-selected-day-text');
    const sideSelectedDate = document.getElementById('side-calendar-selected-date');
    const sideEventsList = document.getElementById('side-calendar-events-list');


    /**
     * Fungsi untuk mendapatkan tema warna tooltip berdasarkan kode anggaran.
     * @param {string} kodeAnggaran - Kode mata anggaran dari SPT.
     * @returns {string[]} Array berisi kelas-kelas CSS Tailwind.
     */
    const getTooltipTheme = (kodeAnggaran) => {
        const themes = {
            green: ['bg-green-50', 'border-green-400', 'text-green-400', 'dark:bg-gray-900', 'dark:border-green-500', 'dark:text-green-500'],
            blue: ['bg-blue-50', 'border-blue-400', 'text-blue-600', 'dark:bg-gray-900', 'dark:border-blue-500', 'dark:text-blue-500'],
            orange: ['bg-orange-50', 'border-orange-400', 'text-orange-600', 'dark:bg-gray-900', 'dark:border-orange-500', 'dark:text-orange-500'],
            yellow: ['bg-yellow-50', 'border-yellow-400', 'text-yellow-600', 'dark:bg-gray-900', 'dark:border-yellow-500', 'dark:text-yellow-500'],
            purple: ['bg-purple-50', 'border-purple-400', 'text-purple-600', 'dark:bg-gray-900', 'dark:border-purple-500', 'dark:text-purple-500']
        };

        if (!kodeAnggaran) return themes.green; // Default

        // Perjalanan Dinas Biasa, Tetap, Meeting Luar Kota
        if (['5.1.02.04.01.0001', '5.1.02.04.01.0002', '5.1.02.04.01.0005'].includes(kodeAnggaran.trim())) return themes.green;
        // Perjalanan Dinas Dalam Kota, Meeting Dalam Kota
        if (['5.1.02.04.01.0003', '5.1.02.04.01.0004'].includes(kodeAnggaran.trim())) return themes.blue;
        // Kursus, Bimbingan Teknis
        if (['5.1.02.02.12.0001', '5.1.02.02.12.0003'].includes(kodeAnggaran.trim())) return themes.orange;
        // Sosialisasi
        if (['5.1.02.02.12.0002'].includes(kodeAnggaran.trim())) return themes.yellow;
        // Diklat Kepemimpinan
        if (['5.1.02.02.12.0004'].includes(kodeAnggaran.trim())) return themes.purple;

        return themes.green; // Fallback jika tidak ada yang cocok
    };

    /**
     * Fungsi untuk mengalihkan tab yang aktif.
     * @param {HTMLElement} selectedTab - Tombol tab yang diklik.
     * @param {HTMLElement} selectedPanel - Panel konten yang sesuai dengan tab.
     */
    const switchTab = (selectedTab, selectedPanel) => {
        const tabs = [dayView, weekView, monthView];
        const panels = [dayPanel, weekPanel, monthPanel];

        // 1. Reset semua tab dan panel ke kondisi non-aktif
        tabs.forEach(tab => {
            if (!tab) return;
            tab.setAttribute('aria-selected', 'false');
            // 1a. Hapus kelas aktif dari tombol
            tab.classList.remove('bg-[#DAEF84]', 'dark:bg-yellow-400');
            // 1b. Atur ulang gaya teks di dalam tombol ke kondisi normal
            const textDiv = tab.querySelector('div');
            if (textDiv) textDiv.classList.remove('font-bold', 'dark:text-gray-900');
            if (textDiv) textDiv.classList.add('font-normal', 'dark:text-gray-300');
        });
        panels.forEach(panel => {
            if (panel) panel.classList.add('hidden');
        });

        // 2. Aktifkan tab dan panel yang dipilih
        if (selectedTab) {
            selectedTab.setAttribute('aria-selected', 'true');
            // 2a. Tambahkan kelas aktif ke tombol
            selectedTab.classList.add('bg-[#DAEF84]', 'dark:bg-yellow-400');
            // 2b. Atur gaya teks di dalam tombol menjadi tebal
            const textDiv = selectedTab.querySelector('div');
            if (textDiv) textDiv.classList.remove('font-normal', 'dark:text-gray-300');
            if (textDiv) textDiv.classList.add('font-bold', 'dark:text-gray-900');
        }
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
        }

        // Update tampilan kalender setelah switch tab
        updateCalendarDisplay();
    };

    const setupTabs = () => {
        if (!dayView || !weekView || !monthView) return;

        // Tambahkan event listener yang memanggil switchTab dengan tab dan panel yang sesuai
        dayView.addEventListener('click', () => switchTab(dayView, dayPanel));
        weekView.addEventListener('click', () => switchTab(weekView, weekPanel));
        monthView.addEventListener('click', () => switchTab(monthView, monthPanel));

        // Atur tab default saat halaman dimuat
        switchTab(monthView, monthPanel);
    };

    // --- BAGIAN NAVIGASI TANGGAL KALENDER ---
    const previousMonth = document.getElementById('previous-month');
    const nextMonth = document.getElementById('next-month');
    const calendarMainTitle = document.getElementById('calendar-main-title');
    // PERBAIKAN: Gunakan selector yang lebih umum untuk header hari
    const dayPanelHeader = document.querySelector('#day-panel .calendar-header-row');
    const monthPanelHeader = document.querySelector('#month-panel .month-header-row');
    const weekPanelHeader = document.querySelector('#week-panel thead tr');

    /**
     * Mengambil data event (SPT) dari server dan merender ulang kalender.
     */
    const fetchEvents = async () => {
        try {
            // PERBAIKAN: Minta semua data SPT tanpa paginasi dengan menambahkan ?limit=0
            const response = await fetch('/api/spt?limit=0');
            if (!response.ok) {
                throw new Error('Gagal memuat data perjalanan dinas.');
            }
            const result = await response.json();
            // PERBAIKAN: Ekstrak array 'data' dari respons API.
            allEvents = result.data || result; // Fallback jika API mengembalikan array langsung
            // PASTIKAN allEvents adalah array
            if (!Array.isArray(allEvents)) {
                throw new Error("Format data event tidak valid. Diharapkan sebuah array.");
            }
            console.log("[Kalender] Data SPT dimuat:", allEvents); // Debugging
            // Setelah data berhasil diambil, render ulang tampilan kalender
            updateCalendarDisplay();
        } catch (error) {
            console.error(error);
            // Opsional: tampilkan pesan error di UI
        }
    };

    /**
     * Merender semua event yang relevan untuk minggu yang sedang ditampilkan pada panel tertentu.
     * @param {Date} startOfWeek - Tanggal hari pertama (Minggu) dari minggu yang ditampilkan.
     * @param {HTMLElement} targetPanel - Panel tujuan untuk merender (dayPanel atau weekPanel).
     * @param {HTMLElement} targetMonthPanel - Panel bulan untuk merender (monthPanel).
     */
    const renderEventsForView = (startOfWeek, targetPanel) => {
        // ==================================================
        // FITUR MODE DAY VIEW & WEEK VIEW
        // ==================================================
        if (!targetPanel || !eventTooltipTemplate) return;

        // Hapus semua tooltip event yang ada sebelumnya
        const panelBody = targetPanel.querySelector('tbody');

        const isMonthView = targetPanel.id === 'month-panel';
        const isWeekView = targetPanel.id === 'week-panel';
        const isDayView = targetPanel.id === 'day-panel'; // Tambahkan flag untuk Day View

        // PERBAIKAN: Gunakan selector yang benar untuk setiap panel.
        // Untuk month-view, header diambil dari monthPanelHeader yang sudah di-cache.
        const dayHeaders = isMonthView
            ? monthPanelHeader.querySelectorAll('.month-header-row th:not(:first-child)')
            : targetPanel.querySelectorAll('.calendar-header-row th:not(:first-child)');

        // PERUBAHAN: Jika dayHeaders kosong (misalnya, saat panel bulan belum dirender), hentikan eksekusi.
        if (!isMonthView && dayHeaders.length === 0) {
            console.warn(`[WARN] Tidak ada header hari yang ditemukan untuk panel #${targetPanel.id}. Melewati render event.`);
            return;
        }

        targetPanel.querySelectorAll('.event-tooltip-instance').forEach(el => el.remove());

        const cellWidth = dayHeaders.length > 0 ? dayHeaders[0].offsetWidth : 128; // Default width
        // Logika untuk menentukan event yang terlihat dalam rentang waktu tampilan 
        // --- PERBAIKAN: Tentukan rentang waktu yang ditampilkan ---
        let viewStartDate, viewEndDate;
        if (isDayView) { // Logika untuk Day View 
            // PERUBAHAN: Rentang tampilan untuk Day View sekarang hanya satu hari.
            viewStartDate = new Date(currentDate);
            viewStartDate.setHours(0, 0, 0, 0);
            viewEndDate = new Date(currentDate);
            viewEndDate.setHours(23, 59, 59, 999);
        } else if (isWeekView) { // Logika untuk Week View (sekarang 7 hari)
            viewEndDate = new Date(startOfWeek);
            viewEndDate.setDate(startOfWeek.getDate() + 6);
            viewStartDate = new Date(startOfWeek);
        } else if (isMonthView) {
            // PERUBAHAN: Rentang tampilan adalah seluruh bulan yang aktif
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            viewStartDate = new Date(year, month, 1);
            viewEndDate = new Date(year, month + 1, 0);
        }

        // --- PERBAIKAN: Filter event yang terlihat ---
        const visibleEvents = allEvents.filter(event => {
            if (!event.tanggal_berangkat || !event.tanggal_kembali) return false;
            const eventStart = new Date(event.tanggal_berangkat.replace(/-/g, '/'));
            const eventEnd = new Date(event.tanggal_kembali.replace(/-/g, '/'));

            // PERBAIKAN: Event terlihat jika ada overlap dengan rentang tampilan
            return eventStart <= viewEndDate && eventEnd >= viewStartDate;
        });

        // DEBUGGING: Tambahkan log untuk memeriksa event yang akan dirender
        console.log(`[DEBUG] Merender ${visibleEvents.length} event untuk panel #${targetPanel.id}`);
        if (visibleEvents.length === 0 && allEvents.length > 0) {
            console.log(`[DEBUG] Rentang tampilan: ${viewStartDate.toLocaleDateString()} - ${viewEndDate.toLocaleDateString()}`);
        }

        // 2. Urutkan event yang terlihat berdasarkan tanggal mulai
        visibleEvents.sort((a, b) => {
            const dateA = new Date(a.tanggal_berangkat.replace(/-/g, '/'));
            const dateB = new Date(b.tanggal_berangkat.replace(/-/g, '/'));
            return dateA - dateB;
        });

        // 3. Render setiap event yang sudah diurutkan
        const renderEvent = (event, index) => {
            if (!event.tanggal_berangkat || !event.tanggal_kembali) {
                console.warn(`[WARN] Event dengan nomor surat "${event.nomor_surat}" dilewati karena data tanggal tidak lengkap.`);
                return;
            }

            const eventStart = new Date(event.tanggal_berangkat.replace(/-/g, '/'));
            const eventEnd = new Date(event.tanggal_kembali.replace(/-/g, '/'));

            // --- PERBAIKAN: Format tanggal yang lebih baik ---
            const startMonth = eventStart.toLocaleString('id-ID', { month: 'short' });
            const endMonth = eventEnd.toLocaleString('id-ID', { month: 'short' });
            const dateRangeText = startMonth === endMonth
                ? `${eventStart.getDate()} - ${eventEnd.getDate()} ${startMonth}`
                : `${eventStart.getDate()} ${startMonth} - ${eventEnd.getDate()} ${endMonth}`;

            // --- PERBAIKAN: Posisi dan ukuran tooltip ---
            const headerHeight = 78;
            const rowSlotHeight = 82; // Diubah dari 72 (2 * 36px) menjadi 82 (2 * 41px)
            const tooltipHeight = 45; // Tinggi tooltip tetap

            if (isMonthView && dayHeaders.length > 0) {
                // --- LOGIKA BARU: Render tooltip untuk month view ---
                const monthTooltip = eventTooltipTemplate.cloneNode(true);
                monthTooltip.removeAttribute('id');
                monthTooltip.classList.add('event-tooltip-instance');
                monthTooltip.classList.remove('hidden');

                const themeClasses = getTooltipTheme(event.mata_anggaran_kode);
                monthTooltip.classList.add(...themeClasses);
                monthTooltip.querySelector('.font-poppins').classList.add(...themeClasses);

                monthTooltip.querySelector('.tooltip-date-range').textContent = dateRangeText;
                monthTooltip.querySelector('.tooltip-spt-no').textContent = event.nomor_surat;

                const truncateText = (text, maxLength = 30) => {
                    if (!text) return '';
                    if (text.length <= maxLength) return text;
                    let truncated = text.substr(0, maxLength);
                    return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
                };
                // KOREKSI: Gunakan maksud_perjalanan untuk judul dan gabungkan nama pegawai untuk atribut title.
                monthTooltip.querySelector('.tooltip-title').textContent = truncateText(event.maksud_perjalanan);
                monthTooltip.classList.add('item');
                monthTooltip.style.top = `${headerHeight + (index * rowSlotHeight) + (rowSlotHeight - tooltipHeight) - 52}px`;
                monthTooltip.style.zIndex = 10;
                const pegawaiNames = Array.isArray(event.pegawai) ? event.pegawai.map(p => p.nama).join(', ') : (event.pegawai?.nama || '');
                monthTooltip.title = pegawaiNames;
                monthTooltip.style.width = `340px`;

                // Hitung posisi dan lebar
                const visibleStart = eventStart < viewStartDate ? viewStartDate : eventStart;
                const visibleEnd = eventEnd > viewEndDate ? viewEndDate : eventEnd;

                const startDayIndex = visibleStart.getDate() - 1; // Indeks berbasis 0
                const durationInDays = Math.ceil((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

                if (dayHeaders[startDayIndex]) {
                    const startHeader = dayHeaders[startDayIndex];
                    const endDayIndex = Math.min(startDayIndex + durationInDays - 1, dayHeaders.length - 1);
                    const endHeader = dayHeaders[endDayIndex];

                    const leftPosition = startHeader.offsetLeft;
                    const tooltipWidth = (endHeader.offsetLeft + endHeader.offsetWidth) - leftPosition;

                    monthTooltip.style.left = `${leftPosition + 5}px`;

                    targetPanel.appendChild(monthTooltip);
                }

            } else if (isDayView) { // Pisahkan logika untuk Day/Week View
                // Logika untuk day/week view
                const newTooltip = eventTooltipTemplate.cloneNode(true);
                newTooltip.removeAttribute('id');
                newTooltip.classList.add('event-tooltip-instance');
                newTooltip.classList.remove('hidden');

                // Terapkan tema warna berdasarkan kode anggaran
                const themeClasses = getTooltipTheme(event.mata_anggaran_kode);
                newTooltip.classList.add(...themeClasses);
                newTooltip.querySelector('.font-poppins').classList.add(...themeClasses);

                newTooltip.querySelector('.tooltip-date-range').textContent = dateRangeText;
                newTooltip.querySelector('.tooltip-spt-no').textContent = event.nomor_surat;

                // Batasi teks maksud perjalanan
                const truncateText = (text, maxLength = 30) => {
                    if (!text) return '';
                    if (text.length <= maxLength) return text;
                    let truncated = text.substr(0, maxLength);
                    return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
                };
                // KOREKSI: Gunakan maksud_perjalanan untuk judul dan gabungkan nama pegawai untuk atribut title.
                newTooltip.querySelector('.tooltip-title').textContent = truncateText(event.maksud_perjalanan);
                newTooltip.style.top = `${headerHeight + (index * rowSlotHeight) + (rowSlotHeight - tooltipHeight) + 4}px`;
                newTooltip.style.width = `340px`;
                newTooltip.style.zIndex = 10;
                const pegawaiNames = Array.isArray(event.pegawai) ? event.pegawai.map(p => p.nama).join(', ') : (event.pegawai?.nama || '');
                newTooltip.title = pegawaiNames;

                let startColumnIndex = -1;

                if (isDayView) {
                    // PERUBAHAN: Untuk Day View, semua event ditampilkan di kolom yang sama (indeks 0).
                    startColumnIndex = 0;
                } else if (isWeekView) { // Logika untuk Week View (tampilan 7 hari)
                    const visibleStartDate = eventStart < startOfWeek ? startOfWeek : eventStart;
                    startColumnIndex = visibleStartDate.getDay();
                }

                // PERUBAHAN: Logika penempatan tooltip disederhanakan untuk Day View.
                if (isDayView && dayHeaders[0]) {
                    newTooltip.style.left = `${dayHeaders[0].offsetLeft + 5}px`;
                    targetPanel.appendChild(newTooltip);
                }
            } else if (isWeekView) {
                const weekTooltip = eventTooltipTemplate.cloneNode(true);
                weekTooltip.removeAttribute('id');
                weekTooltip.classList.add('event-tooltip-instance');
                weekTooltip.classList.remove('hidden');
                // Terapkan tema warna berdasarkan kode anggaran
                const themeClasses = getTooltipTheme(event.mata_anggaran_kode);
                weekTooltip.classList.add(...themeClasses);
                weekTooltip.querySelector('.font-poppins').classList.add(...themeClasses);
                weekTooltip.querySelector('.tooltip-date-range').textContent = dateRangeText;
                weekTooltip.querySelector('.tooltip-spt-no').textContent = event.nomor_surat;
                // Batasi teks maksud perjalanan
                const truncateText = (text, maxLength = 30) => {
                    if (!text) return '';
                    if (text.length <= maxLength) return text;
                    let truncated = text.substr(0, maxLength);
                    return truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + '...';
                };
                // PERBAIKAN: Gabungkan array nama pegawai dengan spasi, lalu potong jika perlu.
                // KOREKSI: Gunakan maksud_perjalanan untuk judul dan gabungkan nama pegawai untuk atribut title.
                weekTooltip.querySelector('.tooltip-title').textContent = truncateText(event.maksud_perjalanan);
                weekTooltip.style.top = `${headerHeight + (index * rowSlotHeight) + (rowSlotHeight - tooltipHeight) - 15}px`;
                weekTooltip.style.left = `${headerHeight + (index * rowSlotHeight) + (rowSlotHeight - tooltipHeight) + 15}px`;
                weekTooltip.style.width = `340px`;
                weekTooltip.style.zIndex = 10;
                // PERBAIKAN: Tampilkan nama lengkap di atribut title.
                const pegawaiNames = Array.isArray(event.pegawai) ? event.pegawai.map(p => p.nama).join(', ') : (event.pegawai?.nama || '');
                weekTooltip.title = pegawaiNames;


                // PERBAIKAN: Tambahkan logika untuk menentukan posisi horizontal tooltip
                let startColumnIndex = -1;
                const visibleStartDate = eventStart < startOfWeek ? startOfWeek : eventStart;
                startColumnIndex = visibleStartDate.getDay();

                const weekDayHeaders = weekPanelHeader.querySelectorAll('th:not(:first-child)');

                if (startColumnIndex >= 0 && startColumnIndex < weekDayHeaders.length && weekDayHeaders[startColumnIndex]) {
                    const headerElement = weekDayHeaders[startColumnIndex];
                    // PERUBAHAN: Atur posisi tooltip agar sejajar dengan tepi kiri kolom.
                    weekTooltip.style.left = `${headerElement.offsetLeft + 3}px`;
                    targetPanel.appendChild(weekTooltip);
                } else {
                    // Fallback jika indeks di luar jangkauan
                    console.warn(`Indeks kolom (${startColumnIndex}) di luar jangkauan untuk event: ${event.nomor_surat}`);
                }
            };
        };

        // PERBAIKAN: Logika pembuatan baris dipisahkan dari render event
        // dan hanya dijalankan untuk mode Day dan Week.
        if (isDayView || isWeekView) {
            panelBody.innerHTML = ''; // Kosongkan body tabel
            const eventRowCount = Math.max(visibleEvents.length, 4);

            for (let i = 0; i < eventRowCount; i++) {
                const row1 = panelBody.insertRow();
                const row2 = panelBody.insertRow();
                row1.className = 'h-[41px]';
                row2.className = 'h-[41px]';

                const cellNo = row1.insertCell();
                cellNo.rowSpan = 2;
                cellNo.className = 'time-agenda pr-2 pl-2 font-semibold border border-solid dark:border-gray-700 items-center justify-center text-center text-nowrap dark:text-gray-400 align-middle';
                cellNo.textContent = i + 1;

                const cols = 7; // Selalu 7 kolom untuk Day dan Week view
                for (let j = 0; j < cols; j++) {
                    // PERBAIKAN: Hitung tanggal kolom berdasarkan awal minggu (startOfWeek)
                    const columnDate = new Date(startOfWeek);
                    columnDate.setDate(startOfWeek.getDate() + j);
                    let cellClasses = 'time-agenda-row-top font-inter border dark:border-gray-700';

                    // PERBAIKAN: Tambahkan kelas highlight jika kolom ini adalah tanggal yang aktif, KECUALI di mode Day View
                    if (!isDayView && columnDate.toDateString() === currentDate.toDateString()) {
                        cellClasses += ' bg-[#E9EAFE] dark:bg-slate-700 opacity-50'; // style highlight untuk tanggal aktif
                    }
                    row1.insertCell().className = cellClasses;
                    row2.insertCell().className = cellClasses;
                };
            }
            // Setelah baris dibuat, render event di atasnya
            visibleEvents.forEach((event, index) => {
                renderEvent(event, index);
            });
        } else if (isMonthView) { // Logika untuk Month View
            const monthPanelBody = panelBody; // Alias untuk kejelasan
            monthPanelBody.innerHTML = ''; // Kosongkan body tabel
            const eventRowCount = Math.max(visibleEvents.length, 4);
            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

            for (let i = 0; i < eventRowCount; i++) {    //Membuat row-td pada tbody
                const row1 = monthPanelBody.insertRow();
                const row2 = monthPanelBody.insertRow();
                row1.className = 'h-[41px]';
                row2.className = 'h-[41px]';

                const cellNo = row1.insertCell();
                cellNo.rowSpan = 2;
                cellNo.className = 'month-agenda pr-2 pl-2 font-semibold border border-solid dark:border-gray-700 items-center justify-center text-center text-nowrap dark:text-gray-400 align-middle';
                cellNo.textContent = i + 1;

                for (let j = 1; j <= daysInMonth; j++) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), j);
                    let cellClasses = 'month-agenda-row-top font-inter border dark:border-gray-700';

                    // PERBAIKAN: Tambahkan kelas highlight jika kolom ini adalah tanggal yang aktif
                    if (date.toDateString() === currentDate.toDateString()) {
                        cellClasses += ' bg-[#E9EAFE] dark:bg-slate-700 opacity-50'; // style highlight untuk tanggal aktif
                    };

                    row1.insertCell().className = cellClasses;
                    row2.insertCell().className = cellClasses;
                };
            };

            // Render event di atas baris yang baru dibuat
            visibleEvents.forEach((event, index) => {
                renderEvent(event, index);
            });
        }
    };

    /**
     * Merender kalender mini di samping.
     * @param {Date} dateForMonth - Tanggal acuan untuk bulan dan tahun yang akan dirender.
     */
    const renderSideCalendar = (dateForMonth) => {
        if (!sideCalendarTitle || !sideCalendarDaysContainer) return;

        sideCalendarDaysContainer.innerHTML = '';
        const year = dateForMonth.getFullYear();
        const month = dateForMonth.getMonth();

        sideCalendarTitle.textContent = dateForMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
        const lastDateOfPrevMonth = new Date(year, month, 0).getDate();

        // Menampilkan sisa hari dari bulan sebelumnya sebelum sampai tanggal 1 bulan ini/berikutnya untuk ditampilkan pada grid kalender samping
        // Perulangan mundur dari hari pertama bulan ini atau dari hari yang sedang ditampilkan (firstDayOfMonth) ke 0 dan seterusnya.  
        for (let i = firstDayOfMonth; i > 0; i--) {
            const day = lastDateOfPrevMonth - i + 1;
            sideCalendarDaysContainer.innerHTML += `<div class="text-white/40">${day}</div>`;
        }

        // Perulangan dimulai dari hari pertama/tanggal 1 (i = 1) dari bulan ini (perulangan maju) sampai hari terakhir bulan ini (0) (lastDateOfMonth) untuk ditampilkan pada grid kalender samping 
        for (let i = 1; i <= lastDateOfMonth; i++) {
            const dayDate = new Date(year, month, i); // Logika tanggal lengkap untuk navigasi dan pengecekan event  
            const isToday = dayDate.toDateString() === new Date().toDateString(); // Logika pengecekan hari ini/hari yang sedang berjalan ( highlight hari ini )
            const isSelected = dayDate.toDateString() === currentDate.toDateString(); // Logika pengecekan hari yang dipilih ( highlight hari yang dipilih )

            let dayClasses = 'cursor-pointer hover:bg-white/20 rounded-full transition-colors duration-200'; // Kelas dasar untuk setiap hari
            if (isSelected) {
                dayClasses += ' bg-yellow-400 text-black font-bold'; // Kelas tambahan untuk hari yang dipilih
            } else if (isToday) {
                dayClasses += ' bg-white/30'; // Kelas tambahan untuk hari ini
            }

            // --- PERBAIKAN: Cek apakah ada acara pada hari ini ---
            const hasEvent = allEvents.some(event => {
                if (!event.tanggal_berangkat || !event.tanggal_kembali) return false;
                const start = new Date(event.tanggal_berangkat.replace(/-/g, '/'));
                const end = new Date(event.tanggal_kembali.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return dayDate >= start && dayDate <= end;
            });

            const eventDotHtml = hasEvent ? '<div class="event-dot"></div>' : '';

            sideCalendarDaysContainer.innerHTML += `
                <div class="${dayClasses}" data-date="${dayDate.toISOString()}">
                    <div class="day-wrapper">
                        <span>${i}</span>
                        ${eventDotHtml}
                    </div>
                </div>
            `;
        }

        // Tambahkan event listener ke setiap tanggal yang valid
        sideCalendarDaysContainer.querySelectorAll('[data-date]').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                currentDate = new Date(dayEl.dataset.date);
                updateCalendarDisplay();
            });
        });
    };

    /**
     * Memperbarui panel informasi di kalender samping (acara untuk tanggal terpilih).
     * @param {Date} selectedDate - Tanggal yang dipilih.
     */
    const updateSidePanelInfo = (selectedDate) => {
        if (!sideSelectedDayText || !sideSelectedDate || !sideEventsList) return;

        sideSelectedDayText.textContent = selectedDate.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
        sideSelectedDate.textContent = selectedDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        const eventsOnDate = allEvents.filter(event => {
            if (!event.tanggal_berangkat || !event.tanggal_kembali) return false;
            const start = new Date(event.tanggal_berangkat.replace(/-/g, '/'));
            start.setHours(0, 0, 0, 0);
            const end = new Date(event.tanggal_kembali.replace(/-/g, '/'));
            end.setHours(23, 59, 59, 999);
            return selectedDate >= start && selectedDate <= end;
        });

        sideEventsList.innerHTML = '';
        if (eventsOnDate.length === 0) {
            sideEventsList.innerHTML = '<p class="text-white/50 text-left">Tidak ada acara untuk tanggal ini.</p>';
        } else {
            eventsOnDate.forEach(event => {
                const eventHtml = `
                    <div class="event-item p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
                        <p class="font-semibold text-sm text-white">${event.maksud_perjalanan}</p>
                        <p class="text-xs text-white/70">${event.nomor_surat}</p>
                    </div>
                `;
                sideEventsList.innerHTML += eventHtml;
            });
        };
    };

    /**
     * Mengubah bulan pada kalender (baik utama maupun samping).
     * @param {number} monthOffset - Jumlah bulan untuk digeser (-1 untuk sebelumnya, 1 untuk berikutnya).
     */
    const changeMonth = (monthOffset) => {
        // Logika ini sekarang berlaku umum untuk semua view.
        // Navigasi per hari/minggu ditangani oleh fungsi changeDay/changeWeek secara terpisah.
        const currentMonth = currentDate.getMonth();

        // Set tanggal ke 1 untuk menghindari bug lompat bulan saat navigasi
        // (misalnya, dari 31 Maret mundur sebulan akan menjadi 3 Maret, bukan Februari).
        currentDate.setDate(1);
        currentDate.setMonth(currentMonth + monthOffset);

        updateCalendarDisplay(); // Perbarui tampilan setelah mengubah tanggal
    };

    /**
     * Mengubah minggu pada kalender (navigasi per minggu).
     * @param {number} weekOffset - Jumlah minggu untuk digeser (-1 untuk sebelumnya, 1 untuk berikutnya).
     */
    const changeWeek = (weekOffset) => {
        // Navigasi di Week View (tampilan 7 hari) menggeser 7 hari
        const daysToShift = weekOffset * 7; // Menggeser 7 hari (1 minggu)
        currentDate.setDate(currentDate.getDate() + daysToShift);
        updateCalendarDisplay();
    };

    /**
     * Mengubah hari pada kalender (navigasi per hari).
     * @param {number} dayOffset - Jumlah hari untuk digeser (-1 untuk kemarin, 1 untuk besok).
    */
    const changeDay = (dayOffset) => {
        // ==================================================
        // FITUR MODE DAY VIEW
        // ==================================================
        currentDate.setDate(currentDate.getDate() + dayOffset); // Navigasi di Day View menggeser per hari
        updateCalendarDisplay();
    };


    /**
     * ==================================================
     * FITUR MODE WEEK VIEW
     * ==================================================
     * Fungsi generik untuk update header kalender (Day dan Week view)
     * PERUBAHAN: Fungsi ini sekarang untuk Week View (tampilan 7 hari)
     */
    const updateWeekViewHeader = async (headerRow) => {
        if (!headerRow) return Promise.resolve();

        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const days = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];
        const dayHeaders = headerRow.querySelectorAll('th:not(:first-child)');

        const updatePromises = Array.from(dayHeaders).map((th, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dayNumber = dayDate.getDate();

            // Reset kelas highlight dan pastikan kelas dasar tetap ada
            th.className = 'py-3 leading-8  pl-3 w-32 border dark:border-gray-700 text-[#969696] dark:text-gray-400 text-left font-semibold font-sans';

            const span = th.querySelector('span');
            if (span) {
                // Reset gaya span
                span.classList.remove('text-white', 'bg-purpleCustom', 'p-2', 'font-medium', 'rounded-full');
                span.classList.add('text-mainNavy', 'dark:text-gray-300', 'text-[18px]', 'font-medium', 'font-inter');
            }

            // Tandai hari yang dipilih
            if (dayDate.toDateString() === currentDate.toDateString()) {
                th.classList.add('bg-[#E9EAFE]', 'dark:bg-slate-700');
                const selectedSpan = th.querySelector('span');
                if (span) {
                    // Terapkan gaya highlight pada span
                    span.classList.add('text-white', 'bg-purpleCustom', 'text-[18px]', 'p-2', 'font-medium', 'font-inter', 'rounded-full');
                    span.classList.remove('text-mainNavy', 'dark:text-gray-300', 'font-medium');
                }
            }

            th.innerHTML = `${days[index]} <br><span class="p-1 ${span ? span.className : ''}">${String(dayNumber).padStart(2, '0')}</span>`;
            return Promise.resolve();
        });

        await Promise.all(updatePromises);
    };

    /**
     * Update header untuk month view
     */
    const updateMonthViewHeader = () => {
        // ==================================================
        // FITUR MODE MONTH VIEW
        // ==================================================
        if (!monthPanelHeader) return;

        monthPanelHeader.innerHTML = ''; // Kosongkan header

        // Tambahkan kolom 'NO'
        const thNo = document.createElement('th');
        thNo.className = 'py-1 w-[13px] border dark:border-gray-700 font-sans text-sm text-[#969696] dark:text-gray-400 font-semibold text-center';
        thNo.textContent = 'NO';
        monthPanelHeader.appendChild(thNo);

        // const tbodyTd = document.getElementById('month-agenda-rows');

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dayNames = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayName = dayNames[date.getDay()];

            const th = document.createElement('th');
            let thClasses = 'p-1 w-8 border dark:border-gray-700 text-[#969696] dark:text-gray-400 font-semibold text-center font-sans';
            let dayNumberSpanClasses = 'text-mainNavy dark:text-gray-300 font-medium font-inter';
            let dayNameSpanClasses = 'text-xs font-normal';


            // Check if this day is the currently selected day
            if (date.toDateString() === currentDate.toDateString()) {
                thClasses += ' bg-[#E9EAFE] dark:bg-slate-700'; // Apply active background to the th
                dayNumberSpanClasses = 'text-white font-medium font-inter p-1 bg-purpleCustom rounded-full'; // Apply active text style to the day number
            };

            th.className = thClasses;
            th.innerHTML = `<span class="${dayNumberSpanClasses}">${String(i).padStart(2, '0')}</span><br><span class="${dayNameSpanClasses}">${dayName}</span>`;
            monthPanelHeader.appendChild(th);
        };
    };

    /**
     * Update header untuk day view dengan navigasi per hari 
     */
    const updateDayViewHeader = () => {
        // ==================================================
        // FITUR MODE DAY VIEW (PERUBAHAN)
        // ==================================================
        if (!dayPanelHeader) return;

        // Kosongkan header yang ada
        dayPanelHeader.innerHTML = '';

        // Buat elemen-elemen baru sesuai permintaan
        const thNo = document.createElement('th');
        thNo.scope = 'col';
        thNo.className = 'py-3 pl-3 pr-3 w-14 border dark:border-gray-700 text-[#969696] dark:text-gray-400 text-center font-semibold font-sans';
        thNo.textContent = 'NO';

        const thNav = document.createElement('th');
        thNav.scope = 'col';
        thNav.colSpan = 7; // Gabungkan 7 kolom
        thNav.className = 'py-3 px-4 w-[56rem] border dark:border-gray-700 text-mainNavy dark:text-gray-300 text-center font-semibold font-sans text-lg';

        // PERUBAHAN: Pisahkan bagian tanggal untuk styling
        const dayName = currentDate.toLocaleDateString('id-ID', { weekday: 'long' });
        const dayNumber = currentDate.getDate();

        // Isi konten navigasi untuk mode day 
        thNav.innerHTML = `
            <div class="text-left items-center pb-4 bg-white dark:bg-slate-800 border border-[#e8e8e8] dark:border-gray-700 flex justify-start space-x-6 px-4">
                <div class="items-center space-x-2">
                    <span class=" py-3 leading-10 pl-3 pt-0 text-[#969696] dark:text-gray-400 font-semibold font-sans">
                        ${dayName} 
                    </span><br>
                    <span class=" text-white font-medium text-[18px] font-inter p-2 bg-purpleCustom rounded-full">
                        ${String(dayNumber).padStart(2, '0')}
                    </span>
                </div>
            </div>
        `;

        // Tambahkan elemen ke baris header
        dayPanelHeader.appendChild(thNo);
        dayPanelHeader.appendChild(thNav);

        // Tambahkan event listener ke tombol navigasi yang baru dibuat
        // document.getElementById('day-view-prev').addEventListener('click', () => changeDay(-1));
        // document.getElementById('day-view-next').addEventListener('click', () => changeDay(1));
    };

    /**
     * Memperbarui semua elemen UI yang bergantung pada tanggal.
     */
    const updateCalendarDisplay = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');

        // 1. Update judul utama berdasarkan tab yang aktif
        if (calendarMainTitle) {
            if (activeTab === monthView) {
                // Untuk mode bulan, tampilkan nama bulan dan tahun
                calendarMainTitle.textContent = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            } else {
                calendarMainTitle.textContent = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            }
        }

        // 2. Update header dan render event untuk panel yang aktif
        (async () => {
            if (dayPanel && !dayPanel.classList.contains('hidden')) {
                updateDayViewHeader();
                renderEventsForView(currentDate, dayPanel); // Gunakan currentDate sebagai acuan
            } else if (weekPanel && !weekPanel.classList.contains('hidden')) {
                await updateWeekViewHeader(weekPanelHeader);
                renderEventsForView(startOfWeek, weekPanel); // startOfWeek sudah benar untuk 7-day view
            } else if (monthPanel && !monthPanel.classList.contains('hidden')) {
                // PERBAIKAN: Update header month view
                updateMonthViewHeader();
                // Render events untuk bulan saat ini
                renderEventsForView(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), monthPanel);
            }
        })();

        // 3. Render ulang kalender mini di samping (tetap gunakan currentDate)
        renderSideCalendar(currentDate);

        // 4. Perbarui daftar acara di kalender samping
        updateSidePanelInfo(currentDate);
    };

    // Event listeners untuk tombol navigasi
    previousMonth.addEventListener('click', () => {
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
        if (activeTab === dayView) { // Khusus untuk Navigasi di Day View adalah per bulan karena pada sub header sudah terdapat tombol navigasi per hari
            changeMonth(-1);
        } else if (activeTab === monthView) { // Navigasi di Month View adalah per bulan
            changeMonth(-1);
        } else {
            changeMonth(-1); // Fallback
        };
    });

    nextMonth.addEventListener('click', () => {
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
        if (activeTab === dayView) { // Khusus untuk Navigasi di Day View adalah per bulan karena pada sub header sudah terdapat tombol navigasi per hari
            changeMonth(1);
        } else if (activeTab === monthView) { // Navigasi di Month View adalah per bulan
            changeMonth(1);
        } else {
            changeMonth(1); // Fallback
        };
    });

    // Event listeners untuk navigasi kalender samping
    sideCalendarPrevBtn.addEventListener('click', () => changeMonth(-1));
    sideCalendarNextBtn.addEventListener('click', () => changeMonth(1));
    document.getElementById('prev-day').addEventListener('click', () => changeDay(-1)); // Navigasi per hari di Day View sub header dari header navigasi utama
    document.getElementById('next-day').addEventListener('click', () => changeDay(1)); // Navigasi per hari di Day View sub header dari header navigasi utama

    setupTabs();
    fetchEvents(); // Panggil untuk mengambil data SPT saat pertama kali load
    // updateCalendarDisplay() akan dipanggil di dalam fetchEvents setelah data siap
})();