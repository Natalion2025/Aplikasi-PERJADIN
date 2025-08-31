const express = require('express');
const path = require('path');
const util = require('util');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');

// Impor rute
const authRoutes = require('./routes/authRoutes');
const pegawaiRoutes = require('./routes/pegawaiRoutes.js'); // Impor rute pegawai
// const userRoutes = require('./routes/userRoutes'); // Tidak digunakan, rute user didefinisikan langsung

const app = express();
const PORT = process.env.PORT || 3000;

// Impor koneksi database terpusat dari file database.js
const db = require('./database.js');

// Promisify fungsi database untuk digunakan dengan async/await
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
// const dbRun = util.promisify(db.run.bind(db)); // DIHAPUS: Ini tidak andal karena kehilangan konteks 'this'.

// Helper promise yang aman untuk db.run
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this); // 'this' berisi lastID dan changes
    });
});

// Middleware
app.use(express.json()); // Menggantikan bodyParser.json()
app.use(express.urlencoded({ extended: true })); // Menggantikan bodyParser.urlencoded()
app.use(express.static('public'));

// Konfigurasi Multer untuk upload foto profil
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'public/uploads/avatars';
        fs.mkdirSync(uploadPath, { recursive: true }); // Buat direktori jika belum ada
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Buat nama file yang unik untuk menghindari konflik
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `user-${req.session.user.id}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: avatarStorage,
    fileFilter: (req, file, cb) => {
        // Terima hanya file gambar
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Hanya file gambar yang diizinkan!'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // Batas ukuran file 5MB
});

// Konfigurasi Session
app.use(session({
    // Mengaktifkan kembali SQLiteStore dengan opsi busyTimeout untuk stabilitas
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './database',
        busyTimeout: 5000 // Tunggu 5 detik jika database terkunci
    }),
    secret: 'kunci-rahasia-perjadin-melawi', // Ganti dengan secret yang lebih kuat
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 jam
}));

// Middleware untuk proteksi rute
const isAuthenticated = (req, res, next) => {
    // Log ini akan sangat membantu untuk debugging
    console.log(`[isAuthenticated] Mengecek sesi untuk rute: ${req.path}`);
    console.log('[isAuthenticated] Isi req.session:', req.session);

    if (req.session && req.session.user) {
        console.log('[isAuthenticated] Sesi ditemukan. Mengizinkan akses.');
        next();
    } else {
        console.log('[isAuthenticated] Sesi TIDAK ditemukan. Mengalihkan ke /login.');
        res.redirect('/login');
    }
};

// Middleware untuk proteksi rute API
const isApiAuthenticated = (req, res, next) => {
    console.log(`[isApiAuthenticated] Mengecek sesi untuk rute API: ${req.path}`);
    console.log('[isApiAuthenticated] Isi req.session:', req.session);

    if (req.session && req.session.user) {
        console.log('[isApiAuthenticated] Sesi ditemukan. Mengizinkan akses.');
        next();
    } else {
        console.log('[isApiAuthenticated] Sesi TIDAK ditemukan. Menolak akses dengan 401.');
        res.status(401).json({ message: 'Akses ditolak. Sesi tidak valid atau telah berakhir.' });
    }
};

// Middleware BARU untuk proteksi rute khusus Super Admin
const isSuperAdmin = (req, res, next) => {
    // Pastikan user ada di session dan rolenya adalah 'superadmin'
    if (req.session.user && req.session.user.role === 'superadmin') {
        next();
    } else {
        // Kirim status 403 Forbidden jika bukan super admin
        res.status(403).json({ message: 'Akses ditolak. Memerlukan hak akses Super Admin.' });
    }
};

// Middleware BARU untuk proteksi rute khusus Admin atau Super Admin (untuk halaman)
const isAdminOrSuperAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        next();
    } else {
        res.status(403).send('Akses Ditolak: Hanya untuk Administrator.');
    }
};

// Middleware API BARU untuk proteksi rute khusus Admin atau Super Admin (untuk API)
const isApiAdminOrSuperAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        next();
    } else {
        res.status(403).json({ message: 'Akses Ditolak: Hanya untuk Administrator.' });
    }
};

// --- Rute Halaman (Frontend) ---

// Halaman Login
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Halaman Dashboard (terproteksi)
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Halaman Tambah SPT (terproteksi)
app.get('/tambah-spt', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tambah-spt.html'));
});

//Halaman Tambah Pegawai
app.get('/pegawai', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pegawai.html'));
});

// API untuk mendapatkan data pengguna yang sedang login
app.get('/me', isApiAuthenticated, (req, res) => {
    if (req.session && req.session.user) {
        res.json(req.session.user);
    } else {
        // Ini seharusnya tidak terjadi jika isApiAuthenticated bekerja
        res.status(401).json({ message: 'Tidak terautentikasi' });
    }
});

// --- Rute API Pengguna (terproteksi) ---

// API untuk mendapatkan semua pengguna (HANYA UNTUK SUPER ADMIN)

// Halaman Setelan (terproteksi)
app.get('/setelan', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'setelan.html'));
});

// Halaman Profil (terproteksi)
app.get('/profil', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profil.html'));
});

// Rute untuk halaman manajemen pengguna (BARU)
app.get('/pengguna', isAuthenticated, isAdminOrSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna.html'));
});

// Rute untuk halaman edit pengguna (BARU)
app.get('/edit-pengguna/:id', isAuthenticated, isAdminOrSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'edit-pengguna.html'));
});

// Rute untuk halaman pengaturan aplikasi (BARU)
app.get('/pengaturan/aplikasi', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengaturan-aplikasi.html'));
});

// Rute utama, redirect ke dashboard atau login
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// --- Rute Otentikasi & API ---

// Gunakan rute yang sudah diimpor
app.use('/api/auth', authRoutes);
app.use('/api/pegawai', isApiAuthenticated, pegawaiRoutes); // Daftarkan rute pegawai

// Rute untuk mendapatkan data sesi pengguna saat ini (PENTING: letakkan di sini)
// Ganti endpoint /api/user/session di server.js
app.get('/api/user/session', async (req, res) => {
    console.log('[DIAGNOSTIK] Cookies di /api/user/session:', req.headers.cookie);

    if (req.session.user) {
        try {
            // Ambil data lengkap user dari database
            const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
            const user = await dbGet(sql, [req.session.user.id]);

            if (user) {
                // Update session dengan data terbaru
                req.session.user = user;
                res.json({ user: user });
            } else {
                res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
            }
        } catch (err) {
            console.error('[API ERROR] Gagal mengambil data user:', err);
            res.status(500).json({ message: 'Terjadi kesalahan server.' });
        }
    } else {
        res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
});

// --- Rute API Profil Pengguna (terproteksi) ---
// Rute ini harus didefinisikan SEBELUM rute umum '/api/user' agar tidak tertangkap olehnya.

// GET: Mengambil data profil gabungan untuk pengguna yang sedang login
app.get('/api/user/profile', isApiAuthenticated, async (req, res) => {
    // Halaman profil sekarang menyertakan NIP, Jabatan, dan foto dari tabel 'users'.
    const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
    try {
        const user = await dbGet(sql, [req.session.user.id]);
        if (!user) {
            return res.status(404).json({ message: 'Profil pengguna tidak ditemukan.' });
        }
        // Kirim data dalam format yang konsisten dengan ekspektasi frontend
        res.json({ user: user });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data profil:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil profil.' });
    }
});

app.put('/api/user/profile', isApiAuthenticated, upload.single('foto_profil'), async (req, res) => {
    const { name, username, nip, jabatan, newPassword } = req.body;
    const oldUsername = req.session.user.username;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    if (!name || !username) {
        return res.status(400).json({ message: 'Nama Lengkap dan Username harus diisi.' });
    }
    // Superadmin cannot change their username
    if (userRole === 'superadmin' && username !== oldUsername) {
        return res.status(403).json({ message: 'Super Admin tidak dapat mengubah username.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION', []);

        // Ambil data pengguna saat ini untuk memeriksa foto lama
        const currentUser = await dbGet('SELECT foto_profil FROM users WHERE id = ?', [userId]);

        // Uniqueness check if username is being changed
        if (username !== oldUsername) {
            const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existingUser) {
                throw new Error('Username tersebut sudah digunakan.');
            }
        }

        // Uniqueness check for NIP (NIP harus unik di antara pengguna)
        if (nip) {
            const existingNipUser = await dbGet('SELECT id FROM users WHERE nip = ? AND id != ?', [nip, userId]);
            if (existingNipUser) {
                throw new Error('NIP tersebut sudah digunakan oleh pengguna lain.');
            }
        }

        // Siapkan query update
        let updateFields = ['name = ?', 'username = ?', 'nip = ?', 'jabatan = ?'];
        let updateParams = [name, username, nip || null, jabatan || null];

        if (newPassword && newPassword.length > 0) {
            if (newPassword.length < 6) { throw new Error('Password baru minimal harus 6 karakter.'); }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateFields.push('password = ?');
            updateParams.push(hashedPassword);
        }

        if (req.file) {
            // Jika ada file baru diupload, simpan path-nya
            const newPhotoPath = req.file.path.replace(/\\/g, "/").replace('public/', '');
            updateFields.push('foto_profil = ?');
            updateParams.push(newPhotoPath);

            // Hapus foto lama jika ada
            if (currentUser && currentUser.foto_profil) {
                const oldPhotoFullPath = path.join(__dirname, 'public', currentUser.foto_profil);
                if (fs.existsSync(oldPhotoFullPath)) {
                    fs.unlinkSync(oldPhotoFullPath);
                }
            }
        }

        updateParams.push(userId);
        const userUpdateSql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        await runQuery(userUpdateSql, updateParams);

        await runQuery('COMMIT', []);

        // Update session data
        req.session.user.name = name;
        req.session.user.username = username;
        req.session.save(); // Simpan perubahan sesi

        res.json({ message: 'Profil berhasil diperbarui.' });

    } catch (error) {
        // Jika terjadi error setelah file diupload, hapus file yang baru diupload
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal melakukan rollback:', rbErr));
        console.error('[API ERROR] Gagal memperbarui profil:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// API untuk mendapatkan semua pengguna (HANYA UNTUK SUPER ADMIN)
app.get('/api/users', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    try {
        // Ambil semua pengguna kecuali password mereka
        const users = await dbAll('SELECT id, username, name, role, nip, jabatan, foto_profil FROM users ORDER BY name ASC', []);
        res.json(users);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil daftar pengguna:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// API BARU untuk menambah pengguna (HANYA UNTUK SUPER ADMIN)
app.post('/api/users', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { name, username, password, role } = req.body;
    try {
        // Validasi input dasar
        if (!name || !username || !password || !role) {
            return res.status(400).json({ message: 'Semua field harus diisi.' });
        }

        // Cek apakah username sudah ada
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan.' });
        }

        // Hash password sebelum disimpan
        const hash = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)';

        // Bungkus db.run dalam Promise untuk mendapatkan this.lastID
        const result = await new Promise((resolve, reject) => {
            db.run(sql, [name, username, hash, role], function (err) {
                if (err) return reject(err);
                resolve({ lastID: this.lastID });
            });
        });

        res.status(201).json({ message: 'Pengguna baru berhasil ditambahkan.', id: result.lastID });
    } catch (err) {
        console.error('[API ERROR] Gagal menambah pengguna:', err);
        res.status(500).json({ message: 'Gagal menyimpan pengguna baru.', error: err.message });
    }
});

// API untuk mendapatkan detail satu pengguna (HANYA UNTUK SUPER ADMIN)
app.get('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => { // Middleware sudah sesuai
    const sql = "SELECT id, name, username, role FROM users WHERE id = ?";
    try {
        const user = await dbGet(sql, [req.params.id]);
        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }
        res.json(user);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil pengguna id ${req.params.id}:`, err);
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: err.message });
    }
});

// API untuk mengedit pengguna (HANYA UNTUK SUPER ADMIN)
app.put('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => { // Middleware sudah sesuai
    const { name, username, role, password } = req.body;
    const userIdToUpdate = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
        // Validasi input
        if (!name || !username || !role) {
            return res.status(400).json({ message: 'Nama, username, dan role harus diisi.' });
        }

        // Ambil data pengguna yang akan diupdate untuk validasi peran
        const userToUpdate = await dbGet('SELECT role FROM users WHERE id = ?', [userIdToUpdate]);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // Logika keamanan untuk Admin
        if (loggedInUser.role === 'admin') {
            if (userToUpdate.role !== 'user') {
                return res.status(403).json({ message: 'Admin hanya dapat mengubah pengguna dengan peran "User".' });
            }
            if (role === 'admin' || role === 'superadmin') {
                return res.status(403).json({ message: 'Admin tidak dapat memberikan peran "Admin" atau "Super Admin".' });
            }
        }

        // Logika keamanan untuk Super Admin (mencegah menghapus super admin terakhir)
        if (loggedInUser.role === 'superadmin' && userToUpdate.role === 'superadmin' && role !== 'superadmin') {
            const superadminCountResult = await dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'");
            if (superadminCountResult && superadminCountResult.count <= 1) {
                return res.status(403).json({ message: 'Tidak dapat mengubah peran Super Admin terakhir.' });
            }
        }

        // Cek apakah username baru sudah digunakan oleh user lain
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userIdToUpdate]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan oleh pengguna lain.' });
        }

        // Siapkan query update
        let updateFields = ['name = ?', 'username = ?', 'role = ?'];
        let params = [name, username, role];
        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            params.push(hash);
        }
        params.push(userIdToUpdate);

        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        const result = await runQuery(sql, params);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan untuk diperbarui.' });
        }

        res.json({ message: 'Pengguna berhasil diperbarui.' });

    } catch (err) {
        console.error(`[API ERROR] Gagal memperbarui pengguna id ${userIdToUpdate}:`, err);
        res.status(500).json({ message: 'Gagal memperbarui pengguna.', error: err.message });
    }
});

// API untuk menghapus pengguna (HANYA UNTUK SUPER ADMIN)
app.delete('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => { // Middleware sudah sesuai
    const userIdToDelete = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
        // Mencegah pengguna menghapus akunnya sendiri
        if (userIdToDelete === loggedInUser.id) {
            return res.status(403).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        }

        // Ambil data pengguna yang akan dihapus untuk validasi peran
        const userToDelete = await dbGet('SELECT role FROM users WHERE id = ?', [userIdToDelete]);
        if (!userToDelete) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // Logika keamanan: Admin hanya bisa hapus 'user'
        if (loggedInUser.role === 'admin' && userToDelete.role !== 'user') {
            return res.status(403).json({ message: 'Admin hanya dapat menghapus pengguna dengan peran "User".' });
        }

        // Logika keamanan: Superadmin tidak bisa hapus 'superadmin' lain
        if (loggedInUser.role === 'superadmin' && userToDelete.role === 'superadmin') {
            return res.status(403).json({ message: 'Super Admin tidak dapat menghapus Super Admin lainnya.' });
        }

        const sql = 'DELETE FROM users WHERE id = ?';
        const result = await runQuery(sql, [userIdToDelete]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.json({ message: 'Pengguna berhasil dihapus.' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus pengguna id ${userIdToDelete}:`, err);
        res.status(500).json({ message: 'Gagal menghapus pengguna.', error: err.message });
    }
});

// API baru untuk mendapatkan daftar peran yang tersedia
app.get('/api/roles', isApiAuthenticated, isApiAdminOrSuperAdmin, (req, res) => {
    // Definisikan peran di satu tempat. Mudah untuk diubah di masa depan.
    const roles = [
        { value: 'user', text: 'User' },
        { value: 'admin', text: 'Admin' },
        { value: 'superadmin', text: 'Super Admin' },
    ];
    res.json(roles);
});

// --- Rute API Pengguna (terproteksi) ---

// API untuk mendapatkan semua pengguna (HANYA UNTUK SUPER ADMIN)

// API untuk data dashboard (dibuat dinamis)
app.get('/api/dashboard/stats', isApiAuthenticated, async (req, res) => { // Gunakan middleware API dan async
    try {
        const sqlTotal = 'SELECT COUNT(*) as totalPerjalanan FROM sppd';
        const sqlBulanIni = "SELECT COUNT(*) as perjalananBulanIni FROM sppd WHERE strftime('%Y-%m', tanggal_berangkat) = strftime('%Y-%m', 'now')";
        const sqlPerjalananPerBulan = `
            SELECT
                strftime('%Y-%m', tanggal_berangkat) as bulan,
                COUNT(*) as jumlah
            FROM sppd
            WHERE tanggal_berangkat >= date('now', '-12 months')
            GROUP BY bulan
            ORDER BY bulan ASC
        `;
        // Jalankan query secara paralel
        const [totalRow, bulanIniRow, perjalananBulananData] = await Promise.all([
            dbGet(sqlTotal),
            dbGet(sqlBulanIni),
            dbAll(sqlPerjalananPerBulan)
        ]);

        // Siapkan data untuk 12 bulan terakhir, isi 0 jika tidak ada data
        const labels = [];
        const data = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthString = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
            labels.push(monthString);

            const monthData = perjalananBulananData.find(item => item.bulan === monthString);
            data.push(monthData ? monthData.jumlah : 0);
        }

        res.json({
            totalPerjalanan: totalRow.totalPerjalanan || 0,
            perjalananBulanIni: bulanIniRow.perjalananBulanIni || 0,
            grafikPerjalanan: {
                labels: labels,
                data: data
            }
        });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil statistik dashboard:', err);
        res.status(500).json({ message: err.message });
    }
});

// --- Rute API SPPD (terproteksi) ---

// GET: Mengambil semua data SPPD
app.get('/api/sppd', isApiAuthenticated, async (req, res) => { // REFAKTOR: Gunakan async/await
    const sql = "SELECT * FROM sppd ORDER BY id DESC";
    try {
        const rows = await dbAll(sql, []);
        res.json({
            "message": "success",
            "data": rows
        });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data SPPD:', err);
        res.status(500).json({ "error": err.message });
    }
});

// POST: Membuat SPPD baru
app.post('/api/sppd', isApiAuthenticated, async (req, res) => { // REFAKTOR: Gunakan async/await
    const {
        nomor_surat, nama_pegawai, nip, pangkat_golongan, jabatan,
        maksud_perjalanan, tempat_tujuan, lama_perjalanan,
        tanggal_berangkat, tanggal_kembali
    } = req.body;

    try {
        const sql = `INSERT INTO sppd (nomor_surat, nama_pegawai, nip, pangkat_golongan, jabatan, maksud_perjalanan, tempat_tujuan, lama_perjalanan, tanggal_berangkat, tanggal_kembali) VALUES (?,?,?,?,?,?,?,?,?,?)`;
        const params = [nomor_surat, nama_pegawai, nip, pangkat_golongan, jabatan, maksud_perjalanan, tempat_tujuan, lama_perjalanan, tanggal_berangkat, tanggal_kembali];

        // Bungkus db.run dalam Promise untuk mendapatkan this.lastID
        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ lastID: this.lastID });
            });
        });

        res.status(201).json({
            "message": "success",
            "data": req.body,
            "id": result.lastID
        });
    } catch (err) {
        console.error('[API ERROR] Gagal membuat SPPD baru:', err);
        res.status(400).json({ "error": err.message });
    }
});

// DELETE: Menghapus SPPD berdasarkan ID
app.delete('/api/sppd/:id', isApiAuthenticated, async (req, res) => { // REFAKTOR: Gunakan async/await
    const id = req.params.id;
    try {
        const sql = 'DELETE FROM sppd WHERE id = ?';
        const result = await new Promise((resolve, reject) => {
            db.run(sql, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (result.changes === 0) {
            return res.status(404).json({ message: 'SPPD tidak ditemukan.' });
        }
        res.json({ "message": "deleted", "changes": result.changes });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus SPPD id ${id}:`, err);
        res.status(400).json({ "error": err.message });
    }
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Aplikasi berjalan di http://localhost:${PORT}`);
});
