const Database = require('better-sqlite3');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Створюємо директорію database якщо не існує
      const dbDir = path.join(__dirname);
      const dbPath = path.join(dbDir, 'main.db');
      
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL'); // Покращуємо продуктивність
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = MEMORY');
      
      this.createTables();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  createTables() {
    // Таблиця користувачів
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблиця балансів
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        token TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_address, token),
        FOREIGN KEY (user_address) REFERENCES users (address)
      )
    `);

    // Таблиця транзакцій
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        tx_hash TEXT UNIQUE NOT NULL,
        token TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'swap')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_address) REFERENCES users (address)
      )
    `);

    // Таблиця заявок на вивід
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        token TEXT NOT NULL,
        amount REAL NOT NULL,
        recipient_address TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        request_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_address) REFERENCES users (address)
      )
    `);

    // Створюємо індекси для швидкого пошуку
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_balances_user_token ON balances(user_address, token);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address);
      CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_address);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
    `);

    console.log('✅ Database tables created successfully');
  }

  // Атомарна операція оновлення балансу
  updateBalance(userAddress, token, amount, operation = 'set') {
    const transaction = this.db.transaction(() => {
      // Додаємо користувача якщо не існує
      this.db.prepare(`
        INSERT OR IGNORE INTO users (address) VALUES (?)
      `).run(userAddress);

      // Отримуємо поточний баланс
      const currentBalance = this.db.prepare(`
        SELECT balance FROM balances WHERE user_address = ? AND token = ?
      `).get(userAddress, token);

      let newBalance;
      if (!currentBalance) {
        newBalance = operation === 'set' ? amount : amount;
      } else {
        const current = currentBalance.balance;
        switch (operation) {
          case 'set':
            newBalance = amount;
            break;
          case 'add':
            newBalance = current + amount;
            break;
          case 'subtract':
            newBalance = Math.max(0, current - amount);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      }

      // Оновлюємо або створюємо баланс
      this.db.prepare(`
        INSERT OR REPLACE INTO balances (user_address, token, balance, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(userAddress, token, newBalance);

      return newBalance;
    });

    return transaction();
  }

  // Отримання балансів користувача
  getUserBalances(userAddress) {
    const balances = this.db.prepare(`
      SELECT token, balance FROM balances WHERE user_address = ?
    `).all(userAddress);

    const result = {};
    balances.forEach(row => {
      result[row.token] = row.balance;
    });

    return result;
  }

  // Збереження транзакції
  saveTransaction(userAddress, txHash, token, amount, type, status = 'confirmed') {
    const transaction = this.db.transaction(() => {
      // Додаємо користувача якщо не існує
      this.db.prepare(`
        INSERT OR IGNORE INTO users (address) VALUES (?)
      `).run(userAddress);

      // Зберігаємо транзакцію
      this.db.prepare(`
        INSERT OR REPLACE INTO transactions (user_address, tx_hash, token, amount, type, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(userAddress, txHash, token, amount, type, status);

      return true;
    });

    return transaction();
  }

  // Перевірка чи транзакція вже оброблена
  isTransactionProcessed(txHash) {
    const result = this.db.prepare(`
      SELECT id FROM transactions WHERE tx_hash = ?
    `).get(txHash);

    return !!result;
  }

  // Отримання історії транзакцій
  getUserTransactions(userAddress) {
    return this.db.prepare(`
      SELECT tx_hash, token, amount, type, status, created_at
      FROM transactions 
      WHERE user_address = ? 
      ORDER BY created_at DESC
    `).all(userAddress);
  }

  // Збереження заявки на вивід
  saveWithdrawalRequest(userAddress, token, amount, recipientAddress, requestId) {
    const transaction = this.db.transaction(() => {
      // Додаємо користувача якщо не існує
      this.db.prepare(`
        INSERT OR IGNORE INTO users (address) VALUES (?)
      `).run(userAddress);

      // Зберігаємо заявку
      this.db.prepare(`
        INSERT INTO withdrawal_requests (user_address, token, amount, recipient_address, request_id, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(userAddress, token, amount, recipientAddress, requestId);

      return true;
    });

    return transaction();
  }

  // Оновлення статусу заявки на вивід
  updateWithdrawalRequestStatus(requestId, status) {
    this.db.prepare(`
      UPDATE withdrawal_requests 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE request_id = ?
    `).run(status, requestId);
  }

  // Отримання заявок на вивід
  getWithdrawalRequests(userAddress) {
    return this.db.prepare(`
      SELECT request_id, token, amount, recipient_address, status, created_at
      FROM withdrawal_requests 
      WHERE user_address = ? 
      ORDER BY created_at DESC
    `).all(userAddress);
  }

  // Закриття з'єднання
  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }
}

// Експортуємо singleton
const dbManager = new DatabaseManager();
module.exports = dbManager;
