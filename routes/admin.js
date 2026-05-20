// routes/admin.js
var express = require('express');
var router = express.Router();
var db = require('../config/database');
var bcrypt = require('bcrypt');

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
        
        // 2. Hitung Total Transaksi & Volume (Pemasukan & Pengeluaran)
        db.query("SELECT COUNT(*) as totalCount, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as totalIncomeVolume, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as totalExpenseVolume FROM transactions", function(err, transStats) {
            
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
                            totalIncomeVolume: transStats[0].totalIncomeVolume,
                            totalExpenseVolume: transStats[0].totalExpenseVolume
                        },
                        usersList: usersList || []
                    });
                });
            });
        });
    });
});

// HALAMAN MANAJEMEN USER
router.get('/users', cekLogin, cekAdmin, function(req, res) {
    db.query("SELECT id, nama, email, role, created_at, profile_picture, is_active, last_login FROM users ORDER BY created_at DESC", function(err, users) {
        if (err) {
            console.error("Error ambil users:", err);
            users = [];
        }
        res.render('admin_users', {
            title: 'Manajemen User',
            user: req.session.user,
            users: users,
            activeMenu: 'admin_users'
        });
    });
});

// TAMBAH USER BARU (Admin)
router.post('/users/add', cekLogin, cekAdmin, function(req, res) {
    const { nama, email, password, role } = req.body;
    bcrypt.hash(password, 10, function(err, hash) {
        if (err) return res.status(500).send("Error hash password");
        
        db.query("INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, ?)", [nama, email, hash, role], function(err) {
            if (err) {
                console.error("Error tambah user:", err);
                return res.status(500).send("Email sudah terdaftar atau terjadi kesalahan.");
            }
            res.redirect('/admin/users');
        });
    });
});

// EDIT INFO USER (Tanpa Ganti Password)
router.post('/users/edit/:id', cekLogin, cekAdmin, function(req, res) {
    const { nama, email, role } = req.body;
    const userId = req.params.id;

    db.query("UPDATE users SET nama = ?, email = ?, role = ? WHERE id = ?", [nama, email, role, userId], function(err) {
        if (err) {
            console.error("Error edit user:", err);
            return res.status(500).send("Terjadi kesalahan sistem.");
        }
        res.redirect('/admin/users');
    });
});

// GANTI PASSWORD USER (RESET BY ADMIN)
router.post('/users/change-password/:id', cekLogin, cekAdmin, function(req, res) {
    const { password } = req.body;
    const userId = req.params.id;

    bcrypt.hash(password, 10, function(err, hash) {
        if (err) return res.status(500).send("Error hash password");

        db.query("UPDATE users SET password = ? WHERE id = ?", [hash, userId], function(err) {
            if (err) {
                console.error("Error change password:", err);
                return res.status(500).send("Terjadi kesalahan sistem.");
            }
            res.redirect('/admin/users');
        });
    });
});

// HAPUS USER
router.post('/users/delete/:id', cekLogin, cekAdmin, function(req, res) {
    const userId = req.params.id;

    // Cegah hapus diri sendiri jika Admin
    if (userId == req.session.user.id) {
        return res.status(400).send("Anda tidak dapat menghapus akun Anda sendiri.");
    }

    // 1. Hapus data terkait secara manual untuk memastikan bersih (terutama jika CASCADE belum aktif di DB)
    const tables = ['budgets', 'transactions', 'wallets', 'categories', 'feedbacks'];
    
    // Gunakan fungsi rekursif untuk menghapus satu per satu tabel terkait
    function deleteRelatedData(index) {
        if (index >= tables.length) {
            // Setelah semua data terkait terhapus, baru hapus user utama
            db.query("DELETE FROM users WHERE id = ?", [userId], function(err) {
                if (err) {
                    console.error("Error hapus user:", err);
                    return res.status(500).send("Gagal menghapus user.");
                }
                res.redirect('/admin/users');
            });
            return;
        }

        const currentTable = tables[index];
        db.query(`DELETE FROM ${currentTable} WHERE user_id = ?`, [userId], function(err) {
            if (err) console.error(`Error hapus data di tabel ${currentTable}:`, err);
            deleteRelatedData(index + 1);
        });
    }

    // Mulai proses penghapusan berantai
    deleteRelatedData(0);
});

// TOGGLE STATUS AKTIF USER
router.post('/users/toggle-status/:id', cekLogin, cekAdmin, function(req, res) {
    const userId = req.params.id;
    const { status } = req.body; // 1 untuk aktif, 0 untuk nonaktif

    db.query("UPDATE users SET is_active = ? WHERE id = ?", [status, userId], function(err) {
        if (err) {
            console.error("Error toggle status:", err);
            return res.status(500).json({ success: false, message: "Gagal mengubah status." });
        }
        res.json({ success: true, message: "Status akun diperbarui." });
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

// HALAMAN MANAJEMEN TRANSAKSI (ADMIN)
router.get('/transactions', cekLogin, cekAdmin, function(req, res) {
    const qTransactions = `
        SELECT t.*, u.nama as user_name, u.email as user_email, u.profile_picture as user_avatar
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.date DESC
    `;

    db.query(qTransactions, function(err, transactions) {
        if (err) {
            console.error("Error mengambil semua transaksi:", err);
            transactions = [];
        }

        // Grouping by User and calculating global stats
        let globalIncome = 0;
        let globalExpense = 0;

        const grouped = transactions.reduce((acc, tx) => {
            if (!acc[tx.user_id]) {
                acc[tx.user_id] = {
                    id: tx.user_id,
                    name: tx.user_name,
                    email: tx.user_email,
                    avatar: tx.user_avatar,
                    totalIncome: 0,
                    totalExpense: 0,
                    transactions: []
                };
            }
            acc[tx.user_id].transactions.push(tx);
            const amount = parseFloat(tx.amount);
            if (tx.type === 'income') {
                acc[tx.user_id].totalIncome += amount;
                globalIncome += amount;
            } else {
                acc[tx.user_id].totalExpense += amount;
                globalExpense += amount;
            }
            return acc;
        }, {});

        res.render('admin_transactions', {
            title: 'Managemen Transaksi',
            user: req.session.user,
            groupedTransactions: Object.values(grouped),
            totalTransactions: transactions.length,
            globalIncome: globalIncome,
            globalExpense: globalExpense,
            activeMenu: 'admin_transactions'
        });
    });
});

module.exports = router;