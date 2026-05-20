const mysql = require('mysql2');

// Pertama, buat koneksi TANPA database untuk auto-create database
const initConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3307
});

// Tambahkan handler error global untuk initConnection agar tidak crash jika MySQL mati
initConnection.on('error', function(err) {
  // Hanya log jika perlu, jangan lempar error agar tidak crash
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
        role VARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_picture VARCHAR(255) DEFAULT NULL,
        calculator_active BOOLEAN DEFAULT FALSE
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    
    // Jalankan di koneksi utama (yang sudah pilih database)
    pool.query(createUsersTable, function(err) {
      if (err) console.log("Error buat tabel users:", err.message);
      else {
        console.log("✅ Tabel 'users' siap.");
        // Auto-create kolom tambahan jika sudah ada tabel sebelumnya
        pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter users (created_at):", e.message);
        });
        pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255) DEFAULT NULL", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter users (profile_picture):", e.message);
        });
        pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter users (is_active):", e.message);
          // Pastikan user lama yang is_active nya NULL/kosong diupdate jadi 1 (Aktif)
          pool.query("UPDATE users SET is_active = 1 WHERE is_active IS NULL");
        });
        pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT CURRENT_TIMESTAMP", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter users (last_login):", e.message);
        });
        pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS calculator_active BOOLEAN DEFAULT FALSE", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter users (calculator_active):", e.message);
        });

        // INJECT DEFAULT ADMIN ACCOUNT
        const bcrypt = require('bcrypt');
        pool.query("SELECT id FROM users WHERE email = 'admin@cekuangku.com'", function(err, result) {
            if (!err && result.length === 0) {
                bcrypt.hash('admin123', 10, function(errHash, hash) {
                    if (!errHash) {
                        pool.query("INSERT INTO users (nama, email, password, role) VALUES ('Administrator', 'admin@cekuangku.com', ?, 'admin')", [hash], function(insertErr) {
                            if (!insertErr) console.log("🌟 Default Admin account created! (admin@cekuangku.com)");
                        });
                    }
                });
            }
        });
      }
    });

    pool.query(createTransactionsTable, function(err) {
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

    pool.query(createCategoriesTable, function(err) {
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
        budget_type VARCHAR(20) DEFAULT 'monthly',
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        duration_days INT DEFAULT NULL,
        is_archived TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    pool.query(createBudgetsTable, function(err) {
      if (err) console.log("Error buat tabel budgets:", err.message);
      else {
        console.log("✅ Tabel 'budgets' siap.");
        // Auto-migrate new columns for custom duration budgets
        pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS budget_type VARCHAR(20) DEFAULT 'monthly'", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter budgets (budget_type):", e.message);
        });
        pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter budgets (start_date):", e.message);
        });
        pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter budgets (end_date):", e.message);
        });
        pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT NULL", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter budgets (duration_days):", e.message);
        });
        pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) DEFAULT 0", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter budgets (is_archived):", e.message);
        });
        pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP", function(e) {
          if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter budgets (created_at):", e.message);
        });
      }
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

    pool.query(createWalletsTable, function(err) {
      if (err) console.log("Error buat tabel wallets:", err.message);
      else {
        console.log("✅ Tabel 'wallets' siap.");
        
        // Auto-create kolom wallet_id di tabel transactions jika belum ada
        const alterTransactionsWalletId = `
          ALTER TABLE transactions 
          ADD COLUMN IF NOT EXISTS wallet_id INT DEFAULT NULL AFTER type;
        `;
        pool.query(alterTransactionsWalletId, function(err2) {
          if (err2 && err2.code !== 'ER_DUP_FIELDNAME') console.log("Error alter tabel transactions (wallet_id):", err2.message);
          else {
            console.log("✅ Kolom 'wallet_id' di tabel transactions siap.");
            
            // Tambahkan foreign key constraint
            const alterTransactionsFk = `
              ALTER TABLE transactions 
              ADD CONSTRAINT fk_transaction_wallet
              FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
            `;
            pool.query(alterTransactionsFk, function(err3) {
              if (err3 && err3.code !== 'ER_DUP_KEY' && err3.code !== 'ER_CANT_CREATE_TABLE') console.log("Error tambah FK wallet_id:", err3.message);
              else console.log("✅ Foreign Key 'wallet_id' siap.");
            });
            
            // Auto-create kolom attachment di tabel transactions
            pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment VARCHAR(255) DEFAULT NULL", function(e) {
                if (e && e.code !== 'ER_DUP_FIELDNAME') console.log("Error alter tabel transactions (attachment):", e.message);
                else console.log("✅ Kolom 'attachment' di tabel transactions siap.");
            });
          }
        });
      }
    });

    // Auto-create tabel feedbacks
    const createFeedbacksTable = `
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;

    pool.query(createFeedbacksTable, function(err) {
      if (err) console.log("Error buat tabel feedbacks:", err.message);
      else console.log("✅ Tabel 'feedbacks' siap.");
    });

  }
  
  // Tutup koneksi init (yang tanpa database) secara aman
  try {
    initConnection.destroy(); 
  } catch(e) {}
});

// Koneksi utama ke database projectkel5 menggunakan POOL agar lebih stabil
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projectkel5',
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verifikasi koneksi pool
pool.getConnection((err, conn) => {
  if (err) {
    console.log("==============================================");
    console.log("❌ Koneksi ke database (Pool) gagal!");
    console.log("Detail:", err.message);
    console.log("==============================================");
  } else {
    console.log("✅ Database terhubung melalui Pool.");
    conn.release();
  }
});

module.exports = pool;
