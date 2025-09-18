<?php

// FIX: Changed Dexie import to be a named import to fix inheritance issues and ensure methods are available.
// In PHP, no Dexie, so using PDO for database
// require_once '../types.php'; // Assuming types.php is included

class WarungPosDB {
    public $users;
    public $products;
    public $suppliers;
    public $customers;
    public $transactions;
    public $incomingGoods;
    public $settings;
    public $files;

    private $pdo;

    public function __construct() {
        // Use MySQL/MariaDB
        $this->pdo = new PDO('mysql:host=localhost;dbname=warung_pos', 'root', '');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Simulate versions with table creation
        $this->createTables();
        $this->populate();
    }

    private function createTables() {
        // Users table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(255) UNIQUE,
            usernameNorm VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            role VARCHAR(50),
            createdAt DATETIME,
            photoFileId VARCHAR(255)
        )");

        // Products table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS products (
            id INT PRIMARY KEY AUTO_INCREMENT,
            code VARCHAR(50) UNIQUE,
            codeNorm VARCHAR(50) UNIQUE,
            name VARCHAR(255),
            retailPrice DECIMAL(10,2),
            wholesalePrice DECIMAL(10,2),
            costPrice DECIMAL(10,2),
            stockQty INT,
            createdAt DATETIME,
            updatedAt DATETIME,
            imageFileId VARCHAR(255),
            archived TINYINT DEFAULT 0
        )");

        // Suppliers table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS suppliers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255),
            bankName VARCHAR(100),
            bankAccountNumber VARCHAR(50),
            createdAt DATETIME,
            updatedAt DATETIME,
            archived TINYINT DEFAULT 0
        )");

        // Customers table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS customers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            memberNo VARCHAR(50) UNIQUE,
            name VARCHAR(255),
            phone VARCHAR(20),
            address TEXT,
            totalTransactions INT DEFAULT 0,
            birthDate DATE,
            createdAt DATETIME,
            updatedAt DATETIME,
            photoFileId VARCHAR(255),
            archived TINYINT DEFAULT 0
        )");

        // Transactions table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS transactions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            type VARCHAR(50),
            date DATE,
            customerId INT,
            customerSnapshot TEXT,
            items TEXT,
            subtotal DECIMAL(10,2),
            discount DECIMAL(10,2),
            total DECIMAL(10,2),
            paymentType VARCHAR(50),
            cashReceived DECIMAL(10,2),
            changeDue DECIMAL(10,2),
            receiptNo VARCHAR(100)
        )");

        // IncomingGoods table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS incomingGoods (
            id INT PRIMARY KEY AUTO_INCREMENT,
            invoiceNo VARCHAR(100),
            supplierId INT,
            items TEXT,
            grandTotal DECIMAL(10,2),
            transactionTime DATETIME
        )");

        // Settings table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS settings (
            id VARCHAR(50) PRIMARY KEY,
            businessName VARCHAR(255),
            address TEXT,
            logoUrl VARCHAR(255),
            theme VARCHAR(50),
            currency VARCHAR(10)
        )");

        // Files table
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS files (
            id VARCHAR(255) PRIMARY KEY,
            fileData LONGTEXT,
            mimeType VARCHAR(100),
            kind VARCHAR(50),
            createdAt DATETIME
        )");
    }

    public function populate() {
        // Seed Users
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO users (username, usernameNorm, password, role, createdAt) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['admin123', 'admin123', 'admin123', 'ADMIN', date('Y-m-d H:i:s')]);
        $stmt->execute(['kasir123', 'kasir123', 'kasir123', 'CASHIER', date('Y-m-d H:i:s')]);

        // Seed Products
        $products = [
            ['P001', 'P001', 'Kopi Hitam', 5000, 4000, 2000, 100, 0],
            ['P002', 'P002', 'Es Teh Manis', 4000, 3000, 1500, 150, 0],
            ['P003', 'P003', 'Indomie Goreng', 8000, 7000, 4000, 80, 0],
            ['P004', 'P004', 'Nasi Goreng Spesial', 15000, 13000, 8000, 50, 0],
            ['P005', 'P005', 'Air Mineral 600ml', 3000, 2500, 1000, 200, 0],
            ['P006', 'P006', 'Gorengan (Bakwan)', 1000, 800, 400, 300, 0],
            ['P007', 'P007', 'Roti Bakar Coklat', 10000, 8500, 5000, 40, 0],
            ['P008', 'P008', 'Teh Botol Sosro', 5000, 4000, 2500, 120, 0],
        ];
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO products (code, codeNorm, name, retailPrice, wholesalePrice, costPrice, stockQty, createdAt, updatedAt, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($products as $p) {
            $stmt->execute(array_merge($p, [date('Y-m-d H:i:s'), date('Y-m-d H:i:s')]));
        }

        // Seed Suppliers
        $suppliers = [
            ['Supplier Sembako Jaya', 'BCA', '1234567890'],
            ['Grosir Minuman Segar', 'Mandiri', '0987654321'],
            ['Pasar Induk Kramat Jati', 'BRI', '1122334455'],
        ];
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO suppliers (name, bankName, bankAccountNumber, createdAt, updatedAt, archived) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($suppliers as $s) {
            $stmt->execute(array_merge($s, [date('Y-m-d H:i:s'), date('Y-m-d H:i:s'), 0]));
        }

        // Seed Customers
        $customers = [
            ['C001', 'Budi Santoso', '081234567890', 'Jl. Merdeka No. 1'],
            ['C002', 'Siti Aminah', '081345678901', 'Jl. Pahlawan No. 10'],
            ['C003', 'Agus Wijaya', '081456789012', 'Jl. Sudirman No. 5A'],
            ['C004', 'Dewi Lestari', '081567890123', 'Jl. Gatot Subroto No. 22'],
            ['C005', 'Eko Prasetyo', '081678901234', 'Jl. Diponegoro No. 8'],
        ];
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO customers (memberNo, name, phone, address, totalTransactions, createdAt, updatedAt, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($customers as $c) {
            $stmt->execute(array_merge($c, [0, date('Y-m-d H:i:s'), date('Y-m-d H:i:s'), 0]));
        }

        // Seed Settings
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO settings (id, businessName, address, theme, currency) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['app', 'Warung Kita', 'Jl. Raya Bogor KM 20, Jakarta Timur', 'dark', 'IDR']);
    }
}

$db = new WarungPosDB();

function ensureDemoUsers() {
    global $db;
    // Simulate transaction
    $stmt = $db->pdo->prepare("INSERT IGNORE INTO users (username, usernameNorm, password, role, createdAt) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute(['admin123', 'admin123', 'admin123', 'ADMIN', date('Y-m-d H:i:s')]);
    $stmt->execute(['kasir123', 'kasir123', 'kasir123', 'CASHIER', date('Y-m-d H:i:s')]);
}

try {
    // $db is already instantiated
} catch (Exception $err) {
    error_log("Failed to open db: " . $err->getMessage());
}
