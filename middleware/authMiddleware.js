const authMiddleware = (req, res, next) => {
    // Cek jika sesi dan data pengguna ada di sesi
    if (req.session && req.session.user) {
        // Lampirkan info pengguna dari sesi ke objek request
        req.user = req.session.user;
        next(); // Lanjutkan ke rute berikutnya
    } else {
        // Jika tidak ada sesi, kirim status 'Unauthorized'
        res.status(401).json({ message: 'Akses ditolak. Anda harus login untuk mengakses sumber daya ini.' });
    }
};

module.exports = authMiddleware;