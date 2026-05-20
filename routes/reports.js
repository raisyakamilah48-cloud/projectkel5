// routes/reports.js
var express = require('express');
var router = express.Router();
var db = require('../config/database');
var path = require('path');
var fs = require('fs');
var PDFDocument = require('pdfkit-table');


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

// HALAMAN EXPORT PDF - SERVER-SIDE RENDERING MENGGUNAKAN PDFKIT
router.get('/export-pdf', cekLogin, function(req, res, next) {
    const userId = req.session.user.id;

    // Ambil parameter rentang tanggal (opsional)
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const hasDateFilter = startDate && endDate;

    // Kondisi WHERE tambahan untuk filter tanggal
    const dateWhere = hasDateFilter ? ' AND date >= ? AND date <= DATE_ADD(?, INTERVAL 1 DAY)' : '';
    const dateParams = hasDateFilter ? [startDate, endDate] : [];

    // Label periode untuk judul PDF
    const periodeLabel = hasDateFilter
        ? `Periode: ${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : 'Semua Data Transaksi';

    // Kueri 1: Monthly aggregation (income & expense per bulan)
    const qMonthly = `
        SELECT 
            MONTH(date) as month, 
            YEAR(date) as year, 
            type, 
            SUM(amount) as total,
            COUNT(*) as count
        FROM transactions 
        WHERE user_id = ?${dateWhere}
        GROUP BY YEAR(date), MONTH(date), type 
        ORDER BY YEAR(date), MONTH(date)
    `;
    db.query(qMonthly, [userId, ...dateParams], function(err, monthlyData) {
        if (err) { console.log("Export PDF Monthly Error:", err); return res.status(500).send("Database error"); }

        // Kueri 2: Category breakdown (expenses)
        const qCatExpense = `
            SELECT category, SUM(amount) as total, COUNT(*) as count 
            FROM transactions 
            WHERE user_id = ? AND type = 'expense'${dateWhere}
            GROUP BY category 
            ORDER BY total DESC
        `;
        db.query(qCatExpense, [userId, ...dateParams], function(err, categoryExpense) {
            if (err) { console.log("Export PDF CatExpense Error:", err); categoryExpense = []; }

            // Kueri 3: Category breakdown (income)
            const qCatIncome = `
                SELECT category, SUM(amount) as total, COUNT(*) as count 
                FROM transactions 
                WHERE user_id = ? AND type = 'income'${dateWhere}
                GROUP BY category 
                ORDER BY total DESC
            `;
            db.query(qCatIncome, [userId, ...dateParams], function(err, categoryIncome) {
                if (err) { console.log("Export PDF CatIncome Error:", err); categoryIncome = []; }

                // Kueri 4: Summary totals (sesuai filter tanggal)
                const qTotals = `
                    SELECT 
                        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as totalIncome,
                        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as totalExpense,
                        COUNT(*) as totalTransactions
                    FROM transactions 
                    WHERE user_id = ?${dateWhere}
                `;
                db.query(qTotals, [userId, ...dateParams], function(err, totals) {
                    if (err) { console.log("Export PDF Totals Error:", err); totals = [{ totalIncome: 0, totalExpense: 0, totalTransactions: 0 }]; }

                    // Kueri 5: Transactions (sesuai filter tanggal, tanpa LIMIT jika ada filter)
                    const qAll = hasDateFilter
                        ? `SELECT * FROM transactions WHERE user_id = ?${dateWhere} ORDER BY date DESC`
                        : "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 20";
                    const qAllParams = hasDateFilter ? [userId, ...dateParams] : [userId];
                    db.query(qAll, qAllParams, async function(err, allTransactions) {
                        if (err) { console.log("Export PDF All Error:", err); allTransactions = []; }

                        const finalTotals = totals ? totals[0] : { totalIncome: 0, totalExpense: 0, totalTransactions: 0 };
                        const transactions = allTransactions || [];

                        // Mulai rendering PDF menggunakan PDFKit dengan bufferPages agar dapat menghitung total halaman secara dinamis
                        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

                        // Penamaan Berkas
                        const filename = 'CekUangku_Laporan_Keuangan_' + new Date().toISOString().split('T')[0] + '.pdf';
                        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                        res.setHeader('Content-type', 'application/pdf');

                        doc.pipe(res);

                        try {
                            // --- PAGE 1: RINGKASAN & DEKORASI ---

                            // Header Logo & Aplikasi
                            const logoPath = path.join(__dirname, '../public/images/asset-avatar/Main.png');
                            if (fs.existsSync(logoPath)) {
                                doc.image(logoPath, 40, 25, { width: 45 });
                            }

                            doc.font('Helvetica-Bold').fontSize(20).fillColor('#4361EE').text('CekUangku', 95, 28);
                            doc.font('Helvetica').fontSize(9).fillColor('#64748B').text('Laporan Transaksi Keuangan Personal', 95, 48);

                            // Tanggal Laporan di Kanan Atas
                            const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                            doc.font('Helvetica-Bold').fontSize(8).fillColor('#94A3B8').text('TANGGAL CETAK', doc.page.width - 180, 28, { align: 'right', width: 140 });
                            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text(formattedDate, doc.page.width - 180, 38, { align: 'right', width: 140 });

                            // Garis Separator
                            doc.moveTo(40, 80).lineTo(doc.page.width - 40, 80).strokeColor('#E2E8F0').lineWidth(1).stroke();

                            // Metadata Akun Pengguna
                            doc.save();
                            doc.fillOpacity(0.04).fillColor('#4361EE').roundedRect(40, 95, doc.page.width - 80, 45, 6).fill();
                            doc.restore();
                            doc.save();
                            doc.lineWidth(1).strokeColor('#E2E8F0').roundedRect(40, 95, doc.page.width - 80, 45, 6).stroke();
                            doc.restore();

                            const userNama = req.session.user.nama || 'Pengguna CekUangku';
                            const userEmail = req.session.user.email || '-';
                            doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B').text('PEMILIK AKUN', 55, 103);
                            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text(`${userNama} (${userEmail})`, 55, 115);
                            doc.font('Helvetica').fontSize(8).fillColor('#4361EE').text(`📅 ${periodeLabel}`, doc.page.width - 180, 108, { align: 'right', width: 140 });
                            
                            // Ringkasan Keuangan (Kartu)
                            const tIncome = parseFloat(finalTotals.totalIncome) || 0;
                            const tExpense = parseFloat(finalTotals.totalExpense) || 0;
                            const tBalance = tIncome - tExpense;
                            const tCount = finalTotals.totalTransactions || 0;
                            const pctExpense = tIncome > 0 ? Math.round((tExpense / tIncome) * 100) : 0;

                            const drawCard = (x, y, w, h, bgColor, borderColor, label, value, subtext, subtextColor, valueColor) => {
                                doc.save();
                                doc.fillColor(bgColor).roundedRect(x, y, w, h, 6).fill();
                                doc.lineWidth(1).strokeColor(borderColor).roundedRect(x, y, w, h, 6).stroke();
                                doc.restore();
                                
                                doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text(label, x + 12, y + 10);
                                doc.font('Helvetica-Bold').fontSize(13).fillColor(valueColor).text(value, x + 12, y + 20, { width: w - 24 });
                                doc.font('Helvetica-Bold').fontSize(7).fillColor(subtextColor || '#94A3B8').text(subtext, x + 12, y + 42, { width: w - 24 });
                            };

                            // Tiga Kartu Berjejer
                            drawCard(40, 155, 161, 60, '#F0FDF4', '#DCFCE7', 'TOTAL PEMASUKAN', `Rp ${tIncome.toLocaleString('id-ID')}`, `${tCount} Transaksi Tercatat`, '#94A3B8', '#10B981');
                            drawCard(217, 155, 161, 60, '#FEF2F2', '#FEE2E2', 'TOTAL PENGELUARAN', `Rp ${tExpense.toLocaleString('id-ID')}`, tIncome > 0 ? `${pctExpense}% Dari Pemasukan` : '-', '#94A3B8', '#EF4444');

                            const balanceBg = tBalance >= 0 ? '#EFF6FF' : '#FEF2F2';
                            const balanceBorder = tBalance >= 0 ? '#DBEAFE' : '#FEE2E2';
                            const balanceValColor = tBalance >= 0 ? '#4361EE' : '#EF4444';
                            const balanceTextColor = tBalance >= 0 ? '#059669' : '#EF4444';
                            const balanceText = tBalance >= 0 ? 'Keuangan Sehat' : 'Pengeluaran Melebihi Pemasukan';
                            const balanceValStr = `${tBalance < 0 ? '-' : ''}Rp ${Math.abs(tBalance).toLocaleString('id-ID')}`;
                            drawCard(394, 155, 161, 60, balanceBg, balanceBorder, 'SALDO BERSIH', balanceValStr, balanceText, balanceTextColor, balanceValColor);

                            // Rincian Per Kategori
                            let yCat = 235;
                            doc.font('Helvetica-Bold').fontSize(11).fillColor('#EF4444').text('Rincian Pengeluaran', 40, yCat);
                            doc.font('Helvetica-Bold').fontSize(11).fillColor('#10B981').text('Rincian Pemasukan', 305, yCat);
                            
                            yCat += 15;
                            doc.moveTo(40, yCat).lineTo(280, yCat).strokeColor('#E2E8F0').lineWidth(1).stroke();
                            doc.moveTo(305, yCat).lineTo(545, yCat).strokeColor('#E2E8F0').lineWidth(1).stroke();
                            
                            yCat += 12;
                            
                            const maxCats = Math.max(categoryExpense.length, categoryIncome.length);
                            if (maxCats === 0) {
                                doc.font('Helvetica').fontSize(9).fillColor('#94A3B8').text('Belum ada data kategori transaksi.', 40, yCat);
                            } else {
                                for (let i = 0; i < Math.min(maxCats, 6); i++) {
                                    // Pengeluaran
                                    if (categoryExpense[i]) {
                                        const c = categoryExpense[i];
                                        const pct = tExpense > 0 ? Math.round((parseFloat(c.total) / tExpense) * 100) : 0;
                                        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text(c.category || 'Lainnya', 40, yCat);
                                        doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text(`${c.count}x trans`, 130, yCat + 1);
                                        doc.font('Helvetica-Bold').fontSize(9).fillColor('#EF4444').text(`Rp ${parseInt(c.total).toLocaleString('id-ID')} (${pct}%)`, 40, yCat, { align: 'right', width: 240 });
                                        
                                        // Progress Bar
                                        doc.save();
                                        doc.fillColor('#F1F5F9').roundedRect(40, yCat + 12, 240, 4, 2).fill();
                                        if (pct > 0) {
                                            doc.fillColor('#EF4444').roundedRect(40, yCat + 12, 240 * (pct / 100), 4, 2).fill();
                                        }
                                        doc.restore();
                                    } else if (i === 0) {
                                        doc.font('Helvetica').fontSize(9).fillColor('#94A3B8').text('Tidak ada data', 40, yCat);
                                    }
                                    
                                    // Pemasukan
                                    if (categoryIncome[i]) {
                                        const c = categoryIncome[i];
                                        const pct = tIncome > 0 ? Math.round((parseFloat(c.total) / tIncome) * 100) : 0;
                                        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text(c.category || 'Lainnya', 305, yCat);
                                        doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text(`${c.count}x trans`, 395, yCat + 1);
                                        doc.font('Helvetica-Bold').fontSize(9).fillColor('#10B981').text(`Rp ${parseInt(c.total).toLocaleString('id-ID')} (${pct}%)`, 305, yCat, { align: 'right', width: 240 });
                                        
                                        // Progress Bar
                                        doc.save();
                                        doc.fillColor('#F1F5F9').roundedRect(305, yCat + 12, 240, 4, 2).fill();
                                        if (pct > 0) {
                                            doc.fillColor('#10B981').roundedRect(305, yCat + 12, 240 * (pct / 100), 4, 2).fill();
                                        }
                                        doc.restore();
                                    } else if (i === 0) {
                                        doc.font('Helvetica').fontSize(9).fillColor('#94A3B8').text('Tidak ada data', 305, yCat);
                                    }
                                    
                                    yCat += 26;
                                }
                            }

                            // --- SECTION: RIWAYAT TRANSAKSI LEDGER ---
                            // Tentukan posisi awal tabel. Jika sisa ruang di halaman 1 kurang dari 150 unit, buat halaman baru.
                            let currentY = yCat + 25;
                            if (currentY + 150 > doc.page.height - doc.page.margins.bottom) {
                                doc.addPage();
                                currentY = 40; // Mulai di batas margin atas halaman baru
                            } else {
                                // Berikan sedikit ruang pemisah jika masih di Halaman 1
                                currentY += 10;
                            }

                            // Atur posisi cursor
                            doc.y = currentY;

                            // Judul & Deskripsi Section (Menggunakan Relative Text Flow)
                            doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Riwayat Transaksi Terakhir', 40);
                            doc.font('Helvetica').fontSize(8.5).fillColor('#64748B').text('20 transaksi terakhir yang tercatat dalam sistem', 40);
                            
                            // Garis Separator
                            const separatorY = doc.y + 6;
                            doc.moveTo(40, separatorY).lineTo(doc.page.width - 40, separatorY).strokeColor('#E2E8F0').lineWidth(1).stroke();
                            
                            // Atur posisi cursor sebelum tabel dimulai
                            doc.y = separatorY + 10;

                            // Persiapan Tabel Data
                            const table = {
                                headers: [
                                    { label: "Tanggal", property: 'date', width: 80, headerColor: "#4361EE", headerOpacity: 1, align: 'left' },
                                    { label: "Deskripsi", property: 'description', width: 175, headerColor: "#4361EE", headerOpacity: 1, align: 'left' },
                                    { label: "Kategori", property: 'category', width: 100, headerColor: "#4361EE", headerOpacity: 1, align: 'left' },
                                    { label: "Tipe", property: 'type', width: 75, headerColor: "#4361EE", headerOpacity: 1, align: 'center', headerAlign: 'center' },
                                    { label: "Jumlah", property: 'amount', width: 85, headerColor: "#4361EE", headerOpacity: 1, align: 'right', headerAlign: 'right' }
                                ],
                                datas: transactions.map(t => ({
                                    date: new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                                    description: t.description,
                                    category: t.category || 'Lainnya',
                                    type: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                                    amount: `${t.type === 'income' ? '+' : '-'} Rp ${parseInt(t.amount).toLocaleString('id-ID')}`,
                                    rawType: t.type
                                }))
                            };

                            await doc.table(table, {
                                x: 40,
                                width: 515,
                                padding: [6, 8, 6, 8],
                                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF"),
                                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                                    doc.font("Helvetica").fontSize(8.5).fillColor("#1E293B");
                                    
                                    // Pewarnaan tipe & nominal
                                    if (indexColumn === 3) {
                                        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(row.rawType === 'income' ? '#059669' : '#DC2626');
                                    } else if (indexColumn === 4) {
                                        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(row.rawType === 'income' ? '#10B981' : '#EF4444');
                                    }
                                },
                                divider: {
                                    header: { disabled: true },
                                    horizontal: { disabled: false, width: 0.5, color: '#E2E8F0' }
                                }
                            });

                            // --- DYNAMIC HEADER & FOOTER ON ALL PAGES ---
                            const range = doc.bufferedPageRange();
                            for (let i = 0; i < range.count; i++) {
                                doc.switchToPage(i);
                                
                                // Top Blue Line Decoration
                                doc.rect(0, 0, doc.page.width, 8).fill('#4361EE');
                                
                                // Simpan margin bawah yang lama dan set ke 0 agar tidak memicu auto-page-break saat mencetak footer
                                const oldBottomMargin = doc.page.margins.bottom;
                                doc.page.margins.bottom = 0;

                                // Footer Kiri: Informasi Cetak Otomatis Resmi
                                doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
                                   .text('Laporan ini dicetak otomatis secara resmi oleh CekUangku.', 40, doc.page.height - 25, { align: 'left', width: 300 });
                                
                                // Footer Kanan: Halaman X dari Y
                                doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
                                   .text(`Halaman ${i + 1} dari ${range.count}`, 40, doc.page.height - 25, { align: 'right', width: doc.page.width - 80 });

                                // Kembalikan margin bawah asli
                                doc.page.margins.bottom = oldBottomMargin;
                            }

                            doc.end();
                        } catch (err) {
                            console.error("PDF generation/table rendering error:", err);
                            doc.end();
                        }
                    });
                });
            });
        });
    });
});

module.exports = router;