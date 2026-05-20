var express = require('express');
var router = express.Router();
var db = require('../config/database');
var bcrypt = require('bcrypt');
var multer = require('multer');
var path = require('path');
var fs = require('fs');

// Konfigurasi Multer untuk upload foto
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/images/profileUsers');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.session.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
    }
    cb(null, true);
  }
});


// GET Halaman Setelan
router.get('/', function(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  
  const userId = req.session.user.id;
  
  db.query("SELECT * FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC", [userId], function(err, feedbacks) {
      res.render('settings', { 
        title: 'Setelan', 
        user: req.session.user,
        feedbacks: feedbacks || [],
        error: req.session.error || null,
        success: req.session.success || null
      });
      
      // Clear messages
      req.session.error = null;
      req.session.success = null;
  });
});

// POST Update Profil
router.post('/update', upload.single('profile_picture'), async function(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');

  const userId = req.session.user.id;
  const { nama, email, password } = req.body;
  let updateQuery = "UPDATE users SET nama = ?, email = ?";
  let queryParams = [nama, email];

  try {
    // 1. Jika ada password baru, tambahkan ke query update
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ", password = ?";
      queryParams.push(hashedPassword);
    }

    // 2. Jika ada foto baru yang diupload, tambahkan ke query
    let newProfilePic = req.session.user.profile_picture; // simpan default yg lama
    if (req.file) {
      newProfilePic = '/images/profileUsers/' + req.file.filename;
      updateQuery += ", profile_picture = ?";
      queryParams.push(newProfilePic);
    }

    updateQuery += " WHERE id = ?";
    queryParams.push(userId);

    // 3. Eksekusi Query
    db.query(updateQuery, queryParams, function(err, result) {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            req.session.error = "Email sudah digunakan oleh akun lain.";
        } else {
            req.session.error = "Terjadi kesalahan pada server.";
        }
        return res.redirect('/settings');
      }

      // 4. Update session dengan data baru
      req.session.user.nama = nama;
      req.session.user.email = email;
      req.session.user.profile_picture = newProfilePic;
      
      req.session.success = "Profil berhasil diperbarui!";
      res.redirect('/settings');
    });

  } catch (error) {
    req.session.error = "Terjadi kesalahan sistem.";
    res.redirect('/settings');
  }
});

// POST Toggle Calculator
router.post('/toggle-calculator', function(req, res) {
  if (!req.session.user) return res.status(401).json({ success: false });

  const userId = req.session.user.id;
  // Invert the current status stored in session
  const newStatus = req.session.user.calculator_active ? false : true;

  db.query("UPDATE users SET calculator_active = ? WHERE id = ?", [newStatus, userId], function(err) {
    if (err) return res.status(500).json({ success: false });
    
    req.session.user.calculator_active = newStatus;
    res.json({ success: true, calculator_active: newStatus });
  });
});

// GET User Statistics for Calculator
router.get('/get-stats', function(req, res) {
  if (!req.session.user) return res.status(401).json({ success: false });

  const userId = req.session.user.id;
  
  const qWallets = "SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = ?";
  const qIncome = "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income'";
  const qExpense = "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense'";

  db.query(qWallets, [userId], function(err1, wRes) {
    db.query(qIncome, [userId], function(err2, iRes) {
      db.query(qExpense, [userId], function(err3, eRes) {
        if (err1 || err2 || err3) return res.status(500).json({ success: false });

        const totalWallet = parseFloat(wRes[0].total);
        const totalIncome = parseFloat(iRes[0].total);
        const totalExpense = parseFloat(eRes[0].total);

        // Calculate fallback wallet balance in case user has no wallets
        const fallbackWallet = totalIncome - totalExpense;

        res.json({
          success: true,
          totalWallet: wRes[0].total > 0 ? totalWallet : fallbackWallet,
          totalIncome: totalIncome,
          totalExpense: totalExpense
        });
      });
    });
  });
});

// GET User Budgets for Calculator
router.get('/get-budgets', function(req, res) {
  if (!req.session.user) return res.status(401).json({ success: false });

  const userId = req.session.user.id;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Get budgets for current month
  db.query("SELECT id, category, amount FROM budgets WHERE user_id = ? AND month = ? AND year = ?", [userId, currentMonth, currentYear], function(err, results) {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, budgets: results || [] });
  });
});

// POST Submit Feedback
router.post('/submit-feedback', function(req, res) {
  if (!req.session.user) return res.redirect('/auth/login');

  const userId = req.session.user.id;
  const message = req.body.message;

  if (!message || message.trim() === '') {
    req.session.error = "Pesan saran tidak boleh kosong.";
    return res.redirect('/settings');
  }

  db.query("INSERT INTO feedbacks (user_id, message) VALUES (?, ?)", [userId, message], function(err) {
    if (err) {
      req.session.error = "Gagal mengirimkan saran. Silakan coba lagi.";
    } else {
      req.session.success = "Terima kasih! Saran Anda telah terkirim kepada kami.";
    }
    res.redirect('/settings');
  });
});

module.exports = router;
