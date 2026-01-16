#!/bin/bash

# Скрипт для настройки домена и SSL
# Использование: ./setup-domain.sh yourdomain.com

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

# Проверка аргументов
if [ -z "$1" ]; then
    error "Использование: ./setup-domain.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
WWW_DOMAIN="www.$DOMAIN"

info "Настройка домена: $DOMAIN"

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    error "Пожалуйста, запустите скрипт от root (sudo ./setup-domain.sh $DOMAIN)"
    exit 1
fi

# Шаг 1: Установка Nginx
info "Проверка Nginx..."
if ! command -v nginx &> /dev/null; then
    info "Установка Nginx..."
    apt update
    apt install -y nginx
else
    info "Nginx уже установлен"
fi

systemctl enable nginx
systemctl start nginx

# Шаг 2: Установка Certbot
info "Проверка Certbot..."
if ! command -v certbot &> /dev/null; then
    info "Установка Certbot..."
    apt install -y certbot python3-certbot-nginx
else
    info "Certbot уже установлен"
fi

# Шаг 3: Создание конфигурации Nginx
info "Создание конфигурации Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/task-bot"

cat > $NGINX_CONFIG <<EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Таймауты
        proxy_read_timeout 86400;
    }
}
EOF

# Шаг 4: Активация конфигурации
info "Активация конфигурации Nginx..."
if [ -L /etc/nginx/sites-enabled/task-bot ]; then
    warn "Конфигурация уже активирована"
else
    ln -s /etc/nginx/sites-available/task-bot /etc/nginx/sites-enabled/
fi

# Удаление дефолтной конфигурации (опционально)
if [ -L /etc/nginx/sites-enabled/default ]; then
    warn "Удаление дефолтной конфигурации..."
    rm /etc/nginx/sites-enabled/default
fi

# Проверка конфигурации
info "Проверка конфигурации Nginx..."
if nginx -t; then
    info "Конфигурация корректна"
    systemctl reload nginx
else
    error "Ошибка в конфигурации Nginx!"
    exit 1
fi

# Шаг 5: Открытие портов в firewall
info "Настройка firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    info "Порты 80 и 443 открыты"
else
    warn "UFW не установлен, пропускаем настройку firewall"
fi

# Шаг 6: Получение SSL сертификата
info "Получение SSL сертификата..."
warn "Убедитесь, что DNS настроен и домен указывает на этот сервер!"
read -p "Продолжить получение SSL? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    info "SSL сертификат получен!"
else
    warn "Пропущено получение SSL. Выполните вручную:"
    echo "  certbot --nginx -d $DOMAIN -d $WWW_DOMAIN"
fi

# Шаг 7: Обновление .env
info "Обновление .env файла..."
if [ -f .env ]; then
    # Обновляем WEB_APP_URL если он есть
    if grep -q "WEB_APP_URL" .env; then
        sed -i "s|WEB_APP_URL=.*|WEB_APP_URL=https://$DOMAIN|" .env
        info "WEB_APP_URL обновлен в .env"
    else
        echo "WEB_APP_URL=https://$DOMAIN" >> .env
        info "WEB_APP_URL добавлен в .env"
    fi
else
    warn "Файл .env не найден. Создайте его вручную."
fi

info "✅ Настройка домена завершена!"
echo ""
info "Следующие шаги:"
echo "1. Убедитесь, что DNS настроен правильно"
echo "2. Проверьте работу: https://$DOMAIN"
echo "3. Перезапустите бота: pm2 restart task-bot"
echo "4. Настройте Mini App в BotFather с URL: https://$DOMAIN"
echo ""
