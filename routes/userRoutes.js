const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database.js'); // Path relatif dari folder routes ke root

const router = express.Router();

// API untuk mendapatkan data sesi pengguna yang sedang login (data lengkap dan terbaru)
router.get('/session', (req, res) => {
    if (req.session && req.session.user && req.session.user.id) {
        const userId = req.session.user.id;
        const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';

        // Menggunakan db.get dengan callback, bukan async/await
        db.get(sql, [userId], (err, userFromDb) => {
            if (err) {
                console.error('Gagal mengambil data user dari DB:', err);
                return res.status(500).json({ message: 'Internal server error.' });
            }
            if (userFromDb) {
                // Perbarui sesi dengan data terbaru
                req.session.user = userFromDb;
                // Kirim data yang sudah lengkap ke frontend
                res.json({ user: req.session.user });
            } else {
                res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
            }
        });
    } else {
        res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
});

// API untuk mendapatkan data profil pengguna yang sedang login
router.get('/me', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
    const userId = req.session.user.id;
    // Ambil SEMUA kolom yang relevan untuk profil, termasuk foto_profil.
    const sql = 'SELECT id, name, username, role, nip, jabatan, golongan, foto_profil FROM users WHERE id = ?';

    // Menggunakan db.get dengan callback
    db.get(sql, [userId], (err, user) => {
        if (err) {
            console.error('Gagal mengambil data profil:', err);
            return res.status(500).json({ message: 'Gagal mengambil data profil.', error: err.message });
        }
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.json(user);
    });
});

// API untuk memperbarui data profil pengguna yang sedang login
// PUT /api/user/me
router.put('/me', async (req, res) => {
    const { name, nip, jabatan, golongan, password } = req.body;
    const userId = req.session.user.id;
    if (!userId) {
        return res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }

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

        db.run(sql, params, function (err) {
            if (err) {
                console.error('Gagal memperbarui profil:', err);
                return res.status(500).json({ message: 'Gagal memperbarui profil.', error: err.message });
            }

            // Update juga data di sesi agar langsung terlihat di UI tanpa perlu login ulang
            req.session.user.name = name;
            req.session.user.nip = nip;
            req.session.user.jabatan = jabatan;
            req.session.user.golongan = golongan;

            req.session.save(err => {
                if (err) {
                    console.error('Gagal menyimpan sesi:', err);
                    return res.status(500).json({ message: 'Gagal menyimpan sesi.', error: err.message });
                }
                res.json({ message: 'Profil berhasil diperbarui.' });
            });
        });
    } catch (err) {
        console.error('Gagal memproses permintaan pembaruan profil:', err);
        res.status(500).json({ message: 'Gagal memproses permintaan.', error: err.message });
    }
});

module.exports = router;