var express = require('express');
var router = express.Router();
var db = require('../config/database');

// Middleware Cek Login
function cekLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        return res.redirect('/auth/login');
    }
}

// HALAMAN TRANSAKSI (GET) — Ambil transactions + categories dari DB
router.get('/', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;

    // Query 1: Ambil semua kategori dari tabel categories
    db.query("SELECT * FROM categories ORDER BY name ASC", function(err, categories) {
        if (err) { console.log("Categories Error:", err); categories = []; }

        // Query 2: Ambil transaksi user
        db.query(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
            [userId],
            function(err, results) {
                if (err) {
                    console.error("Database Error:", err);
                    return res.send("Terjadi kesalahan database.");
                }

                // Query 3: Summary stats (untuk mini cards di halaman)
                const qStats = `
                    SELECT 
                        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as totalIncome,
                        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as totalExpense,
                        COUNT(*) as totalCount
                    FROM transactions WHERE user_id = ?
                `;
                db.query(qStats, [userId], function(err, stats) {
                    if (err) { console.log("Stats Error:", err); stats = [{ totalIncome: 0, totalExpense: 0, totalCount: 0 }]; }

                    res.render('transactions', {
                        title: 'Transaksi',
                        user: req.session.user,
                        transactions: results,
                        categories: categories || [],
                        stats: stats ? stats[0] : { totalIncome: 0, totalExpense: 0, totalCount: 0 }
                    });
                });
            }
        );
    });
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
        res.redirect('/transactions');
    });
});

// HAPUS TRANSAKSI (POST)
router.post('/delete/:id', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const transId = req.params.id;

    db.query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [transId, userId], function(err) {
        if (err) {
            console.error("Gagal Hapus:", err);
            return res.send("Gagal menghapus transaksi.");
        }
        res.redirect('/transactions');
    });
});

module.exports = router;