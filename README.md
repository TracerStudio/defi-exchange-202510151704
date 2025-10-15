# DeFi Exchange Platform

Децентралізована платформа обміну криптовалют з підтримкою Web3 гаманців.

## 🚀 Деплой на Render.com

### Крок 1: Підготовка репозиторію
1. Завантажте цей проект на GitHub
2. Переконайтеся, що всі файли закомічені

### Крок 2: Створення сервісу на Render
1. Перейдіть на [render.com](https://render.com)
2. Натисніть "New +" → "Web Service"
3. Підключіть ваш GitHub репозиторій
4. Оберіть папку `prd_deploy`

### Крок 3: Налаштування сервісу
- **Name**: `defi-exchange-platform`
- **Environment**: `Node`
- **Build Command**: `npm install --legacy-peer-deps && npm run build`
- **Start Command**: `npm run start:prod`
- **Plan**: Free (або Starter для кращої продуктивності)

### Крок 4: Environment Variables
Додайте наступні змінні середовища:
- `NODE_ENV`: `production`
- `PORT`: `3002`

### Крок 5: Деплой
1. Натисніть "Create Web Service"
2. Render автоматично почне білд та деплой
3. Очікуйте завершення процесу (5-10 хвилин)

## 📱 Доступ до додатку
Після успішного деплою ваш додаток буде доступний за адресою:
- **Основний додаток**: `https://defi-exchange-platform.onrender.com`
- **Адмін панель**: `https://defi-exchange-platform.onrender.com/admin`
- **Health Check**: `https://defi-exchange-platform.onrender.com/health`

## 🔧 Локальний запуск
```bash
# Встановлення залежностей
npm install --legacy-peer-deps

# Збірка проекту
npm run build

# Запуск сервера
npm run start:prod
```

## 📁 Структура проекту
```
prd_deploy/
├── build/                 # Зібраний фронтенд
├── src/                   # React компоненти
├── admin-server.js        # Express сервер
├── telegram-bot/          # Telegram бот
├── database/              # База даних
├── Dockerfile             # Docker конфігурація
├── render.yaml            # Render конфігурація
└── package.json           # Залежності
```

## 🌐 API Endpoints
- `GET /` - Головна сторінка
- `GET /admin` - Адмін панель
- `GET /health` - Health check
- `POST /api/sync-balances` - Синхронізація балансів
- `GET /api/balances/:userAddress` - Отримання балансів
- `POST /withdrawal-request` - Заявка на вивід
- `GET /withdrawal-status/:requestId` - Статус заявки

## 🔒 Безпека
- CORS налаштований для всіх доменів
- Підтримка HTTPS
- Валідація вхідних даних
- Захист від CSRF атак

## 📞 Підтримка
При виникненні проблем перевірте:
1. Логи в Render Dashboard
2. Health check endpoint
3. Environment variables
4. Build logs
