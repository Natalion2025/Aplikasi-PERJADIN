document.addEventListener('DOMContentLoaded', () => {
    const init = async () => {
        try {
            // Tunggu header dan sidebar selesai dimuat
            await new Promise(resolve => setTimeout(resolve, 500));

            // Tandai navigasi aktif
            const navSetelan = document.getElementById('nav-setelan-pengguna');
            if (navSetelan) {
                navSetelan.classList.add('bg-blue-700');
            }

            console.log("Halaman setelan berhasil diinisialisasi.");

        } catch (error) {
            console.error("Gagal menginisialisasi halaman setelan:", error);
        }
    };

    init();
});