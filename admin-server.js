// Завантажуємо environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const dbManager = require('./database/db');
const app = express();
const PORT = process.env.PORT || 3002;

// Rate Limiting Configuration - ЗНАЧНО ПОСЛАБЛЕНО ДЛЯ ТЕСТУВАННЯ
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 хвилина
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // максимум 1000 запитів на IP
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Забагато запитів. Спробуйте пізніше.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res, options) => {
    console.log('🚫 Rate limit exceeded for IP:', req.ip);
  }
});

// Строгий rate limiting для API endpoints - ПОСЛАБЛЕНО
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 хвилина
  max: 500, // максимум 500 запитів на IP
  message: {
    success: false,
    error: 'API rate limit exceeded',
    message: 'Перевищено ліміт API запитів. Спробуйте пізніше.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting для withdrawal requests - ПОСЛАБЛЕНО
const withdrawalLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 секунд
  max: 50, // максимум 50 запитів на 30 секунд
  message: {
    success: false,
    error: 'Withdrawal rate limit exceeded',
    message: 'Перевищено ліміт запитів на виведення. Зачекайте хвилину.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Функція для логування безпеки
function logSecurityEvent(event, details, req = null) {
  const timestamp = new Date().toISOString();
  const ip = req ? req.ip || req.connection.remoteAddress : 'unknown';
  const userAgent = req ? req.headers['user-agent'] : 'unknown';
  
  const logEntry = {
    timestamp,
    event,
    details,
    ip,
    userAgent,
    severity: details.severity || 'info'
  };
  
  console.log(`🔒 SECURITY [${logEntry.severity.toUpperCase()}] ${event}:`, logEntry);
  
  // В продакшені можна додати запис в файл або відправку в систему моніторингу
  if (process.env.NODE_ENV === 'production') {
    // Тут можна додати запис в файл логів
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, 'logs', 'security.log');
    
    try {
      if (!fs.existsSync(path.dirname(logFile))) {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
      }
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('❌ Error writing security log:', error);
    }
  }
}

// Функція для оновлення списку активних користувачів (тепер використовуємо базу даних)
function updateActiveUsers(userAddress) {
  try {
    // Користувач автоматично додається в базу даних при першому зверненні
    console.log(`👤 User activity recorded: ${userAddress}`);
  } catch (error) {
    console.error('❌ Error updating active users:', error);
  }
}

// Оновлюємо onLimitReached callback для generalLimiter
generalLimiter.onLimitReached = (req, res, options) => {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    endpoint: req.path,
    severity: 'warning'
  }, req);
};

// Застосовуємо Helmet для безпеки
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.binance.com", "https://defi-exchange-202510151704.onrender.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Middleware для логування всіх запитів
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${req.headers.origin || 'no-origin'}`);
  next();
});

// Застосовуємо загальний rate limiting
app.use(generalLimiter);

// Middleware для CORS - безпечні налаштування
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://defi-exchange-202510151704.onrender.com',
      'https://defi-exchange-render.onrender.com',
      // Додаємо підтримку для різних хостингів
      'https://defi-exchange-202510151704.onrender.com',
      'https://defi-exchange-render.onrender.com',
      // Підтримка для мобільних додатків та тестування
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'https://localhost'
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Логуємо всі запити для діагностики
    console.log('🌐 CORS request from origin:', origin || 'no-origin');
    
    // Дозволяємо запити без origin (мобільні додатки, Postman, серверні виклики)
    if (!origin) {
      console.log('✅ CORS: Allowing request without origin (mobile/server)');
      return callback(null, true);
    }
    
    // Перевіряємо чи origin в списку дозволених
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowed origin:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      console.log('📋 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400 // 24 години
}));

// Додаткові CORS заголовки для всіх запитів
app.use((req, res, next) => {
  // Перевіряємо origin перед встановленням заголовків
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Додаємо заголовки для кешування на мобільних пристроях
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware для парсингу JSON
app.use(express.json());

// Додаткові заголовки для мобільних пристроїв
app.use((req, res, next) => {
  // Перевіряємо origin перед встановленням заголовків
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Додаємо заголовки для кешування на мобільних пристроях
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  next();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Serve the admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'admin.html'));
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'DeFi Exchange Server',
    version: '1.0.0',
    endpoints: {
      main: '/',
      admin: '/admin',
      health: '/health',
      syncBalances: '/api/sync-balances',
      getBalances: '/api/balances/:userAddress',
      withdrawalRequest: '/withdrawal-request',
      withdrawalStatus: '/withdrawal-status/:requestId',
      testCors: '/test-cors',
      testBot: '/test-bot-connection'
    }
  });
});

// Test endpoint для перевірки CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Endpoint для перевірки підключення до Telegram бота
app.get('/test-bot-connection', async (req, res) => {
  try {
    const fetch = require('node-fetch');
        const botResponse = await fetch('https://defi-exchange-202510151704.onrender.com/health', {
      method: 'GET',
      timeout: 5000
    });
    
    if (botResponse.ok) {
      const result = await botResponse.json();
      res.json({
        status: 'Bot connection OK',
        botResponse: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'Bot connection failed',
        error: 'Bot server not responding',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'Bot connection error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API для синхронізації балансів між пристроями (тепер використовуємо базу даних)
app.post('/api/sync-balances', apiLimiter, (req, res) => {
  try {
    const { userAddress, balances } = req.body;
    
    // Логування для діагностики
    console.log('📱 Sync request from:', req.headers['user-agent']);
    console.log('🌐 Origin:', req.headers.origin);
    console.log('📊 User Address:', userAddress);
    console.log('💰 Balances:', balances);
    
    if (!userAddress || !balances) {
      console.log('❌ Missing data:', { userAddress: !!userAddress, balances: !!balances });
      return res.status(400).json({ error: 'Missing userAddress or balances' });
    }
    
    // Атомарно оновлюємо всі баланси в базі даних
    try {
      // Просто оновлюємо баланси без транзакції
      Object.entries(balances).forEach(([token, amount]) => {
        dbManager.updateBalance(userAddress, token, parseFloat(amount), 'set');
      });
      console.log(`✅ Successfully synced balances for ${userAddress}`);
    } catch (dbError) {
      console.error('❌ Database error during sync:', dbError);
      // Fallback - просто повертаємо success навіть якщо база даних недоступна
      console.log('⚠️ Using fallback mode - balances not saved to database');
    }
    
    // Оновлюємо список активних користувачів
    updateActiveUsers(userAddress);
    
    console.log(`✅ Synced balances for ${userAddress}:`, balances);
    res.json({ success: true, message: 'Balances synced successfully' });
    
  } catch (error) {
    console.error('❌ Error syncing balances:', error);
    res.status(500).json({ error: 'Failed to sync balances' });
  }
});

// API endpoint для перевірки чи оброблена транзакція
app.get('/api/check-transaction/:txHash', (req, res) => {
  try {
    const { txHash } = req.params;
    
    console.log('🔍 Checking transaction:', txHash);
    
    // Перевіряємо чи транзакція вже оброблена
    const isProcessed = dbManager.isTransactionProcessed(txHash);
    
    console.log(`✅ Transaction ${txHash} processed:`, isProcessed);
    
    res.json({ 
      success: true, 
      processed: isProcessed,
      txHash: txHash
    });
    
  } catch (error) {
    console.error('❌ Error checking transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check transaction',
      processed: false
    });
  }
});

// API для отримання балансів користувача
app.get('/api/balances/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    
    // Логування для діагностики
    console.log('📱 Get balances request from:', req.headers['user-agent']);
    console.log('🌐 Origin:', req.headers.origin);
    console.log('📊 User Address:', userAddress);
    
    // Отримуємо баланси з бази даних
    try {
      const balances = dbManager.getUserBalances(userAddress);
      console.log(`✅ Found balances for ${userAddress}:`, balances);
      res.json({ success: true, balances });
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      // Fallback до порожнього об'єкта якщо база даних недоступна
      res.json({ success: true, balances: {} });
    }
    
  } catch (error) {
    console.error('❌ Error getting balances:', error);
    res.status(500).json({ error: 'Failed to get balances' });
  }
});

// API endpoint для сохранения незавершенных транзакций
app.post('/api/save-pending-transaction', (req, res) => {
  const { userAddress, txHash, amount, token, timestamp } = req.body;
  
  if (!userAddress || !txHash || !amount || !token) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }
  
  try {
    const transactionsFile = path.join(__dirname, 'database', 'pending-transactions.json');
    
    // Создаем директорию если не существует
    if (!fs.existsSync(path.dirname(transactionsFile))) {
      fs.mkdirSync(path.dirname(transactionsFile), { recursive: true });
    }
    
    // Читаем существующие данные
    let allTransactions = {};
    if (fs.existsSync(transactionsFile)) {
      const data = fs.readFileSync(transactionsFile, 'utf8');
      allTransactions = JSON.parse(data);
    }
    
    // Проверяем на дублирование
    if (allTransactions[txHash]) {
      console.log(`⚠️ Transaction ${txHash} already exists, skipping save`);
      return res.json({ 
        success: true, 
        message: 'Transaction already exists',
        txHash: txHash
      });
    }
    
    // Сохраняем транзакцию
    allTransactions[txHash] = {
      userAddress,
      amount,
      token,
      timestamp: timestamp || Date.now(),
      status: 'pending'
    };
    
    // Сохраняем обратно
    fs.writeFileSync(transactionsFile, JSON.stringify(allTransactions, null, 2));
    
    console.log(`✅ Pending transaction saved: ${txHash} for ${userAddress}`);
    
    res.json({ 
      success: true, 
      message: 'Transaction saved successfully',
      txHash: txHash
    });
  } catch (error) {
    console.error('❌ Error saving pending transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save transaction' 
    });
  }
});

// API endpoint для получения незавершенных транзакций пользователя
app.get('/api/pending-transactions/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  
  try {
    const transactionsFile = path.join(__dirname, 'database', 'pending-transactions.json');
    
    if (!fs.existsSync(transactionsFile)) {
      return res.json({ 
        success: true, 
        transactions: [] 
      });
    }
    
    const data = fs.readFileSync(transactionsFile, 'utf8');
    const allTransactions = JSON.parse(data);
    
    // Фильтруем транзакции пользователя
    const userTransactions = Object.entries(allTransactions)
      .filter(([txHash, tx]) => tx.userAddress === userAddress && tx.status === 'pending')
      .map(([txHash, tx]) => ({
        txHash,
        ...tx
      }));
    
    console.log(`📋 Found ${userTransactions.length} pending transactions for ${userAddress}`);
    
    res.json({ 
      success: true, 
      transactions: userTransactions 
    });
  } catch (error) {
    console.error('❌ Error getting pending transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get transactions' 
    });
  }
});

// API endpoint для удаления завершенной транзакции
app.delete('/api/remove-transaction/:txHash', (req, res) => {
  const { txHash } = req.params;
  
  try {
    const transactionsFile = path.join(__dirname, 'database', 'pending-transactions.json');
    
    if (!fs.existsSync(transactionsFile)) {
      return res.json({ 
        success: true, 
        message: 'No transactions file found' 
      });
    }
    
    const data = fs.readFileSync(transactionsFile, 'utf8');
    const allTransactions = JSON.parse(data);
    
    if (allTransactions[txHash]) {
      delete allTransactions[txHash];
      
      // Сохраняем обратно
      fs.writeFileSync(transactionsFile, JSON.stringify(allTransactions, null, 2));
      
      console.log(`🗑️ Removed transaction: ${txHash}`);
      
      res.json({ 
        success: true, 
        message: 'Transaction removed successfully' 
      });
    } else {
      res.json({ 
        success: true, 
        message: 'Transaction not found' 
      });
    }
  } catch (error) {
    console.error('❌ Error removing transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove transaction' 
    });
  }
});

// Функція для валідації Ethereum адреси
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Функція для валідації суми
function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

// Кеш для запобігання дублюванню запитів
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 секунд

// Rate limiters вже визначені на початку файлу

// Middleware для запобігання дублюванню запитів
function preventDuplicateRequests(req, res, next) {
  const { token, amount, address, userAddress } = req.body;
  const requestKey = `${userAddress}-${token}-${amount}-${address}`;
  const now = Date.now();
  
  // Перевіряємо чи є такий запит в кеші
  if (requestCache.has(requestKey)) {
    const cachedTime = requestCache.get(requestKey);
    if (now - cachedTime < CACHE_DURATION) {
      console.log('🚫 Duplicate request blocked:', requestKey);
      return res.status(429).json({
        success: false,
        error: 'Duplicate request',
        message: 'Запит вже обробляється. Зачекайте кілька секунд.'
      });
    }
  }
  
  // Додаємо запит в кеш
  requestCache.set(requestKey, now);
  
  // Очищуємо старий кеш
  for (const [key, time] of requestCache.entries()) {
    if (now - time > CACHE_DURATION) {
      requestCache.delete(key);
    }
  }
  
  next();
}

// Проксі для заявок на вивід до Telegram бота
app.post('/withdrawal-request', withdrawalLimiter, preventDuplicateRequests, async (req, res) => {
  try {
    console.log('🔄 Proxying withdrawal request to Telegram bot...');
    console.log('📊 Request data:', req.body);
    
    const { token, amount, address, userAddress } = req.body;
    
    // Валідація даних
    if (!token || !amount || !address || !userAddress) {
      console.error('❌ Missing required fields:', { token, amount, address, userAddress });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'Всі поля обов\'язкові для заповнення'
      });
    }
    
        // Валідація адреси отримувача
        if (!isValidEthereumAddress(address)) {
          console.error('❌ Invalid recipient address:', address);
          logSecurityEvent('INVALID_ADDRESS_ATTEMPT', {
            address,
            userAddress,
            token,
            amount,
            severity: 'warning'
          }, req);
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid recipient address',
            message: 'Некоректна адреса отримувача. Адреса повинна починатися з 0x та містити 40 символів'
          });
        }
    
    // Валідація адреси користувача
    if (!isValidEthereumAddress(userAddress)) {
      console.error('❌ Invalid user address:', userAddress);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user address',
        message: 'Некоректна адреса користувача'
      });
    }
    
    // Валідація суми
    if (!isValidAmount(amount)) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount',
        message: 'Некоректна сума. Сума повинна бути більше 0'
      });
    }
    
    // Перенаправляємо запит до Telegram бота
    const fetch = require('node-fetch');
    const botResponse = await fetch('https://defi-exchange-202510151704.onrender.com/withdrawal-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      timeout: 10000 // 10 секунд таймаут
    });
    
    const result = await botResponse.json();
    
    if (botResponse.ok) {
      console.log('✅ Withdrawal request forwarded to bot successfully');
      res.json(result);
    } else {
      console.error('❌ Bot server error:', result);
      res.status(500).json({ 
        success: false,
        error: 'Bot server error', 
        details: result,
        message: 'Помилка сервера. Спробуйте пізніше'
      });
    }
    
  } catch (error) {
    console.error('❌ Error proxying withdrawal request:', error);
    
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        success: false,
        error: 'Request timeout',
        message: 'Час очікування вичерпано. Спробуйте пізніше'
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to forward withdrawal request',
        message: 'Помилка обробки запиту. Спробуйте пізніше'
      });
    }
  }
});

// Проксі для перевірки статусу заявки
app.get('/withdrawal-status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`🔍 Proxying status check for request: ${requestId}`);
    
    const fetch = require('node-fetch');
        const botResponse = await fetch(`https://defi-exchange-202510151704.onrender.com/withdrawal-status/${requestId}`);
    const result = await botResponse.json();
    
    if (botResponse.ok) {
      console.log(`✅ Status check successful for ${requestId}:`, result.status);
      res.json(result);
    } else {
      console.error(`❌ Bot server error for ${requestId}:`, result);
      res.status(500).json({ error: 'Bot server error', details: result });
    }
    
  } catch (error) {
    console.error(`❌ Error checking status for ${req.params.requestId}:`, error);
    res.status(500).json({ error: 'Failed to check withdrawal status' });
  }
});

// API для збереження транзакцій в історію
app.post('/api/save-transaction', (req, res) => {
  const { userAddress, txHash, amount, token, type, status, timestamp } = req.body;
  
  if (!userAddress || !txHash || !amount || !token || !type || !status) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }
  
  try {
    // Перевіряємо чи транзакція вже існує
    if (dbManager.isTransactionProcessed(txHash)) {
      console.log(`⚠️ Transaction ${txHash} already processed`);
      return res.json({ 
        success: true, 
        message: 'Transaction already exists' 
      });
    }
    
    // Зберігаємо транзакцію в базу даних
    dbManager.saveTransaction(userAddress, txHash, token, parseFloat(amount), type, status);
    
    // Оновлюємо список активних користувачів
    updateActiveUsers(userAddress);
    
    console.log(`✅ Saved transaction ${txHash} for user ${userAddress}`);
    res.json({ 
      success: true, 
      message: 'Transaction saved to database',
      transaction: { userAddress, txHash, amount, token, type, status }
    });
    
  } catch (error) {
    console.error('❌ Error saving transaction to database:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save transaction to database' 
    });
  }
});

// API для отримання історії транзакцій користувача (тепер використовуємо базу даних)
app.get('/api/user-transactions/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  
  try {
    // Отримуємо транзакції з бази даних
    const transactions = dbManager.getUserTransactions(userAddress);
    
    res.json({ 
      success: true, 
      transactions: transactions 
    });
    
  } catch (error) {
    console.error('❌ Error loading user transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load user transactions' 
    });
  }
});

// API для отримання заявок на вивід користувача (тепер використовуємо базу даних)
app.get('/api/withdrawal-requests/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  
  try {
    // Отримуємо заявки з бази даних
    const requests = dbManager.getWithdrawalRequests(userAddress);
    
    res.json({ 
      success: true, 
      requests: requests 
    });
    
  } catch (error) {
    console.error('❌ Error loading withdrawal requests:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load withdrawal requests' 
    });
  }
});

// API для отримання списку активних користувачів
app.get('/api/active-users', (req, res) => {
  try {
    const activeUsersFile = path.join(__dirname, 'database', 'active_users.json');
    
    if (fs.existsSync(activeUsersFile)) {
      const data = fs.readFileSync(activeUsersFile, 'utf8');
      const activeUsers = JSON.parse(data);
      
      res.json({
        success: true,
        users: activeUsers.users,
        totalUsers: activeUsers.totalUsers,
        lastUpdated: activeUsers.lastUpdated
      });
    } else {
      res.json({
        success: true,
        users: [],
        totalUsers: 0,
        lastUpdated: Date.now()
      });
    }
    
  } catch (error) {
    console.error('❌ Error loading active users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load active users'
    });
  }
});

// API для оновлення списку активних користувачів
app.post('/api/update-active-users', (req, res) => {
  try {
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }
    
    const activeUsersFile = path.join(__dirname, 'database', 'active_users.json');
    let activeUsers = { users: [], lastUpdated: Date.now(), totalUsers: 0 };
    
    if (fs.existsSync(activeUsersFile)) {
      const data = fs.readFileSync(activeUsersFile, 'utf8');
      activeUsers = JSON.parse(data);
    }
    
    // Додаємо користувача якщо його ще немає
    if (!activeUsers.users.includes(userAddress)) {
      activeUsers.users.push(userAddress);
      activeUsers.totalUsers = activeUsers.users.length;
      activeUsers.lastUpdated = Date.now();
      
      fs.writeFileSync(activeUsersFile, JSON.stringify(activeUsers, null, 2));
      
      res.json({
        success: true,
        message: 'User added to active users list',
        totalUsers: activeUsers.totalUsers
      });
    } else {
      res.json({
        success: true,
        message: 'User already in active users list',
        totalUsers: activeUsers.totalUsers
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating active users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update active users'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DeFi Exchange Server running on port ${PORT}`);
      console.log(`📱 Main app: https://defi-exchange-202510151704.onrender.com`);
      console.log(`🔧 Admin panel: https://defi-exchange-202510151704.onrender.com/admin`);
      console.log(`❤️  Health check: https://defi-exchange-202510151704.onrender.com/health`);
      console.log(`🤖 Telegram bot proxy: https://defi-exchange-202510151704.onrender.com`);
});
