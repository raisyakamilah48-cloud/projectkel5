const fs = require('fs');
let c = fs.readFileSync('views/budget.ejs', 'utf8');

// The file is missing </style></head><body> between the CSS and the sidebar include
// We need to insert those tags

const needle = `        .cat-default { background: var(--info-light); color: var(--primary); }\r\n\r\n    <!-- ===== SIDEBAR ===== -->`;
const replacement = `        .cat-default { background: var(--info-light); color: var(--primary); }

        /* ---- ANIMATIONS ---- */
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .summary-card { animation: slideUp .4s ease forwards; }
        .summary-card:nth-child(1) { animation-delay: .05s; }
        .summary-card:nth-child(2) { animation-delay: .1s; }
        .summary-card:nth-child(3) { animation-delay: .15s; }
        .budget-grid { animation: slideUp .4s ease .2s forwards; opacity: 0; }

        /* ---- RESPONSIVE ---- */
        @media (max-width: 1100px) { .budget-grid { grid-template-columns: 1fr; } }
        @media (max-width: 900px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); box-shadow: 4px 0 20px rgba(0,0,0,0.1); }
            .main-area { margin-left: 0; }
            .menu-toggle { display: block !important; }
            .summary-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
            .content-area { padding: 16px 12px; }
            .top-header { padding: 16px; }
            #budgetFilters { flex-direction: column; }
        }

        /* Prevent content overflow */
        .main-area { overflow-x: hidden; }
        .content-area { overflow-x: hidden; max-width: 100%; box-sizing: border-box; }
        .card { max-width: 100%; box-sizing: border-box; word-break: break-word; }
        .budget-item { max-width: 100%; box-sizing: border-box; }
        #budgetFilters { max-width: 100%; box-sizing: border-box; }
        .summary-value { font-size: clamp(1.1rem, 3vw, 1.5rem); word-break: break-word; }

        .menu-toggle { display: none; background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: var(--text-secondary); }
        .menu-toggle:hover { background: #f1f5f9; }

        /* ---- MONTH BADGE ---- */
        .month-badge {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 16px; background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white; border-radius: 20px; font-size: 0.82rem; font-weight: 600;
            box-shadow: 0 4px 12px rgba(67, 97, 238, 0.25);
        }
    </style>
</head>
<body>

    <!-- ===== SIDEBAR ===== -->`;

if (c.includes(needle)) {
    c = c.replace(needle, replacement);
    fs.writeFileSync('views/budget.ejs', c);
    console.log('Fixed successfully');
} else {
    // Try normalized (CRLF to LF)
    let cNorm = c.replace(/\r\n/g, '\n');
    const needleNorm = `        .cat-default { background: var(--info-light); color: var(--primary); }\n\n    <!-- ===== SIDEBAR ===== -->`;
    if (cNorm.includes(needleNorm)) {
        cNorm = cNorm.replace(needleNorm, replacement);
        fs.writeFileSync('views/budget.ejs', cNorm);
        console.log('Fixed with normalized line endings');
    } else {
        console.log('Could not find pattern');
        // Show context around cat-default
        let idx = c.indexOf('.cat-default');
        console.log(JSON.stringify(c.substring(idx, idx + 150)));
    }
}
