const express = require('express');
const path = require('path');
const util = require('util');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const ExcelJS = require('exceljs');
const { spawn } = require('child_process');

// Impor rute
const authRoutes = require('./routes/authRoutes');
const pegawaiRoutes = require('./routes/pegawaiRoutes.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Impor koneksi database terpusat dari file database.js
const db = require('./database.js');

// Pastikan tabel 'pejabat' ada saat server dimulai
db.run(`CREATE TABLE IF NOT EXISTS pejabat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    nip TEXT
)`, (err) => {
    if (err) {
        console.error("Error creating 'pejabat' table:", err.message);
    }
});

// Cek dan perbaiki struktur tabel 'pejabat' jika kolom 'nip' belum ada.
db.all("PRAGMA table_info(pejabat)", (err, cols) => {
    if (err) return; // Tabel mungkin belum ada, biarkan kode di atas yang membuat.
    const hasNip = cols.some(col => col.name === 'nip');
    if (!hasNip) {
        console.warn("[DB MIGRATION] Kolom 'nip' tidak ditemukan. Menambahkan kolom ke tabel 'pejabat'...");
        db.run("ALTER TABLE pejabat ADD COLUMN nip TEXT", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'nip':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'nip' berhasil ditambahkan.");
        });
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
    tempat_berangkat TEXT DEFAULT 'Nanga Pinoh',
    tanggal_berangkat DATE NOT NULL,
    tanggal_kembali DATE NOT NULL,
    lama_perjalanan INTEGER NOT NULL,
    sumber_dana TEXT,
    kendaraan TEXT,
    anggaran_id INTEGER NOT NULL,
    keterangan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) console.error("Error creating 'spt' table:", err.message);
});

// Cek dan perbaiki struktur tabel 'spt' jika kolom 'status' belum ada.
db.all("PRAGMA table_info(spt)", (err, cols) => {
    if (err) return;
    const hasStatus = cols.some(col => col.name === 'status');
    if (!hasStatus) {
        console.warn("[DB MIGRATION] Kolom 'status' tidak ditemukan. Menambahkan kolom ke tabel 'spt'...");
        db.run("ALTER TABLE spt ADD COLUMN status TEXT DEFAULT 'aktif'", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'status':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'status' berhasil ditambahkan.");
        });
    }
});


// Cek dan perbaiki struktur tabel 'spt' jika kolom 'tempat_berangkat' belum ada.
db.all("PRAGMA table_info(spt)", (err, cols) => {
    if (err) return; // Tabel mungkin belum ada, biarkan kode di atas yang membuat.
    const hasTempatBerangkat = cols.some(col => col.name === 'tempat_berangkat');
    if (!hasTempatBerangkat) {
        console.warn("[DB MIGRATION] Kolom 'tempat_berangkat' tidak ditemukan. Menambahkan kolom ke tabel 'spt'...");
        db.run("ALTER TABLE spt ADD COLUMN tempat_berangkat TEXT DEFAULT 'Nanga Pinoh'", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'tempat_berangkat':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'tempat_berangkat' berhasil ditambahkan.");
        });
    }
});

// Cek dan perbaiki struktur tabel 'spt' jika kolom 'keterangan' belum ada.
db.all("PRAGMA table_info(spt)", (err, cols) => {
    if (err) return; // Tabel mungkin belum ada, biarkan kode di atas yang membuat.
    const hasKeterangan = cols.some(col => col.name === 'keterangan');
    if (!hasKeterangan) {
        console.warn("[DB MIGRATION] Kolom 'keterangan' tidak ditemukan. Menambahkan kolom ke tabel 'spt'...");
        db.run("ALTER TABLE spt ADD COLUMN keterangan TEXT", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'keterangan':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'keterangan' berhasil ditambahkan.");
        });
    }
});

// Pastikan tabel 'spt_pegawai' (linking table) ada
db.run(`CREATE TABLE IF NOT EXISTS spt_pegawai (
    spt_id INTEGER NOT NULL,
    pegawai_id INTEGER NOT NULL,
    is_pengikut INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (spt_id, pegawai_id),
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'spt_pegawai' table:", err.message);
});

// Cek dan perbaiki struktur tabel 'spt_pegawai' jika kolom 'is_pengikut' belum ada.
db.all("PRAGMA table_info(spt_pegawai)", (err, cols) => {
    if (err) return;
    const hasIsPengikut = cols.some(col => col.name === 'is_pengikut');
    if (!hasIsPengikut) {
        console.warn("[DB MIGRATION] Kolom 'is_pengikut' tidak ditemukan. Menambahkan kolom ke tabel 'spt_pegawai'...");
        db.run("ALTER TABLE spt_pegawai ADD COLUMN is_pengikut INTEGER NOT NULL DEFAULT 0", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'is_pengikut':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'is_pengikut' berhasil ditambahkan.");
        });
    }
});

// Cek dan perbaiki struktur tabel 'laporan_perjadin' jika kolom 'penandatangan_ids' belum ada.
db.all("PRAGMA table_info(laporan_perjadin)", (err, cols) => {
    if (err) return;
    const hasPenandatangan = cols.some(col => col.name === 'penandatangan_ids');
    if (!hasPenandatangan) {
        console.warn("[DB MIGRATION] Kolom 'penandatangan_ids' tidak ditemukan. Menambahkan kolom ke tabel 'laporan_perjadin'...");
        db.run("ALTER TABLE laporan_perjadin ADD COLUMN penandatangan_ids TEXT", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'penandatangan_ids':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'penandatangan_ids' berhasil ditambahkan.");
        });
    }
});

// Pastikan tabel 'sppd' (Surat Perjalanan Dinas) ada
db.run(`CREATE TABLE IF NOT EXISTS sppd (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spt_id INTEGER NOT NULL,
    nomor_sppd TEXT UNIQUE NOT NULL,
    tanggal_sppd DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'sppd' table:", err.message);
});

// Cek dan migrasikan struktur tabel 'sppd' yang sudah usang
db.all("PRAGMA table_info(sppd)", async (err, cols) => {
    if (err) return;
    // Deteksi struktur lama dengan memeriksa kolom yang seharusnya tidak ada, seperti 'nama_pegawai'
    const isOldStructure = cols.some(col => col.name === 'nama_pegawai');
    if (isOldStructure) {
        console.warn("[DB MIGRATION] Struktur tabel 'sppd' usang terdeteksi. Memulai migrasi...");
        try {
            await runQuery('BEGIN TRANSACTION');
            // 1. Ganti nama tabel lama untuk backup
            await runQuery("ALTER TABLE sppd RENAME TO sppd_old");
            console.log("[DB MIGRATION] Tabel lama diganti nama menjadi 'sppd_old'.");

            // 2. Buat tabel baru dengan struktur yang benar
            await runQuery(`CREATE TABLE sppd (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                spt_id INTEGER NOT NULL,
                pegawai_id INTEGER NOT NULL,
                nomor_sppd TEXT UNIQUE NOT NULL,
                tanggal_sppd DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
                FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
            )`);
            console.log("[DB MIGRATION] Tabel 'sppd' baru dengan struktur yang benar telah dibuat.");

            // 3. Salin data yang relevan dari tabel lama ke tabel baru
            // Karena data pegawai tidak ada di tabel lama, kita tidak bisa memigrasikannya secara otomatis.
            // Data SPPD lama mungkin perlu dibuat ulang.
            console.warn("[DB MIGRATION] Data dari 'sppd_old' tidak dapat dimigrasikan sepenuhnya karena tidak ada 'pegawai_id'. SPPD lama mungkin perlu dibuat ulang.");
            // await runQuery("INSERT INTO sppd (id, spt_id, nomor_sppd, tanggal_sppd) SELECT id, spt_id, nomor_sppd, tanggal_sppd FROM sppd_old WHERE spt_id IS NOT NULL AND nomor_sppd IS NOT NULL AND tanggal_sppd IS NOT NULL");
            console.log("[DB MIGRATION] Data yang relevan telah disalin ke tabel baru.");

            await runQuery('COMMIT');
            console.log("[DB MIGRATION SUCCESS] Migrasi tabel 'sppd' selesai.");
        } catch (migrationErr) {
            console.error("[DB MIGRATION FAILED] Gagal memigrasi tabel 'sppd':", migrationErr.message);
            await runQuery('ROLLBACK').catch(rbErr => console.error('[DB MIGRATION] Gagal rollback:', rbErr));
        }
    }
});

// Cek dan perbaiki struktur tabel 'sppd' jika kolom 'pegawai_id' belum ada.
db.all("PRAGMA table_info(sppd)", (err, cols) => {
    if (err) return;
    const hasPegawaiId = cols.some(col => col.name === 'pegawai_id');
    if (!hasPegawaiId) {
        console.warn("[DB MIGRATION] Kolom 'pegawai_id' tidak ditemukan. Menambahkan kolom ke tabel 'sppd'...");
        db.run("ALTER TABLE sppd ADD COLUMN pegawai_id INTEGER", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'pegawai_id':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'pegawai_id' berhasil ditambahkan.");
        });
    }
});

// Cek dan perbaiki struktur tabel 'sppd' jika kolom 'nomor_sppd' dan 'tanggal_sppd' belum ada.
db.all("PRAGMA table_info(sppd)", (err, cols) => {
    if (err) return;
    const hasNomor = cols.some(col => col.name === 'nomor_sppd');
    const hasTanggal = cols.some(col => col.name === 'tanggal_sppd');

    if (!hasNomor) {
        console.warn("[DB MIGRATION] Kolom 'nomor_sppd' tidak ditemukan. Menambahkan kolom...");
        db.run("ALTER TABLE sppd ADD COLUMN nomor_sppd TEXT", (e) => {
            if (e) {
                console.error("[DB MIGRATION FAILED] Gagal menambah kolom 'nomor_sppd':", e.message);
            } else {
                console.log("[DB MIGRATION] Membuat UNIQUE INDEX untuk 'nomor_sppd'...");
                db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_sppd_nomor_sppd ON sppd(nomor_sppd)", (indexErr) => {
                    if (indexErr) console.error("[DB MIGRATION FAILED] Gagal membuat UNIQUE INDEX untuk 'nomor_sppd':", indexErr.message);
                    else console.log("[DB MIGRATION SUCCESS] UNIQUE INDEX untuk 'nomor_sppd' berhasil dibuat.");
                });
            }
        });
    }
    if (!hasTanggal) {
        console.warn("[DB MIGRATION] Kolom 'tanggal_sppd' tidak ditemukan. Menambahkan kolom...");
        db.run("ALTER TABLE sppd ADD COLUMN tanggal_sppd DATE", (e) => {
            if (e) console.error("[DB MIGRATION FAILED] Gagal menambah 'tanggal_sppd':", e.message);
        });
    }
});

// Cek dan perbaiki struktur tabel 'sppd' jika kolom 'spt_id' belum ada.
db.all("PRAGMA table_info(sppd)", (err, cols) => {
    if (err) return;
    const hasSptId = cols.some(col => col.name === 'spt_id');
    if (!hasSptId) {
        console.warn("[DB MIGRATION] Kolom 'spt_id' tidak ditemukan. Menambahkan kolom ke tabel 'sppd'...");
        // Menambahkan kolom. Catatan: Menambahkan FOREIGN KEY via ALTER TABLE memiliki keterbatasan di SQLite.
        // Namun, menambahkan kolomnya saja sudah cukup untuk memperbaiki query yang error.
        db.run("ALTER TABLE sppd ADD COLUMN spt_id INTEGER", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'spt_id':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'spt_id' berhasil ditambahkan.");
        });
    }
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

// Pastikan tabel 'laporan_perjadin' ada
db.run(`CREATE TABLE IF NOT EXISTS laporan_perjadin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spt_id INTEGER,
    tanggal_laporan DATE NOT NULL,
    tempat_laporan TEXT NOT NULL,
    judul TEXT NOT NULL,
    identitas_pelapor TEXT,
    dasar_perjalanan TEXT,
    tujuan_perjalanan TEXT,
    lama_dan_tanggal_perjalanan TEXT,
    deskripsi_kronologis TEXT,
    tempat_dikunjungi TEXT,
    hasil_dicapai TEXT,
    transportasi_jenis TEXT,
    transportasi_perusahaan TEXT,
    transportasi_nominal REAL, 
    akomodasi_jenis TEXT,
    akomodasi_nama TEXT,
    akomodasi_harga_satuan REAL,
    akomodasi_malam INTEGER,
    akomodasi_nominal REAL,
    kontribusi_jenis TEXT,
    kontribusi_nominal REAL,
    lain_lain_uraian TEXT,
    lain_lain_nominal REAL,
    kesimpulan TEXT,
    lampiran_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE SET NULL
)`, (err) => {
    if (err) console.error("Error creating 'laporan_perjadin' table:", err.message);
});

// Cek dan perbaiki struktur tabel 'laporan_perjadin' jika kolom 'biaya_lain' belum ada.
db.all("PRAGMA table_info(laporan_perjadin)", (err, cols) => {
    if (err) return;
    const hasBiayaLain = cols.some(col => col.name === 'biaya_lain');
    if (!hasBiayaLain) {
        console.warn("[DB MIGRATION] Kolom 'biaya_lain' tidak ditemukan. Menambahkan kolom ke tabel 'laporan_perjadin'...");
        db.run("ALTER TABLE laporan_perjadin ADD COLUMN biaya_lain TEXT", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menambahkan kolom 'biaya_lain':", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'biaya_lain' berhasil ditambahkan.");
        });
    }
});


// Cek dan migrasikan kolom 'lampiran_path' dari 'laporan_perjadin'
db.all("PRAGMA table_info(laporan_perjadin)", (err, cols) => {
    if (err) return;
    const hasLampiranPath = cols.some(col => col.name === 'lampiran_path');
    if (hasLampiranPath) {
        console.warn("[DB MIGRATION] Kolom 'lampiran_path' sudah usang. Menghapusnya dari 'laporan_perjadin'...");
        // SQLite tidak mendukung DROP COLUMN secara langsung di semua versi.
        // Cara aman adalah dengan membuat tabel baru, salin data, hapus tabel lama, dan rename.
        // Untuk kesederhanaan di sini, kita asumsikan versi SQLite yang lebih baru atau ini adalah pengembangan awal.
        // Jika gagal, Anda mungkin perlu melakukannya secara manual.
        db.run("ALTER TABLE laporan_perjadin DROP COLUMN lampiran_path", (alterErr) => {
            if (alterErr) console.error("[DB MIGRATION FAILED] Gagal menghapus kolom 'lampiran_path'. Mungkin perlu dilakukan manual.", alterErr.message);
            else console.log("[DB MIGRATION SUCCESS] Kolom 'lampiran_path' berhasil dihapus.");
        });
    }
});

// Pastikan tabel 'laporan_lampiran' ada
db.run(`CREATE TABLE IF NOT EXISTS laporan_lampiran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    laporan_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'laporan_lampiran' table:", err.message);
});

// Pastikan tabel 'pembatalan_spt' ada
db.run(`CREATE TABLE IF NOT EXISTS pembatalan_spt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spt_id INTEGER NOT NULL,
    tempat_pembatalan TEXT NOT NULL,
    tanggal_pembatalan DATE NOT NULL,
    alasan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'pembatalan_spt' table:", err.message);
});

// Pastikan tabel 'pembayaran' ada
db.run(`CREATE TABLE IF NOT EXISTS pembayaran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_bukti TEXT UNIQUE NOT NULL,
    tanggal_bukti DATE NOT NULL,
    anggaran_id INTEGER NOT NULL,
    spt_id INTEGER NOT NULL,
    nama_penerima TEXT NOT NULL,
    uraian_pembayaran TEXT NOT NULL,
    nominal_bayar REAL NOT NULL,
    panjar_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (anggaran_id) REFERENCES anggaran(id),
    FOREIGN KEY (spt_id) REFERENCES spt(id)
)`, (err) => {
    if (err) console.error("Error creating 'pembayaran' table:", err.message);
});

// --- PERUBAHAN: Normalisasi Tabel Pengeluaran ---
// Hapus tabel lama jika ada (hanya untuk pengembangan, hati-hati di produksi)
db.run(`DROP TABLE IF EXISTS laporan_pengeluaran`);

// Buat tabel baru untuk Transportasi
db.run(`CREATE TABLE IF NOT EXISTS laporan_transportasi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    laporan_id INTEGER NOT NULL,
    pegawai_id INTEGER NOT NULL,
    jenis TEXT,
    perusahaan TEXT,
    nominal REAL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'laporan_transportasi' table:", err.message);
});

// Buat tabel baru untuk Akomodasi
db.run(`CREATE TABLE IF NOT EXISTS laporan_akomodasi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    laporan_id INTEGER NOT NULL,
    pegawai_id INTEGER NOT NULL,
    jenis TEXT,
    nama TEXT,
    harga_satuan REAL,
    malam INTEGER,
    nominal REAL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'laporan_akomodasi' table:", err.message);
});

// Buat tabel baru untuk Kontribusi
db.run(`CREATE TABLE IF NOT EXISTS laporan_kontribusi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    laporan_id INTEGER NOT NULL,
    pegawai_id INTEGER NOT NULL,
    jenis TEXT,
    nominal REAL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'laporan_kontribusi' table:", err.message);
});

// Buat tabel baru untuk Biaya Lain-lain
db.run(`CREATE TABLE IF NOT EXISTS laporan_lain_lain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    laporan_id INTEGER NOT NULL,
    pegawai_id INTEGER NOT NULL,
    uraian TEXT,
    nominal REAL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Error creating 'laporan_lain_lain' table:", err.message);
});

// Promisify fungsi database untuk digunakan dengan async/await
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

// Helper promise yang aman untuk db.run
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Konfigurasi Multer untuk upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'public/uploads';
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file Excel yang diizinkan!'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Konfigurasi Session
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './database',
        busyTimeout: 5000
    }),
    secret: 'kunci-rahasia-perjadin-melawi',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware untuk proteksi rute
const isAuthenticated = (req, res, next) => {
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

// Middleware untuk proteksi rute khusus Super Admin
const isSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak. Memerlukan hak akses Super Admin.' });
    }
};

// Middleware untuk proteksi rute khusus Admin atau Super Admin (untuk halaman)
const isAdminOrSuperAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        next();
    } else {
        res.status(403).send('Akses Ditolak: Hanya untuk Administrator.');
    }
};

// Middleware API untuk proteksi rute khusus Admin atau Super Admin (untuk API)
const isApiAdminOrSuperAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        next();
    } else {
        res.status(403).json({ message: 'Akses Ditolak: Hanya untuk Administrator.' });
    }
};

// --- PERBAIKAN: Fungsi getTingkatBiaya dan getKolomGolongan ---
const getTingkatBiaya = (pegawai) => {
    const jabatan = (pegawai.jabatan || '').toLowerCase().trim();

    // Aturan berdasarkan permintaan:
    // Golongan B: Jabatan Kepala Dinas
    if (jabatan.includes('kepala dinas')) {
        return 'Golongan B';
    }

    // Golongan C: Jabatan Sekretaris, Kepala Bagian, Kepala Bidang
    if (jabatan.startsWith('sekretaris') || jabatan.startsWith('kepala bagian') || jabatan.startsWith('kepala bidang')) {
        return 'Golongan C';
    }

    // Golongan D: Jabatan Kepala Seksi, Kepala Sub Bagian, Kepala Sub Bidang, dan lainnya
    return 'Golongan D';
};

const getKolomGolongan = (tingkatBiaya) => {
    const mapping = {
        'Golongan B': 'gol_b',
        'Golongan C': 'gol_c',
        'Golongan D': 'gol_d',
    };
    return mapping[tingkatBiaya] || 'gol_d';
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

// Halaman Register SPT
app.get('/spt', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'spt-register.html'));
});

// Halaman Edit SPT
app.get('/edit-spt/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tambah-spt.html'));
});

// Halaman Cetak SPT
app.get('/cetak/spt/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cetak-spt.html'));
});

// Halaman Cetak SPPD
app.get('/cetak/sppd/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cetak-sppd.html'));
});

// Halaman Cetak SPPD Detail
app.get('/cetak/sppd-detail/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cetak-sppd.html'));
});

// Halaman Anggaran
app.get('/anggaran', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'anggaran.html'));
});

// Halaman Tambah Pegawai
app.get('/pegawai', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pegawai.html'));
});

// Route untuk halaman Standar Biaya
app.get('/standar-biaya', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'standar-biaya.html'));
});

// Rute untuk halaman Laporan Register
app.get('/laporan', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'laporan-register.html'));
});

// Rute untuk halaman Pembayaran
app.get('/pembayaran', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pembayaran.html'));
});

// Rute untuk halaman Buat Laporan
app.get('/buat-laporan', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'buat-laporan.html'));
});

// Rute untuk halaman Edit Laporan (menggunakan file yang sama dengan buat-laporan)
app.get('/edit-laporan/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'buat-laporan.html'));
});

// Rute untuk halaman Cetak Laporan
app.get('/cetak/laporan/:id', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cetak-laporan.html'));
});

// API untuk mendapatkan data pengguna yang sedang login
app.get('/me', isApiAuthenticated, (req, res) => {
    if (req.session && req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ message: 'Tidak terautentikasi' });
    }
});

// Halaman Setelan (terproteksi)
app.get('/setelan', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'setelan.html'));
});

// Halaman Profil (terproteksi)
app.get('/profil', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profil.html'));
});

// Rute untuk halaman manajemen pengguna
app.get('/pengguna', isAuthenticated, isAdminOrSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna.html'));
});

// Rute untuk halaman edit pengguna
app.get('/edit-pengguna/:id', isAuthenticated, isAdminOrSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'edit-pengguna.html'));
});

// Rute untuk halaman tambah pengguna
app.get('/tambah-pengguna', isAuthenticated, isAdminOrSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tambah-pengguna.html'));
});

// Rute untuk halaman pengaturan aplikasi
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

// Middleware "pembersih" untuk rute pegawai
app.use('/api/pegawai', (req, res, next) => {
    if (req.body && req.body.nama_lengkap && !req.body.nama) {
        req.body.nama = req.body.nama_lengkap;
    }
    next();
});

app.use('/api/pegawai', isApiAuthenticated, pegawaiRoutes);

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
    const { nama, jabatan, nip } = req.body;
    if (!nama || !jabatan) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const sql = 'INSERT INTO pejabat (nama, jabatan, nip) VALUES (?, ?, ?)';
        const result = await runQuery(sql, [nama, jabatan, nip || null]);
        res.status(201).json({ id: result.lastID, nama, jabatan, nip });
    } catch (err) {
        console.error('[API ERROR] Gagal menambah pejabat:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT (update) a pejabat
app.put('/api/pejabat/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { nama, jabatan, nip } = req.body;
    if (!nama || !jabatan) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const sql = 'UPDATE pejabat SET nama = ?, jabatan = ?, nip = ? WHERE id = ?';
        const result = await runQuery(sql, [nama, jabatan, nip || null, req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data pejabat tidak ditemukan.' });
        }
        res.json({ id: req.params.id, nama, jabatan, nip });
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
        const sql = `
            SELECT 
                s.id, s.nomor_surat, s.tanggal_surat, s.maksud_perjalanan, s.lokasi_tujuan, 
                s.tanggal_berangkat, s.status,
                p.nama as pejabat_nama, p.jabatan as pejabat_jabatan,
                (SELECT COUNT(*) FROM laporan_perjadin WHERE spt_id = s.id) as laporan_count
            FROM spt s
            LEFT JOIN pejabat p ON s.pejabat_pemberi_tugas_id = p.id
            ORDER BY s.tanggal_surat DESC, s.id DESC
        `;
        const spts = await dbAll(sql);

        for (const spt of spts) {
            const pegawaiSql = `
                SELECT pg.nama_lengkap, pg.nip FROM spt_pegawai sp
                JOIN pegawai pg ON sp.pegawai_id = pg.id
                WHERE sp.spt_id = ?
            `;
            const pegawaiRows = await dbAll(pegawaiSql, [spt.id]);
            // Mengubah nama properti agar konsisten dan menyertakan data lengkap
            // Frontend (spt-register.js) mengharapkan array of strings (nama) di properti `pegawai_ditugaskan`
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

        // Memperkaya data pegawai dengan join ke tabel pegawai
        const pegawaiSql = `
            SELECT p.id as pegawai_id, p.nama_lengkap, p.nip, p.jabatan, sp.is_pengikut 
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ?
            ORDER BY sp.urutan ASC
        `;
        const pegawaiRows = await dbAll(pegawaiSql, [req.params.id]);
        spt.pegawai = pegawaiRows;

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
        maksud_perjalanan, lokasi_tujuan, tempat_berangkat, tanggal_berangkat, tanggal_kembali,
        lama_perjalanan, sumber_dana, kendaraan, anggaran_id, pegawai, keterangan
    } = req.body;

    if (!nomor_surat || !tanggal_surat || !dasar_surat || !pejabat_pemberi_tugas_id ||
        !maksud_perjalanan || !lokasi_tujuan || !tanggal_berangkat || !tanggal_kembali ||
        !lama_perjalanan || !sumber_dana || !kendaraan || !anggaran_id || !pegawai ||
        pegawai.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua kolom yang wajib diisi.' });
    }

    const hasNonFollower = pegawai.some(p => p.pengikut === '0' || p.pengikut === 0);
    if (!hasNonFollower) {
        return res.status(400).json({ message: 'Harus ada minimal satu pegawai yang ditugaskan (bukan pengikut).' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        const sptSql = `INSERT INTO spt (
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, maksud_perjalanan, lokasi_tujuan, tempat_berangkat, tanggal_berangkat, tanggal_kembali, lama_perjalanan, sumber_dana, kendaraan, anggaran_id, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const sptResult = await runQuery(sptSql, [
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, maksud_perjalanan, lokasi_tujuan, tempat_berangkat || 'Nanga Pinoh', tanggal_berangkat, tanggal_kembali, lama_perjalanan, sumber_dana, kendaraan, anggaran_id, keterangan || ''
        ]);

        const newSptId = sptResult.lastID;

        const sptPegawaiSql = 'INSERT INTO spt_pegawai (spt_id, pegawai_id, is_pengikut, urutan) VALUES (?, ?, ?, ?)';
        for (const [index, pegawaiItem] of pegawai.entries()) {
            await runQuery(sptPegawaiSql, [newSptId, pegawaiItem.id, pegawaiItem.pengikut, index]);
        }

        // Buat SPPD otomatis untuk setiap pegawai yang BUKAN pengikut
        const pelaksanaTugas = pegawai.filter(p => p.pengikut === '0' || p.pengikut === 0);
        const sppdSql = `INSERT INTO sppd (spt_id, pegawai_id, nomor_sppd, tanggal_sppd) VALUES (?, ?, ?, ?)`;
        let sppdCounter = 1;
        for (const pelaksana of pelaksanaTugas) {
            const nomorSppd = `090/${newSptId}.${sppdCounter++}/SPD/${new Date(tanggal_surat).getFullYear()}`;
            await runQuery(sppdSql, [newSptId, pelaksana.id, nomorSppd, tanggal_surat]);
        }

        await runQuery('COMMIT');
        res.status(201).json({ message: 'SPT dan SPPD berhasil dibuat!', sptId: newSptId });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));

        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Nomor surat sudah digunakan. Gunakan nomor surat yang berbeda.' });
        } else if (err.message.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
            return res.status(400).json({
                message: 'Data terkait (pejabat, anggaran, atau pegawai) tidak valid. Pastikan pilihan Anda ada di daftar.',
                error: err.message // Sertakan pesan error asli dari database untuk debugging lebih lanjut
            });
        }

        console.error('[API ERROR] Gagal menyimpan SPT:', err);
        res.status(500).json({ message: 'Gagal menyimpan SPT dan SPPD.', error: err.message });
    }
});

// PUT: Memperbarui SPT yang sudah ada
app.put('/api/spt/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
        maksud_perjalanan, lokasi_tujuan, tempat_berangkat, tanggal_berangkat, tanggal_kembali,
        lama_perjalanan, sumber_dana, kendaraan, anggaran_id, pegawai, keterangan
    } = req.body;

    if (!nomor_surat || !tanggal_surat || !dasar_surat || !pejabat_pemberi_tugas_id ||
        !maksud_perjalanan || !lokasi_tujuan || !tanggal_berangkat || !tanggal_kembali ||
        !lama_perjalanan || !sumber_dana || !kendaraan || !anggaran_id || !pegawai ||
        pegawai.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua kolom yang wajib diisi.' });
    }

    const hasNonFollower = pegawai.some(p => p.pengikut === '0' || p.pengikut === 0);
    if (!hasNonFollower) {
        return res.status(400).json({ message: 'Harus ada minimal satu pegawai yang ditugaskan (bukan pengikut).' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        const sptSql = `UPDATE spt SET 
            nomor_surat = ?, tanggal_surat = ?, dasar_surat = ?, pejabat_pemberi_tugas_id = ?, maksud_perjalanan = ?, lokasi_tujuan = ?, tempat_berangkat = ?, tanggal_berangkat = ?, tanggal_kembali = ?, lama_perjalanan = ?, sumber_dana = ?, kendaraan = ?, anggaran_id = ?, keterangan = ?
            WHERE id = ?`;

        await runQuery(sptSql, [
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, maksud_perjalanan, lokasi_tujuan, tempat_berangkat || 'Nanga Pinoh', tanggal_berangkat, tanggal_kembali, lama_perjalanan, sumber_dana, kendaraan, anggaran_id, keterangan || '', id
        ]);

        await runQuery('DELETE FROM spt_pegawai WHERE spt_id = ?', [id]);

        const sptPegawaiSql = 'INSERT INTO spt_pegawai (spt_id, pegawai_id, is_pengikut, urutan) VALUES (?, ?, ?, ?)';
        for (const [index, pegawaiItem] of pegawai.entries()) {
            await runQuery(sptPegawaiSql, [id, pegawaiItem.id, pegawaiItem.pengikut, index]);
        }

        // Hapus SPPD lama dan buat ulang sesuai daftar pelaksana yang baru
        await runQuery('DELETE FROM sppd WHERE spt_id = ?', [id]);

        const pelaksanaTugas = pegawai.filter(p => p.pengikut === '0' || p.pengikut === 0);
        const sppdSql = `INSERT INTO sppd (spt_id, pegawai_id, nomor_sppd, tanggal_sppd) VALUES (?, ?, ?, ?)`;
        let sppdCounter = 1;
        for (const pelaksana of pelaksanaTugas) {
            const nomorSppd = `090/${id}.${sppdCounter++}/SPD/${new Date(tanggal_surat).getFullYear()}`;
            await runQuery(sppdSql, [id, pelaksana.id, nomorSppd, tanggal_surat]);
        }

        // PERBAIKAN: Sinkronkan data ke laporan yang sudah ada
        const laporanTerkait = await dbGet('SELECT id FROM laporan_perjadin WHERE spt_id = ?', [id]);
        if (laporanTerkait) {
            console.log(`[SYNC] Laporan ID ${laporanTerkait.id} ditemukan untuk SPT ID ${id}. Melakukan sinkronisasi...`);
            const lamaDanTanggal = `${lama_perjalanan} hari, dari ${new Date(tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s/d ${new Date(tanggal_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

            const syncSql = `UPDATE laporan_perjadin SET
                dasar_perjalanan = ?,
                tujuan_perjalanan = ?,
                lama_dan_tanggal_perjalanan = ?,
                tempat_dikunjungi = ?
                WHERE id = ?`;
            await runQuery(syncSql, [dasar_surat, maksud_perjalanan, lamaDanTanggal, lokasi_tujuan, laporanTerkait.id]);
            console.log(`[SYNC] Laporan ID ${laporanTerkait.id} berhasil disinkronkan.`);
        }

        await runQuery('COMMIT');
        res.json({ message: 'Surat Perintah Tugas berhasil diperbarui!', sptId: id });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));

        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Nomor surat sudah digunakan. Gunakan nomor surat yang berbeda.' });
        } else if (err.message.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
            return res.status(400).json({
                message: 'Data terkait (pejabat, anggaran, atau pegawai) tidak valid. Pastikan pilihan Anda ada di daftar.',
                error: err.message // Sertakan pesan error asli dari database untuk debugging lebih lanjut
            });
        }

        console.error(`[API ERROR] Gagal memperbarui SPT id ${id}:`, err);
        res.status(500).json({ message: 'Gagal memperbarui SPT.', error: err.message });
    }
});

// DELETE: Menghapus SPT
app.delete('/api/spt/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await runQuery('BEGIN TRANSACTION');

        // PERBAIKAN: Hapus laporan terkait terlebih dahulu
        console.log(`[DELETE] Mencari dan menghapus laporan terkait untuk SPT ID: ${id}`);
        await runQuery('DELETE FROM laporan_perjadin WHERE spt_id = ?', [id]);

        // Hapus SPT (ini akan otomatis menghapus data di spt_pegawai dan sppd karena ON DELETE CASCADE)
        const result = await runQuery('DELETE FROM spt WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
        }
        await runQuery('COMMIT');
        res.json({ message: 'Data SPT berhasil dihapus.' });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback saat hapus SPT:', rbErr));
        console.error(`[API ERROR] Gagal menghapus SPT id ${id}:`, err);
        res.status(500).json({ message: 'Gagal menghapus SPT.', error: err.message });
    }
});

// POST: Membatalkan SPT
app.post('/api/spt/cancel', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { spt_id, tempat_pembatalan, tanggal_pembatalan, alasan } = req.body;

    if (!spt_id || !tempat_pembatalan || !tanggal_pembatalan) {
        return res.status(400).json({ message: 'Data pembatalan tidak lengkap.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        // 1. Update status di tabel SPT
        const updateResult = await runQuery("UPDATE spt SET status = 'dibatalkan' WHERE id = ? AND status = 'aktif'", [spt_id]);
        if (updateResult.changes === 0) {
            throw new Error('SPT tidak ditemukan atau sudah dibatalkan sebelumnya.');
        }

        // 2. Simpan catatan pembatalan
        const insertSql = 'INSERT INTO pembatalan_spt (spt_id, tempat_pembatalan, tanggal_pembatalan, alasan) VALUES (?, ?, ?, ?)';
        await runQuery(insertSql, [spt_id, tempat_pembatalan, tanggal_pembatalan, alasan]);

        await runQuery('COMMIT');
        res.status(200).json({ message: 'Surat Tugas berhasil dibatalkan.' });
    } catch (error) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback pembatalan:', rbErr));
        console.error('[API ERROR] Gagal membatalkan SPT:', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
    }
});

// --- Rute API SPPD (Surat Perjalanan Dinas) ---

// GET: Mengambil semua data SPPD untuk register
app.get('/api/sppd', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `
            SELECT 
                sp.id, sp.nomor_sppd, sp.tanggal_sppd, sp.spt_id,
                s.nomor_surat, s.tanggal_surat, s.maksud_perjalanan, s.lokasi_tujuan,
                s.tanggal_berangkat, s.tanggal_kembali,
                p.nama_lengkap as pegawai_nama, p.nip as pegawai_nip
            FROM sppd sp
            JOIN spt s ON sp.spt_id = s.id
            JOIN spt_pegawai spg ON s.id = spg.spt_id AND spg.is_pengikut = 0
            JOIN pegawai p ON spg.pegawai_id = p.id
            ORDER BY sp.tanggal_sppd DESC, sp.id DESC
        `;
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

// GET: Mengambil data SPPD berdasarkan ID untuk keperluan cetak
app.get('/api/sppd/:id', isApiAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const sql = `
            SELECT 
                sp.*, 
                s.nomor_surat, s.tanggal_surat, s.maksud_perjalanan, s.lokasi_tujuan,
                s.tanggal_berangkat, s.tanggal_kembali, s.kendaraan, s.lama_perjalanan,
                p.nama_lengkap as pegawai_nama, p.nip as pegawai_nip, p.pangkat, p.golongan, p.jabatan,
                pj.nama as pejabat_nama, pj.jabatan as pejabat_jabatan, pj.nip as pejabat_nip
            FROM sppd sp
            JOIN spt s ON sp.spt_id = s.id
            LEFT JOIN spt_pegawai spg ON s.id = spg.spt_id AND spg.is_pengikut = 0
            LEFT JOIN pegawai p ON spg.pegawai_id = p.id
            LEFT JOIN pejabat pj ON s.pejabat_pemberi_tugas_id = pj.id
            WHERE sp.id = ?
        `;

        const sppdData = await dbGet(sql, [id]);

        if (!sppdData) {
            return res.status(404).json({ message: 'SPD tidak ditemukan.' });
        }

        const pengikutSql = `
            SELECT p.nama_lengkap, p.nip 
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ? AND sp.is_pengikut = 1
        `;
        const pengikut = await dbAll(pengikutSql, [sppdData.spt_id]);

        res.json({
            sppd: sppdData,
            spt: {
                nomor_surat: sppdData.nomor_surat,
                tanggal_surat: sppdData.tanggal_surat,
                maksud_perjalanan: sppdData.maksud_perjalanan,
                lokasi_tujuan: sppdData.lokasi_tujuan,
                tanggal_berangkat: sppdData.tanggal_berangkat,
                tanggal_kembali: sppdData.tanggal_kembali,
                kendaraan: sppdData.kendaraan,
                lama_perjalanan: sppdData.lama_perjalanan
            },
            pegawai: {
                nama_lengkap: sppdData.pegawai_nama,
                nip: sppdData.pegawai_nip,
                pangkat: sppdData.pangkat,
                golongan: sppdData.golongan,
                jabatan: sppdData.jabatan
            },
            pejabat: {
                nama: sppdData.pejabat_nama,
                jabatan: sppdData.pejabat_jabatan,
                nip: sppdData.pejabat_nip
            },
            pengikut: pengikut
        });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data SPD:', err);
        res.status(500).json({ message: 'Gagal mengambil data SPD.' });
    }
});

// API untuk membuat SPD otomatis dari SPT
app.post('/api/sppd/auto-create', isApiAuthenticated, async (req, res) => {
    try {
        const { spt_id } = req.body;

        const spt = await dbGet("SELECT * FROM spt WHERE id = ?", [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'SPT tidak ditemukan.' });
        }

        const existingSppd = await dbGet("SELECT * FROM sppd WHERE spt_id = ?", [spt_id]);
        if (existingSppd) {
            return res.status(400).json({ message: 'SPD sudah ada untuk SPT ini.' });
        }

        const currentYear = new Date().getFullYear();
        const countSppd = await dbGet("SELECT COUNT(*) as count FROM sppd WHERE strftime('%Y', tanggal_sppd) = ?", [currentYear.toString()]);
        const nomorSppd = `800/${countSppd.count + 1}/SETDA/${currentYear}`;

        const insertSql = `
            INSERT INTO sppd (nomor_sppd, tanggal_sppd, spt_id) 
            VALUES (?, datetime('now'), ?)
        `;
        const result = await runQuery(insertSql, [nomorSppd, spt_id]);

        res.json({
            message: 'SPD berhasil dibuat otomatis.',
            sppdId: result.lastID,
            nomorSppd: nomorSppd
        });
    } catch (err) {
        console.error('[API ERROR] Gagal membuat SPD otomatis:', err);
        res.status(500).json({ message: 'Gagal membuat SPD otomatis.' });
    }
});

// GET: Mengambil data SPPD berdasarkan SPT ID untuk keperluan cetak
app.get('/api/sppd/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    try {
        const { spt_id } = req.params;

        const sptSql = "SELECT * FROM spt WHERE id = ?";
        const spt = await dbGet(sptSql, [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT terkait tidak ditemukan.' });
        }

        // Ambil SEMUA SPPD yang terkait dengan SPT ini
        const sppdList = await dbAll("SELECT * FROM sppd WHERE spt_id = ?", [spt_id]);
        if (!sppdList || sppdList.length === 0) {
            return res.status(404).json({ message: `Tidak ada data SPPD yang ditemukan untuk SPT ID ${spt_id}.` });
        }

        // Untuk setiap SPPD, ambil detail pegawai yang bersangkutan
        for (const sppd of sppdList) {
            const pegawaiSql = `SELECT * FROM pegawai WHERE id = ?`;
            const pegawai = await dbGet(pegawaiSql, [sppd.pegawai_id]);
            sppd.pegawai = pegawai || { nama_lengkap: 'Data Pegawai Tidak Ditemukan' };
        }

        let pejabat = await dbGet("SELECT id, nama, jabatan, nip FROM pejabat WHERE id = ?", [spt.pejabat_pemberi_tugas_id]);
        if (!pejabat) {
            const pegawaiAsPejabat = await dbGet("SELECT id, nama_lengkap as nama, jabatan, nip FROM pegawai WHERE id = ?", [spt.pejabat_pemberi_tugas_id]);
            pejabat = pegawaiAsPejabat;
        }

        if (!pejabat) {
            console.warn(`[WARN] Pejabat pemberi tugas dengan ID ${spt.pejabat_pemberi_tugas_id} tidak ditemukan untuk SPT ID ${spt.id}.`);
            pejabat = { nama: 'Data Pejabat Tidak Ditemukan', jabatan: 'Data Jabatan Tidak Ditemukan', nip: '-' };
        }

        let anggaran = await dbGet("SELECT mata_anggaran_kode, mata_anggaran_nama FROM anggaran WHERE id = ?", [spt.anggaran_id]);
        if (!anggaran) {
            console.warn(`[WARN] Data anggaran dengan ID ${spt.anggaran_id} tidak ditemukan untuk SPT ID ${spt.id}.`);
            anggaran = { mata_anggaran_kode: 'Tidak Ditemukan', mata_anggaran_nama: '' };
        }

        // Ambil data Pengguna Anggaran (Kepala Dinas)
        let penggunaAnggaran = await dbGet("SELECT nama_lengkap FROM pegawai WHERE jabatan = 'Kepala Dinas' LIMIT 1");
        if (!penggunaAnggaran) {
            console.warn(`[WARN] Data Pengguna Anggaran (Kepala Dinas) tidak ditemukan.`);
            penggunaAnggaran = { nama_lengkap: 'Kepala Dinas (Data tidak ditemukan)' };
        }

        const pengikutSql = `
            SELECT p.nama_lengkap, p.nip 
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ? AND sp.is_pengikut = 1
        `;
        const pengikut = await dbAll(pengikutSql, [spt_id]);

        res.json({ sppdList, spt, pejabat, pengikut, anggaran, penggunaAnggaran });

    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil SPPD untuk SPT id ${req.params.spt_id}:`, err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// --- Rute API Profil Pengguna (terproteksi) ---

// GET: Mengambil data profil gabungan untuk pengguna yang sedang login
app.get('/api/user/profile', isApiAuthenticated, async (req, res) => {
    const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
    try {
        const user = await dbGet(sql, [req.session.user.id]);
        if (!user) {
            return res.status(404).json({ message: 'Profil pengguna tidak ditemukan.' });
        }
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
    if (userRole === 'superadmin' && username !== oldUsername) {
        return res.status(403).json({ message: 'Super Admin tidak dapat mengubah username.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION', []);

        const currentUser = await dbGet('SELECT foto_profil FROM users WHERE id = ?', [userId]);

        if (username !== oldUsername) {
            const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existingUser) {
                throw new Error('Username tersebut sudah digunakan.');
            }
        }

        if (nip) {
            const existingNipUser = await dbGet('SELECT id FROM users WHERE nip = ? AND id != ?', [nip, userId]);
            if (existingNipUser) {
                throw new Error('NIP tersebut sudah digunakan oleh pengguna lain.');
            }
        }

        let updateFields = ['name = ?', 'username = ?', 'nip = ?', 'jabatan = ?'];
        let updateParams = [name, username, nip || null, jabatan || null];

        if (newPassword && newPassword.length > 0) {
            if (newPassword.length < 6) { throw new Error('Password baru minimal harus 6 karakter.'); }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateFields.push('password = ?');
            updateParams.push(hashedPassword);
        }

        if (req.file) {
            const newPhotoPath = req.file.path.replace(/\\/g, "/").replace('public/', '');
            updateFields.push('foto_profil = ?');
            updateParams.push(newPhotoPath);

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

        req.session.user.name = name;
        req.session.user.username = username;
        req.session.save();

        res.json({ message: 'Profil berhasil diperbarui.' });

    } catch (error) {
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
        if (!name || !username || !password || !role) {
            return res.status(400).json({ message: 'Semua field harus diisi.' });
        }

        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan.' });
        }

        const hash = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)';

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
app.get('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
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
app.put('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { name, username, role, password } = req.body;
    const userIdToUpdate = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
        if (!name || !username || !role) {
            return res.status(400).json({ message: 'Nama, username, dan role harus diisi.' });
        }

        const userToUpdate = await dbGet('SELECT role FROM users WHERE id = ?', [userIdToUpdate]);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        if (loggedInUser.role === 'admin') {
            if (userToUpdate.role !== 'user') {
                return res.status(403).json({ message: 'Admin hanya dapat mengubah pengguna dengan peran "User".' });
            }
            if (role === 'admin' || role === 'superadmin') {
                return res.status(403).json({ message: 'Admin tidak dapat memberikan peran "Admin" atau "Super Admin".' });
            }
        }

        if (loggedInUser.role === 'superadmin' && userToUpdate.role === 'superadmin' && role !== 'superadmin') {
            const superadminCountResult = await dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'");
            if (superadminCountResult && superadminCountResult.count <= 1) {
                return res.status(403).json({ message: 'Tidak dapat mengubah peran Super Admin terakhir.' });
            }
        }

        const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userIdToUpdate]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan oleh pengguna lain.' });
        }

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
app.delete('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
        if (userIdToDelete === loggedInUser.id) {
            return res.status(403).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        }

        const userToDelete = await dbGet('SELECT role FROM users WHERE id = ?', [userIdToDelete]);
        if (!userToDelete) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        if (loggedInUser.role === 'admin' && userToDelete.role !== 'user') {
            return res.status(403).json({ message: 'Admin hanya dapat menghapus pengguna dengan peran "User".' });
        }

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
            const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
            const user = await dbGet(sql, [req.session.user.id]);

            if (user) {
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

// API untuk data dashboard (dibuat dinamis)
app.get('/api/dashboard/stats', isApiAuthenticated, async (req, res) => {
    try {
        const sqlTotal = 'SELECT COUNT(*) as totalPerjalanan FROM sppd';
        const sqlBulanIni = `
            SELECT COUNT(*) as perjalananBulanIni FROM sppd 
            JOIN spt ON sppd.spt_id = spt.id 
            WHERE strftime('%Y-%m', spt.tanggal_berangkat) = strftime('%Y-%m', 'now')
        `;
        const sqlPerjalananPerBulan = `
            SELECT
                strftime('%Y-%m', s.tanggal_berangkat) as bulan,
                COUNT(*) as jumlah
            FROM sppd sp
            JOIN spt s ON sp.spt_id = s.id
            WHERE s.tanggal_berangkat >= date('now', '-12 months')
            GROUP BY bulan
            ORDER BY bulan ASC
        `;
        const [totalRow, bulanIniRow, perjalananBulananData] = await Promise.all([
            dbGet(sqlTotal),
            dbGet(sqlBulanIni),
            dbAll(sqlPerjalananPerBulan)
        ]);

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

/**
 * Menjalankan query dengan penanganan retry jika database terkunci.
 * @param {string} sql - Perintah SQL.
 * @param {Array} params - Parameter untuk SQL.
 * @returns {Promise<object>}
 */
const runQueryWithRetry = (sql, params = []) => new Promise((resolve, reject) => {
    const tryQuery = (retries = 5) => {
        db.run(sql, params, function (err) {
            if (err && err.code === 'SQLITE_BUSY' && retries > 0) {
                console.warn(`[DB WARN] Database sibuk, mencoba lagi... Sisa percobaan: ${retries - 1}`);
                setTimeout(() => tryQuery(retries - 1), 100); // Tunggu 100ms sebelum mencoba lagi
            } else if (err) reject(err);
            else resolve(this);
        });
    };
    tryQuery();
});

// POST: Upload data standar biaya dari Excel
app.post('/api/standar-biaya/upload', isApiAuthenticated, isApiAdminOrSuperAdmin, upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const tipeBiaya = req.body.tipe_biaya;
    const filePath = req.file.path;

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];
        const standarBiayaData = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const headerRowsToSkip = (['A', 'B', 'E', 'F', 'G', 'H', 'I', 'J'].includes(tipeBiaya)) ? 2 : 1;

            if (rowNumber > headerRowsToSkip) {
                // PERBAIKAN: Paksa pembacaan setiap sel sebagai string untuk menghindari
                // masalah tipe data (misal: "Eselon II" dibaca sebagai angka).
                const rowData = [];
                // PERBAIKAN FINAL: Buat pembacaan sel lebih aman dengan memeriksa nilai null.
                // Ini mencegah error "Cannot read properties of null" pada sel kosong atau sel gabungan.
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowData[colNumber] = (cell.value !== null && cell.value !== undefined) ? cell.text : '';
                });

                let data = {};
                if (tipeBiaya === 'A' || tipeBiaya === 'B') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: rowData[8] || null
                    };
                } else if (tipeBiaya === 'C') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,
                        provinsi: rowData[2] || null,
                        satuan: rowData[3] || null,
                        gol_a: null,
                        gol_b: null,
                        gol_c: null,
                        gol_d: null,
                        besaran: rowData[4] || null,
                        biaya_kontribusi: rowData[5] || null
                    };
                } else if (tipeBiaya === 'D') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: null,
                        gol_b: null,
                        gol_c: null,
                        gol_d: null,
                        besaran: rowData[4] || null,
                        biaya_kontribusi: rowData[5] || null
                    };
                } else if (tipeBiaya === 'E') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,
                        provinsi: rowData[2] || null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'F') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'G') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'H') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'I') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'J') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: rowData[4] || null,
                        gol_b: rowData[5] || null,
                        gol_c: rowData[6] || null,
                        gol_d: rowData[7] || null,
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'K') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,
                        provinsi: rowData[2] || null,
                        satuan: rowData[3] || null,
                        gol_a: null,
                        gol_b: null,
                        gol_c: null,
                        gol_d: null,
                        besaran: rowData[4] || null,
                        biaya_kontribusi: null
                    };
                }

                standarBiayaData.push(data);
            }
        });

        // PERBAIKAN: Gunakan transaksi untuk memastikan operasi atomik
        await runQueryWithRetry('BEGIN TRANSACTION');
        await runQueryWithRetry('DELETE FROM standar_biaya WHERE tipe_biaya = ?', [tipeBiaya]);

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
        await runQueryWithRetry('COMMIT');

        fs.unlinkSync(filePath);

        res.json({ message: 'Data standar biaya berhasil diupload dan disimpan.' });
    } catch (error) {
        console.error('[API ERROR] Gagal memproses file Excel:', error);
        // Rollback transaksi jika terjadi error
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses file Excel.' });
    }
});

// --- API BARU: Mendapatkan Standar Biaya Akomodasi per Pegawai untuk SPT ---
app.get('/api/spt/:spt_id/accommodation-standards', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const spt = await dbGet(`SELECT lokasi_tujuan, tempat_berangkat FROM spt WHERE id = ?`, [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
        }

        const pegawaiSql = `
            SELECT p.id, p.jabatan, p.golongan
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ?
        `;
        const pegawaiList = await dbAll(pegawaiSql, [spt_id]);

        const locationsData = require('./public/data/locations.json');

        const cariJenisLokasi = (lokasi) => {
            const lokasiLower = lokasi.toLowerCase().trim();
            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        if (location.toLowerCase().includes(lokasiLower) || lokasiLower.includes(location.toLowerCase())) {
                            return { jenis: 'desa', nama: location, group: group.group };
                        }
                    }
                    if (group.group.toLowerCase().includes(lokasiLower) || lokasiLower.includes(group.group.toLowerCase().replace('kecamatan', '').trim())) {
                        return { jenis: 'kecamatan', nama: group.group };
                    }
                }
            }
            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) { // Provinsi
                    for (const location of group.locations) {
                        if (location.toLowerCase().includes(lokasiLower) || lokasiLower.includes(location.toLowerCase())) {
                            return { jenis: 'kabupaten', nama: location, provinsi: group.group };
                        }
                    }
                    if (group.group.toLowerCase() === lokasiLower) {
                        return { jenis: 'provinsi', nama: group.group };
                    }
                }
            }
            return { jenis: 'tidak_diketahui', nama: lokasi };
        };

        const infoLokasi = cariJenisLokasi(spt.lokasi_tujuan || '');

        // PERBAIKAN: Membuat fungsi pencarian standar biaya lebih tangguh
        const cariStandarAkomodasi = async (tipeBiaya, lokasiQuery) => {
            let query = '';
            // Bersihkan query dari kata-kata umum dan spasi berlebih
            const cleanLokasiQuery = lokasiQuery.replace(/kabupaten|kota|kab\.?/gi, '').trim();
            let params = [`%${cleanLokasiQuery}%`];

            if (tipeBiaya === 'B') { // Dalam kota
                // Cari kecocokan pada uraian yang sudah dibersihkan juga
                query = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'B' AND REPLACE(REPLACE(REPLACE(TRIM(UPPER(uraian)), 'KABUPATEN', ''), 'KOTA', ''), 'KAB.', '') LIKE TRIM(UPPER(?))`;
            } else if (tipeBiaya === 'E') { // Luar kota
                query = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'E' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
                // PERBAIKAN: Tangani kasus khusus untuk Jakarta
                const lokasiLower = cleanLokasiQuery.toLowerCase();
                if (lokasiLower.includes('dki') || lokasiLower.includes('jakarta')) {
                    console.log(`[DEBUG] Kueri Jakarta terdeteksi. Mengubah pencarian menjadi '%JAKARTA%'`);
                    params = ['%JAKARTA%'];
                }
            } else return null; // Tipe biaya tidak valid untuk akomodasi

            let result = await dbGet(query, params);
            if (!result) {
                // Jika tidak ketemu, coba cari dengan query yang lebih umum tanpa pembersihan
                const fallbackQuery = tipeBiaya === 'B' ? `SELECT * FROM standar_biaya WHERE tipe_biaya = 'B' AND TRIM(UPPER(uraian)) LIKE TRIM(UPPER(?))` : `SELECT * FROM standar_biaya WHERE tipe_biaya = 'E' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
                result = await dbGet(fallbackQuery, [`%${lokasiQuery}%`]);
            }

            return result;
        };

        let standarAkomodasi;
        if (infoLokasi.jenis === 'desa' || infoLokasi.jenis === 'kecamatan') {
            const namaKecamatan = (infoLokasi.jenis === 'desa' ? infoLokasi.group : infoLokasi.nama).replace('Kecamatan', '').trim();
            standarAkomodasi = await cariStandarAkomodasi('B', namaKecamatan);
        } else if (infoLokasi.jenis === 'kabupaten') {
            const tempatBerangkat = spt.tempat_berangkat || 'Nanga Pinoh';
            const isSameRegion = infoLokasi.nama.toLowerCase().includes(tempatBerangkat.toLowerCase());
            if (isSameRegion) {
                standarAkomodasi = await cariStandarAkomodasi('B', infoLokasi.nama);
            } else {
                standarAkomodasi = await cariStandarAkomodasi('E', infoLokasi.provinsi);
            }
        } else if (infoLokasi.jenis === 'provinsi') {
            standarAkomodasi = await cariStandarAkomodasi('E', infoLokasi.nama);
        } else {
            // Fallback: Asumsikan perjalanan luar negeri jika lokasi tidak terdefinisi dengan jelas
            standarAkomodasi = await cariStandarAkomodasi('E', spt.lokasi_tujuan.split(',').pop().trim());
        }

        if (!standarAkomodasi) {
            // PERBAIKAN: Jika masih tidak ditemukan, berikan fallback ke standar biaya pertama yang ada daripada 404
            console.warn(`[WARN] Standar biaya akomodasi untuk "${spt.lokasi_tujuan}" tidak ditemukan. Menggunakan fallback...`);
            standarAkomodasi = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'E' OR tipe_biaya = 'B' ORDER BY id LIMIT 1`);
            if (!standarAkomodasi) {
                return res.status(404).json({ message: `Standar biaya akomodasi untuk lokasi "${spt.lokasi_tujuan}" tidak ditemukan, dan tidak ada data standar biaya fallback yang tersedia.` });
            }
        }

        const accommodationStandards = {};
        pegawaiList.forEach(pegawai => {
            const tingkatBiaya = getTingkatBiaya(pegawai);
            const kolomGolongan = getKolomGolongan(tingkatBiaya);
            const harga = standarAkomodasi[kolomGolongan] || 0;
            accommodationStandards[pegawai.id] = harga;
        });

        res.json(accommodationStandards);

    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil standar akomodasi untuk SPT ID ${spt_id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// --- Rute API Laporan Perjalanan Dinas ---

// GET: Mengambil semua laporan untuk register
app.get('/api/laporan', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `
            SELECT 
                l.id, l.judul, l.tanggal_laporan, l.spt_id,
                s.nomor_surat
            FROM laporan_perjadin l
            JOIN spt s ON l.spt_id = s.id
            ORDER BY l.tanggal_laporan DESC
        `;
        const laporan = await dbAll(sql);
        res.json(laporan);
    } catch (error) {
        console.error('[API ERROR] Gagal mengambil daftar laporan:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// --- Rute API Laporan Perjalanan Dinas ---

// GET: Mengambil data satu laporan berdasarkan SPT_ID (UNTUK FORM PEMBAYARAN)
app.get('/api/laporan/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const sqlLaporan = `SELECT * FROM laporan_perjadin WHERE spt_id = ?`;
        const laporan = await dbGet(sqlLaporan, [spt_id]);

        const spt = await dbGet(`SELECT lokasi_tujuan, tempat_berangkat FROM spt WHERE id = ?`, [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT terkait tidak ditemukan.' });
        }

        if (!laporan) {
            return res.status(404).json({ message: 'Belum ada laporan yang dibuat untuk SPT ini.' });
        }

        let penandatanganIds = [];
        try {
            penandatanganIds = JSON.parse(laporan.penandatangan_ids || '[]');
            if (!Array.isArray(penandatanganIds)) penandatanganIds = [];
        } catch (e) {
            console.warn(`[API WARN] Gagal parse penandatangan_ids untuk laporan id ${laporan.id}.`);
        }

        // PERBAIKAN: Ambil data dari tabel-tabel baru dan gabungkan
        const [transportasi, akomodasi, kontribusi, lainLain] = await Promise.all([
            dbAll('SELECT * FROM laporan_transportasi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_akomodasi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_kontribusi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_lain_lain WHERE laporan_id = ?', [laporan.id])
        ]);

        const pengeluaranMap = new Map();

        const allItems = [...transportasi, ...akomodasi, ...kontribusi, ...lainLain];
        allItems.forEach(item => {
            if (!pengeluaranMap.has(item.pegawai_id)) {
                pengeluaranMap.set(item.pegawai_id, { pegawai_id: item.pegawai_id });
            }
            const pengeluaranPegawai = pengeluaranMap.get(item.pegawai_id);

            if (item.hasOwnProperty('perusahaan')) { // Transportasi
                pengeluaranPegawai.transportasi_nominal = (pengeluaranPegawai.transportasi_nominal || 0) + item.nominal;
                pengeluaranPegawai.transportasi_jenis = item.jenis;
            } else if (item.hasOwnProperty('malam')) { // Akomodasi
                pengeluaranPegawai.akomodasi_nominal = (pengeluaranPegawai.akomodasi_nominal || 0) + item.nominal;
                pengeluaranPegawai.akomodasi_harga_satuan = item.harga_satuan;
                pengeluaranPegawai.akomodasi_malam = item.malam;
                pengeluaranPegawai.akomodasi_jenis = item.jenis;
            } else if (item.hasOwnProperty('uraian')) { // Lain-lain
                pengeluaranPegawai.lain_lain_nominal = (pengeluaranPegawai.lain_lain_nominal || 0) + item.nominal;
                pengeluaranPegawai.lain_lain_uraian = item.uraian;
            } else { // Kontribusi
                pengeluaranPegawai.kontribusi_nominal = (pengeluaranPegawai.kontribusi_nominal || 0) + item.nominal;
                pengeluaranPegawai.kontribusi_jenis = item.jenis;
            }
        });

        const pengeluaran = Array.from(pengeluaranMap.values());

        if (penandatanganIds.length === 0) {
            return res.json({ penerima: [], pengeluaran: pengeluaran });
        }

        const placeholders = penandatanganIds.map(() => '?').join(',');
        const pegawaiSql = `
            SELECT id, nama_lengkap, nip, jabatan, golongan
            FROM pegawai 
            WHERE id IN (${placeholders})
        `;
        const penerimaFromDb = await dbAll(pegawaiSql, penandatanganIds);

        // =================================================================
        // === LOGIKA PENCARIAN STANDAR BIAYA ===
        // =================================================================
        const lokasiTujuan = spt.lokasi_tujuan || '';
        let isDalamKota = false;
        let lokasiUntukQuery = lokasiTujuan;

        const locationsData = require('./public/data/locations.json');

        const cariJenisLokasi = (lokasi) => {
            const lokasiLower = lokasi.toLowerCase().trim();
            console.log(`[DEBUG LOKASI] Mencari jenis lokasi untuk: "${lokasi}"`);

            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        const locationLower = location.toLowerCase();
                        if (locationLower.includes(lokasiLower) || lokasiLower.includes(locationLower)) {
                            return { jenis: 'desa', nama: location, group: group.group };
                        }
                    }
                }
            }

            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    const groupLower = group.group.toLowerCase();
                    if (groupLower.includes(lokasiLower) || lokasiLower.includes(groupLower.replace('kecamatan', '').trim())) {
                        return { jenis: 'kecamatan', nama: group.group };
                    }
                }
            }

            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        const locationLower = location.toLowerCase();
                        const lokasiClean = lokasiLower.replace(/[.,]/g, '').trim(); // Hapus titik dan koma
                        const locationClean = locationLower.replace(/[.,]/g, '').trim();

                        if (locationClean.includes(lokasiClean) || lokasiClean.includes(locationClean) ||
                            (lokasiClean.includes('jakarta') && locationClean.includes('jakarta')) ||
                            (lokasiClean.includes('dki') && locationClean.includes('jakarta'))) {
                            return { jenis: 'kabupaten', nama: location, provinsi: group.group };
                        }
                    }
                }
            }

            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) {
                    const groupLower = group.group.toLowerCase();
                    const lokasiClean = lokasiLower.replace(/[.,]/g, '').trim();
                    const groupClean = groupLower.replace(/[.,]/g, '').trim();

                    if (groupClean === lokasiClean ||
                        (lokasiClean.includes('dki') && groupClean.includes('jakarta')) ||
                        (lokasiClean.includes('jakarta') && groupClean.includes('jakarta'))) {
                        return { jenis: 'provinsi', nama: group.group };
                    }
                }
            }

            console.log(`[DEBUG LOKASI] Jenis lokasi tidak dikenali untuk: ${lokasi}`);
            return { jenis: 'tidak_diketahui', nama: lokasi };
        };

        const infoLokasi = cariJenisLokasi(lokasiTujuan);
        console.log(`[LOKASI INFO] Untuk SPT ${spt_id}:`, infoLokasi);

        const cariStandarBiaya = async (tipeBiaya, lokasiQuery, isDalamKota) => {
            console.log(`[DEBUG STANDAR BIAYA] Mencari tipe ${tipeBiaya} untuk: "${lokasiQuery.trim()}" (dalam kota: ${isDalamKota})`);
            let result = null;
            if (tipeBiaya === 'A') {
                const queries = [
                    `SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' AND TRIM(UPPER(uraian)) = TRIM(UPPER(?))`,
                    `SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' AND TRIM(UPPER(uraian)) LIKE TRIM(UPPER(?))`
                ];
                const searchTerms = [lokasiQuery, `%${lokasiQuery}%`];
                for (let i = 0; i < queries.length; i++) {
                    result = await dbGet(queries[i], [searchTerms[i]]);
                    if (result) break;
                }
            } else if (tipeBiaya === 'C') {
                const queries = [
                    `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) = TRIM(UPPER(?))`
                ];
                let provinsiQuery = lokasiQuery.trim();
                const lokasiLower = provinsiQuery.toLowerCase(); // "dki jakarta"
                if (lokasiLower.includes('jakarta') || lokasiLower.includes('dki')) {
                    result = await dbGet(queries[0], ['DKI Jakarta']);
                    if (!result) {
                        const jakartaFallbackQuery = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) LIKE '%JAKARTA%'`;
                        result = await dbGet(jakartaFallbackQuery, []);
                    }
                } else {
                    result = await dbGet(queries[0], [provinsiQuery]);
                }
                if (!result && lokasiLower.includes('kepulauan')) {
                    const provinsiTanpaKepulauan = provinsiQuery.replace(/kepulauan/gi, '').trim();
                    result = await dbGet(queries[0], [provinsiTanpaKepulauan]);
                }
                if (!result) {
                    const fallbackQuery = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
                    result = await dbGet(fallbackQuery, [`%${provinsiQuery}%`]);
                }
            }
            return result;
        };

        let standarBiayaHarian;
        if (infoLokasi.jenis === 'desa' || infoLokasi.jenis === 'kecamatan') {
            const namaKecamatan = infoLokasi.jenis === 'desa' ? infoLokasi.group : infoLokasi.nama;
            const namaKecamatanClean = namaKecamatan.replace('Kecamatan', '').trim();
            console.log(`[INFO] Perjalanan Dalam Kota (Desa/Kecamatan) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'A' untuk: ${namaKecamatanClean}`);
            standarBiayaHarian = await cariStandarBiaya('A', namaKecamatanClean, true);
            isDalamKota = true;
            lokasiUntukQuery = namaKecamatanClean;
        } else if (infoLokasi.jenis === 'kabupaten') {
            const tempatBerangkat = spt.tempat_berangkat || 'Nanga Pinoh';
            const isSameRegion = infoLokasi.nama.toLowerCase().includes(tempatBerangkat.toLowerCase()) ||
                tempatBerangkat.toLowerCase().includes(infoLokasi.nama.toLowerCase()) ||
                (infoLokasi.nama.toLowerCase().includes('jakarta') && tempatBerangkat.toLowerCase().includes('jakarta'));
            const provinsiTujuan = (infoLokasi.provinsi || '').trim();
            if (isSameRegion) {
                console.log(`[INFO] Perjalanan Dalam Kota (Kabupaten) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'A' untuk: ${infoLokasi.nama}`);
                standarBiayaHarian = await cariStandarBiaya('A', infoLokasi.nama, true);
                isDalamKota = true;
            } else {
                console.log(`[INFO] Perjalanan Luar Daerah (Kabupaten) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'C' untuk: ${provinsiTujuan}`);
                standarBiayaHarian = await cariStandarBiaya('C', provinsiTujuan, false);
                isDalamKota = false;
            }
            lokasiUntukQuery = isDalamKota ? infoLokasi.nama.trim() : provinsiTujuan;
        } else if (infoLokasi.jenis === 'provinsi') {
            console.log(`[INFO] Perjalanan Luar Daerah (Provinsi) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'C' untuk: ${infoLokasi.nama.trim()}`);
            standarBiayaHarian = await cariStandarBiaya('C', infoLokasi.nama.trim(), false);
            isDalamKota = false;
            lokasiUntukQuery = infoLokasi.nama.trim();
        } else {
            console.log(`[WARN] Jenis lokasi tidak dikenali untuk: ${lokasiTujuan}. Menggunakan logika fallback.`);

            if (lokasiTujuan.toLowerCase().includes('kecamatan') || lokasiTujuan.toLowerCase().includes('desa')) {
                isDalamKota = true;
                lokasiUntukQuery = lokasiTujuan.split(',').shift().trim();
                standarBiayaHarian = await cariStandarBiaya('A', lokasiUntukQuery, true);
            } else if (lokasiTujuan.includes(',')) {
                isDalamKota = false;
                lokasiUntukQuery = lokasiTujuan.split(',').pop().trim();
                standarBiayaHarian = await cariStandarBiaya('C', lokasiUntukQuery, false);
            } else {
                isDalamKota = true;
                lokasiUntukQuery = lokasiTujuan.split(',')[0].trim();
                standarBiayaHarian = await cariStandarBiaya('A', lokasiUntukQuery, true);
            }
        }

        if (!standarBiayaHarian) {
            console.warn(`[WARN] Standar biaya tidak ditemukan untuk: ${lokasiUntukQuery} (Jenis: ${infoLokasi.jenis}). Mencari fallback...`);
            if (isDalamKota) {
                standarBiayaHarian = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' LIMIT 1`);
            } else {
                standarBiayaHarian = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' LIMIT 1`);
            }
            if (!standarBiayaHarian) {
                console.error(`[ERROR] Standar biaya fallback juga tidak ditemukan!`);
                standarBiayaHarian = {
                    satuan: 'OH',
                    besaran: 0,
                    gol_a: 0,
                    gol_b: 0,
                    gol_c: 0,
                    gol_d: 0,
                    biaya_kontribusi: 0
                };
            }
        }

        // =================================================================
        // === LOGIKA BARU: Ambil Biaya Representasi untuk Kepala Dinas (FINAL) ===
        // =================================================================
        const biayaRepresentasiEselonII = await dbGet(
            `SELECT * FROM standar_biaya WHERE tipe_biaya = 'D' AND (TRIM(UPPER(uraian)) = 'PEJABAT ESELON II' OR TRIM(UPPER(uraian)) LIKE '%ESELON II%')`
        );

        let representasiInfo = null;
        if (!biayaRepresentasiEselonII) {
            console.warn(`[WARN] Standar Biaya Representasi (Tipe D, Eselon II) tidak ditemukan di database. Biaya representasi tidak akan diterapkan.`);
            representasiInfo = {
                uraian: 'Biaya Representasi (Eselon II)',
                harga: 0,
                satuan: 'OH'
            };
        } else {
            console.log(`[DEBUG REPRESENTASI] Standar biaya representasi ditemukan:`, biayaRepresentasiEselonII);
            representasiInfo = {
                uraian: biayaRepresentasiEselonII.uraian || 'Biaya Representasi (Eselon II)',
                harga: isDalamKota ? (biayaRepresentasiEselonII.biaya_kontribusi || 0) : (biayaRepresentasiEselonII.besaran || 0),
                satuan: biayaRepresentasiEselonII.satuan || 'OH'
            };
        }

        // =================================================================
        // === AKHIR DARI BLOK LOGIKA ===
        // =================================================================

        const penerimaMap = new Map(penerimaFromDb.map(p => [p.id.toString(), p]));

        const penerima = penandatanganIds
            .map(id => {
                const p = penerimaMap.get(id.toString());
                if (!p) return null;

                const tingkatBiaya = getTingkatBiaya(p);
                const kolomGolongan = getKolomGolongan(tingkatBiaya);

                let hargaSatuanHarian = 0;
                if (standarBiayaHarian) {
                    hargaSatuanHarian = standarBiayaHarian[kolomGolongan] || standarBiayaHarian.besaran || 0;
                }

                p.uang_harian = {
                    harga_satuan: hargaSatuanHarian,
                    satuan: standarBiayaHarian ? standarBiayaHarian.satuan : 'OH',
                    golongan: tingkatBiaya
                };

                if (p && p.jabatan && p.jabatan.toLowerCase().includes('kepala dinas')) {
                    p.biaya_representasi = representasiInfo;
                    console.log(`[DEBUG REPRESENTASI] Info representasi untuk ${p.nama_lengkap}: Harga = ${representasiInfo.harga}`);
                }

                return p;
            }).filter(Boolean);

        res.json({ penerima, pengeluaran });

    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil laporan by-spt-id ${spt_id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});


// GET: Mengambil data satu laporan untuk edit/cetak
app.get('/api/laporan/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `SELECT * FROM laporan_perjadin WHERE id = ?`;
        const laporan = await dbGet(sql, [req.params.id]);
        if (!laporan) return res.status(404).json({ message: 'Laporan tidak ditemukan.' });

        // Ambil lampiran dan data pegawai untuk cetak
        const lampiranSql = `SELECT * FROM laporan_lampiran WHERE laporan_id = ?`;
        laporan.lampiran = await dbAll(lampiranSql, [req.params.id]);

        // Ambil semua pegawai (pelaksana dan pengikut) dari SPT terkait
        if (laporan.spt_id) {
            const pegawaiSql = `
                SELECT p.id as pegawai_id, p.nama_lengkap, p.nip, sp.is_pengikut
                FROM spt_pegawai sp
                JOIN pegawai p ON sp.pegawai_id = p.id
                WHERE sp.spt_id = ?
                ORDER BY sp.urutan ASC
            `;
            laporan.pegawai = await dbAll(pegawaiSql, [laporan.spt_id]);
        }

        // PERBAIKAN: Hapus query ke tabel 'laporan_pengeluaran' yang sudah tidak ada
        laporan.transportasi = await dbAll('SELECT * FROM laporan_transportasi WHERE laporan_id = ?', [req.params.id]);
        laporan.akomodasi = await dbAll('SELECT * FROM laporan_akomodasi WHERE laporan_id = ?', [req.params.id]);
        laporan.kontribusi = await dbAll('SELECT * FROM laporan_kontribusi WHERE laporan_id = ?', [req.params.id]);
        laporan.lain_lain = await dbAll('SELECT * FROM laporan_lain_lain WHERE laporan_id = ?', [req.params.id]);
        res.json(laporan);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil laporan id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// Konfigurasi Multer untuk laporan (berbeda dari upload Excel)
const laporanUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = 'public/uploads/laporan';
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `lampiran-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    })
});

// POST: Membuat laporan baru
app.post('/api/laporan', isApiAuthenticated, laporanUpload.array('lampiran', 10), async (req, res) => {
    const { pegawai, ...data } = req.body;

    try { // PERUBAHAN: Logika penyimpanan ke tabel-tabel baru
        await runQuery('BEGIN TRANSACTION');

        // Hapus kolom biaya lama dari tabel utama
        const laporanSql = `INSERT INTO laporan_perjadin (spt_id, tanggal_laporan, tempat_laporan, judul, dasar_perjalanan, tujuan_perjalanan, lama_dan_tanggal_perjalanan, deskripsi_kronologis, tempat_dikunjungi, hasil_dicapai, kesimpulan, penandatangan_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const result = await runQuery(laporanSql, [
            data.spt_id, data.tanggal_laporan, data.tempat_laporan, data.judul, data.dasar_perjalanan, data.tujuan_perjalanan,
            data.lama_dan_tanggal_perjalanan, data.deskripsi_kronologis, data.tempat_dikunjungi,
            data.hasil_dicapai, data.kesimpulan, data.penandatangan_ids
        ]);

        const laporanId = result.lastID;

        // Simpan data pengeluaran ke tabel masing-masing
        if (pegawai) {
            for (const pegawaiId in pegawai) {
                const pengeluaran = pegawai[pegawaiId];
                if (pengeluaran.transportasi) {
                    for (const item of pengeluaran.transportasi) {
                        await runQuery('INSERT INTO laporan_transportasi (laporan_id, pegawai_id, jenis, perusahaan, nominal) VALUES (?, ?, ?, ?, ?)', [laporanId, pegawaiId, item.jenis, item.perusahaan, item.nominal]);
                    }
                }
                if (pengeluaran.akomodasi) {
                    for (const item of pengeluaran.akomodasi) {
                        await runQuery('INSERT INTO laporan_akomodasi (laporan_id, pegawai_id, jenis, nama, harga_satuan, malam, nominal) VALUES (?, ?, ?, ?, ?, ?, ?)', [laporanId, pegawaiId, item.jenis, item.nama, item.harga_satuan, item.malam, item.nominal]);
                    }
                }
                if (pengeluaran.kontribusi) {
                    for (const item of pengeluaran.kontribusi) {
                        await runQuery('INSERT INTO laporan_kontribusi (laporan_id, pegawai_id, jenis, nominal) VALUES (?, ?, ?, ?)', [laporanId, pegawaiId, item.jenis, item.nominal]);
                    }
                }
                if (pengeluaran.lain_lain) {
                    for (const item of pengeluaran.lain_lain) {
                        await runQuery('INSERT INTO laporan_lain_lain (laporan_id, pegawai_id, uraian, nominal) VALUES (?, ?, ?, ?)', [laporanId, pegawaiId, item.uraian, item.nominal]);
                    }
                }
            }
        }

        if (req.files && req.files.length > 0) {
            const lampiranSql = 'INSERT INTO laporan_lampiran (laporan_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)';
            for (const file of req.files) {
                const filePath = file.path.replace(/\\/g, "/").replace('public/', '');
                await runQuery(lampiranSql, [laporanId, filePath, file.originalname, file.mimetype]);
            }
        }

        await runQuery('COMMIT');
        res.status(201).json({ message: 'Laporan berhasil disimpan!', laporanId: laporanId });
    } catch (error) {
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
        }
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('[API ERROR] Gagal menyimpan laporan:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});


// PUT: Memperbarui laporan yang ada
app.put('/api/laporan/:id', isApiAuthenticated, laporanUpload.array('lampiran', 10), async (req, res) => {
    const { id } = req.params;
    const { pegawai, ...data } = req.body;
    const deletedFiles = data.deleted_files ? JSON.parse(data.deleted_files) : [];

    try { // PERUBAHAN: Logika update ke tabel-tabel baru
        await runQuery('BEGIN TRANSACTION');

        // 1. Hapus file lama yang diminta untuk dihapus
        if (deletedFiles.length > 0) {
            const placeholders = deletedFiles.map(() => '?').join(',');
            const filesToDelete = await dbAll(`SELECT file_path FROM laporan_lampiran WHERE id IN (${placeholders})`, deletedFiles);

            for (const file of filesToDelete) {
                const oldFilePath = path.join(__dirname, 'public', file.file_path);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            await runQuery(`DELETE FROM laporan_lampiran WHERE id IN (${placeholders})`, deletedFiles);
        }

        // 2. Update data laporan utama
        // Hapus kolom biaya lama dari query update
        const updateFields = [
            'tanggal_laporan = ?', 'tempat_laporan = ?', 'judul = ?',
            'dasar_perjalanan = ?', 'tujuan_perjalanan = ?', 'lama_dan_tanggal_perjalanan = ?',
            'deskripsi_kronologis = ?', 'tempat_dikunjungi = ?', 'hasil_dicapai = ?',
            'kesimpulan = ?', 'penandatangan_ids = ?'
        ];

        const updateValues = [
            data.tanggal_laporan,
            data.tempat_laporan,
            data.judul,
            data.dasar_perjalanan,
            data.tujuan_perjalanan,
            data.lama_dan_tanggal_perjalanan,
            data.deskripsi_kronologis,
            data.tempat_dikunjungi,
            data.hasil_dicapai,
            data.kesimpulan,
            data.penandatangan_ids,
            id
        ];

        await runQuery(`UPDATE laporan_perjadin SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

        // 3. Hapus semua data pengeluaran lama dan masukkan yang baru
        await runQuery('DELETE FROM laporan_transportasi WHERE laporan_id = ?', [id]);
        await runQuery('DELETE FROM laporan_akomodasi WHERE laporan_id = ?', [id]);
        await runQuery('DELETE FROM laporan_kontribusi WHERE laporan_id = ?', [id]);
        await runQuery('DELETE FROM laporan_lain_lain WHERE laporan_id = ?', [id]);

        if (pegawai) {
            for (const pegawaiId in pegawai) {
                const pengeluaran = pegawai[pegawaiId];
                if (pengeluaran.transportasi) {
                    for (const item of pengeluaran.transportasi) {
                        await runQuery('INSERT INTO laporan_transportasi (laporan_id, pegawai_id, jenis, perusahaan, nominal) VALUES (?, ?, ?, ?, ?)', [id, pegawaiId, item.jenis, item.perusahaan, item.nominal]);
                    }
                }
                if (pengeluaran.akomodasi) {
                    for (const item of pengeluaran.akomodasi) {
                        await runQuery('INSERT INTO laporan_akomodasi (laporan_id, pegawai_id, jenis, nama, harga_satuan, malam, nominal) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, pegawaiId, item.jenis, item.nama, item.harga_satuan, item.malam, item.nominal]);
                    }
                }
                if (pengeluaran.kontribusi) {
                    for (const item of pengeluaran.kontribusi) {
                        await runQuery('INSERT INTO laporan_kontribusi (laporan_id, pegawai_id, jenis, nominal) VALUES (?, ?, ?, ?)', [id, pegawaiId, item.jenis, item.nominal]);
                    }
                }
                if (pengeluaran.lain_lain) {
                    for (const item of pengeluaran.lain_lain) {
                        await runQuery('INSERT INTO laporan_lain_lain (laporan_id, pegawai_id, uraian, nominal) VALUES (?, ?, ?, ?)', [id, pegawaiId, item.uraian, item.nominal]);
                    }
                }
            }
        }

        // 4. Simpan lampiran baru
        if (req.files && req.files.length > 0) {
            const lampiranSql = 'INSERT INTO laporan_lampiran (laporan_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)';
            for (const file of req.files) {
                const filePath = file.path.replace(/\\/g, "/").replace('public/', '');
                await runQuery(lampiranSql, [id, filePath, file.originalname, file.mimetype]);
            }
        }

        await runQuery('COMMIT');
        res.json({ message: 'Laporan berhasil diperbarui.' });
    } catch (error) {
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
        }
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('Error updating laporan:', error);
        res.status(500).json({ message: 'Gagal memperbarui laporan.', error: error.message });
    }
});


// DELETE: Menghapus laporan
app.delete('/api/laporan/:id', isApiAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // Ambil semua path lampiran terkait sebelum menghapus
        const lampiran = await dbAll('SELECT file_path FROM laporan_lampiran WHERE laporan_id = ?', [id]);

        // Hapus record laporan (akan menghapus lampiran via CASCADE)
        const result = await runQuery('DELETE FROM laporan_perjadin WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
        }

        // Hapus file fisik dari server
        if (lampiran && lampiran.length > 0) {
            for (const item of lampiran) {
                const filePath = path.join(__dirname, 'public', item.file_path);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }
        res.json({ message: 'Laporan berhasil dihapus.' });
    } catch (error) {
        console.error(`[API ERROR] Gagal menghapus laporan id ${id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// =================================================================
// API ENDPOINTS UNTUK PEMBAYARAN
// =================================================================

// Fungsi untuk generate nomor bukti unik
const generateNomorBukti = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `KWT/${year}/${month}/`;

    const lastPayment = await dbGet("SELECT nomor_bukti FROM pembayaran WHERE nomor_bukti LIKE ? ORDER BY id DESC LIMIT 1", [`${prefix}%`]);

    let nextNumber = 1;
    if (lastPayment) {
        const lastNumber = parseInt(lastPayment.nomor_bukti.split('/').pop(), 10);
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// GET: Mengambil semua data pembayaran
app.get('/api/pembayaran', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `SELECT * FROM pembayaran ORDER BY tanggal_bukti DESC, id DESC`;
        const pembayaran = await dbAll(sql);
        res.json(pembayaran);
    } catch (error) {
        console.error('[API ERROR] Gagal mengambil data pembayaran:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Mengambil satu data pembayaran untuk edit
app.get('/api/pembayaran/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `SELECT * FROM pembayaran WHERE id = ?`;
        const pembayaran = await dbGet(sql, [req.params.id]);
        if (!pembayaran) {
            return res.status(404).json({ message: 'Data pembayaran tidak ditemukan.' });
        }
        res.json(pembayaran);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil pembayaran id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// PUT: Memperbarui bukti pembayaran
app.put('/api/pembayaran/:id', isApiAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { panjar_data, ...data } = req.body; // Ambil panjar_data secara terpisah
        const sql = `UPDATE pembayaran SET anggaran_id = ?, spt_id = ?, nama_penerima = ?, uraian_pembayaran = ?, nominal_bayar = ?, panjar_data = ? WHERE id = ?`;
        await runQuery(sql, [data.anggaran_id, data.spt_id, data.nama_penerima, data.uraian_pembayaran, data.nominal_bayar, panjar_data, id]);
        res.json({ message: 'Bukti pembayaran berhasil diperbarui!' });
    } catch (error) {
        console.error(`[API ERROR] Gagal memperbarui bukti pembayaran id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// POST: Membuat bukti pembayaran baru
app.post('/api/pembayaran', isApiAuthenticated, async (req, res) => {
    try {
        const { panjar_data, ...data } = req.body; // Ambil panjar_data secara terpisah
        const nomorBukti = await generateNomorBukti();
        const tanggalBukti = new Date().toISOString().split('T')[0]; // Tanggal hari ini

        const sql = `INSERT INTO pembayaran (nomor_bukti, tanggal_bukti, anggaran_id, spt_id, nama_penerima, uraian_pembayaran, nominal_bayar, panjar_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await runQuery(sql, [nomorBukti, tanggalBukti, data.anggaran_id, data.spt_id, data.nama_penerima, data.uraian_pembayaran, data.nominal_bayar, panjar_data]);

        res.status(201).json({ message: 'Bukti pembayaran berhasil disimpan!' });
    } catch (error) {
        console.error('[API ERROR] Gagal menyimpan bukti pembayaran:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// DELETE: Menghapus bukti pembayaran
app.delete('/api/pembayaran/:id', isApiAuthenticated, async (req, res) => {
    runQuery('DELETE FROM pembayaran WHERE id = ?', [req.params.id])
        .then(() => res.json({ message: 'Bukti pembayaran berhasil dihapus.' }))
        .catch(err => res.status(500).json({ message: 'Gagal menghapus data.', error: err.message }));
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Aplikasi berjalan di http://localhost:${PORT}`);
});