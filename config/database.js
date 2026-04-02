const mysql = require('mysql2');

// Pertama, buat koneksi TANPA database untuk auto-create database
const initConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

// Auto-create database jika belum ada
initConnection.query("CREATE DATABASE IF NOT EXISTS projectkel5", function(err) {
  if (err) {
    console.log("==============================================");
    console.log("❌ GAGAL KONEKSI KE MYSQL!");
    console.log("Pastikan MySQL/XAMPP sudah dijalankan.");
    console.log("==============================================");
    console.log("Detail Error:", err.message);
  } else {
    console.log("✅ Database 'projectkel5' siap digunakan.");
    
    // Auto-create tabel users
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user'
      )
    `;
    
    // Auto-create tabel transactions
    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(15,2) NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;
    
    // Jalankan di koneksi utama (yang sudah pilih database)
    connection.query(createUsersTable, function(err) {
      if (err) console.log("Error buat tabel users:", err.message);
      else console.log("✅ Tabel 'users' siap.");
    });

    connection.query(createTransactionsTable, function(err) {
      if (err) console.log("Error buat tabel transactions:", err.message);
      else console.log("✅ Tabel 'transactions' siap.");
    });

    // Auto-create tabel categories
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    connection.query(createCategoriesTable, function(err) {
      if (err) console.log("Error buat tabel categories:", err.message);
      else console.log("✅ Tabel 'categories' siap.");
    });

    // Auto-create tabel budgets
    const createBudgetsTable = `
      CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    connection.query(createBudgetsTable, function(err) {
      if (err) console.log("Error buat tabel budgets:", err.message);
      else console.log("✅ Tabel 'budgets' siap.");
    });
    // Auto-create tabel wallets
    const createWalletsTable = `
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0,
        color VARCHAR(20) DEFAULT '#4F46E5',
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;

    connection.query(createWalletsTable, function(err) {
      if (err) console.log("Error buat tabel wallets:", err.message);
      else {
        console.log("✅ Tabel 'wallets' siap.");
        
        // Auto-create kolom wallet_id di tabel transactions jika belum ada
        const alterTransactionsWalletId = `
          ALTER TABLE transactions 
          ADD COLUMN IF NOT EXISTS wallet_id INT DEFAULT NULL AFTER type;
        `;
        connection.query(alterTransactionsWalletId, function(err2) {
          if (err2 && err2.code !== 'ER_DUP_FIELDNAME') console.log("Error alter tabel transactions (wallet_id):", err2.message);
          else {
            console.log("✅ Kolom 'wallet_id' di tabel transactions siap.");
            
            // Tambahkan foreign key constraint
            const alterTransactionsFk = `
              ALTER TABLE transactions 
              ADD CONSTRAINT fk_transaction_wallet
              FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
            `;
            connection.query(alterTransactionsFk, function(err3) {
              if (err3 && err3.code !== 'ER_DUP_KEY' && err3.code !== 'ER_CANT_CREATE_TABLE') console.log("Error tambah FK wallet_id:", err3.message);
              else console.log("✅ Foreign Key 'wallet_id' siap.");
            });
          }
        });
      }
    });

  }
  
  // Tutup koneksi init (yang tanpa database)
  initConnection.end();
});

// Koneksi utama ke database projectkel5
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projectkel5'
});

connection.connect(function(err) {
  if (err) {
    console.log("==============================================");
    console.log("❌ Koneksi ke database gagal!");
    console.log("Pastikan MySQL/XAMPP sudah RUNNING.");
    console.log("Lalu jalankan ulang: npm run dev");
    console.log("==============================================");
    console.log("Detail:", err.message);
  } else {
    console.log("✅ Database terhubung ke 'projectkel5'.");
  }
});

module.exports = connection;
