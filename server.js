const express = require('express');
const path = require('path');
const util = require('util');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const ExcelJS = require('exceljs'); // Tambahkan modul ExcelJS

// Impor rute
const authRoutes = require('./routes/authRoutes');
const pegawaiRoutes = require('./routes/pegawaiRoutes.js'); // Impor rute pegawai
// const userRoutes = require('./routes/userRoutes'); // Tidak digunakan, rute user didefinisikan langsung

const app = express();
const PORT = process.env.PORT || 3000;

// Impor koneksi database terpusat dari file database.js
const db = require('./database.js');

// Pastikan tabel 'pejabat' ada saat server dimulai
db.run(`CREATE TABLE IF NOT EXISTS pejabat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL
)`, (err) => {
    if (err) {
        // Log error jika gagal membuat tabel, tapi jangan hentikan server
        console.error("Error creating 'pejabat' table:", err.message);
    }
});

// Pastikan tabel 'anggaran' ada saat server dimulai
db.run(`CREATE TABLE IF NOT EXISTS anggaran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bidang_urusan TEXT,
    program TEXT,
    kegiatan TEXT,
    sub_kegiatan TEXT,
    mata_anggaran_kode TEXT NOT NULL,
    mata_anggaran_nama TEXT NOT NULL,
    nilai_anggaran INTEGER NOT NULL
)`, (err) => {
    if (err) {
        console.error("Error creating 'anggaran' table:", err.message);
    }
});

// Pastikan tabel 'spt' (Surat Perintah Tugas) ada
db.run(`CREATE TABLE IF NOT EXISTS spt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_surat TEXT NOT NULL UNIQUE,
    tanggal_surat DATE NOT NULL,
    dasar_surat TEXT NOT NULL,
    pejabat_pemberi_tugas_id INTEGER NOT NULL,
    pegawai_ditugaskan INTEGER,
    peran TEXT,
    maksud_perjalanan TEXT NOT NULL,
    lokasi_tujuan TEXT NOT NULL,
    tanggal_berangkat DATE NOT NULL,
    tanggal_kembali DATE NOT NULL,
    lama_perjalanan INTEGER NOT NULL,
    sumber_dana TEXT,
    kendaraan TEXT,
    anggaran_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- FOREIGN KEY akan ditambahkan jika tabel pejabat dan anggaran sudah pasti ada
)`, (err) => {
    if (err) console.error("Error creating 'spt' table:", err.message);
});

// Pastikan tabel 'spt_pegawai' (linking table) ada
db.run(`CREATE TABLE IF NOT EXISTS spt_pegawai (
    spt_id INTEGER NOT NULL,
    pegawai_id INTEGER NOT NULL,
    PRIMARY KEY (spt_id, pegawai_id),
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'spt_pegawai' table:", err.message);
});

// Pastikan tabel 'standar_biaya' ada
db.run(`CREATE TABLE IF NOT EXISTS standar_biaya (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipe_biaya TEXT NOT NULL,
    uraian TEXT,
    provinsi TEXT,
    satuan TEXT,
    gol_a INTEGER,
    gol_b INTEGER,
    gol_c INTEGER,
    gol_d INTEGER,
    besaran INTEGER,
    biaya_kontribusi INTEGER
)`, (err) => {
    if (err) console.error("Error creating 'standar_biaya' table:", err.message);
});

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

// Konfigurasi Multer untuk upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'public/uploads';
        fs.mkdirSync(uploadPath, { recursive: true }); // Buat direktori jika belum ada
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Buat nama file yang unik untuk menghindari konflik
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Terima hanya file Excel
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file Excel yang diizinkan!'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // Batas ukuran file 10MB
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

// Halaman Register SPT (BARU)
app.get('/spt', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'spt-register.html'));
});

// Halaman Edit SPT (BARU) - Menggunakan template yang sama dengan tambah
app.get('/edit-spt/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tambah-spt.html'));
});

// Halaman Cetak SPT (BARU)
app.get('/cetak/spt/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cetak-spt.html'));
});

// Halaman Anggaran (BARU)
app.get('/anggaran', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'anggaran.html'));
});

//Halaman Tambah Pegawai
app.get('/pegawai', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pegawai.html'));
});

// Route untuk halaman Standar Biaya
app.get('/standar-biaya', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'standar-biaya.html'));
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

// Rute untuk halaman tambah pengguna (BARU)
app.get('/tambah-pengguna', isAuthenticated, isAdminOrSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tambah-pengguna.html'));
});

// Rute untuk halaman pengaturan aplikasi (BARU)
app.get('/pengaturan/aplikasi', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengaturan-aplikasi.html'));
});

// Rute utama, redirect to dashboard atau login
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

// Middleware "pembersih" untuk rute pegawai.
// Ini memastikan bahwa data nama yang masuk ke API selalu konsisten (menggunakan properti 'nama').
// Ini akan memperbaiki masalah di mana frontend mungkin mengirim 'nama_lengkap' sementara backend mengharapkan 'nama'.
app.use('/api/pegawai', (req, res, next) => {
    if (req.body && req.body.nama_lengkap && !req.body.nama) {
        req.body.nama = req.body.nama_lengkap;
    }
    next();
});

app.use('/api/pegawai', isApiAuthenticated, pegawaiRoutes); // Daftarkan rute pegawai

// --- API routes for Pejabat (Kepala/WK Daerah) ---

// GET all pejabat
app.get('/api/pejabat', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM pejabat ORDER BY id", []);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data pejabat:', err);
        res.status(500).json({ "error": err.message });
    }
});

// GET single pejabat by id
app.get('/api/pejabat/:id', isApiAuthenticated, async (req, res) => {
    try {
        const row = await dbGet("SELECT * FROM pejabat WHERE id = ?", [req.params.id]);
        if (!row) {
            return res.status(404).json({ message: "Data pejabat tidak ditemukan." });
        }
        res.json(row);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil pejabat id ${req.params.id}:`, err);
        res.status(500).json({ "error": err.message });
    }
});

// POST a new pejabat
app.post('/api/pejabat', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { nama, jabatan } = req.body;
    if (!nama || !jabatan) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const sql = 'INSERT INTO pejabat (nama, jabatan) VALUES (?, ?)';
        const result = await runQuery(sql, [nama, jabatan]);
        res.status(201).json({ id: result.lastID, nama, jabatan });
    } catch (err) {
        console.error('[API ERROR] Gagal menambah pejabat:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT (update) a pejabat
app.put('/api/pejabat/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { nama, jabatan } = req.body;
    if (!nama || !jabatan) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const sql = 'UPDATE pejabat SET nama = ?, jabatan = ? WHERE id = ?';
        const result = await runQuery(sql, [nama, jabatan, req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data pejabat tidak ditemukan.' });
        }
        res.json({ id: req.params.id, nama, jabatan });
    } catch (err) {
        console.error(`[API ERROR] Gagal memperbarui pejabat id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE a pejabat
app.delete('/api/pejabat/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    try {
        const sql = 'DELETE FROM pejabat WHERE id = ?';
        const result = await runQuery(sql, [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data pejabat tidak ditemukan.' });
        }
        res.json({ message: 'Data pejabat berhasil dihapus' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus pejabat id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// --- Rute API Anggaran (terproteksi) ---

// GET all anggaran
app.get('/api/anggaran', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM anggaran ORDER BY id DESC", []);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data anggaran:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET single anggaran by id
app.get('/api/anggaran/:id', isApiAuthenticated, async (req, res) => {
    try {
        const row = await dbGet("SELECT * FROM anggaran WHERE id = ?", [req.params.id]);
        if (!row) {
            return res.status(404).json({ message: "Data anggaran tidak ditemukan." });
        }
        res.json(row);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil anggaran id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// POST a new anggaran
app.post('/api/anggaran', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { bidang_urusan, program, kegiatan, sub_kegiatan, mata_anggaran, nilai_anggaran } = req.body;
    if (!mata_anggaran || !nilai_anggaran) {
        return res.status(400).json({ message: 'Mata Anggaran dan Nilai Anggaran wajib diisi.' });
    }

    // Ekstrak kode dan nama dari dropdown
    const [mata_anggaran_kode, mata_anggaran_nama] = mata_anggaran.split(' - ');

    try {
        const sql = 'INSERT INTO anggaran (bidang_urusan, program, kegiatan, sub_kegiatan, mata_anggaran_kode, mata_anggaran_nama, nilai_anggaran) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const result = await runQuery(sql, [bidang_urusan, program, kegiatan, sub_kegiatan, mata_anggaran_kode.trim(), mata_anggaran_nama.trim(), nilai_anggaran]);
        res.status(201).json({ id: result.lastID, ...req.body });
    } catch (err) {
        console.error('[API ERROR] Gagal menambah anggaran:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT (update) an anggaran
app.put('/api/anggaran/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { bidang_urusan, program, kegiatan, sub_kegiatan, mata_anggaran, nilai_anggaran } = req.body;
    if (!mata_anggaran || !nilai_anggaran) {
        return res.status(400).json({ message: 'Mata Anggaran dan Nilai Anggaran wajib diisi.' });
    }

    const [mata_anggaran_kode, mata_anggaran_nama] = mata_anggaran.split(' - ');

    try {
        const sql = 'UPDATE anggaran SET bidang_urusan = ?, program = ?, kegiatan = ?, sub_kegiatan = ?, mata_anggaran_kode = ?, mata_anggaran_nama = ?, nilai_anggaran = ? WHERE id = ?';
        const result = await runQuery(sql, [bidang_urusan, program, kegiatan, sub_kegiatan, mata_anggaran_kode.trim(), mata_anggaran_nama.trim(), nilai_anggaran, req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data anggaran tidak ditemukan.' });
        }
        res.json({ id: req.params.id, ...req.body });
    } catch (err) {
        console.error(`[API ERROR] Gagal memperbarui anggaran id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE an anggaran
app.delete('/api/anggaran/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    try {
        const sql = 'DELETE FROM anggaran WHERE id = ?';
        const result = await runQuery(sql, [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data anggaran tidak ditemukan.' });
        }
        res.json({ message: 'Data anggaran berhasil dihapus' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus anggaran id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// --- Rute API SPT (Surat Perintah Tugas) ---

// GET: Mengambil semua data SPT untuk ditampilkan di register
app.get('/api/spt', isApiAuthenticated, async (req, res) => {
    try {
        // Query utama untuk mengambil data SPT dan informasi pejabat pemberi tugas
        const sql = `
            SELECT 
                s.id, s.nomor_surat, s.tanggal_surat, s.maksud_perjalanan, s.lokasi_tujuan, s.tanggal_berangkat,
                p.nama as pejabat_nama, p.jabatan as pejabat_jabatan
            FROM spt s
            LEFT JOIN pejabat p ON s.pejabat_pemberi_tugas_id = p.id
            ORDER BY s.tanggal_surat DESC, s.id DESC
        `;
        const spts = await dbAll(sql);

        // Untuk setiap SPT, ambil daftar pegawai yang ditugaskan
        for (const spt of spts) {
            const pegawaiSql = `
                SELECT pg.nama_lengkap FROM spt_pegawai sp
                JOIN pegawai pg ON sp.pegawai_id = pg.id
                WHERE sp.spt_id = ?
            `;
            const pegawaiRows = await dbAll(pegawaiSql, [spt.id]);
            spt.pegawai_ditugaskan = pegawaiRows.map(p => p.nama_lengkap);
        }

        res.json(spts);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil daftar SPT:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Mengambil data satu SPT untuk keperluan edit dan cetak
app.get('/api/spt/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sptSql = "SELECT * FROM spt WHERE id = ?";
        const spt = await dbGet(sptSql, [req.params.id]);

        if (!spt) {
            return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
        }

        // Ambil ID pegawai DAN status is_pengikut
        const pegawaiSql = "SELECT pegawai_id, is_pengikut FROM spt_pegawai WHERE spt_id = ?";
        const pegawaiRows = await dbAll(pegawaiSql, [req.params.id]);
        spt.pegawai = pegawaiRows; // Kirim array objek { pegawai_id, is_pengikut }

        res.json(spt);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil SPT id ${req.params.id}:`, err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// POST: Membuat SPT baru
app.post('/api/spt', isApiAuthenticated, async (req, res) => {
    const {
        nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
        maksud_perjalanan, lokasi_tujuan, tanggal_berangkat, tanggal_kembali,
        lama_perjalanan, sumber_dana, kendaraan, anggaran_id, pegawai
    } = req.body;

    // Validasi dasar
    if (!nomor_surat || !tanggal_surat || !dasar_surat || !pejabat_pemberi_tugas_id ||
        !maksud_perjalanan || !lokasi_tujuan || !tanggal_berangkat || !tanggal_kembali ||
        !lama_perjalanan || !sumber_dana || !kendaraan || !anggaran_id || !pegawai ||
        pegawai.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua kolom yang wajib diisi.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        // 1. Insert ke tabel 'spt'
        const sptSql = `INSERT INTO spt (
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, 
            maksud_perjalanan, lokasi_tujuan, tanggal_berangkat, tanggal_kembali, 
            lama_perjalanan, sumber_dana, kendaraan, anggaran_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const sptResult = await runQuery(sptSql, [
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
            maksud_perjalanan, lokasi_tujuan, tanggal_berangkat, tanggal_kembali,
            lama_perjalanan, sumber_dana, kendaraan, anggaran_id
        ]);

        const newSptId = sptResult.lastID;

        // 2. Insert ke tabel 'spt_pegawai' untuk setiap pegawai
        // PERBAIKAN: Tambahkan kolom is_pengikut
        const sptPegawaiSql = 'INSERT INTO spt_pegawai (spt_id, pegawai_id, is_pengikut) VALUES (?, ?, ?)';
        for (const pegawaiItem of pegawai) {
            await runQuery(sptPegawaiSql, [newSptId, pegawaiItem.id, pegawaiItem.pengikut]); // Gunakan nilai 'pengikut' dari frontend
        }

        await runQuery('COMMIT');
        res.status(201).json({ message: 'Surat Perintah Tugas berhasil disimpan!', sptId: newSptId });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));

        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Nomor surat sudah digunakan. Gunakan nomor surat yang berbeda.' });
        }

        console.error('[API ERROR] Gagal menyimpan SPT:', err);
        res.status(500).json({ message: 'Gagal menyimpan SPT.', error: err.message });
    }
});

// PUT: Memperbarui SPT yang sudah ada
app.put('/api/spt/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
        maksud_perjalanan, lokasi_tujuan, tanggal_berangkat, tanggal_kembali,
        lama_perjalanan, sumber_dana, kendaraan, anggaran_id, pegawai
    } = req.body;

    // Validasi
    if (!nomor_surat || !tanggal_surat || !dasar_surat || !pejabat_pemberi_tugas_id ||
        !maksud_perjalanan || !lokasi_tujuan || !tanggal_berangkat || !tanggal_kembali ||
        !lama_perjalanan || !sumber_dana || !kendaraan || !anggaran_id || !pegawai ||
        pegawai.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua kolom yang wajib diisi.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        // 1. Update tabel 'spt'
        const sptSql = `UPDATE spt SET 
            nomor_surat = ?, tanggal_surat = ?, dasar_surat = ?, pejabat_pemberi_tugas_id = ?,
            maksud_perjalanan = ?, lokasi_tujuan = ?, tanggal_berangkat = ?, tanggal_kembali = ?,
            lama_perjalanan = ?, sumber_dana = ?, kendaraan = ?, anggaran_id = ?
            WHERE id = ?`;

        await runQuery(sptSql, [
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
            maksud_perjalanan, lokasi_tujuan, tanggal_berangkat, tanggal_kembali,
            lama_perjalanan, sumber_dana, kendaraan, anggaran_id, id
        ]);

        // 2. Hapus pegawai lama dari 'spt_pegawai'
        await runQuery('DELETE FROM spt_pegawai WHERE spt_id = ?', [id]);

        // 3. Insert pegawai baru ke 'spt_pegawai'
        // PERBAIKAN: Tambahkan kolom is_pengikut
        const sptPegawaiSql = 'INSERT INTO spt_pegawai (spt_id, pegawai_id, is_pengikut) VALUES (?, ?, ?)';
        for (const pegawaiItem of pegawai) {
            await runQuery(sptPegawaiSql, [id, pegawaiItem.id, pegawaiItem.pengikut]); // Gunakan nilai 'pengikut' dari frontend
        }

        await runQuery('COMMIT');
        res.json({ message: 'Surat Perintah Tugas berhasil diperbarui!', sptId: id });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));

        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Nomor surat sudah digunakan. Gunakan nomor surat yang berbeda.' });
        }

        console.error(`[API ERROR] Gagal memperbarui SPT id ${id}:`, err);
        res.status(500).json({ message: 'Gagal memperbarui SPT.', error: err.message });
    }
});

// DELETE: Menghapus SPT
app.delete('/api/spt/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const result = await runQuery('DELETE FROM spt WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
        return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
    }
    res.json({ message: 'Data SPT berhasil dihapus.' });
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

// --- Rute API Sesi Pengguna ---

// API untuk mendapatkan data sesi pengguna yang sedang login (data lengkap dan terbaru)
app.get('/api/user/session', async (req, res) => {
    console.log('[DIAGNOSTIK] Cookies di /api/user/session:', req.headers.cookie);

    if (req.session && req.session.user && req.session.user.id) {
        try {
            // Ambil data lengkap user dari database untuk memastikan data selalu fresh
            const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
            const user = await dbGet(sql, [req.session.user.id]);

            if (user) {
                // Perbarui sesi dengan data terbaru dan kirim ke frontend
                req.session.user = user;
                res.json({ user: user });
            } else {
                res.status(404).json({ message: 'Pengguna tidak ditemukan di database.' });
            }
        } catch (err) {
            console.error('[API ERROR] Gagal mengambil data user untuk sesi:', err);
            res.status(500).json({ message: 'Terjadi kesalahan server saat verifikasi sesi.' });
        }
    } else {
        res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
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

// --- Rute API Standar Biaya ---

// GET: Mengambil semua data standar biaya
app.get('/api/standar-biaya', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM standar_biaya ORDER BY tipe_biaya, id", []);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data standar biaya:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET: Mengambil data standar biaya berdasarkan tipe
app.get('/api/standar-biaya/:tipe', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM standar_biaya WHERE tipe_biaya = ? ORDER BY id", [req.params.tipe]);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data standar biaya:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST: Upload data standar biaya dari Excel
app.post('/api/standar-biaya/upload', isApiAuthenticated, isApiAdminOrSuperAdmin, upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const tipeBiaya = req.body.tipe_biaya;
    const filePath = req.file.path; // Dapatkan path file dari multer

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath); // Perbaikan: Baca dari file path, bukan buffer

        const worksheet = workbook.worksheets[0];
        const standarBiayaData = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            // Perbaikan: Tentukan jumlah baris header yang akan dilewati berdasarkan tipe biaya.
            // Tipe A, B, E, F, G, H, I, dan J memiliki 2 baris header. Tipe K (Taksi) hanya 1.
            const headerRowsToSkip = (['A', 'B', 'E', 'F', 'G', 'H', 'I', 'J'].includes(tipeBiaya)) ? 2 : 1;

            if (rowNumber > headerRowsToSkip) {
                const rowData = row.values; // row.values adalah sparse array, index = nomor kolom

                let data = {};
                // Pemetaan kolom spesifik untuk Tipe A (Uang Harian) dan B (Penginapan)
                // yang memiliki struktur kolom yang sama.
                if (tipeBiaya === 'A' || tipeBiaya === 'B') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Tempat Tujuan
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: rowData[8] || null // Kolom H: Diklat/Bimtek
                    };
                } else if (tipeBiaya === 'C') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,                       // Tidak digunakan untuk tipe ini
                        provinsi: rowData[2] || null,       // Kolom B: Provinsi
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: null,                        // Tidak digunakan untuk tipe ini
                        gol_b: null,                        // Tidak digunakan untuk tipe ini
                        gol_c: null,                        // Tidak digunakan untuk tipe ini
                        gol_d: null,                        // Tidak digunakan untuk tipe ini
                        besaran: rowData[4] || null,        // Kolom D: Besaran
                        biaya_kontribusi: rowData[5] || null // Kolom E: Kontribusi
                    };
                } else if (tipeBiaya === 'D') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Uraian
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: null,                        // Tidak digunakan untuk tipe ini
                        gol_b: null,                        // Tidak digunakan untuk tipe ini
                        gol_c: null,                        // Tidak digunakan untuk tipe ini
                        gol_d: null,                        // Tidak digunakan untuk tipe ini
                        besaran: rowData[4] || null,        // Kolom D: Luar Kota
                        biaya_kontribusi: rowData[5] || null // Kolom E: Dalam Kota
                    };
                } else if (tipeBiaya === 'E') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,                       // Tidak digunakan untuk tipe ini
                        provinsi: rowData[2] || null,       // Kolom B: Provinsi
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                } else if (tipeBiaya === 'F') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Tujuan
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                } else if (tipeBiaya === 'G') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Tujuan
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                } else if (tipeBiaya === 'H') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Tujuan
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                } else if (tipeBiaya === 'I') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Tujuan
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                } else if (tipeBiaya === 'J') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,         // Kolom B: Tujuan
                        provinsi: null,                     // Tidak digunakan untuk tipe ini
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: rowData[4] || null,          // Kolom D: Gol A
                        gol_b: rowData[5] || null,          // Kolom E: Gol B
                        gol_c: rowData[6] || null,          // Kolom F: Gol C
                        gol_d: rowData[7] || null,          // Kolom G: Gol D
                        besaran: null,                      // Tidak digunakan untuk tipe ini
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                } else if (tipeBiaya === 'K') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,                       // Tidak digunakan untuk tipe ini
                        provinsi: rowData[2] || null,       // Kolom B: Provinsi
                        satuan: rowData[3] || null,         // Kolom C: Satuan
                        gol_a: null,                        // Tidak digunakan untuk tipe ini
                        gol_b: null,                        // Tidak digunakan untuk tipe ini
                        gol_c: null,                        // Tidak digunakan untuk tipe ini
                        gol_d: null,                        // Tidak digunakan untuk tipe ini
                        besaran: rowData[4] || null,        // Kolom D: Besaran
                        biaya_kontribusi: null              // Tidak digunakan untuk tipe ini
                    };
                }
                // TODO: Tambahkan blok 'else if' untuk tipe biaya lain (C, D, dst.) dengan pemetaan kolom yang berbeda.

                standarBiayaData.push(data);
            }
        });

        // Hapus data lama dengan tipe_biaya yang sama
        await runQuery('DELETE FROM standar_biaya WHERE tipe_biaya = ?', [tipeBiaya]);

        // Simpan data baru
        for (const data of standarBiayaData) {
            const sql = `INSERT INTO standar_biaya 
                (tipe_biaya, uraian, provinsi, satuan, gol_a, gol_b, gol_c, gol_d, besaran, biaya_kontribusi) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await runQuery(sql, [
                data.tipe_biaya,
                data.uraian,
                data.provinsi,
                data.satuan,
                data.gol_a,
                data.gol_b,
                data.gol_c,
                data.gol_d,
                data.besaran,
                data.biaya_kontribusi
            ]);
        }

        // Hapus file setelah diproses
        fs.unlinkSync(filePath);

        res.json({ message: 'Data standar biaya berhasil diupload dan disimpan.' });
    } catch (error) {
        console.error('[API ERROR] Gagal memproses file Excel:', error);
        // Hapus file jika terjadi error saat pemrosesan
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses file Excel.' });
    }
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Aplikasi berjalan di http://localhost:${PORT}`);
});