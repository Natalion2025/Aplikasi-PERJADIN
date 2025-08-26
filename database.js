const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, './database/perjadin.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Gagal membuka koneksi database:', err.message);
    } else {
        console.log('Berhasil terhubung ke database SQLite.');
        // Mengaktifkan foreign key untuk menjaga integritas data
        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) {
                console.error("Tidak dapat mengaktifkan foreign key:", err);
            } else {
                console.log("Foreign key telah diaktifkan.");
            }
        });
    }
});

// Tambahkan event listener untuk melacak semua query SQL yang dieksekusi.
// Ini sangat berguna untuk debugging.
db.on('trace', (sql) => {
    console.log('[SQL TRACE]', sql);
});

module.exports = db;