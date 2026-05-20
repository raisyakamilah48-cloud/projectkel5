const fs = require('fs');
let c = fs.readFileSync('views/budget.ejs', 'utf8');

// 1. Make the chart a global variable so we can access it
c = c.replace(
    "new Chart(document.getElementById('budgetChart').getContext('2d')",
    "window.budgetChart = new Chart(document.getElementById('budgetChart').getContext('2d')"
);

// 2. Modify applyBudgetFilters to also extract labels and data
const origFunc = `
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
`;

const newFunc = `
            let visibleBudget = 0; let visibleSpent = 0; let visibleCount = 0;
            let chartLabels = [];
            let chartData = [];
            
            items.forEach(item => {
                const rawCat = item.getAttribute('data-category');
                const itemCat = rawCat.toLowerCase();
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
                        chartLabels.push(rawCat);
                        chartData.push(amt);
                    }
                } else { 
                    item.style.display = 'none'; 
                }
            });
            
            // Update chart if it exists
            if (window.budgetChart) {
                window.budgetChart.data.labels = chartLabels;
                window.budgetChart.data.datasets[0].data = chartData;
                const colors = ['#4361ee', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
                window.budgetChart.data.datasets[0].backgroundColor = colors.slice(0, chartLabels.length);
                window.budgetChart.update();
            }
`;

c = c.replace(origFunc.trim(), newFunc.trim());

fs.writeFileSync('views/budget.ejs', c);
console.log('Chart update applied');
