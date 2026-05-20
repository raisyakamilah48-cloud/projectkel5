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

    // Ambil budget bulan ini ATAU budget custom (semua custom budget ditampilkan agar bisa di-renew jika expired)
    const qBudgets = "SELECT * FROM budgets WHERE user_id = ? ORDER BY category";
    db.query(qBudgets, [userId], async function(err, budgets) {
        if (err) { console.log("Budget Error:", err); budgets = []; }

        // Ambil kategori pengeluaran milik user
        db.query("SELECT * FROM categories WHERE user_id = ? AND type = 'expense' ORDER BY name", [userId], async function(err, categories) {
            if (err) { console.log("Categories Error:", err); categories = []; }

            let totalBudget = 0;
            let totalSpent = 0;
            const budgetItems = [];

            // Helper function to sum expenses based on date range
            const getExpense = (categoryId, startDate, endDate, bType, month, year) => {
                return new Promise((resolve) => {
                    let q = "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND category = ?";
                    let params = [userId, categoryId];
                    
                    if (bType === 'custom' && startDate && endDate) {
                        q += " AND DATE(date) >= ? AND DATE(date) <= ?";
                        params.push(startDate, endDate);
                    } else if (bType === 'unlimited' && startDate) {
                        q += " AND DATE(date) >= ?";
                        params.push(startDate);
                    } else if ((bType === 'monthly' || !bType) && month && year) {
                        q += " AND MONTH(date) = ? AND YEAR(date) = ?";
                        params.push(month, year);
                    }
                    
                    db.query(q, params, (err, result) => {
                        if (err || !result || !result[0].total) resolve(0);
                        else resolve(parseFloat(result[0].total));
                    });
                });
            };

            // Process each budget asynchronously to get accurate spent amounts
            for (const b of budgets) {
                const budgetAmt = parseFloat(b.amount);
                
                // Cek status expired
                let is_expired = false;
                let endDateStr = null;
                if (b.budget_type === 'custom' && b.end_date) {
                    const endDate = new Date(b.end_date);
                    endDate.setHours(23, 59, 59, 999);
                    if (now > endDate) {
                        is_expired = true;
                    }
                    endDateStr = endDate.toISOString().split('T')[0]; // format YYYY-MM-DD
                }

                // Ambil total pengeluaran untuk budget ini
                const spent = await getExpense(b.category, b.start_date, b.end_date, b.budget_type, b.month, b.year);
                
                const remaining = budgetAmt - spent;
                const percent = budgetAmt > 0 ? Math.round((spent / budgetAmt) * 100) : 0;
                
                // Tambahkan ke total akumulasi hanya jika belum diarsipkan (is_archived = 0)
                // Budget expired tapi belum diarsipkan tetap dihitung di ringkasan aktif
                if (!b.is_archived) {
                    totalBudget += budgetAmt;
                    totalSpent += spent;
                }

                let remainingDaysStr = null;
                let startDateStr = null;
                if (b.budget_type === 'custom' && b.end_date) {
                    startDateStr = new Date(b.start_date).toISOString().split('T')[0];
                    if (!is_expired) {
                        const endDate = new Date(b.end_date);
                        endDate.setHours(23, 59, 59, 999);
                        const diffTime = endDate - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        remainingDaysStr = diffDays;
                    }
                }

                budgetItems.push({
                    id: b.id,
                    category: b.category,
                    budgetAmount: budgetAmt,
                    spent: spent,
                    remaining: remaining,
                    percent: Math.min(percent, 100),
                    budget_type: b.budget_type,
                    duration_days: b.duration_days,
                    is_expired: is_expired,
                    is_archived: !!b.is_archived,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    remaining_days: remainingDaysStr,
                    created_at: b.created_at ? new Date(new Date(b.created_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0] : ''
                });
            }

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

// TAMBAH BUDGET (POST)
router.post('/add', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    const { category, amount, budget_type, duration_days } = req.body;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (!category || !amount) {
        return res.redirect('/budget');
    }

    let bType = budget_type === 'custom' ? 'custom' : 'unlimited';
    let start_date = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; // Today local YYYY-MM-DD
    let end_date = null;
    let duration = null;

    if (bType === 'custom' && duration_days && !isNaN(duration_days)) {
        duration = parseInt(duration_days);
        start_date = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; // Today local YYYY-MM-DD
        let endObj = new Date(now);
        endObj.setDate(endObj.getDate() + duration);
        end_date = new Date(endObj.getTime() - (endObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Cek apakah ada budget AKTIF untuk kategori ini
    // Budget aktif = bukan custom (unlimited) ATAU custom yang belum kedaluwarsa
    db.query(
        "SELECT id FROM budgets WHERE user_id = ? AND category = ? AND (budget_type != 'custom' OR (budget_type = 'custom' AND end_date >= ?)) LIMIT 1",
        [userId, category, todayStr],
        function(err, existing) {
            if (err) { console.log("Budget Check Error:", err); return res.redirect('/budget'); }

            if (existing && existing.length > 0) {
                // Update active budget
                db.query(
                    "UPDATE budgets SET amount = ?, budget_type = ?, start_date = ?, end_date = ?, duration_days = ?, month = ?, year = ? WHERE id = ?",
                    [amount, bType, start_date, end_date, duration, currentMonth, currentYear, existing[0].id],
                    function(err) {
                        if (err) console.log("Budget Update Error:", err);
                        
                        db.query("UPDATE budgets SET is_archived = 1 WHERE user_id = ? AND category = ? AND id != ?", [userId, category, existing[0].id], function() {
                            res.redirect('/budget');
                        });
                    }
                );
            } else {
                // Insert new budget
                db.query(
                    "INSERT INTO budgets (user_id, category, amount, month, year, budget_type, start_date, end_date, duration_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [userId, category, amount, currentMonth, currentYear, bType, start_date, end_date, duration],
                    function(err, insertResult) {
                        if (err) console.log("Budget Insert Error:", err);
                        
                        const newId = insertResult ? insertResult.insertId : 0;
                        db.query("UPDATE budgets SET is_archived = 1 WHERE user_id = ? AND category = ? AND id != ?", [userId, category, newId], function() {
                            res.redirect('/budget');
                        });
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

// SKIP (Archive) Expired Budget (POST)
router.post('/skip/:id', cekLogin, function(req, res) {
    const userId = req.session.user.id;
    db.query("UPDATE budgets SET is_archived = 1 WHERE id = ? AND user_id = ?", [req.params.id, userId], function(err) {
        if (err) console.log("Budget Skip Error:", err);
        res.redirect('/budget');
    });
});

module.exports = router;
