// routes/reports.js
var express = require('express');
var router = express.Router();
var db = require('../config/database');

// Middleware Cek Login
function cekLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
}

// HALAMAN REPORTS (GET)
router.get('/', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;

    // Ambil data transaksi untuk keperluan laporan (opsional, jika ingin grafik real)
    db.query(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date ASC", 
        [userId], 
        function(err, results) {
            if (err) console.log(err);

            res.render('reports', {
                title: 'Financial Reports',
                user: req.session.user,
                transactions: results // Kirim data jika mau dipakai untuk grafik dinamis
            });
        }
    );
});

module.exports = router;