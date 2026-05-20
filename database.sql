-- =============================================
-- DATABASE SETUP — CekUangku (ProjectKel5)
-- =============================================
-- File ini berisi semua query SQL yang dibutuhkan
-- untuk menjalankan project CekUangku.
--
-- CARA PAKAI:
-- 1. Buka phpMyAdmin atau MySQL CLI
-- 2. Copy-paste seluruh isi file ini
-- 3. Jalankan (Execute)
-- 4. Database dan semua tabel akan otomatis dibuat
--
-- Atau via terminal:
--   mysql -u root -p < database.sql
-- =============================================

-- Buat Database
CREATE DATABASE IF NOT EXISTS projectkel5;
USE projectkel5;

-- =============================================
-- TABEL: users
-- Menyimpan data akun pengguna
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  profile_picture VARCHAR(255) DEFAULT NULL,
  calculator_active BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- TABEL: categories
-- Menyimpan kategori transaksi milik setiap user
-- Setiap kategori memiliki tipe: 'income' atau 'expense'
-- Tidak ada kategori default, semua dikelola oleh user
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT 'income atau expense',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- TABEL: wallets
-- Menyimpan dompet / sumber dana per user
-- =============================================
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  color VARCHAR(20) DEFAULT '#4F46E5',
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- 6. Tabel Feedbacks
-- =============================================
CREATE TABLE IF NOT EXISTS feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- TABEL: transactions
-- Menyimpan semua transaksi pemasukan & pengeluaran
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'income atau expense',
  wallet_id INT DEFAULT NULL COMMENT 'Sumber dana',
  category VARCHAR(100) COMMENT 'Nama kategori transaksi',
  description TEXT COMMENT 'Deskripsi transaksi',
  amount DECIMAL(15,2) NOT NULL COMMENT 'Jumlah uang',
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- TABEL: budgets
-- Menyimpan batas anggaran per kategori per bulan atau durasi kustom
-- =============================================
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category VARCHAR(100) NOT NULL COMMENT 'Kategori anggaran',
  amount DECIMAL(15,2) NOT NULL COMMENT 'Batas anggaran',
  month INT NOT NULL COMMENT 'Bulan (1-12)',
  year INT NOT NULL COMMENT 'Tahun',
  budget_type VARCHAR(20) DEFAULT 'monthly',
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  duration_days INT DEFAULT NULL,
  is_archived TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- SELESAI! Database siap digunakan.
-- Jalankan project: npm run dev
-- Akses: http://localhost:3000
-- =============================================
