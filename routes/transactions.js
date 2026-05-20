var express = require('express');
var router = express.Router();
var db = require('../config/database');
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var ExcelJS = require('exceljs');

// Konfigurasi Multer untuk Attachment Transaksi
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/images/transactions';
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
    limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya diperbolehkan mengupload gambar!'));
        }
    }
});

// Middleware Cek Login
function cekLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        return res.redirect('/auth/login');
    }
}

// HALAMAN TRANSAKSI (GET) — Ambil transactions + categories dari DB
router.get('/', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;

    // Query 1: Ambil kategori milik user
    db.query("SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC", [userId], function(err, categories) {
        if (err) { console.log("Categories Error:", err); categories = []; }

        // Query 2: Ambil transaksi user
        db.query(
            "SELECT transactions.*, wallets.name AS wallet_name, wallets.color AS wallet_color FROM transactions LEFT JOIN wallets ON transactions.wallet_id = wallets.id WHERE transactions.user_id = ? ORDER BY date DESC",
            [userId],
            function(err, results) {
                if (err) {
                    console.error("Database Error:", err);
                    return res.send("Terjadi kesalahan database.");
                }

                // Query 3: Summary stats (untuk mini cards di halaman)
                const qStats = `
                    SELECT 
                        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as totalIncome,
                        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as totalExpense,
                        COUNT(*) as totalCount
                    FROM transactions WHERE user_id = ?
                `;
                db.query(qStats, [userId], function(err, stats) {
                    if (err) { console.log("Stats Error:", err); stats = [{ totalIncome: 0, totalExpense: 0, totalCount: 0 }]; }

                    // Query 4: Ambil wallets milik user untuk dropdown pilih dompet
                    db.query("SELECT * FROM wallets WHERE user_id = ? ORDER BY is_default DESC", [userId], function(err, wallets) {
                        
                        // Query 5: Ambil budget dan pengeluaran bulan ini untuk cek limit di frontend
                        const now = new Date();
                        const currentMonth = now.getMonth() + 1;
                        const currentYear = now.getFullYear();

                        const qBudgets = "SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?";
                        db.query(qBudgets, [userId, currentMonth, currentYear], function(err, budgets) {
                            if (err) { console.log("Budget Error:", err); budgets = []; }

                            const qExpenses = `
                                SELECT category, SUM(amount) as total 
                                FROM transactions 
                                WHERE user_id = ? AND type = 'expense' AND MONTH(date) = ? AND YEAR(date) = ?
                                GROUP BY category
                            `;
                            db.query(qExpenses, [userId, currentMonth, currentYear], function(err, expenses) {
                                if (err) { console.log("Expense Error:", err); expenses = []; }

                                const expenseMap = {};
                                expenses.forEach(e => { expenseMap[e.category] = parseFloat(e.total); });

                                const budgetData = {};
                                budgets.forEach(b => {
                                    const budgetAmt = parseFloat(b.amount);
                                    const spent = expenseMap[b.category] || 0;
                                    budgetData[b.category] = { budget: budgetAmt, spent: spent, remaining: budgetAmt - spent };
                                });

                                res.render('transactions', {
                                    title: 'Transaksi',
                                    user: req.session.user,
                                    transactions: results,
                                    categories: categories || [],
                                    wallets: wallets || [],
                                    stats: stats ? stats[0] : { totalIncome: 0, totalExpense: 0, totalCount: 0 },
                                    budgetData: JSON.stringify(budgetData)
                                });
                            });
                        });
                    });
                });
            }
        );
    });
});

// PROSES TAMBAH TRANSAKSI (POST)
router.post('/add', cekLogin, upload.single('attachment'), function(req, res, next) {
    const userId = req.session.user.id;
    const { type, category, description, amount, wallet_id } = req.body;

    if (!description || !amount) {
        return res.send("Data tidak lengkap");
    }

    const walletIdVal = wallet_id ? wallet_id : null;
    let attachmentPath = null;
    if (req.file) {
        attachmentPath = '/images/transactions/' + req.file.filename;
    }

    const sql = "INSERT INTO transactions (user_id, type, category, description, amount, wallet_id, attachment) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [userId, type, category, description, amount, walletIdVal, attachmentPath], function(err, result) {
        if (err) {
            console.error("Gagal Insert:", err);
            return res.send("Gagal menyimpan transaksi.");
        }

        // Jika terhubung dengan dompet, update saldo dompet
        if (walletIdVal) {
            let modifier = (type === 'income') ? parseFloat(amount) : -parseFloat(amount);
            db.query("UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?", [modifier, walletIdVal, userId], function(err2) {
                if (err2) console.error("Gagal update saldo dompet:", err2);
                res.redirect('/transactions');
            });
        } else {
            res.redirect('/transactions');
        }
    });
});

// HAPUS TRANSAKSI (POST)
router.post('/delete/:id', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;
    const transId = req.params.id;

    // Ambil info transaksi sebelum dihapus untuk restore saldo dompet
    db.query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [transId, userId], function(err, results) {
        if (err || results.length === 0) return res.redirect('/transactions');
        
        const trans = results[0];
        
        db.query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [transId, userId], function(err2) {
            if (err2) {
                console.error("Gagal Hapus:", err2);
                return res.send("Gagal menghapus transaksi.");
            }

            // Hapus file attachment jika ada
            if (trans.attachment) {
                const filePath = path.join(__dirname, '../public', trans.attachment);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            
            // Restore saldo jika ada wallet_id yang terasosiasi
            if (trans.wallet_id) {
                // Kebalikan dari operasi awal: pemasukan dulu + sekarang dikurangi. pengeluaran dulu - sekarang ditambah.
                let modifier = (trans.type === 'income') ? -parseFloat(trans.amount) : parseFloat(trans.amount);
                db.query("UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?", [modifier, trans.wallet_id, userId], function(err3) {
                    res.redirect('/transactions');
                });
            } else {
                res.redirect('/transactions');
            }
        });
    });
});// EXPORT EXCEL (mendukung filter rentang tanggal via query params)
router.get('/export', cekLogin, async function(req, res, next) {
    const userId = req.session.user.id;
    const { start_date, end_date } = req.query;

    // Tentukan apakah ada filter tanggal
    const hasDateFilter = start_date && end_date;

    let sql, params;
    if (hasDateFilter) {
        // Ekspor berdasarkan rentang tanggal — gunakan DATE() agar jam diabaikan
        sql = `
            SELECT t.*, w.name as wallet_name 
            FROM transactions t 
            LEFT JOIN wallets w ON t.wallet_id = w.id 
            WHERE t.user_id = ? AND DATE(t.date) BETWEEN ? AND ?
            ORDER BY t.date DESC
        `;
        params = [userId, start_date, end_date];
    } else {
        // Ekspor semua data (perilaku default)
        sql = `
            SELECT t.*, w.name as wallet_name 
            FROM transactions t 
            LEFT JOIN wallets w ON t.wallet_id = w.id 
            WHERE t.user_id = ? 
            ORDER BY t.date DESC
        `;
        params = [userId];
    }
    
    db.query(sql, params, async function(err, results) {
        if (err) {
            console.error("Export Error:", err);
            return res.status(500).send("Gagal mengekspor data");
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CekUangku';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Riwayat Transaksi', {
            views: [{ showGridLines: false }]
        });

        // Baris Judul Utama
        sheet.mergeCells('A1:G1');
        sheet.getCell('A1').value = 'LAPORAN TRANSAKSI KEUANGAN';
        sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } };

        // Baris Subjudul — tampilkan keterangan periode ekspor
        sheet.mergeCells('A2:G2');
        let periodLabel;
        if (hasDateFilter) {
            const startFormatted = new Date(start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            const endFormatted = new Date(end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            periodLabel = `Periode: ${startFormatted} s/d ${endFormatted}`;
        } else {
            periodLabel = `Seluruh Riwayat Transaksi`;
        }
        sheet.getCell('A2').value = `${periodLabel}  |  Diekspor pada: ${new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}`;
        sheet.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF475569' } };
        sheet.getCell('A2').alignment = { horizontal: 'center' };
        sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
        sheet.addRow([]); // Baris kosong pemisah

        // Baris Header Kolom
        const headerRow = sheet.addRow(['No', 'Tanggal', 'Tipe', 'Kategori', 'Sumber Dompet', 'Deskripsi', 'Jumlah']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Styling header
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Lebar kolom
        sheet.columns = [
            { key: 'no', width: 6 },
            { key: 'date', width: 15 },
            { key: 'type', width: 15 },
            { key: 'category', width: 20 },
            { key: 'wallet', width: 20 },
            { key: 'description', width: 45 },
            { key: 'amount', width: 20 }
        ];

        // Isi Data Transaksi
        let totalIncome = 0;
        let totalExpense = 0;

        results.forEach((row, index) => {
            const dateStr = new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const typeStr = row.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            const amount = parseFloat(row.amount);
            
            if (row.type === 'income') totalIncome += amount;
            else totalExpense += amount;

            const dataRow = sheet.addRow([
                index + 1,
                dateStr,
                typeStr,
                row.category || 'Lainnya',
                row.wallet_name || '-',
                row.description,
                amount
            ]);

            // Warna baris selang-seling
            if (index % 2 === 0) {
                dataRow.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                });
            }

            // Format kolom
            dataRow.getCell(1).alignment = { horizontal: 'center' };
            dataRow.getCell(2).alignment = { horizontal: 'center' };
            dataRow.getCell(3).font = { color: { argb: row.type === 'income' ? 'FF10B981' : 'FFEF4444' }, bold: true };
            dataRow.getCell(3).alignment = { horizontal: 'center' };
            dataRow.getCell(7).numFmt = '"Rp" #,##0.00;[Red]\\-"Rp" #,##0.00';
            
            dataRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        // Baris Total Saldo
        sheet.addRow([]);
        const sumRow = sheet.addRow(['', '', '', '', '', 'Total Saldo:', totalIncome - totalExpense]);
        sumRow.getCell(6).font = { bold: true };
        sumRow.getCell(6).alignment = { horizontal: 'right' };
        sumRow.getCell(7).font = { bold: true, color: { argb: (totalIncome - totalExpense) >= 0 ? 'FF10B981' : 'FFEF4444' } };
        sumRow.getCell(7).numFmt = '"Rp" #,##0.00;[Red]\\-"Rp" #,##0.00';
        sumRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        sumRow.getCell(7).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // Nama file menyesuaikan dengan filter
        let filename = hasDateFilter 
            ? `CekUangku-Transaksi_${start_date}_sd_${end_date}.xlsx`
            : 'CekUangku-Transaksi-Semua.xlsx';

        // Response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Tulis dan kirim
        await workbook.xlsx.write(res);
        res.end();
    });
});

module.exports = router;