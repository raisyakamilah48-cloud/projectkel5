// routes/budget.js
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

// HALAMAN BUDGET (GET)
router.get('/', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Query 1: Ambil budget bulan ini
    const qBudgets = "SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ? ORDER BY category";
    db.query(qBudgets, [userId, currentMonth, currentYear], function(err, budgets) {
        if (err) { console.log("Budget Error:", err); budgets = []; }

        // Query 2: Ambil pengeluaran per kategori bulan ini
        const qExpenses = `
            SELECT category, SUM(amount) as total 
            FROM transactions 
            WHERE user_id = ? AND type = 'expense' AND MONTH(date) = ? AND YEAR(date) = ?
            GROUP BY category
        `;
        db.query(qExpenses, [userId, currentMonth, currentYear], function(err, expenses) {
            if (err) { console.log("Expense Error:", err); expenses = []; }

            // Query 3: Ambil kategori pengeluaran milik user
            db.query("SELECT * FROM categories WHERE user_id = ? AND type = 'expense' ORDER BY name", [userId], function(err, categories) {
                if (err) { console.log("Categories Error:", err); categories = []; }

                // Build expense lookup
                const expenseMap = {};
                expenses.forEach(function(e) {
                    expenseMap[e.category] = parseFloat(e.total);
                });

                // Combine budget + spending
                let totalBudget = 0;
                let totalSpent = 0;
                const budgetItems = budgets.map(function(b) {
                    const budgetAmt = parseFloat(b.amount);
                    const spent = expenseMap[b.category] || 0;
                    const remaining = budgetAmt - spent;
                    const percent = budgetAmt > 0 ? Math.round((spent / budgetAmt) * 100) : 0;
                    totalBudget += budgetAmt;
                    totalSpent += spent;

                    return {
                        id: b.id,
                        category: b.category,
                        budgetAmount: budgetAmt,
                        spent: spent,
                        remaining: remaining,
                        percent: Math.min(percent, 100)
                    };
                });

                const totalRemaining = totalBudget - totalSpent;
                const totalPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

                res.render('budget', {
                    title: 'Anggaran',
                    user: req.session.user,
                    budgetItems: budgetItems,
                    totalBudget: totalBudget,
                    totalSpent: totalSpent,
                    totalRemaining: totalRemaining,
                    totalPercent: totalPercent,
                    categories: categories || [],
                    currentMonth: currentMonth,
                    currentYear: currentYear
                });
            });
        });
    });
});

// TAMBAH BUDGET (POST)
router.post('/add', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    const { category, amount } = req.body;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (!category || !amount) {
        return res.redirect('/budget');
    }

    // Check if budget for this category already exists
    db.query(
        "SELECT id FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND year = ?",
        [userId, category, currentMonth, currentYear],
        function(err, existing) {
            if (err) { console.log("Budget Check Error:", err); return res.redirect('/budget'); }

            if (existing && existing.length > 0) {
                // Update existing
                db.query(
                    "UPDATE budgets SET amount = ? WHERE id = ?",
                    [amount, existing[0].id],
                    function(err) {
                        if (err) console.log("Budget Update Error:", err);
                        res.redirect('/budget');
                    }
                );
            } else {
                // Insert new
                db.query(
                    "INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)",
                    [userId, category, amount, currentMonth, currentYear],
                    function(err) {
                        if (err) console.log("Budget Insert Error:", err);
                        res.redirect('/budget');
                    }
                );
            }
        }
    );
});

// HAPUS BUDGET (POST)
router.post('/delete/:id', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    db.query("DELETE FROM budgets WHERE id = ? AND user_id = ?", [req.params.id, userId], function(err) {
        if (err) console.log("Budget Delete Error:", err);
        res.redirect('/budget');
    });
});

module.exports = router;
