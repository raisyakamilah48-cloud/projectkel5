// routes/categories.js
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

// HALAMAN KATEGORI (GET)
router.get('/', cekLogin, function(req, res) {
    const userId = req.session.user.id;

    // Ambil semua kategori milik user
    db.query(
        "SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC",
        [userId],
        function(err, categories) {
            if (err) { console.log("Categories Error:", err); categories = []; }

            res.render('categories', {
                title: 'Kelola Kategori',
                user: req.session.user,
                categories: categories
            });
        }
    );
});

// TAMBAH KATEGORI (POST)
router.post('/add', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    const { name, type } = req.body;

    if (!name || !name.trim() || !type) {
        return res.redirect('/categories');
    }

    // Cek duplikat nama+tipe
    db.query(
        "SELECT id FROM categories WHERE name = ? AND type = ? AND user_id = ?",
        [name.trim(), type, userId],
        function(err, existing) {
            if (err) { console.log("Check Error:", err); return res.redirect('/categories'); }

            if (existing && existing.length > 0) {
                return res.redirect('/categories');
            }

            db.query(
                "INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)",
                [userId, name.trim(), type],
                function(err) {
                    if (err) console.log("Insert Error:", err);
                    res.redirect('/categories');
                }
            );
        }
    );
});

// EDIT KATEGORI (POST)
router.post('/edit/:id', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    const catId = req.params.id;
    const { name, type } = req.body;

    if (!name || !name.trim() || !type) {
        return res.redirect('/categories');
    }

    db.query(
        "UPDATE categories SET name = ?, type = ? WHERE id = ? AND user_id = ?",
        [name.trim(), type, catId, userId],
        function(err) {
            if (err) console.log("Update Error:", err);
            res.redirect('/categories');
        }
    );
});

// HAPUS KATEGORI (POST)
router.post('/delete/:id', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    const catId = req.params.id;

    db.query(
        "DELETE FROM categories WHERE id = ? AND user_id = ?",
        [catId, userId],
        function(err) {
            if (err) console.log("Delete Error:", err);
            res.redirect('/categories');
        }
    );
});

module.exports = router;
