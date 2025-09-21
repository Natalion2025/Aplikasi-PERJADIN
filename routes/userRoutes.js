const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const util = require('util');
const db = require('../database.js'); // Path relatif dari folder routes ke root

const router = express.Router();

// Promisify fungsi database untuk async/await
const dbGet = util.promisify(db.get.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

// Konfigurasi Multer untuk upload foto profil
const profileUpload = multer({
    storage: multer.diskStorage({
        destination: 'public/uploads/avatars',
        filename: (req, file, cb) => cb(null, `avatar-${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`)
    })
}).single('foto_profil');

// API untuk mendapatkan data sesi pengguna yang sedang login (data lengkap dan terbaru)
router.get('/session', async (req, res) => {
    if (req.session && req.session.user && req.session.user.id) {
        try {
            const userId = req.session.user.id;
            const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
            const userFromDb = await dbGet(sql, [userId]);

            if (userFromDb) {
                // Perbarui sesi dengan data terbaru
                req.session.user = userFromDb; // Update data di memori
                // Tunggu sesi disimpan untuk memastikan konsistensi
                await new Promise((resolve, reject) => {
                    req.session.save(err => err ? reject(err) : resolve());
                });
                // Kirim data yang sudah dijamin terbaru
                res.json({ user: req.session.user });
            } else {
                res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
            }
        } catch (err) {
            console.error('[API ERROR] Gagal mengambil data user dari DB untuk sesi:', err);
            res.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
});

// API untuk mendapatkan data profil pengguna yang sedang login
router.get('/profile', async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
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

// API untuk memperbarui data profil pengguna yang sedang login
router.put('/profile', profileUpload, async (req, res) => {
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
        await runQuery('BEGIN TRANSACTION');

        const currentUser = await dbGet('SELECT foto_profil FROM users WHERE id = ?', [userId]);

        if (username !== oldUsername) {
            const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existingUser) throw new Error('Username tersebut sudah digunakan.');
        }

        if (nip) {
            const existingNipUser = await dbGet('SELECT id FROM users WHERE nip = ? AND id != ? AND nip IS NOT NULL AND nip != ""', [nip, userId]);
            if (existingNipUser) throw new Error('NIP tersebut sudah digunakan oleh pengguna lain.');
        }

        let updateFields = ['name = ?', 'username = ?', 'nip = ?', 'jabatan = ?'];
        let updateParams = [name, username, nip || null, jabatan || null];

        if (newPassword && newPassword.length > 0) {
            if (newPassword.length < 6) throw new Error('Password baru minimal harus 6 karakter.');
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateFields.push('password = ?');
            updateParams.push(hashedPassword);
        }

        if (req.file) {
            const newPhotoPath = req.file.path.replace(/\\/g, "/").replace('public/', '');
            updateFields.push('foto_profil = ?');
            updateParams.push(newPhotoPath);

            if (currentUser && currentUser.foto_profil) {
                const oldPhotoFullPath = path.join(__dirname, '..', 'public', currentUser.foto_profil);
                if (fs.existsSync(oldPhotoFullPath)) fs.unlinkSync(oldPhotoFullPath);
            }
        }

        updateParams.push(userId);
        const userUpdateSql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        await runQuery(userUpdateSql, updateParams);

        await runQuery('COMMIT');

        // Perbarui sesi setelah commit berhasil
        const updatedUser = await dbGet('SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?', [userId]);
        req.session.user = updatedUser;

        // Tunggu sesi disimpan sebelum mengirim respons untuk menghindari race condition
        await new Promise((resolve, reject) => {
            req.session.save(err => err ? reject(err) : resolve());
        });

        res.json({ message: 'Profil berhasil diperbarui.' });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('[API ERROR] Gagal memperbarui profil:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

module.exports = router;