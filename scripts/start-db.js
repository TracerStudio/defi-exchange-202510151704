#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🗄️  Initializing DeFi Exchange Database...');

// Database directory
const dbDir = path.join(__dirname, '..', 'database');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}

// Initialize database files if they don't exist
const dbFiles = [
  'active_users.json',
  'pending-transactions.json',
  'user_balances.json'
];

dbFiles.forEach(file => {
  const filePath = path.join(dbDir, file);
  
  if (!fs.existsSync(filePath)) {
    let initialData;
    
    switch (file) {
      case 'active_users.json':
        initialData = {
          users: [],
          lastUpdated: Date.now(),
          totalUsers: 0
        };
        break;
      case 'pending-transactions.json':
        initialData = {};
        break;
      case 'user_balances.json':
        initialData = {};
        break;
      default:
        initialData = {};
    }
    
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
    console.log(`✅ Created ${file}`);
  } else {
    console.log(`📁 ${file} already exists`);
  }
});

console.log('🎉 Database initialization complete!');
console.log('📊 Database files:');
console.log('   - active_users.json');
console.log('   - pending-transactions.json');
console.log('   - user_balances.json');
console.log('   - user_balances_*.json (per user)');
console.log('   - user_transactions_*.json (per user)');
console.log('   - withdrawal_requests_*.json (per user)');
console.log('');
console.log('🚀 Ready to start the application!');
