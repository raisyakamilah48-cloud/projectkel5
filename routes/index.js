var express = require('express');
var router = express.Router();
var db = require('../config/database');

/* GET dashboard page — FULL DYNAMIC DATA */
router.get('/', function(req, res, next) {

  // 1. Cek login
  const userData = req.session.user;
  if (!userData) {
    return res.redirect('/auth/login');
  }

  const userId = userData.id;

  // Default values jika query gagal
  const defaults = {
    title: 'Dashboard',
    user: userData,
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
    recentTransactions: [],
    categoryData: [],
    monthlyData: []
  };

  // Query 1: Total Income
  const qIncome = "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income'";
  db.query(qIncome, [userId], function(err, incomeResult) {
    if (err) { console.log("Dashboard Income Error:", err); return res.render('dashboard', defaults); }

    // Query 2: Total Expense
    const qExpense = "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense'";
    db.query(qExpense, [userId], function(err, expenseResult) {
      if (err) { console.log("Dashboard Expense Error:", err); return res.render('dashboard', defaults); }

      // Query 3: Transaction Count
      const qCount = "SELECT COUNT(*) as total FROM transactions WHERE user_id = ?";
      db.query(qCount, [userId], function(err, countResult) {
        if (err) { console.log("Dashboard Count Error:", err); return res.render('dashboard', defaults); }

        // Query 4: Recent 5 Transactions
        const qRecent = "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 5";
        db.query(qRecent, [userId], function(err, recentTransactions) {
          if (err) { console.log("Dashboard Recent Error:", err); recentTransactions = []; }

          // Query 5: Category Breakdown (expenses only, for pie chart)
          const qCategory = "SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' GROUP BY category ORDER BY total DESC";
          db.query(qCategory, [userId], function(err, categoryData) {
            if (err) { console.log("Dashboard Category Error:", err); categoryData = []; }

            // Query 6: Monthly Trend (group by month + type)
            const qMonthly = "SELECT MONTH(date) as month, YEAR(date) as year, type, SUM(amount) as total FROM transactions WHERE user_id = ? GROUP BY YEAR(date), MONTH(date), type ORDER BY YEAR(date), MONTH(date)";
            db.query(qMonthly, [userId], function(err, monthlyData) {
              if (err) { console.log("Dashboard Monthly Error:", err); monthlyData = []; }

              // Query 7: Wallets Total Balance
              const qWalletLimit = "SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = ?";
              db.query(qWalletLimit, [userId], function(err, walletResult) {
                if (err) { console.log("Dashboard Wallet Error:", err); }

                // Hitung totals
                const totalIncome = incomeResult ? parseFloat(incomeResult[0].total) : 0;
                const totalExpense = expenseResult ? parseFloat(expenseResult[0].total) : 0;
                const totalBalance = walletResult && walletResult[0].total ? parseFloat(walletResult[0].total) : (totalIncome - totalExpense);
                const transactionCount = countResult ? countResult[0].total : 0;

                // Cek onboarding
                const showOnboarding = req.session.isNewUser ? true : false;
                if (showOnboarding) {
                    delete req.session.isNewUser;
                }

                // Render dashboard dengan semua data
                res.render('dashboard', {
                  title: 'Dashboard',
                  user: userData,
                  totalBalance: totalBalance,
                  totalIncome: totalIncome,
                  totalExpense: totalExpense,
                  transactionCount: transactionCount,
                  recentTransactions: recentTransactions || [],
                  categoryData: categoryData || [],
                  monthlyData: monthlyData || [],
                  showOnboarding: showOnboarding
                });
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;