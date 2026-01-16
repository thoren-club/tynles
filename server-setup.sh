#!/bin/bash

# Скрипт автоматической настройки сервера для Telegram Task Bot
# Запустите на сервере после подключения через SSH

set -e  # Остановка при ошибке

echo "🚀 Начинаем настройку сервера..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    error "Пожалуйста, запустите скрипт от root (sudo ./server-setup.sh)"
    exit 1
fi

# Шаг 1: Обновление системы
info "Обновление системы..."
apt update
apt upgrade -y

# Шаг 2: Установка необходимых пакетов
info "Установка необходимых пакетов..."
apt install -y curl wget git build-essential

# Шаг 3: Проверка и установка Node.js
info "Проверка Node.js..."
if ! command -v node &> /dev/null; then
    info "Установка Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    info "Node.js уже установлен: $(node --version)"
fi

# Проверка версий
info "Node.js версия: $(node --version)"
info "npm версия: $(npm --version)"

# Шаг 4: Установка PostgreSQL
info "Проверка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    info "Установка PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    info "PostgreSQL уже установлен"
    systemctl start postgresql || true
fi

# Шаг 5: Настройка базы данных
info "Настройка базы данных..."
DB_NAME="task_bot_db"
DB_USER="taskbot_user"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Проверка, существует ли база данных
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    warn "База данных $DB_NAME уже существует"
else
    info "Создание базы данных $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
fi

# Проверка, существует ли пользователь
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    warn "Пользователь $DB_USER уже существует"
    info "Обновление пароля пользователя..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
    info "Создание пользователя $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# Выдача прав
info "Настройка прав доступа..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

info "✅ База данных настроена!"
info "📝 DATABASE_URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""

# Шаг 6: Установка PM2
info "Проверка PM2..."
if ! command -v pm2 &> /dev/null; then
    info "Установка PM2..."
    npm install -g pm2
else
    info "PM2 уже установлен"
fi

# Шаг 7: Настройка firewall (опционально)
read -p "Настроить firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Настройка firewall..."
    ufw allow 22/tcp
    ufw allow 3000/tcp
    ufw --force enable
    info "Firewall настроен"
fi

echo ""
info "✅ Базовая настройка сервера завершена!"
echo ""
warn "ВАЖНО: Сохраните следующую информацию:"
echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
info "Следующие шаги:"
echo "1. Загрузите проект на сервер (git clone или scp)"
echo "2. Создайте .env файл с BOT_TOKEN и DATABASE_URL"
echo "3. Выполните: npm install"
echo "4. Выполните: npm run db:generate && npm run db:migrate"
echo "5. Выполните: npm run build"
echo "6. Запустите: pm2 start dist/index.js --name task-bot"
echo ""
