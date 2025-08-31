const express = require('express');
const router = express.Router();
const db = require('../database.js');

// --- Promise-based DB helpers for cleaner async/await ---
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
    });
});

// --- Middleware untuk validasi data pegawai ---
const validatePegawai = (req, res, next) => {
    const { nama_lengkap, nip } = req.body;
    if (!nama_lengkap || !nip) {
        return res.status(400).json({ message: 'Nama lengkap dan NIP wajib diisi.' });
    }
    // Tambahkan validasi lain jika perlu (misal: format NIP)
    next();
};

// --- API Endpoints ---

// GET /api/pegawai - Mendapatkan semua data pegawai
router.get('/', async (req, res) => {
    try {
        const rows = await dbAll('SELECT id, nama_lengkap, nip, jabatan FROM pegawai ORDER BY nama_lengkap ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching all pegawai:', err);
        res.status(500).json({ message: 'Server error saat mengambil data pegawai.' });
    }
});

// GET /api/pegawai/:id - Mendapatkan satu data pegawai (untuk Edit)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pegawai = await dbGet('SELECT * FROM pegawai WHERE id = ?', [id]);
        if (pegawai) {
            res.json(pegawai);
        } else {
            res.status(404).json({ message: `Pegawai dengan ID ${id} tidak ditemukan.` });
        }
    } catch (err) {
        console.error(`Error fetching pegawai with id ${req.params.id}:`, err);
        res.status(500).json({ message: 'Server error saat mengambil data pegawai.' });
    }
});

// POST /api/pegawai - Membuat data pegawai baru
router.post('/', validatePegawai, async (req, res) => {
    try {
        const { nama_lengkap, nip, jabatan, golongan } = req.body;
        const sql = 'INSERT INTO pegawai (nama_lengkap, nip, jabatan, golongan) VALUES (?, ?, ?, ?)';
        const result = await dbRun(sql, [nama_lengkap, nip, jabatan || null, golongan || null]);
        const newPegawai = await dbGet('SELECT * FROM pegawai WHERE id = ?', [result.lastID]);
        res.status(201).json(newPegawai);
    } catch (err) {
        console.error('Error creating pegawai:', err);
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Gagal menambahkan data. NIP mungkin sudah terdaftar.' });
        }
        res.status(500).json({ message: 'Server error saat menambahkan data pegawai.' });
    }
});

// PUT /api/pegawai/:id - Memperbarui data pegawai
router.put('/:id', validatePegawai, async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_lengkap, nip, jabatan, golongan } = req.body;
        const sql = 'UPDATE pegawai SET nama_lengkap = ?, nip = ?, jabatan = ?, golongan = ? WHERE id = ?';
        const result = await dbRun(sql, [nama_lengkap, nip, jabatan || null, golongan || null, id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: `Pegawai dengan ID ${id} tidak ditemukan untuk diperbarui.` });
        }
        const updatedPegawai = await dbGet('SELECT * FROM pegawai WHERE id = ?', [id]);
        res.json(updatedPegawai);
    } catch (err) {
        console.error(`Error updating pegawai with id ${req.params.id}:`, err);
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Gagal memperbarui data. NIP mungkin sudah digunakan oleh pegawai lain.' });
        }
        res.status(500).json({ message: 'Server error saat memperbarui data pegawai.' });
    }
});

// DELETE /api/pegawai/:id - Menghapus data pegawai
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dbRun('DELETE FROM pegawai WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: `Pegawai dengan ID ${id} tidak ditemukan untuk dihapus.` });
        }
        res.json({ message: `Data pegawai dengan ID ${id} berhasil dihapus.` });
    } catch (err) {
        console.error(`Error deleting pegawai with id ${req.params.id}:`, err);
        res.status(500).json({ message: 'Server error saat menghapus data pegawai.' });
    }
});

module.exports = router;