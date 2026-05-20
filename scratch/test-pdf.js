const PDFDocument = require("pdfkit-table");
const fs = require("fs");
const path = require("path");

async function test() {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const outputDir = __dirname;
    const outputPath = path.join(outputDir, "test.pdf");
    doc.pipe(fs.createWriteStream(outputPath));

    const table = {
        title: "Test Table with Header Customization",
        headers: [
            { label: "Deskripsi", property: "desc", width: 200, headerColor: "#4361EE", headerOpacity: 1 },
            { label: "Tipe", property: "type", width: 100, headerColor: "#4361EE", headerOpacity: 1 },
            { label: "Jumlah", property: "amount", width: 100, headerColor: "#4361EE", headerOpacity: 1 }
        ],
        datas: [
            { desc: "Gaji Bulanan", type: "Pemasukan", amount: "+ Rp 5.000.000", rawType: "income" },
            { desc: "Beli Kopi", type: "Pengeluaran", amount: "- Rp 35.000", rawType: "expense" }
        ]
    };
    
    await doc.table(table, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF"),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            doc.font("Helvetica").fontSize(10).fillColor("#1E293B");
        }
    });

    doc.end();
    console.log("PDF generated successfully at:", outputPath);
}

test().catch(err => {
    console.error("Error generating PDF:", err);
});
