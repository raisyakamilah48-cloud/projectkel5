var express = require('express');
var router = express.Router();
var db = require('../config/database');
var bcrypt = require('bcrypt');

// halaman login
router.get('/login', function(req, res) {
  res.render('login');
});

// proses login
router.post('/login', function(req, res) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.send("Email dan password wajib diisi");
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async function(err, results) {
    if (err) {
      console.log(err);
      return res.send("Error database");
    }

    if (results.length === 0) {
      return res.send("Email belum terdaftar, silakan register");
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.send("Password salah");
    }

    req.session.user = user;
    res.redirect('/auth/dashboard');
  });
});

// halaman register
router.get('/register', function(req, res) {
  res.render('register');
});

// proses register
router.post('/register', async function(req, res) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.send("Email dan password wajib diisi");
  }

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hash],
    function(err) {
      if (err) {
        console.log(err);
        return res.send("Gagal register");
      }
      res.redirect('/auth/login');
    }
  );
});

// dashboard
router.get('/dashboard', function(req, res) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  res.render('dashboard', { user: req.session.user });
});

// logout
router.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/auth/login');
  });
});

module.exports = router;
