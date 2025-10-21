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
    };

    const setupTabs = () => {
        if (!dayView || !weekView || !monthView) return;

        // Tambahkan event listener yang memanggil switchTab dengan tab dan panel yang sesuai
        dayView.addEventListener('click', () => switchTab(dayView, dayPanel));
        weekView.addEventListener('click', () => switchTab(weekView, weekPanel));
        monthView.addEventListener('click', () => switchTab(monthView, monthPanel));

        // Atur tab default saat halaman dimuat
        switchTab(dayView, dayPanel);
    };

    // --- BAGIAN NAVIGASI TANGGAL KALENDER ---
    const previousMonth = document.getElementById('previous-month');
    const nextMonth = document.getElementById('next-month');
    const calendarMainTitle = document.getElementById('calendar-main-title');
    const dayPanelHeader = document.querySelector('#day-panel thead tr');

    /**
     * Mengambil data event (SPT) dari server.
     */
    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/spt');
            if (!response.ok) {
                throw new Error('Gagal memuat data perjalanan dinas.');
            }
            allEvents = await response.json();
            // Setelah data berhasil diambil, render ulang tampilan kalender
            updateCalendarDisplay();
        } catch (error) {
            console.error(error);
            // Opsional: tampilkan pesan error di UI
        }
    };

    /**
     * Merender semua event yang relevan untuk minggu yang sedang ditampilkan.
     * @param {Date} startOfWeek - Tanggal hari pertama (Minggu) dari minggu yang ditampilkan.
     */
    const renderEvents = (startOfWeek, dayPanelBody) => {
        if (!dayPanel || !eventTooltipTemplate) return;

        // Hapus semua tooltip event dan baris nomor yang ada sebelumnya
        dayPanel.querySelectorAll('.event-tooltip-instance').forEach(el => el.remove());

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const dayHeaders = dayPanelHeader.querySelectorAll('th:not(:first-child)');
        const cellWidth = dayHeaders.length > 0 ? dayHeaders[0].offsetWidth : 128; // Default width


        // --- PERBAIKAN: Filter dan Urutkan Event ---
        // 1. Filter event yang hanya terlihat di minggu ini
        const visibleEvents = allEvents.filter(event => {
            if (!event.tanggal_berangkat || !event.tanggal_kembali) return false;
            const eventStart = new Date(event.tanggal_berangkat.replace(/-/g, '/'));
            const eventEnd = new Date(event.tanggal_kembali.replace(/-/g, '/'));
            return eventStart <= endOfWeek && eventEnd >= startOfWeek;
        });

        // 2. Urutkan event yang terlihat berdasarkan tanggal mulai
        visibleEvents.sort((a, b) => {
            const dateA = new Date(a.tanggal_berangkat.replace(/-/g, '/'));
            const dateB = new Date(b.tanggal_berangkat.replace(/-/g, '/'));
            return dateA - dateB;
        });

        // 3. Render setiap event yang sudah diurutkan
        visibleEvents.forEach((event, index) => {
            // --- PERBAIKAN: Guard clause untuk data tidak lengkap ---
            // Jika tanggal berangkat atau kembali tidak ada, lewati event ini.
            if (!event.tanggal_berangkat || !event.tanggal_kembali) {
                console.warn(`[WARN] Event dengan nomor surat "${event.nomor_surat}" dilewati karena data tanggal tidak lengkap.`);
                return; // Lanjut ke event berikutnya
            }
            const eventStart = new Date(event.tanggal_berangkat.replace(/-/g, '/'));
            const eventEnd = new Date(event.tanggal_kembali.replace(/-/g, '/'));

            // Cek apakah event bersinggungan dengan minggu yang ditampilkan
            if (eventStart <= endOfWeek && eventEnd >= startOfWeek) {
                const newTooltip = eventTooltipTemplate.cloneNode(true);
                newTooltip.removeAttribute('id');
                newTooltip.classList.add('event-tooltip-instance');
                newTooltip.classList.remove('hidden');

                // --- PERBAIKAN: Format tanggal yang lebih baik ---
                const startMonth = eventStart.toLocaleString('id-ID', { month: 'short' });
                const endMonth = eventEnd.toLocaleString('id-ID', { month: 'short' });
                const dateRangeText = startMonth === endMonth
                    ? `${eventStart.getDate()} - ${eventEnd.getDate()} ${startMonth}`
                    : `${eventStart.getDate()} ${startMonth} - ${eventEnd.getDate()} ${endMonth}`;
                newTooltip.querySelector('.tooltip-date-range').textContent = dateRangeText;
                newTooltip.querySelector('.tooltip-spt-no').textContent = event.nomor_surat;
                newTooltip.querySelector('.tooltip-title').textContent = event.maksud_perjalanan;

                // --- PERBAIKAN TOTAL: Logika Posisi dan Durasi ---

                // 1. Tentukan hari mulai event yang *terlihat* di minggu ini.
                // Jika event dimulai sebelum minggu ini, maka hari mulainya adalah Minggu (indeks 0).
                const visibleStartDate = eventStart < startOfWeek ? startOfWeek : eventStart;

                // 2. Tentukan hari selesai event yang *terlihat* di minggu ini.
                // Jika event selesai setelah minggu ini, maka hari selesainya adalah Sabtu (indeks 6).
                const visibleEndDate = eventEnd > endOfWeek ? endOfWeek : eventEnd;

                // 3. Hitung indeks kolom hari untuk memulai tooltip.
                // `getDay()` mengembalikan 0 untuk Minggu, 1 untuk Senin, dst., yang sudah cocok dengan urutan kolom kita.
                const startDayIndex = visibleStartDate.getDay();

                // 4. Hitung durasi (jumlah hari) event yang terlihat di minggu ini.
                // Kita tambahkan 1 karena perhitungannya inklusif.
                const durationInMs = visibleEndDate.getTime() - visibleStartDate.getTime();
                const durationInDays = Math.round(durationInMs / (1000 * 60 * 60 * 24)) + 1;

                // Pastikan durasi minimal 1 hari
                const duration = Math.max(1, durationInDays);

                // --- PERBAIKAN UI: Atur lebar tetap dan posisi vertikal yang rapi ---
                const headerHeight = 78; // Perkiraan tinggi header kalender dalam pixel
                const rowSlotHeight = 72; // Total tinggi untuk 2 baris (2 * 36px)
                const tooltipHeight = 45; // Perkiraan tinggi tooltip

                // Atur posisi dan lebar tooltip
                newTooltip.style.top = `${headerHeight + (index * rowSlotHeight) + (rowSlotHeight - tooltipHeight) / 2}px`;

                // Pastikan startDayIndex valid sebelum mengakses offsetLeft
                if (dayHeaders[startDayIndex]) {
                    newTooltip.style.left = `${dayHeaders[startDayIndex].offsetLeft - 13}px`;
                    newTooltip.style.width = `340px`; // Atur lebar tooltip menjadi 340px
                    newTooltip.style.zIndex = 10;
                    newTooltip.title = event.maksud_perjalanan;


                    // Tambahkan tooltip ke panel hari
                    dayPanel.appendChild(newTooltip);
                } else {
                    console.error(`[ERROR] Indeks hari (${startDayIndex}) tidak valid untuk event: ${event.maksud_perjalanan}`);
                }

            }

            // Custom Tema Tooltip


        });

        // --- PERBAIKAN: Buat baris nomor urut secara dinamis ---
        dayPanelBody.innerHTML = ''; // Kosongkan body tabel
        const eventRowCount = visibleEvents.length > 0 ? visibleEvents.length : 4; // Tampilkan minimal 4 baris kosong
        for (let i = 0; i < eventRowCount; i++) {
            // Buat dua baris untuk setiap nomor urut
            const row1 = dayPanelBody.insertRow();
            const row2 = dayPanelBody.insertRow();
            row1.className = 'h-[36px]'; // Setengah dari tinggi tooltip
            row2.className = 'h-[36px]'; // Setengah dari tinggi tooltip

            // Tambahkan sel nomor dengan rowspan="2" ke baris pertama
            const cellNo = row1.insertCell();
            cellNo.rowSpan = 2;
            cellNo.className = 'time-agenda pr-2 pl-2 font-semibold border border-solid dark:border-gray-700 items-center justify-center text-center text-nowrap dark:text-gray-400';
            cellNo.textContent = i + 1; // Nomor urut 1, 2, 3, ...

            // Tambahkan 7 sel kosong ke setiap baris
            for (let j = 0; j < 7; j++) row1.insertCell().className = 'note-agenda-row-top font-inter border dark:border-gray-700';
            for (let j = 0; j < 7; j++) row2.insertCell().className = 'note-agenda-row-top font-inter border dark:border-gray-700';
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

        // Hari dari bulan sebelumnya
        for (let i = firstDayOfMonth; i > 0; i--) {
            const day = lastDateOfPrevMonth - i + 1;
            sideCalendarDaysContainer.innerHTML += `<div class="text-white/40">${day}</div>`;
        }

        // Hari dari bulan ini
        for (let i = 1; i <= lastDateOfMonth; i++) {
            const dayDate = new Date(year, month, i);
            const isToday = dayDate.toDateString() === new Date().toDateString();
            const isSelected = dayDate.toDateString() === currentDate.toDateString();

            let dayClasses = 'cursor-pointer hover:bg-white/20 rounded-full transition-colors duration-200';
            if (isSelected) {
                dayClasses += ' bg-yellow-400 text-black font-bold';
            } else if (isToday) {
                dayClasses += ' bg-white/30';
            }

            sideCalendarDaysContainer.innerHTML += `<div class="${dayClasses}" data-date="${dayDate.toISOString()}">${i}</div>`;
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
        }
    };

    /**
     * Mengubah bulan pada kalender (baik utama maupun samping).
     * @param {number} monthOffset - Jumlah bulan untuk digeser (-1 untuk sebelumnya, 1 untuk berikutnya).
     */
    const changeMonth = (monthOffset) => {
        // Untuk navigasi bulan, kita ubah bulan dari tanggal 1 agar tidak melompat aneh
        const currentMonth = currentDate.getMonth();
        currentDate.setMonth(currentMonth + monthOffset, 1);
        updateCalendarDisplay();
    };

    /**
     * Mengubah hari pada kalender (navigasi per hari).
     * @param {number} dayOffset - Jumlah hari untuk digeser (-1 untuk kemarin, 1 untuk besok).
     */
    const changeDay = (dayOffset) => {
        currentDate.setDate(currentDate.getDate() + dayOffset);
        updateCalendarDisplay();
    };

    /**
     * Memperbarui semua elemen UI yang bergantung pada tanggal.
     */
    const updateCalendarDisplay = () => {
        // 1. Update judul utama (Contoh: "January, 2025")
        if (calendarMainTitle) {
            calendarMainTitle.textContent = currentDate.toLocaleDateString('id-ID', {
                month: 'long',
                year: 'numeric'
            });
        }

        // 2. Update header untuk Kalender Utama (Day View)
        if (dayPanelHeader) {
            const startOfWeek = new Date(currentDate);
            // Set ke hari Minggu dari minggu saat ini
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

            const dayPanelBody = dayPanel.querySelector('tbody');
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];
            const dayHeaders = dayPanelHeader.querySelectorAll('th:not(:first-child)'); // Lewati kolom "NO"

            dayHeaders.forEach((th, index) => {
                const dayDate = new Date(startOfWeek);
                dayDate.setDate(startOfWeek.getDate() + index);

                const dayAbbr = days[index];
                const dayNumber = dayDate.getDate();

                // Reset kelas
                th.classList.remove('bg-[#E9EAFE]', 'bg-opacity-50', 'dark:bg-slate-700');
                const span = th.querySelector('span');
                if (span) {
                    span.classList.remove('text-white', 'bg-purpleCustom', 'rounded-full', 'p-1');
                    span.classList.add('text-mainNavy', 'dark:text-gray-300');
                }

                // Tandai hari ini
                if (dayDate.toDateString() === currentDate.toDateString()) {
                    th.classList.add('bg-[#E9EAFE]', 'bg-opacity-50', 'dark:bg-slate-700');
                    if (span) {
                        span.classList.add('text-white', 'bg-purpleCustom', 'rounded-full', 'p-1');
                        span.classList.remove('text-mainNavy', 'dark:text-gray-300');
                    }
                }

                th.innerHTML = `${dayAbbr} <br><span class="${span.className}">${String(dayNumber).padStart(2, '0')}</span>`;
            });

            // 3. Render event setelah header diperbarui
            renderEvents(startOfWeek, dayPanelBody);
        }

        // 4. Render ulang kalender mini di samping
        renderSideCalendar(currentDate);

        // 5. Perbarui daftar acara di kalender samping
        updateSidePanelInfo(currentDate);
    };

    // Event listeners untuk tombol navigasi
    previousMonth.addEventListener('click', () => {
        changeDay(-1);
    });

    nextMonth.addEventListener('click', () => {
        changeDay(1);
    });

    // Event listeners untuk navigasi kalender samping
    sideCalendarPrevBtn.addEventListener('click', () => changeMonth(-1));
    sideCalendarNextBtn.addEventListener('click', () => changeMonth(1));

    setupTabs();
    fetchEvents(); // Panggil untuk mengambil data SPT saat pertama kali load
    // updateCalendarDisplay() akan dipanggil di dalam fetchEvents setelah data siap
})();