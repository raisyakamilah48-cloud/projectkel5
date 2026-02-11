// routes/admin.js
var express = require('express');
var router = express.Router();
var db = require('../config/database');

// Middleware Cek Login
function cekLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login'); // Arahkan ke login biasa jika belum login
    }
}

// Middleware Cek Role Admin
function cekAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next(); // Lanjut jika Admin
    } else {
        res.status(403).send("Akses Ditolak: Anda bukan Admin.");
    }
}

// HALAMAN DASHBOARD ADMIN
router.get('/', cekLogin, cekAdmin, function(req, res, next) {
    
    // 1. Hitung Total User
    db.query("SELECT COUNT(*) as total FROM users WHERE role = 'user'", function(err, userCount) {
        
        // 2. Hitung Total Transaksi
        db.query("SELECT COUNT(*) as total FROM transactions", function(err, transCount) {
            
            // 3. Hitung Total Uang yang Beredar (Simulasi dari saldo)
            // Kita asumsikan saldo dihitung dari Income - Expense
            db.query("SELECT SUM(amount) as total FROM transactions WHERE type = 'income'", function(err, incomeRes) {
                db.query("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'", function(err, expenseRes) {
                    
                    const totalIncome = incomeRes[0].total || 0;
                    const totalExpense = expenseRes[0].total || 0;
                    const balance = totalIncome - totalExpense;

                    // Render Halaman Admin
                    res.render('admin', {
                        title: 'Admin Dashboard',
                        user: req.session.user,
                        stats: {
                            totalUsers: userCount[0].total,
                            totalTransactions: transCount[0].total,
                            totalBalance: balance
                        }
                    });
                });
            });
        });
    });
});

module.exports = router;