#!/bin/bash

# Скрипт для сборки веба и развертывания через PM2
# Запустите на сервере в папке проекта

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка наличия .env
if [ ! -f .env ]; then
    error "Файл .env не найден!"
    exit 1
fi

info "Начинаем сборку проекта..."

# Шаг 1: Установка зависимостей backend
info "Установка зависимостей backend..."
npm install

# Шаг 2: Установка зависимостей frontend
if [ -d "web" ]; then
    info "Установка зависимостей frontend..."
    cd web
    npm install
    cd ..
else
    error "Папка web не найдена!"
    exit 1
fi

# Шаг 3: Генерация Prisma клиента
info "Генерация Prisma клиента..."
npm run db:generate

# Шаг 4: Сборка frontend
info "Сборка frontend..."
cd web
npm run build
cd ..

# Проверка, что сборка прошла успешно
if [ ! -d "web/dist" ]; then
    error "Сборка frontend не удалась! Папка web/dist не создана."
    exit 1
fi

info "✅ Frontend собран успешно!"

# Шаг 5: Сборка backend
info "Сборка backend..."
npm run build

# Проверка, что сборка прошла успешно
if [ ! -f "dist/index.js" ]; then
    error "Сборка backend не удалась! Файл dist/index.js не создан."
    exit 1
fi

info "✅ Backend собран успешно!"

# Шаг 6: Остановка существующих процессов PM2
info "Проверка существующих процессов PM2..."
if pm2 list | grep -q "task-bot"; then
    info "Остановка существующего процесса task-bot..."
    pm2 stop task-bot || true
    pm2 delete task-bot || true
fi

if pm2 list | grep -q "task-web"; then
    info "Остановка существующего процесса task-web..."
    pm2 stop task-web || true
    pm2 delete task-web || true
fi

# Шаг 7: Запуск бота через PM2
info "Запуск бота через PM2..."
pm2 start dist/index.js --name task-bot

# Шаг 8: Сохранение конфигурации PM2
pm2 save

info "✅ Развертывание завершено!"
echo ""
info "Проверьте статус:"
echo "  pm2 status"
echo ""
info "Просмотр логов:"
echo "  pm2 logs task-bot"
echo ""
info "Проверка веб-сервера:"
echo "  curl http://localhost:3000/api/auth/me"
echo ""
