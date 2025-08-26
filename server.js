const express = require('express');
const path = require('path');
const util = require('util');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// Impor rute
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Impor koneksi database terpusat dari file database.js
const db = require('./database.js');

// Promisify fungsi database untuk digunakan dengan async/await
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const dbRun = util.promisify(db.run.bind(db)); // Catatan: Ini tidak akan mengembalikan 'this.lastID' atau 'this.changes'

// Middleware
app.use(express.json()); // Menggantikan bodyParser.json()
app.use(express.urlencoded({ extended: true })); // Menggantikan bodyParser.urlencoded()
app.use(express.static('public'));

// Konfigurasi Session
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './database'
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
    // Pastikan user ada di session dan rolenya adalah 'super_admin'
    if (req.session.user && req.session.user.role === 'superadmin') {
        next();
    } else {
        // Kirim status 403 Forbidden jika bukan super admin
        res.status(403).json({ message: 'Akses ditolak. Memerlukan hak akses Super Admin.' });
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
app.use('/api/user', isApiAuthenticated, userRoutes); // PERBAIKAN: Terapkan middleware proteksi di sini

// API untuk mendapatkan semua pengguna (HANYA UNTUK SUPER ADMIN)
app.get('/api/users', isApiAuthenticated, isSuperAdmin, async (req, res) => {
    // Pilih kolom yang aman, jangan sertakan password
    const sql = "SELECT id, name, username, role FROM users ORDER BY name";
    try {
        const users = await dbAll(sql, []);
        res.json(users);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil semua pengguna:', err);
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: err.message });
    }
});

// API BARU untuk menambah pengguna (HANYA UNTUK SUPER ADMIN)
app.post('/api/users', isApiAuthenticated, isSuperAdmin, async (req, res) => {
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
app.get('/api/users/:id', isApiAuthenticated, isSuperAdmin, async (req, res) => {
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
app.put('/api/users/:id', isApiAuthenticated, isSuperAdmin, async (req, res) => {
    const { name, username, role, password } = req.body;
    const userIdToUpdate = req.params.id;

    try {
        if (!name || !username || !role) {
            return res.status(400).json({ message: 'Nama, username, dan role harus diisi.' });
        }

        // Cek apakah username baru sudah digunakan oleh user lain
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userIdToUpdate]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan oleh pengguna lain.' });
        }

        let sql;
        let params;

        // Jika password diisi, hash dan update. Jika tidak, update data lain saja.
        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            sql = 'UPDATE users SET name = ?, username = ?, role = ?, password = ? WHERE id = ?';
            params = [name, username, role, hash, userIdToUpdate];
        } else {
            sql = 'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?';
            params = [name, username, role, userIdToUpdate];
        }

        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

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
app.delete('/api/users/:id', isApiAuthenticated, isSuperAdmin, async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const loggedInUserId = req.session.user.id;

    try {
        // Mencegah super admin menghapus akunnya sendiri
        if (userIdToDelete === loggedInUserId) {
            return res.status(403).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        }

        const sql = 'DELETE FROM users WHERE id = ?';
        // Bungkus db.run dalam Promise untuk mendapatkan this.changes
        const result = await new Promise((resolve, reject) => {
            db.run(sql, [userIdToDelete], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

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
app.get('/api/roles', isApiAuthenticated, (req, res) => {
    // Definisikan peran di satu tempat. Mudah untuk diubah di masa depan.
    const roles = [
        { value: 'superadmin', text: 'Super Admin' },
        { value: 'admin', text: 'Admin' },
        { value: 'user', text: 'User' }
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
