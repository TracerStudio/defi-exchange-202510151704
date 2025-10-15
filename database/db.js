const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname);
  }

  // Перевіряємо чи транзакція вже оброблена
  isTransactionProcessed(txHash) {
    try {
      // Перевіряємо в pending-transactions.json
      const pendingFile = path.join(this.dbPath, 'pending-transactions.json');
      if (fs.existsSync(pendingFile)) {
        const data = fs.readFileSync(pendingFile, 'utf8');
        const pendingTransactions = JSON.parse(data);
        if (pendingTransactions[txHash]) {
          return true;
        }
      }

      // Перевіряємо в user_transactions файлах
      const files = fs.readdirSync(this.dbPath);
      for (const file of files) {
        if (file.startsWith('user_transactions_') && file.endsWith('.json')) {
          const filePath = path.join(this.dbPath, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const transactions = JSON.parse(data);
          
          if (transactions.some(tx => tx.txHash === txHash)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking transaction:', error);
      return false;
    }
  }

  // Зберігаємо транзакцію
  saveTransaction(userAddress, txHash, token, amount, type, status) {
    try {
      const transactionsFile = path.join(this.dbPath, `user_transactions_${userAddress}.json`);
      let transactions = [];

      if (fs.existsSync(transactionsFile)) {
        const data = fs.readFileSync(transactionsFile, 'utf8');
        transactions = JSON.parse(data);
      }

      // Перевіряємо на дублювання
      if (transactions.some(tx => tx.txHash === txHash)) {
        console.log(`⚠️ Transaction ${txHash} already exists in user transactions`);
        return;
      }

      // Додаємо нову транзакцію
      transactions.push({
        userAddress,
        txHash,
        amount: amount.toString(),
        token,
        type,
        status,
        timestamp: Date.now()
      });

      // Зберігаємо
      fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));
      console.log(`✅ Transaction saved: ${txHash} for user ${userAddress}`);

    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  // Отримуємо баланси користувача
  getUserBalances(userAddress) {
    try {
      const balancesFile = path.join(this.dbPath, `user_balances_${userAddress}.json`);
      
      if (fs.existsSync(balancesFile)) {
        const data = fs.readFileSync(balancesFile, 'utf8');
        return JSON.parse(data);
      }
      
      return {};
    } catch (error) {
      console.error('Error getting user balances:', error);
      return {};
    }
  }

  // Оновлюємо баланс користувача
  updateBalance(userAddress, token, amount, operation) {
    try {
      const balancesFile = path.join(this.dbPath, `user_balances_${userAddress}.json`);
      let balances = {};

      if (fs.existsSync(balancesFile)) {
        const data = fs.readFileSync(balancesFile, 'utf8');
        balances = JSON.parse(data);
      }

      const currentBalance = parseFloat(balances[token] || 0);
      let newBalance;

      switch (operation) {
        case 'add':
          newBalance = currentBalance + amount;
          break;
        case 'subtract':
          newBalance = Math.max(0, currentBalance - amount);
          break;
        case 'set':
          newBalance = amount;
          break;
        default:
          newBalance = currentBalance;
      }

      balances[token] = newBalance;
      fs.writeFileSync(balancesFile, JSON.stringify(balances, null, 2));
      
      return balances;
    } catch (error) {
      console.error('Error updating balance:', error);
      return {};
    }
  }

  // Отримуємо транзакції користувача
  getUserTransactions(userAddress) {
    try {
      const transactionsFile = path.join(this.dbPath, `user_transactions_${userAddress}.json`);
      
      if (fs.existsSync(transactionsFile)) {
        const data = fs.readFileSync(transactionsFile, 'utf8');
        return JSON.parse(data);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  // Отримуємо заявки на вивід
  getWithdrawalRequests(userAddress) {
    try {
      const requestsFile = path.join(this.dbPath, `withdrawal_requests_${userAddress}.json`);
      
      if (fs.existsSync(requestsFile)) {
        const data = fs.readFileSync(requestsFile, 'utf8');
        return JSON.parse(data);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting withdrawal requests:', error);
      return [];
    }
  }
}

// Створюємо екземпляр
const dbManager = new DatabaseManager();

// Додаємо фейковий db об'єкт для сумісності
dbManager.db = {
  transaction: (callback) => {
    try {
      callback();
    } catch (error) {
      console.error('Transaction error:', error);
    }
  }
};

module.exports = dbManager;
