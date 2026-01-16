#!/bin/bash

# Скрипт для проверки состояния после неудачной настройки SSL
# Запустите на сервере

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

echo "Проверка состояния настройки..."
echo ""

# Проверка Nginx
section "Nginx"
if command -v nginx &> /dev/null; then
    info "Nginx установлен: $(nginx -v 2>&1 | cut -d'/' -f2)"
    if systemctl is-active --quiet nginx; then
        info "Nginx запущен"
    else
        error "Nginx не запущен"
        echo "  Запустите: systemctl start nginx"
    fi
else
    error "Nginx не установлен"
    echo "  Установите: apt install -y nginx"
fi

# Проверка конфигурации Nginx
if [ -f /etc/nginx/sites-available/task-bot ]; then
    info "Конфигурация Nginx создана"
    if [ -L /etc/nginx/sites-enabled/task-bot ]; then
        info "Конфигурация активирована"
    else
        warn "Конфигурация не активирована"
        echo "  Активируйте: ln -s /etc/nginx/sites-available/task-bot /etc/nginx/sites-enabled/"
    fi
else
    error "Конфигурация Nginx не создана"
fi

# Проверка конфигурации
if nginx -t &> /dev/null; then
    info "Конфигурация Nginx корректна"
else
    error "Ошибка в конфигурации Nginx"
    echo "  Проверьте: nginx -t"
fi

# Проверка Certbot
section "Certbot"
if command -v certbot &> /dev/null; then
    info "Certbot установлен: $(certbot --version 2>&1 | head -1)"
    
    # Проверка сертификатов
    CERT_COUNT=$(certbot certificates 2>/dev/null | grep -c "Certificate Name" || echo "0")
    if [ "$CERT_COUNT" -gt 0 ]; then
        info "Найдено сертификатов: $CERT_COUNT"
        certbot certificates 2>/dev/null | grep -A 3 "Certificate Name"
    else
        warn "SSL сертификаты не получены"
        echo "  Получите после настройки DNS: certbot --nginx -d yourdomain.com"
    fi
else
    error "Certbot не установлен"
    echo "  Установите: apt install -y certbot python3-certbot-nginx"
fi

# Проверка firewall
section "Firewall"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    if echo "$UFW_STATUS" | grep -q "active"; then
        info "Firewall активен"
        
        # Проверка портов
        if ufw status | grep -q "80/tcp"; then
            info "Порт 80 открыт"
        else
            warn "Порт 80 не открыт"
            echo "  Откройте: ufw allow 80/tcp"
        fi
        
        if ufw status | grep -q "443/tcp"; then
            info "Порт 443 открыт"
        else
            warn "Порт 443 не открыт"
            echo "  Откройте: ufw allow 443/tcp"
        fi
    else
        warn "Firewall не активен"
    fi
else
    warn "UFW не установлен (опционально)"
fi

# Проверка портов
section "Порты"
if netstat -tulpn 2>/dev/null | grep -q ":80 "; then
    info "Порт 80 слушается"
    netstat -tulpn 2>/dev/null | grep ":80 "
else
    warn "Порт 80 не слушается"
fi

if netstat -tulpn 2>/dev/null | grep -q ":443 "; then
    info "Порт 443 слушается"
    netstat -tulpn 2>/dev/null | grep ":443 "
else
    warn "Порт 443 не слушается (SSL еще не настроен)"
fi

if netstat -tulpn 2>/dev/null | grep -q ":3000 "; then
    info "Порт 3000 слушается (веб-сервер)"
    netstat -tulpn 2>/dev/null | grep ":3000 "
else
    error "Порт 3000 не слушается"
    echo "  Проверьте: pm2 status"
fi

# Проверка PM2
section "PM2"
if command -v pm2 &> /dev/null; then
    info "PM2 установлен"
    if pm2 list | grep -q "task-bot"; then
        info "Бот запущен через PM2"
        pm2 list | grep task-bot
    else
        error "Бот не запущен через PM2"
        echo "  Запустите: pm2 start dist/index.js --name task-bot"
    fi
else
    error "PM2 не установлен"
    echo "  Установите: npm install -g pm2"
fi

# Проверка .env
section ".env файл"
if [ -f .env ]; then
    info ".env файл существует"
    if grep -q "WEB_APP_URL" .env; then
        WEB_APP_URL=$(grep "WEB_APP_URL" .env | cut -d'=' -f2)
        info "WEB_APP_URL: $WEB_APP_URL"
    else
        warn "WEB_APP_URL не установлен в .env"
    fi
else
    error ".env файл не найден"
fi

echo ""
section "Резюме"
echo "Если DNS еще не привязан, дождитесь привязки и выполните:"
echo "  certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "Подробная инструкция: см. CHECK_AFTER_SSL_FAIL.md"
