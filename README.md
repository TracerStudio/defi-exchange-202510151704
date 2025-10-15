# 🚀 DeFi Exchange Platform

Decentralized Exchange Platform with Telegram Bot integration for withdrawals.

## 📋 Features

- **Frontend**: React-based DeFi exchange interface
- **Admin Panel**: Server management and monitoring
- **Telegram Bot**: Automated withdrawal processing
- **Database**: JSON-based user data storage
- **Smart Contracts**: Ethereum-based deposit system

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd prd_deploy
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env
```

## 🚀 Quick Start

### Option 1: Start Everything at Once
```bash
npm run start:all
```
This will start:
- Database initialization
- Admin server (port 3002)
- Telegram bot (port 3001)
- Frontend (port 3000)

### Option 2: Start Services Individually

**Start Database:**
```bash
npm run db:init
```

**Start Admin Server:**
```bash
npm run admin
```

**Start Telegram Bot:**
```bash
npm run bot
```

**Start Frontend:**
```bash
npm start
```

### Option 3: Development Mode
```bash
npm run dev:full
```

## 📱 Access Points

- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3002/admin
- **Health Check**: http://localhost:3002/health
- **Bot Health**: http://localhost:3001/health

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start React frontend |
| `npm run build` | Build for production |
| `npm run admin` | Start admin server |
| `npm run bot` | Start Telegram bot |
| `npm run db:init` | Initialize database |
| `npm run start:all` | Start everything |
| `npm run dev:full` | Development mode with all services |

## 🗄️ Database Structure

```
database/
├── active_users.json          # Active user list
├── pending-transactions.json  # Pending transactions
├── user_balances.json         # Global user balances
├── user_balances_*.json       # Per-user balances
├── user_transactions_*.json   # Per-user transaction history
└── withdrawal_requests_*.json # Per-user withdrawal requests
```

## 🤖 Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Add token to `.env` file:
```
BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_chat_id_here
```

## 🔐 Environment Variables

```env
# Server Configuration
PORT=3002
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=your_admin_chat_id

# Reown AppKit
REACT_APP_REOWN_PROJECT_ID=your_reown_project_id

# Etherscan API
REACT_APP_ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 🚨 Important Notes

- **Gas Fees**: Optimized for low-cost transactions (5 gwei)
- **Security**: API keys should be in environment variables
- **Database**: JSON-based, suitable for development/testing
- **Bot**: Requires active Telegram bot for withdrawals

## 🐛 Troubleshooting

**Bot not responding:**
- Check BOT_TOKEN in .env
- Verify ADMIN_CHAT_ID is correct
- Ensure bot is running on port 3001

**High gas fees:**
- Gas prices are optimized to 5 gwei
- Check network congestion
- Verify contract deployment

**Database issues:**
- Run `npm run db:init` to reinitialize
- Check file permissions in database/ folder

## 📞 Support

For issues and questions, please check the logs or contact the development team.

---

**🎉 Happy Trading!**