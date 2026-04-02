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
  
  res.render('settings', { 
    title: 'Setelan', 
    user: req.session.user,
    error: req.session.error || null,
    success: req.session.success || null
  });
  
  // Clear messages
  req.session.error = null;
  req.session.success = null;
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

module.exports = router;
