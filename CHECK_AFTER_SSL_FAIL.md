# Проверка после неудачной настройки SSL

Если скрипт `setup-domain.sh` крашнулся при попытке получить SSL (потому что DNS еще не привязан), проверьте что успело настроиться:

## Что проверить на сервере

### 1. Проверка Nginx

```bash
# Проверка, установлен ли Nginx
nginx -v

# Проверка статуса
systemctl status nginx

# Проверка конфигурации
nginx -t
```

### 2. Проверка конфигурации Nginx

```bash
# Проверьте, создана ли конфигурация
ls -la /etc/nginx/sites-available/task-bot
ls -la /etc/nginx/sites-enabled/task-bot

# Посмотрите содержимое конфигурации
cat /etc/nginx/sites-available/task-bot
```

### 3. Проверка Certbot

```bash
# Проверка, установлен ли Certbot
certbot --version

# Проверка существующих сертификатов
certbot certificates
```

### 4. Проверка firewall

```bash
# Проверка статуса firewall
ufw status

# Проверка, открыты ли порты
ufw status | grep -E "(80|443)"
```

## Что нужно сделать дальше

### Шаг 1: Дождитесь привязки DNS

Проверьте, что DNS привязан:

```bash
# Проверка DNS (замените yourdomain.com на ваш домен)
nslookup yourdomain.com
dig yourdomain.com

# Должен вернуть IP: 89.104.70.86
```

**Важно:** Подождите, пока DNS распространится (обычно 10-30 минут, максимум 48 часов).

### Шаг 2: Получение SSL сертификата

После того, как DNS привязан, получите SSL:

```bash
# Замените yourdomain.com на ваш домен
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями (A)
# - Выберите редирект на HTTPS (2)
```

### Шаг 3: Обновление .env

```bash
nano .env
```

Убедитесь, что есть строка:
```env
WEB_APP_URL=https://yourdomain.com
```

### Шаг 4: Перезапуск бота

```bash
pm2 restart task-bot
```

## Если что-то не настроилось

### Nginx не установлен

```bash
apt update
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### Конфигурация Nginx не создана

Создайте вручную:

```bash
nano /etc/nginx/sites-available/task-bot
```

Вставьте (замените `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

Активируйте:

```bash
ln -s /etc/nginx/sites-available/task-bot /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # если есть
nginx -t
systemctl reload nginx
```

### Certbot не установлен

```bash
apt install -y certbot python3-certbot-nginx
```

### Порты не открыты

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

## Быстрая проверка всего

Выполните на сервере:

```bash
echo "=== Проверка Nginx ==="
nginx -v 2>&1
systemctl status nginx --no-pager | head -5

echo ""
echo "=== Проверка конфигурации ==="
ls -la /etc/nginx/sites-available/task-bot 2>&1
ls -la /etc/nginx/sites-enabled/task-bot 2>&1

echo ""
echo "=== Проверка Certbot ==="
certbot --version 2>&1

echo ""
echo "=== Проверка firewall ==="
ufw status | head -10

echo ""
echo "=== Проверка портов ==="
netstat -tulpn | grep -E "(80|443|3000)" || echo "Порты не слушаются"
```

## После получения SSL

После успешного получения SSL:

1. Certbot автоматически обновит конфигурацию Nginx
2. Проверьте работу: `curl -I https://yourdomain.com`
3. Обновите `.env`: `WEB_APP_URL=https://yourdomain.com`
4. Перезапустите бота: `pm2 restart task-bot`
5. Настройте Mini App в BotFather
