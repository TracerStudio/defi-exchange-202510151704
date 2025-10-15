# 🚀 Швидкий деплой на Render.com

## Крок 1: Завантаження на GitHub
```bash
# Ініціалізувати git репозиторій
git init

# Додати всі файли
git add .

# Зробити коміт
git commit -m "Initial commit - DeFi Exchange Platform"

# Додати remote репозиторій (замініть на ваш URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Запушити на GitHub
git push -u origin main
```

## Крок 2: Створення сервісу на Render
1. Перейдіть на [render.com](https://render.com)
2. Натисніть **"New +"** → **"Web Service"**
3. Підключіть ваш GitHub репозиторій
4. Оберіть папку `prd_deploy`

## Крок 3: Налаштування
- **Name**: `defi-exchange-platform`
- **Environment**: `Node`
- **Build Command**: `npm install --legacy-peer-deps && npm run build`
- **Start Command**: `npm run start:prod`
- **Plan**: `Free` (або `Starter` для кращої продуктивності)

## Крок 4: Environment Variables
Додайте:
- `NODE_ENV` = `production`
- `PORT` = `3002`

## Крок 5: Деплой
Натисніть **"Create Web Service"** та очікуйте завершення (5-10 хвилин)

## ✅ Результат
Ваш додаток буде доступний за адресою:
- **Основний додаток**: `https://defi-exchange-platform.onrender.com`
- **Адмін панель**: `https://defi-exchange-platform.onrender.com/admin`
- **Health Check**: `https://defi-exchange-platform.onrender.com/health`

## 🔧 Troubleshooting
Якщо щось не працює:
1. Перевірте логи в Render Dashboard
2. Переконайтеся, що всі файли закомічені
3. Перевірте Environment Variables
4. Переконайтеся, що build пройшов успішно
