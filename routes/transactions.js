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

    // Query 1: Ambil kategori milik user
    db.query("SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC", [userId], function(err, categories) {
        if (err) { console.log("Categories Error:", err); categories = []; }

        // Query 2: Ambil transaksi user
        db.query(
            "SELECT transactions.*, wallets.name AS wallet_name, wallets.color AS wallet_color FROM transactions LEFT JOIN wallets ON transactions.wallet_id = wallets.id WHERE transactions.user_id = ? ORDER BY date DESC",
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

                    // Query 4: Ambil wallets milik user untuk dropdown pilih dompet
                    db.query("SELECT * FROM wallets WHERE user_id = ? ORDER BY is_default DESC", [userId], function(err, wallets) {
                        res.render('transactions', {
                            title: 'Transaksi',
                            user: req.session.user,
                            transactions: results,
                            categories: categories || [],
                            wallets: wallets || [],
                            stats: stats ? stats[0] : { totalIncome: 0, totalExpense: 0, totalCount: 0 }
                        });
                    });
                });
            }
        );
    });
});

// PROSES TAMBAH TRANSAKSI (POST)
router.post('/add', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const { type, category, description, amount, wallet_id } = req.body;

    if (!description || !amount) {
        return res.send("Data tidak lengkap");
    }

    const walletIdVal = wallet_id ? wallet_id : null;

    const sql = "INSERT INTO transactions (user_id, type, category, description, amount, wallet_id) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [userId, type, category, description, amount, walletIdVal], function(err, result) {
        if (err) {
            console.error("Gagal Insert:", err);
            return res.send("Gagal menyimpan transaksi.");
        }

        // Jika terhubung dengan dompet, update saldo dompet
        if (walletIdVal) {
            let modifier = (type === 'income') ? parseFloat(amount) : -parseFloat(amount);
            db.query("UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?", [modifier, walletIdVal, userId], function(err2) {
                if (err2) console.error("Gagal update saldo dompet:", err2);
                res.redirect('/transactions');
            });
        } else {
            res.redirect('/transactions');
        }
    });
});

// HAPUS TRANSAKSI (POST)
router.post('/delete/:id', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const transId = req.params.id;

    // Ambil info transaksi sebelum dihapus untuk restore saldo dompet
    db.query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [transId, userId], function(err, results) {
        if (err || results.length === 0) return res.redirect('/transactions');
        
        const trans = results[0];
        
        db.query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [transId, userId], function(err2) {
            if (err2) {
                console.error("Gagal Hapus:", err2);
                return res.send("Gagal menghapus transaksi.");
            }
            
            // Restore saldo jika ada wallet_id yang terasosiasi
            if (trans.wallet_id) {
                // Kebalikan dari operasi awal: pemasukan dulu + sekarang dikurangi. pengeluaran dulu - sekarang ditambah.
                let modifier = (trans.type === 'income') ? -parseFloat(trans.amount) : parseFloat(trans.amount);
                db.query("UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?", [modifier, trans.wallet_id, userId], function(err3) {
                    res.redirect('/transactions');
                });
            } else {
                res.redirect('/transactions');
            }
        });
    });
});

module.exports = router;