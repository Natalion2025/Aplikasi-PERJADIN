const bcrypt = require('bcryptjs');
const db = require('./database.js');

// --- KONFIGURASI ---
// Ganti dengan username yang ingin Anda reset passwordnya
const targetUsername = 'pengguna';

// Ganti dengan password baru yang Anda inginkan
const newPassword = 'password123';
// -------------------

console.log(`Mencoba mereset password untuk pengguna: ${targetUsername}...`);

bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Gagal membuat hash password:', err);
        return;
    }

    console.log('Hash password baru berhasil dibuat.');

    const sql = 'UPDATE users SET password = ? WHERE username = ?';
    db.run(sql, [hashedPassword, targetUsername], function (err) {
        if (err) {
            return console.error('Gagal memperbarui password di database:', err.message);
        }
        console.log(`\n>>> SUKSES! Password untuk '${targetUsername}' telah direset.`);
        console.log(`>>> Silakan login dengan username '${targetUsername}' dan password '${newPassword}'.`);

        db.close((closeErr) => {
            if (closeErr) {
                return console.error('Gagal menutup koneksi database:', closeErr.message);
            }
            console.log('Koneksi database ditutup dengan sukses.');
        });
    });
});