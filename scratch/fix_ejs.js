const fs = require('fs');
let lines = fs.readFileSync('views/budget.ejs', 'utf8').split('\n');
let headIdx = lines.findIndex(l => l.includes('<main class="main-area">'));
let formIdx = lines.findIndex(l => l.includes('<form action="/budget/add" method="POST" id="budgetForm">'));

if (headIdx !== -1 && formIdx !== -1) {
    let before = lines.slice(0, headIdx + 1).join('\n');
    let after = lines.slice(formIdx).join('\n');
    let middle = `        <header class="top-header">
            <div style="display:flex;align-items:center;gap:12px;">
                <button class="menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">
                    <i class="fas fa-bars" style="font-size:1.2rem;"></i>
                </button>
                <div class="page-title">
                    <h2><i class="fas fa-bullseye" style="color:var(--primary);margin-right:8px;"></i>Kelola Anggaran</h2>
                    <p>Atur batas pengeluaran per kategori setiap bulan</p>
                </div>
            </div>
            <%
                const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            %>
            <span class="month-badge">
                <i class="fas fa-calendar-alt"></i> <%= monthNames[currentMonth] %> <%= currentYear %>
            </span>
        </header>

        <div class="content-area">

            <!-- SUMMARY CARDS -->
            <div class="summary-grid">
                <div class="summary-card total">
                    <div class="summary-top">
                        <span class="summary-label">Total Anggaran</span>
                        <div class="summary-icon blue"><i class="fas fa-bullseye"></i></div>
                    </div>
                    <div class="summary-value" id="summaryTotalBudget">Rp <%= totalBudget.toLocaleString('id-ID') %></div>
                    <div class="summary-sub" id="summaryTotalCategory"><%= budgetItems.length %> kategori dianggarkan</div>
                </div>
                <div class="summary-card spent">
                    <div class="summary-top">
                        <span class="summary-label">Sudah Terpakai</span>
                        <div class="summary-icon red"><i class="fas fa-shopping-cart"></i></div>
                    </div>
                    <div class="summary-value" id="summaryTotalSpent">Rp <%= totalSpent.toLocaleString('id-ID') %></div>
                    <div class="summary-sub" id="summaryTotalPercent">
                        <% if (totalBudget > 0) { %>
                            <%= totalPercent %>% dari anggaran
                        <% } else { %>
                            Belum ada anggaran
                        <% } %>
                    </div>
                </div>
                <div class="summary-card remaining">
                    <div class="summary-top">
                        <span class="summary-label">Sisa Anggaran</span>
                        <div class="summary-icon green"><i class="fas fa-piggy-bank"></i></div>
                    </div>
                    <div class="summary-value" id="summaryTotalRemaining" style="color: <%= totalRemaining >= 0 ? 'var(--success)' : 'var(--danger)' %>;">
                        <%= totalRemaining >= 0 ? '' : '-' %>Rp <%= Math.abs(totalRemaining).toLocaleString('id-ID') %>
                    </div>
                    <div class="summary-sub" id="summaryRemainingStatus" style="color: <%= totalRemaining >= 0 ? 'var(--success)' : 'var(--danger)' %>;">
                        <i class="fas fa-<%= totalRemaining >= 0 ? 'check-circle' : 'exclamation-triangle' %>"></i>
                        <%= totalRemaining >= 0 ? 'Keuangan terkontrol' : 'Anggaran terlampaui!' %>
                    </div>
                </div>
            </div>

            <!-- MAIN GRID -->
            <div class="budget-grid">

                <!-- FORM CARD -->
                <div class="card" style="height:fit-content;position:sticky;top:96px;">
                    <div class="card-title"><i class="fas fa-plus-circle"></i> Tambah Anggaran</div>
`;
    fs.writeFileSync('views/budget.ejs', before + '\n' + middle + '\n                    ' + after);
    console.log('Fixed file');
} else {
    console.log('Could not find indices');
}
