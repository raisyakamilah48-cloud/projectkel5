var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var db = require('./config/database');

// Import Routes
var authRouter = require('./routes/auth');
var indexRouter = require('./routes/index'); // Ini untuk Dashboard
var transactionsRouter = require('./routes/transactions');
var reportsRouter = require('./routes/reports');
var adminRouter = require('./routes/admin');
var budgetRouter = require('./routes/budget');
var categoriesRouter = require('./routes/categories');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Setup Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
  secret: 'cekuangku_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 jam
}));

// --- ROUTING ---

// 1. HALAMAN LANDING PAGE (/)
app.get('/', function(req, res) {
    res.render('landing', { 
        user: req.session.user 
    });
});

// 2. HALAMAN TENTANG KAMI (/about)
app.get('/about', function(req, res) {
    res.render('about', { 
        user: req.session.user 
    });
});

// 3. ROUTE BUDGET (/budget)
app.use('/budget', budgetRouter);

// 3. ROUTE ADMIN (/admin)
app.use('/admin', adminRouter);

// 4. ROUTE AUTH (/auth/login, /auth/register)
app.use('/auth', authRouter);

// 5. ROUTE DASHBOARD (/dashboard)
// Middleware proteksi: Hanya bisa diakses jika ada session user
app.use('/dashboard', function(req, res, next) {
    if(req.session.user){
        next();
    } else {
        res.redirect('/auth/login');
    }
}, indexRouter);

// 6. ROUTE LAINNYA
app.use('/transactions', transactionsRouter);
app.use('/reports', reportsRouter);
app.use('/categories', categoriesRouter);

// catch 404
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;