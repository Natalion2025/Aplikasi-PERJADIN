const express = require('express');
const bcrypt = require('bcryptjs');
const util = require('util');
const db = require('../database.js'); // Path relatif dari folder routes ke root

const router = express.Router();

// Promisify fungsi database untuk digunakan dengan async/await
const dbGet = util.promisify(db.get.bind(db));

// Wrapper khusus untuk db.run agar bisa mendapatkan 'this' context
const dbRun = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
};

// API untuk mendapatkan data profil pengguna yang sedang login
// GET /api/user/me
router.get('/me', async (req, res) => {
    const userId = req.session.user.id;
    // PERBAIKAN: Ambil SEMUA kolom yang relevan untuk profil, bukan hanya beberapa.
    const sql = 'SELECT id, name, username, role, nip, jabatan, golongan FROM users WHERE id = ?';
    try {
        const user = await dbGet(sql, [userId]);
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Gagal mengambil data profil:', err);
        res.status(500).json({ message: 'Gagal mengambil data profil.', error: err.message });
    }
});

// API untuk memperbarui data profil pengguna yang sedang login
// PUT /api/user/me
router.put('/me', async (req, res) => {
    const { name, nip, jabatan, golongan, password } = req.body;
    const userId = req.session.user.id;

    try {
        let sql;
        let params;

        // Jika password diisi, buat query untuk update password juga
        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            sql = `UPDATE users SET name = ?, nip = ?, jabatan = ?, golongan = ?, password = ? WHERE id = ?`;
            params = [name, nip || null, jabatan || null, golongan || null, hash, userId];
        } else {
            // Jika password kosong, buat query tanpa update password
            sql = `UPDATE users SET name = ?, nip = ?, jabatan = ?, golongan = ? WHERE id = ?`;
            params = [name, nip || null, jabatan || null, golongan || null, userId];
        }

        await dbRun(sql, params);

        // Update juga data di sesi agar langsung terlihat di UI tanpa perlu login ulang
        req.session.user.name = name;
        req.session.user.nip = nip;
        req.session.user.jabatan = jabatan;
        req.session.user.golongan = golongan;

        req.session.save(err => {
            if (err) throw err;
            res.json({ message: 'Profil berhasil diperbarui.' });
        });
    } catch (err) {
        console.error('Gagal memperbarui profil:', err);
        res.status(500).json({ message: 'Gagal memperbarui profil.', error: err.message });
    }
});

module.exports = router;