const fs = require('fs');
let c = fs.readFileSync('views/budget.ejs', 'utf8');

c = c.replace('<div class="summary-value">Rp <%= totalBudget.toLocaleString(\'id-ID\') %></div>', '<div class="summary-value" id="summaryTotalBudget">Rp <%= totalBudget.toLocaleString(\'id-ID\') %></div>');
c = c.replace('<div class="summary-sub"><%= budgetItems.length %> kategori dianggarkan</div>', '<div class="summary-sub" id="summaryTotalCategory"><%= budgetItems.length %> kategori dianggarkan</div>');
c = c.replace('<div class="summary-value">Rp <%= totalSpent.toLocaleString(\'id-ID\') %></div>', '<div class="summary-value" id="summaryTotalSpent">Rp <%= totalSpent.toLocaleString(\'id-ID\') %></div>');
c = c.replace('<div class="summary-sub">\n                        <% if (totalBudget > 0) { %>', '<div class="summary-sub" id="summaryTotalPercent">\n                        <% if (totalBudget > 0) { %>');
c = c.replace('<div class="summary-value" style="color: <%= totalRemaining >= 0 ? \'var(--success)\' : \'var(--danger)\' %>;">', '<div class="summary-value" id="summaryTotalRemaining" style="color: <%= totalRemaining >= 0 ? \'var(--success)\' : \'var(--danger)\' %>;">');
c = c.replace('<div class="summary-sub" style="color: <%= totalRemaining >= 0 ? \'var(--success)\' : \'var(--danger)\' %>;">', '<div class="summary-sub" id="summaryRemainingStatus" style="color: <%= totalRemaining >= 0 ? \'var(--success)\' : \'var(--danger)\' %>;">');

let filterHTML = `
                        <div style="width: 100%;">
                            <div id="budgetFilters" style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; display: block;">Filter Kategori</label>
                                    <select id="filterCategory" class="form-input" style="padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border); width: 100%; outline: none;" onchange="applyBudgetFilters()">
                                        <option value="">Semua Kategori</option>
                                        <% categories.forEach(function(c) { %>
                                            <option value="<%= c.name %>"><%= c.name %></option>
                                        <% }) %>
                                    </select>
                                </div>
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; display: block;">Tanggal Dibuat</label>
                                    <input type="date" id="filterDate" class="form-input" style="padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border); width: 100%; outline: none;" onchange="applyBudgetFilters()">
                                </div>
                            </div>
`;
c = c.replace('<div style="width: 100%;">\n                            <div id="budgetFlipper" style="position: relative;">', filterHTML + '                            <div id="budgetFlipper" style="position: relative;">');

let jsHTML = `
        // Budget Filter Logic
        function applyBudgetFilters() {
            const catFilter = document.getElementById('filterCategory') ? document.getElementById('filterCategory').value.toLowerCase() : '';
            const dateFilter = document.getElementById('filterDate') ? document.getElementById('filterDate').value : '';
            const items = document.querySelectorAll('.budget-item');
            const containerId = isHistoryView ? 'budgetBack' : 'budgetFront';
            const container = document.getElementById(containerId);
            
            let visibleBudget = 0; let visibleSpent = 0; let visibleCount = 0;
            
            items.forEach(item => {
                const itemCat = item.getAttribute('data-category').toLowerCase();
                const itemDate = item.getAttribute('data-created');
                let matchCat = true; let matchDate = true;
                
                if (catFilter && itemCat !== catFilter) matchCat = false;
                if (dateFilter && itemDate !== dateFilter) matchDate = false;
                
                if (matchCat && matchDate) {
                    item.style.display = 'flex';
                    if (item.closest('#' + containerId)) {
                        const amt = parseFloat(item.getAttribute('data-amount')) || 0;
                        const spent = parseFloat(item.getAttribute('data-spent')) || 0;
                        visibleBudget += amt; visibleSpent += spent; visibleCount++;
                    }
                } else { 
                    item.style.display = 'none'; 
                }
            });
            
            if (document.getElementById('summaryTotalBudget')) document.getElementById('summaryTotalBudget').innerText = 'Rp ' + visibleBudget.toLocaleString('id-ID');
            if (document.getElementById('summaryTotalCategory')) document.getElementById('summaryTotalCategory').innerText = visibleCount + ' kategori dianggarkan';
            if (document.getElementById('summaryTotalSpent')) document.getElementById('summaryTotalSpent').innerText = 'Rp ' + visibleSpent.toLocaleString('id-ID');
            
            const pct = visibleBudget > 0 ? Math.round((visibleSpent / visibleBudget) * 100) : 0;
            if (document.getElementById('summaryTotalPercent')) document.getElementById('summaryTotalPercent').innerText = visibleBudget > 0 ? pct + '% dari anggaran' : 'Belum ada anggaran';
            
            const remaining = visibleBudget - visibleSpent;
            const remVal = document.getElementById('summaryTotalRemaining');
            const remStat = document.getElementById('summaryRemainingStatus');
            
            if (remVal && remStat) {
                if (remaining >= 0) { 
                    remVal.style.color = 'var(--success)'; 
                    remVal.innerText = 'Rp ' + remaining.toLocaleString('id-ID'); 
                    remStat.style.color = 'var(--success)'; 
                    remStat.innerHTML = '<i class="fas fa-check-circle"></i> Keuangan terkontrol'; 
                } else { 
                    remVal.style.color = 'var(--danger)'; 
                    remVal.innerText = '-Rp ' + Math.abs(remaining).toLocaleString('id-ID'); 
                    remStat.style.color = 'var(--danger)'; 
                    remStat.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Anggaran terlampaui!'; 
                }
            }
        }
    </script>`;
c = c.replace('</script>', jsHTML);

// Need to also inject applyBudgetFilters() in toggleBudgetHistory
c = c.replace(`btn.style.color = 'var(--primary)';
            }`, `btn.style.color = 'var(--primary)';
            }
            applyBudgetFilters();`);

fs.writeFileSync('views/budget.ejs', c);
console.log('Script completed.');
