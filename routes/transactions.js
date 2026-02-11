var express = require('express');
var router = express.Router();
var db = require('../config/database');

// Middleware Cek Login
function cekLogin(req, res, next) {
    // Debug: Cek isi session
    console.log("Session User saat akses Transactions:", req.session.user);

    if (req.session.user) {
        next();
    } else {
        // Jika session kosong, redirect ke login
        console.log("Session kosong, redirect ke login...");
        return res.redirect('/auth/login');
    }
}

// HALAMAN TRANSAKSI (GET)
router.get('/', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;

    // Ambil data transaksi user yang sedang login
    db.query(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC", 
        [userId], 
        function(err, results) {
            if (err) {
                console.error("Database Error:", err);
                return res.send("Terjadi kesalahan database.");
            }

            console.log("Data Transaksi ditemukan:", results.length);

            // RENDER DENGAN DATA USER YANG JELAS
            res.render('transactions', {
                title: 'Transactions',
                user: req.session.user, // <-- Pastikan ini dikirim
                transactions: results
            });
        }
    );
});

// PROSES TAMBAH TRANSAKSI (POST)
router.post('/add', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const { type, category, description, amount } = req.body;

    if (!description || !amount) {
        return res.send("Data tidak lengkap");
    }

    const sql = "INSERT INTO transactions (user_id, type, category, description, amount) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [userId, type, category, description, amount], function(err, result) {
        if (err) {
            console.error("Gagal Insert:", err);
            return res.send("Gagal menyimpan transaksi.");
        }
        // Redirect kembali ke halaman list transaksi
        res.redirect('/transactions');
    });
});

module.exports = router;