const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path ke file database SQLite
const dbPath = path.resolve(__dirname, 'database', 'perjadin.db');

// Buat koneksi ke database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error saat membuka database:', err.message);
    } else {
        console.log('Terhubung ke database SQLite.');
        // Aktifkan foreign key constraints
        db.run("PRAGMA foreign_keys = ON;", (err) => {
            if (err) console.error("Gagal mengaktifkan PRAGMA foreign_keys:", err.message);
        });
    }
});

module.exports = db;