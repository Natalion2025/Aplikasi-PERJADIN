const express = require('express');
const router = express.Router();
const util = require('util');
const db = require('../database.js');

// --- Helper & Utilitas Database ---

// Promisify fungsi database untuk digunakan dengan async/await
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

// Helper promise yang aman untuk db.run, memastikan 'this' context terjaga
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this); // 'this' berisi lastID dan changes
    });
});

// --- Rute API Pegawai ---

// GET: Mengambil semua data pegawai
router.get('/', async (req, res) => {
    const sql = "SELECT * FROM pegawai ORDER BY nama_lengkap ASC";
    try {
        const rows = await dbAll(sql, []);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data pegawai:', err);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: err.message });
    }
});

// GET: Mengambil satu data pegawai berdasarkan ID
router.get('/:id', async (req, res) => {
    const sql = "SELECT * FROM pegawai WHERE id = ?";
    try {
        const row = await dbGet(sql, [req.params.id]);
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ message: "Pegawai tidak ditemukan." });
        }
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil pegawai id ${req.params.id}:`, err);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: err.message });
    }
});

// POST: Menambah pegawai baru
router.post('/', async (req, res) => {
    // PERBAIKAN: Gunakan nama_lengkap yang konsisten
    const { nama_lengkap, nip, pangkat, golongan, jabatan, bidang } = req.body;

    // Validasi dasar
    if (!nama_lengkap || !nip) {
        return res.status(400).json({ message: 'Nama Lengkap dan NIP wajib diisi.' });
    }

    try {
        const sql = `INSERT INTO pegawai (nama_lengkap, nip, pangkat, golongan, jabatan, bidang) VALUES (?, ?, ?, ?, ?, ?)`;
        // Pastikan semua kolom, termasuk yang mungkin kosong, ada di params
        const params = [nama_lengkap, nip, pangkat || null, golongan || null, jabatan || null, bidang || null];

        const result = await runQuery(sql, params);

        res.status(201).json({
            message: "Pegawai baru berhasil ditambahkan.",
            data: { id: result.lastID, ...req.body }
        });

    } catch (err) {
        console.error('[API ERROR] Gagal menambah pegawai:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat menambah pegawai.', error: err.message });
    }
});

// PUT: Memperbarui data pegawai
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    // PERBAIKAN: Gunakan nama_lengkap yang konsisten
    const { nama_lengkap, nip, pangkat, golongan, jabatan, bidang } = req.body;

    // Validasi dasar
    if (!nama_lengkap || !nip) {
        return res.status(400).json({ message: 'Nama Lengkap dan NIP wajib diisi.' });
    }

    try {
        const sql = `UPDATE pegawai SET 
                        nama_lengkap = ?, 
                        nip = ?, 
                        pangkat = ?, 
                        golongan = ?, 
                        jabatan = ?, 
                        bidang = ?
                     WHERE id = ?`;
        const params = [nama_lengkap, nip, pangkat || null, golongan || null, jabatan || null, bidang || null, id];

        const result = await runQuery(sql, params);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pegawai tidak ditemukan untuk diperbarui.' });
        }

        res.json({
            message: "Data pegawai berhasil diperbarui.",
            data: { id, ...req.body }
        });

    } catch (err) {
        console.error(`[API ERROR] Gagal memperbarui pegawai id ${id}:`, err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat memperbarui pegawai.', error: err.message });
    }
});

// DELETE: Menghapus data pegawai
router.delete('/:id', async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM pegawai WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pegawai tidak ditemukan.' });
        }
        res.json({ message: 'Pegawai berhasil dihapus.' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus pegawai id ${req.params.id}:`, err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: err.message });
    }
});

module.exports = router;