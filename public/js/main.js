// Pastikan objek App sudah ada, atau buat jika belum ada.
window.App = window.App || {};

/**
 * Memuat komponen layout utama (header & sidebar) dan menginisialisasi fungsionalitasnya.
 * @returns {Promise<void>} Promise yang resolve ketika komponen telah dimuat.
 */
window.App.loadLayout = async () => {
    const headerContainer = document.getElementById('header-container');
    const sidebarContainer = document.getElementById('sidebar');

    if (!headerContainer || !sidebarContainer) {
        console.error("Error Kritis: Elemen #header-container atau #sidebar tidak ditemukan di HTML utama.");
        return;
    }

    try {
        const [headerRes, sidebarRes] = await Promise.all([
            fetch('/components/header.html'),
            fetch('/components/sidebar.html')
        ]);

        if (!headerRes.ok || !sidebarRes.ok) {
            throw new Error(`Gagal memuat komponen: Header status ${headerRes.status}, Sidebar status ${sidebarRes.status}`);
        }

        headerContainer.innerHTML = await headerRes.text();
        sidebarContainer.innerHTML = await sidebarRes.text();

        // Kembalikan promise yang resolve ketika elemen sudah benar-benar ada di DOM
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 100);
        });

    } catch (error) {
        console.error('Gagal memuat komponen layout:', error);
        sidebarContainer.innerHTML = `<p class="p-4 text-red-500">Gagal memuat navigasi.</p>`;
        headerContainer.innerHTML = `<p class="p-4 text-red-500">Gagal memuat header.</p>`;
    }
};

/**
 * Fungsi untuk menunggu hingga elemen tersedia di DOM
 */
window.App.waitForElement = (selector, timeout = 3000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            if (Date.now() - startTime > timeout) {
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                return;
            }

            setTimeout(checkElement, 100);
        };

        checkElement();
    });
};

/**
 * Menginisialisasi fungsionalitas sidebar yang responsif dan dapat di-toggle.
 */
window.App.initializeSidebar = async () => {
    try {
        // Tunggu hingga semua elemen tersedia
        const [sidebar, openButton, closeButton, backdrop, mainContentWrapper] = await Promise.all([
            window.App.waitForElement('#sidebar'),
            window.App.waitForElement('#header-menu-button'),
            window.App.waitForElement('#sidebar-close-button'),
            window.App.waitForElement('#sidebar-backdrop'),
            window.App.waitForElement('#main-content-wrapper')
        ]);

        console.log("DIAGNOSTIK: Semua elemen sidebar ditemukan, inisialisasi dimulai.");

        const updateSidebarState = (isOpen) => {
            if (isOpen) {
                sidebar.classList.remove('-translate-x-full');
                // Di desktop, geser konten utama
                if (window.innerWidth >= 768) {
                    mainContentWrapper.classList.add('md:ml-64');
                }
                // Di mobile, tampilkan backdrop
                if (window.innerWidth < 768) {
                    backdrop.classList.remove('hidden');
                }
            } else {
                sidebar.classList.add('-translate-x-full');
                // Kembalikan konten utama
                mainContentWrapper.classList.remove('md:ml-64');
                // Sembunyikan backdrop
                backdrop.classList.add('hidden');
            }
        };

        // Event listeners
        openButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateSidebarState(true);
        });

        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateSidebarState(false);
        });

        backdrop.addEventListener('click', () => {
            updateSidebarState(false);
        });

        // Handle resize
        let isDesktop = window.innerWidth >= 768;
        const handleResize = () => {
            const currentlyDesktop = window.innerWidth >= 768;

            if (currentlyDesktop && !isDesktop) {
                // Berubah dari mobile ke desktop
                updateSidebarState(true);
            } else if (!currentlyDesktop && isDesktop) {
                // Berubah dari desktop to mobile
                updateSidebarState(false);
            }
            isDesktop = currentlyDesktop;
        };

        window.addEventListener('resize', handleResize);

        // Set state awal
        updateSidebarState(isDesktop);

    } catch (error) {
        console.error("Gagal menginisialisasi sidebar:", error);
        // Coba lagi setelah 500ms jika elemen belum ready
        setTimeout(() => {
            window.App.initializeSidebar();
        }, 500);
    }
};

/**
 * Menginisialisasi fungsionalitas dropdown di sidebar dan mencegah "lompatan" scroll.
 */
window.App.initializeSidebarDropdown = async () => {
    try {
        const sidebar = await window.App.waitForElement('#sidebar');

        sidebar.addEventListener('click', (event) => {
            const scrollPosition = sidebar.scrollTop;

            const dropdownToggle = event.target.closest('.dropdown-toggle');
            if (dropdownToggle) {
                event.preventDefault();
                const targetId = dropdownToggle.getAttribute('aria-controls');
                if (!targetId) return;

                const dropdownMenu = document.getElementById(targetId);
                if (!dropdownMenu) return;

                const isExpanded = !dropdownMenu.classList.toggle('hidden');
                dropdownToggle.setAttribute('aria-expanded', isExpanded);

                const chevron = dropdownToggle.querySelector('svg:last-of-type');
                if (chevron) {
                    chevron.classList.toggle('rotate-180', isExpanded);
                }
            }

            const link = event.target.closest('a');
            if (link && link.getAttribute('href') === '#') {
                event.preventDefault();
            }

            requestAnimationFrame(() => {
                sidebar.scrollTop = scrollPosition;
            });
        });

        console.log("DIAGNOSTIK: Sidebar dropdown berhasil diinisialisasi.");

    } catch (error) {
        console.error("Gagal menginisialisasi sidebar dropdown:", error);
    }
};

/**
 * Menandai item navigasi yang aktif di sidebar.
 * @param {string} navId - ID dari elemen <a> yang akan ditandai aktif.
 */
window.App.setActiveNav = (navId) => {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeNavItem = document.getElementById(navId);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
};