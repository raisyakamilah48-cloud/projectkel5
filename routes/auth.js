var express = require('express');
var router = express.Router();
var db = require('../config/database');
var bcrypt = require('bcrypt');

// Halaman Login
router.get('/login', function(req, res) {
    res.render('login', { message: '' });
});

// Halaman Register
router.get('/register', function(req, res) {
    res.render('register', { message: '' });
});

// --- PROSES REGISTER (FULL CODE) ---
router.post('/register', async function(req, res) {
    // 1. Ambil data dan Hapus Spasi
    const nama = req.body.nama ? req.body.nama.trim() : '';
    const email = req.body.email ? req.body.email.trim() : '';
    const password = req.body.password;

    console.log("Memproses Register...");
    console.log("Email Input:", email);

    // 2. Validasi Kosong
    if (!email || !password || !nama) {
        console.log("Gagal: Data kosong");
        return res.render('register', { message: 'Semua kolom wajib diisi!' });
    }

    // 3. Validasi Harus Gmail
    if (!email.endsWith('@gmail.com')) {
        console.log("Gagal: Bukan gmail");
        return res.render('register', { message: 'Email harus menggunakan @gmail.com!' });
    }

    // 4. Cek Apakah Email Sudah Ada di Database
    db.query("SELECT * FROM users WHERE email = ?", [email], async function(err, results) {
        if (err) {
            console.log("Error Database Saat Cek Email:", err);
            return res.render('register', { message: 'Terjadi kesalahan database (Cek Email).' });
        }

        if (results.length > 0) {
            console.log("Gagal: Email sudah terdaftar");
            return res.render('register', { message: 'Email [' + email + '] sudah terdaftar! Silakan login atau pakai email lain.' });
        }

        // 5. Hashing Password
        try {
            var hash = await bcrypt.hash(password, 10);
        } catch (error) {
            console.log("Gagal Hash Password:", error);
            return res.render('register', { message: 'Gagal mengamankan password.' });
        }

        // 6. Insert User Baru ke Database
        const sql = "INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, 'user')";
        
        db.query(sql, [nama, email, hash], function(err, result) {
            if (err) {
                console.log("GAGAL INSERT KE DATABASE:", err);
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    return res.render('register', { message: 'Error Database: Kolom "role" belum ada.' });
                }
                return res.render('register', { message: 'Gagal melakukan registrasi.' });
            }

            console.log("Berhasil Insert User ID:", result.insertId);

            // 7. Auto Login Setelah Register
            const newUserId = result.insertId;
            db.query("SELECT * FROM users WHERE id = ?", [newUserId], function(err, userData) {
                if (userData && userData.length > 0) {
                    req.session.user = userData[0];
                    console.log("Auto Login Berhasil untuk:", userData[0].email);
                    return res.redirect('/dashboard');
                } else {
                    console.log("Gagal Ambil Data User Baru");
                    res.redirect('/auth/login');
                }
            });
        });
    });
});

// --- PROSES LOGIN ---
// PERHATIKAN: Ada 'async' di sini
router.post('/login', async function(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { message: 'Email dan password wajib diisi!' });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async function(err, results) {
        if (err) {
            console.log(err);
            return res.render('login', { message: 'Error database.' });
        }

        if (results.length === 0) {
            return res.render('login', { message: 'Email belum terdaftar. Silakan Register.' });
        }

        const user = results[0];

        // Cek Password
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.render('login', { message: 'Password salah!' });
        }

        // Simpan Session
        req.session.user = user;

        // Redirect berdasarkan Role
        if (user.role === 'NULL') {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    });
});

// Logout
router.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
        if(err) throw err;
        res.redirect('/auth/login');
    });
});

module.exports = router;