# Використовуємо Node.js 18 Alpine для меншого розміру
FROM node:18-alpine

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо package.json та package-lock.json
COPY package*.json ./

# Встановлюємо залежності
RUN npm install --legacy-peer-deps

# Копіюємо весь проект
COPY . .

# Створюємо директорію для бази даних
RUN mkdir -p database

# Відкриваємо порт
EXPOSE 3002

# Команда для запуску
CMD ["npm", "run", "start:prod"]
