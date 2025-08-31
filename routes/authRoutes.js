const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const util = require('util'); // Diperlukan untuk promisify

const router = express.Router();

// Promisify db.get agar bisa digunakan dengan async/await
const dbGet = util.promisify(db.get.bind(db));

// API Login dengan async/await untuk penanganan error yang lebih baik
router.post('/login', async (req, res) => {
    // LOG 1: Menerima request
    console.log('API: Menerima request ke /api/auth/login');
    const { username, password } = req.body;

    try {
        // Langkah 1: Validasi input
        if (!username || !password) {
            console.log('API GAGAL: Username atau password kosong.');
            return res.status(400).json({ message: 'Username dan password harus diisi.' });
        }

        // Langkah 2: Cari user di database menggunakan await
        const sql = 'SELECT * FROM users WHERE username = ?';
        console.log(`API: Mencari user '${username}' di database...`);
        const user = await dbGet(sql, [username]);

        // Kondisi jika user tidak ditemukan
        if (!user) {
            console.log(`API GAGAL: User '${username}' tidak ditemukan.`);
            return res.status(401).json({ message: 'Username atau password salah.' });
        }
        console.log(`API SUKSES: User '${username}' ditemukan.`);

        // Pastikan user.password ada untuk mencegah error
        if (!user.password) {
            console.error(`API ERROR: Pengguna ${username} tidak memiliki hash password di database.`);
            return res.status(500).json({ message: 'Konfigurasi akun bermasalah.' });
        }

        // Langkah 3: Bandingkan password menggunakan await
        console.log(`API: Membandingkan password untuk user '${username}'...`);
        const isMatch = await bcrypt.compare(password, user.password);

        // Kondisi jika password tidak cocok
        if (!isMatch) {
            console.log(`API GAGAL: Password salah untuk user '${username}'.`);
            return res.status(401).json({ message: 'Username atau password salah.' });
        }
        console.log(`API SUKSES: Password cocok untuk user '${username}'.`);

        // Langkah 4: Buat dan simpan sesi
        console.log(`API: Membuat sesi untuk user '${username}'...`);
        req.session.user = {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
        };

        // Langkah 5: Simpan sesi secara eksplisit sebelum mengirim respons.
        // Ini adalah kunci untuk mencegah "login loop" (race condition).
        req.session.save(err => {
            if (err) {
                console.error('API ERROR: Gagal menyimpan sesi:', err);
                return res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan sesi.' });
            }

            console.log(`API SUKSES: Sesi untuk '${username}' berhasil disimpan.`);
            // Langkah 6: Kirim respons sukses setelah sesi dijamin tersimpan
            res.status(200).json({ message: 'Login berhasil.', redirectTo: '/dashboard' });
        });

    } catch (error) {
        // Langkah 7: Tangani semua error tak terduga dari proses async
        console.error('API ERROR: Terjadi kesalahan internal di proses login:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// API Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Gagal untuk logout.' });
        }
        res.clearCookie('connect.sid'); // Nama cookie default
        res.json({ message: 'Logout berhasil.' });
    });
});

module.exports = router;