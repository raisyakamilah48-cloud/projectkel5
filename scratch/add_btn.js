const fs = require('fs');
let c = fs.readFileSync('views/budget.ejs', 'utf8');

const oldTitle = `                        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">\r\n                            <span><i class="fas fa-list-check"></i> Rincian Anggaran</span>\r\n                            <span style="font-size:0.8rem;color:var(--text-muted);background:#f1f5f9;padding:4px 12px;border-radius:20px;font-weight:600;">\r\n                                <%= budgetItems.length %> kategori\r\n                            </span>\r\n                        </div>`;

const newTitle = `                        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <span><i class="fas fa-list-check"></i> Rincian Anggaran</span>
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span style="font-size:0.8rem;color:var(--text-muted);background:#f1f5f9;padding:4px 12px;border-radius:20px;font-weight:600;">
                                    <%= budgetItems.length %> kategori
                                </span>
                                <button id="btnToggleHistory" onclick="toggleBudgetHistory()" style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.8rem;font-weight:600;background:var(--info-light);color:var(--primary);transition:all 0.2s;">
                                    <i class="fas fa-history"></i> Riwayat
                                </button>
                            </div>
                        </div>`;

if (c.includes(oldTitle)) {
    c = c.replace(oldTitle, newTitle);
    fs.writeFileSync('views/budget.ejs', c);
    console.log('Button added successfully');
} else {
    console.log('Pattern not found - checking raw...');
    let idx = c.indexOf('card-title');
    console.log(JSON.stringify(c.substring(idx, idx + 400)));
}
