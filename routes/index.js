var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  
  // 1. Ambil data user dari session
  const userData = req.session.user;

  // 2. Cek keamanan (Jika belum login, tendang ke login)
  if (!userData) {
      console.log("Belum login, redirect ke /auth/login");
      return res.redirect('/auth/login');
  }

  // 3. Kirim data user ke view dashboard
  res.render('dashboard', { 
      title: 'Dashboard',
      user: userData // Pastikan nama variabelnya 'user'
  });
});

module.exports = router;