const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs'); // Diperlukan untuk hash password superadmin

const DB_PATH = path.join(__dirname, 'perjadin.db'); // Menggunakan perjadin.db yang sudah ada

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the perjadin database.');
        db.serialize(() => {
            // Create users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    username TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'user'
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                } else {
                    console.log('Users table created or already exists.');
                    // Add a default superadmin user if not exists
                    db.get("SELECT COUNT(*) as count FROM users WHERE username = 'superadmin'", (err, row) => {
                        if (err) {
                            console.error('Error checking superadmin:', err.message);
                        } else if (row.count === 0) {
                            const hashedPassword = bcrypt.hashSync('superadminpass', 10); // Ganti dengan password yang lebih kuat
                            db.run("INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
                                ['Super Admin', 'superadmin', hashedPassword, 'superadmin'],
                                (err) => {
                                    if (err) {
                                        console.error('Error inserting superadmin:', err.message);
                                    } else {
                                        console.log('Default superadmin user created.');
                                    }
                                });
                        }
                    });
                }
            });

            // Create sppd table
            db.run(`
                CREATE TABLE IF NOT EXISTS sppd (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nomor_surat TEXT NOT NULL,
                    nama_pegawai TEXT NOT NULL,
                    nip TEXT NOT NULL,
                    pangkat_golongan TEXT,
                    jabatan TEXT NOT NULL,
                    maksud_perjalanan TEXT NOT NULL,
                    tempat_tujuan TEXT NOT NULL,
                    lama_perjalanan INTEGER NOT NULL,
                    tanggal_berangkat TEXT NOT NULL,
                    tanggal_kembali TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating sppd table:', err.message);
                } else {
                    console.log('SPPD table created or already exists.');
                }
            });

            // Create pegawai table (NEW)
            db.run(`
                CREATE TABLE IF NOT EXISTS pegawai (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nama_lengkap TEXT NOT NULL,
                    nip TEXT NOT NULL UNIQUE,
                    pangkat TEXT,
                    golongan TEXT,
                    jabatan TEXT NOT NULL,
                    bidang TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating pegawai table:', err.message);
                } else {
                    console.log('Pegawai table created or already exists.');
                }
            });

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
            });
        });
    }
});