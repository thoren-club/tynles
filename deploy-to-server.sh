#!/bin/bash

# Скрипт для развертывания проекта на сервере
# Запустите на сервере в папке с проектом

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

# Проверка наличия .env файла
if [ ! -f .env ]; then
    error "Файл .env не найден!"
    info "Создайте файл .env с необходимыми переменными:"
    echo "BOT_TOKEN=your_bot_token"
    echo "DATABASE_URL=postgresql://user:password@localhost:5432/database"
    echo "WEB_APP_URL=https://your-domain.com"
    exit 1
fi

info "Проверка переменных окружения..."
source .env

if [ -z "$BOT_TOKEN" ]; then
    error "BOT_TOKEN не установлен в .env"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL не установлен в .env"
    exit 1
fi

# Установка зависимостей
info "Установка зависимостей backend..."
npm install

# Установка зависимостей frontend
if [ -d "web" ]; then
    info "Установка зависимостей frontend..."
    cd web
    npm install
    cd ..
fi

# Генерация Prisma клиента
info "Генерация Prisma клиента..."
npm run db:generate

# Миграции базы данных
info "Применение миграций базы данных..."
npm run db:migrate || warn "Миграции могут быть уже применены"

# Сборка frontend
if [ -d "web" ]; then
    info "Сборка frontend..."
    cd web
    
    # Проверка, установлены ли зависимости
    if [ ! -d "node_modules" ]; then
        info "Установка зависимостей frontend..."
        npm install
    fi
    
    info "Запуск сборки frontend..."
    npm run build
    
    # Проверка успешности сборки
    if [ ! -d "dist" ]; then
        error "Сборка frontend не удалась! Папка dist не создана."
        exit 1
    fi
    
    info "✅ Frontend собран успешно!"
    cd ..
else
    warn "Папка web не найдена, пропускаем сборку frontend"
fi

# Сборка backend
info "Сборка backend..."
npm run build

# Проверка PM2
if ! command -v pm2 &> /dev/null; then
    error "PM2 не установлен. Установите: npm install -g pm2"
    exit 1
fi

# Остановка существующего процесса (если есть)
if pm2 list | grep -q "task-bot"; then
    info "Остановка существующего процесса..."
    pm2 stop task-bot || true
    pm2 delete task-bot || true
fi

# Запуск бота
info "Запуск бота через PM2..."
pm2 start dist/index.js --name task-bot

# Сохранение конфигурации PM2
pm2 save

info "✅ Развертывание завершено!"
info "Проверьте статус: pm2 status"
info "Просмотр логов: pm2 logs task-bot"
