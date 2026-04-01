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

// HALAMAN REPORTS — FULL DYNAMIC DATA
router.get('/', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;

    // Default values
    const defaults = {
        title: 'Financial Reports',
        user: req.session.user,
        monthlyData: [],
        categoryExpense: [],
        categoryIncome: [],
        totals: { totalIncome: 0, totalExpense: 0, totalTransactions: 0 },
        transactions: []
    };

    // Query 1: Monthly aggregation (income & expense per bulan)
    const qMonthly = `
        SELECT 
            MONTH(date) as month, 
            YEAR(date) as year, 
            type, 
            SUM(amount) as total,
            COUNT(*) as count
        FROM transactions 
        WHERE user_id = ? 
        GROUP BY YEAR(date), MONTH(date), type 
        ORDER BY YEAR(date), MONTH(date)
    `;
    db.query(qMonthly, [userId], function(err, monthlyData) {
        if (err) { console.log("Reports Monthly Error:", err); return res.render('reports', defaults); }

        // Query 2: Category breakdown (expenses)
        const qCatExpense = `
            SELECT category, SUM(amount) as total, COUNT(*) as count 
            FROM transactions 
            WHERE user_id = ? AND type = 'expense' 
            GROUP BY category 
            ORDER BY total DESC
        `;
        db.query(qCatExpense, [userId], function(err, categoryExpense) {
            if (err) { console.log("Reports CatExpense Error:", err); categoryExpense = []; }

            // Query 3: Category breakdown (income)
            const qCatIncome = `
                SELECT category, SUM(amount) as total, COUNT(*) as count 
                FROM transactions 
                WHERE user_id = ? AND type = 'income' 
                GROUP BY category 
                ORDER BY total DESC
            `;
            db.query(qCatIncome, [userId], function(err, categoryIncome) {
                if (err) { console.log("Reports CatIncome Error:", err); categoryIncome = []; }

                // Query 4: Summary totals
                const qTotals = `
                    SELECT 
                        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as totalIncome,
                        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as totalExpense,
                        COUNT(*) as totalTransactions
                    FROM transactions 
                    WHERE user_id = ?
                `;
                db.query(qTotals, [userId], function(err, totals) {
                    if (err) { console.log("Reports Totals Error:", err); totals = [{ totalIncome: 0, totalExpense: 0, totalTransactions: 0 }]; }

                    // Query 5: All transactions (untuk tabel detail)
                    const qAll = "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 20";
                    db.query(qAll, [userId], function(err, allTransactions) {
                        if (err) { console.log("Reports All Error:", err); allTransactions = []; }

                        res.render('reports', {
                            title: 'Financial Reports',
                            user: req.session.user,
                            monthlyData: monthlyData || [],
                            categoryExpense: categoryExpense || [],
                            categoryIncome: categoryIncome || [],
                            totals: totals ? totals[0] : { totalIncome: 0, totalExpense: 0, totalTransactions: 0 },
                            transactions: allTransactions || []
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;