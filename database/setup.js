const db = require('../database.js');
const bcrypt = require('bcryptjs');

const saltRounds = 10;

// --- Konfigurasi Pengguna Default ---
// Untuk keamanan di lingkungan produksi, password ini HARUS diatur melalui environment variable.
const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin';
const superAdminUsername = 'superadmin';
const superAdminName = 'Super Administrator';

console.log('Menjalankan skrip setup database...');

db.serialize(() => {
    // Hapus tabel lama jika ada untuk memastikan skema baru diterapkan
    db.run('DROP TABLE IF EXISTS users', (err) => {
        if (err) {
            return console.error("Gagal menghapus tabel users lama:", err.message);
        }
        console.log("Tabel users lama (jika ada) berhasil dihapus.");

        // Buat tabel users dengan semua kolom yang diperlukan
        const createUserTableSql = `
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            nip TEXT,
            jabatan TEXT,
            golongan TEXT
        );
        `;

        db.run(createUserTableSql, (err) => {
            if (err) {
                return console.error("Gagal membuat tabel users:", err.message);
            }
            console.log("Tabel users berhasil dibuat dengan skema baru.");

            // Masukkan pengguna superadmin default
            bcrypt.hash(superAdminPassword, saltRounds, (err, hash) => {
                if (err) {
                    return console.error("Gagal melakukan hash password:", err);
                }
                const insertUserSql = `INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`;
                db.run(insertUserSql, [superAdminName, superAdminUsername, hash, 'superadmin'], (err) => {
                    if (err) {
                        return console.error("Gagal memasukkan superadmin:", err.message);
                    }
                    console.log(`Pengguna default 'superadmin' berhasil dibuat dengan password: '${superAdminPassword}'.`);
                    // TUTUP KONEKSI DI SINI: Setelah operasi terakhir selesai.
                    db.close((err) => {
                        if (err) return console.error(err.message);
                        console.log('Koneksi database ditutup. Setup selesai.');
                    });
                });
            });
        });
    });
});
