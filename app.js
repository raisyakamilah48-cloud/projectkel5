var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

// Import Routes yang BENAR
var authRouter = require('./routes/auth');   // Untuk Login/Register
var indexRouter = require('./routes/index'); // Ini biasanya untuk Dashboard
var transactionsRouter = require('./routes/transactions'); // TAMBAHKAN INI
var reportsRouter = require('./routes/reports'); // Tambahkan ini
var adminRouter = require('./routes/admin'); // Tambahkan ini
// Jika Anda punya file dashboard.js terpisah, uncomment baris bawah:
// var dashboardRouter = require('./routes/dashboard');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// PENTING: Agar CSS, JS, dan Gambar bisa terbaca
app.use(express.static(path.join(__dirname, 'public')));

// session
app.use(session({
  secret: 'cekuangku_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 jam
}));

// --- PERBAIKAN ROUTING DI SINI ---

app.use('/admin', adminRouter); 

// 1. Route untuk Halaman Utama (/) -> Arahkan ke Login jika belum login
app.use('/', indexRouter); 

app.use('/', authRouter); 

// 2. Route untuk Auth (/auth/login, /auth/register) -> Kita pakai authRouter
app.use('/auth', authRouter);

// 3. Route untuk Dashboard (/dashboard)
// Kita gunakan indexRouter (atau dashboardRouter jika Anda buat file baru)
// Tambahkan middleware cekLogin di sini agar hanya yang login yang bisa akses
app.use('/dashboard', function(req, res, next) {
    if(req.session.user){
        next(); // Lanjut ke router
    } else {
        res.redirect('/auth/login'); // Belum login? tendang ke login
    }
}, indexRouter); 

app.use('/transactions', transactionsRouter); // TAMBAHKAN INI (Route Transaksi)

app.use('/reports', reportsRouter);

// catch 404
app.use(function(req, res, next) {
  next(createError(404));
});

module.exports = app;