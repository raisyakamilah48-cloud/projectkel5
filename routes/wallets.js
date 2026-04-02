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

// 1. READ SEMUA DOMPET
router.get('/', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    
    db.query("SELECT * FROM wallets WHERE user_id = ? ORDER BY is_default DESC, created_at ASC", [userId], function(err, wallets) {
        if (err) {
            console.error(err);
            return res.send("Gagal mengambil data dompet.");
        }
        res.render('wallets', { 
            title: 'Kelola Dompet', 
            user: req.session.user, 
            wallets: wallets || [] 
        });
    });
});

// 2. TAMBAH DOMPET BARU
router.post('/add', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const { name, balance, color } = req.body;
    
    // Cek apakah sudah ada 5 dompet
    db.query("SELECT COUNT(*) as total FROM wallets WHERE user_id = ?", [userId], function(err, countRes) {
        if (err) return res.send("Gagal mengecek limit dompet");
        
        const total = countRes[0].total;
        if (total >= 5) {
            return res.send("<script>alert('Maksimal dompet adalah 5!'); window.location.href='/wallets';</script>");
        }
        
        // Cek apakah ini dompet pertama (otomatis set is_default = true)
        const isDefault = (total === 0) ? true : false;
        const startBalance = balance ? parseFloat(balance) : 0;
        const colorVal = color || '#4361ee';

        db.query(
            "INSERT INTO wallets (user_id, name, balance, color, is_default) VALUES (?, ?, ?, ?, ?)",
            [userId, name, startBalance, colorVal, isDefault],
            function(err2) {
                if (err2) {
                    console.error("Gagal buat dompet:", err2);
                    return res.send("Gagal membuat dompet.");
                }
                res.redirect('/wallets');
            }
        );
    });
});

// 3. SET DOMPET SEBAGAI UTAMA (DEFAULT)
router.post('/set_default/:id', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const walletId = req.params.id;

    // Menjadikan SEMUA dompet milik user tsb bukan utama
    db.query("UPDATE wallets SET is_default = FALSE WHERE user_id = ?", [userId], function(err) {
        if (err) return res.send("Gagal mereset default.");
        
        // Set dompet yang dipilih sebagai utama (TRUE)
        db.query("UPDATE wallets SET is_default = TRUE WHERE id = ? AND user_id = ?", [walletId, userId], function(err2) {
            if (err2) return res.send("Gagal mengatur dompet utama.");
            res.redirect('/wallets');
        });
    });
});

// 4. HAPUS DOMPET
router.post('/delete/:id', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const walletId = req.params.id;

    // Cek terlebih dahulu apakah yang dihapus adalah dompet default
    db.query("SELECT is_default FROM wallets WHERE id = ? AND user_id = ?", [walletId, userId], function(err, result) {
        if (err || result.length === 0) return res.redirect('/wallets');
        
        const isDefault = result[0].is_default;
        
        // Hapus dompet
        db.query("DELETE FROM wallets WHERE id = ? AND user_id = ?", [walletId, userId], function(err2) {
            if (err2) {
                console.error("Gagal hapus dompet:", err2);
                return res.send("Gagal menghapus dompet.");
            }
            
            // Jika yang dihapus td adalah default, jadikan salah satu dompet tersisa sebagai default
            if (isDefault) {
                db.query("SELECT id FROM wallets WHERE user_id = ? LIMIT 1", [userId], function(err3, remain) {
                    if (remain && remain.length > 0) {
                        db.query("UPDATE wallets SET is_default = TRUE WHERE id = ?", [remain[0].id]);
                    }
                });
            }
            res.redirect('/wallets');
        });
    });
});

module.exports = router;
