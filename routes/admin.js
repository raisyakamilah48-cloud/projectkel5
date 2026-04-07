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
        
        // 2. Hitung Total Transaksi & Total Volume Transaksi (Pemasukan)
        db.query("SELECT COUNT(*) as totalCount, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as totalVolume FROM transactions", function(err, transStats) {
            
            // 3. Hitung Uang Beredar riil (Berdasarkan Dompet)
            db.query("SELECT COALESCE(SUM(balance), 0) as totalBalance FROM wallets", function(err, walletStats) {
                
                // 4. Ambil Daftar User (Monitoring) dengan Subquery untuk mengetahui jumlah transaksinya
                const queryUsers = `
                    SELECT u.id, u.nama, u.email, u.created_at, u.profile_picture,
                    (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) as txCount,
                    (SELECT COALESCE(SUM(balance), 0) FROM wallets w WHERE w.user_id = u.id) as userBalance
                    FROM users u 
                    WHERE u.role = 'user' 
                    ORDER BY u.created_at DESC
                `;

                db.query(queryUsers, function(err, usersList) {
                    // Render Halaman Admin
                    res.render('admin', {
                        title: 'Admin Dashboard',
                        user: req.session.user,
                        stats: {
                            totalUsers: userCount[0].total,
                            totalTransactions: transStats[0].totalCount,
                            totalBalance: walletStats[0].totalBalance,
                            totalVolume: transStats[0].totalVolume
                        },
                        usersList: usersList || []
                    });
                });
            });
        });
    });
});

// HALAMAN SARAN PENGGUNA (ADMIN)
router.get('/feedbacks', cekLogin, cekAdmin, function(req, res, next) {
    const qFeedbacks = `
        SELECT f.id, f.message, f.created_at, u.nama, u.email, u.profile_picture 
        FROM feedbacks f 
        JOIN users u ON f.user_id = u.id 
        ORDER BY f.created_at DESC
    `;

    db.query(qFeedbacks, function(err, feedbacks) {
        if (err) {
            console.error("Error mengambil tanggapan:", err);
            feedbacks = [];
        }

        res.render('admin_feedbacks', {
            title: 'Saran Pengguna',
            user: req.session.user,
            feedbacks: feedbacks
        });
    });
});

module.exports = router;