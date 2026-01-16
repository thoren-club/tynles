# Настройка домена для Mini App

## Шаг 1: Настройка DNS записей

В панели управления вашего домена (где вы покупали домен) добавьте A-запись:

```
Тип: A
Имя: @ (или оставьте пустым для корневого домена)
Значение: 89.104.70.86
TTL: 3600 (или автоматически)
```

Если нужен поддомен (например, `app.yourdomain.com`):
```
Тип: A
Имя: app
Значение: 89.104.70.86
TTL: 3600
```

**Важно:** Изменения DNS могут занять от нескольких минут до 48 часов. Обычно это занимает 10-30 минут.

## Шаг 2: Проверка DNS

После настройки DNS проверьте:

```bash
# Проверка A-записи
nslookup yourdomain.com
# или
dig yourdomain.com

# Должен вернуть IP: 89.104.70.86
```

## Шаг 3: Установка Nginx

Nginx будет работать как reverse proxy и обрабатывать SSL.

```bash
# Установка Nginx
apt update
apt install -y nginx

# Проверка статуса
systemctl status nginx
systemctl enable nginx
```

## Шаг 4: Установка Certbot (для SSL)

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Проверка установки
certbot --version
```

## Шаг 5: Настройка Nginx

Создайте конфигурационный файл для вашего домена:

```bash
nano /etc/nginx/sites-available/task-bot
```

Вставьте следующее (замените `yourdomain.com` на ваш домен):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Редирект на HTTPS (будет работать после получения SSL)
    # Пока закомментировано, раскомментируйте после получения SSL
    # return 301 https://$server_name$request_uri;

    # Временная конфигурация для получения SSL
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
    }
}
```

Сохраните файл (`Ctrl+O`, `Enter`, `Ctrl+X`).

## Шаг 6: Активация конфигурации

```bash
# Создать символическую ссылку
ln -s /etc/nginx/sites-available/task-bot /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию (опционально)
rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
```

## Шаг 7: Получение SSL сертификата

```bash
# Получить SSL сертификат
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями
# - Выберите редирект на HTTPS (2)
```

Certbot автоматически обновит конфигурацию Nginx и добавит SSL.

## Шаг 8: Обновление .env файла

```bash
nano .env
```

Обновите `WEB_APP_URL`:
```env
WEB_APP_URL=https://yourdomain.com
```

## Шаг 9: Перезапуск бота

```bash
pm2 restart task-bot
```

## Шаг 10: Настройка автопродления SSL

Certbot автоматически настроит автопродление, но можно проверить:

```bash
# Проверка автопродления
certbot renew --dry-run

# Если нужно, добавьте в crontab (обычно уже добавлено)
systemctl status certbot.timer
```

## Шаг 11: Настройка Mini App в BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Используйте `/newapp` или `/myapps`
3. Выберите вашего бота
4. Укажите URL: `https://yourdomain.com`
5. Загрузите иконку (опционально)
6. Сохраните

## Проверка работы

```bash
# Проверка Nginx
systemctl status nginx

# Проверка SSL
curl -I https://yourdomain.com

# Проверка в браузере
# Откройте https://yourdomain.com
```

## Финальная конфигурация Nginx (после SSL)

После получения SSL, Certbot автоматически обновит конфигурацию. Финальная версия будет примерно такой:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL настройки (Certbot добавит автоматически)
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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
        
        # Таймауты для WebSocket (если нужно)
        proxy_read_timeout 86400;
    }
}
```

## Troubleshooting

### DNS не резолвится
```bash
# Проверьте DNS
dig yourdomain.com
nslookup yourdomain.com

# Подождите до 48 часов для распространения DNS
```

### Nginx не запускается
```bash
# Проверьте конфигурацию
nginx -t

# Проверьте логи
tail -f /var/log/nginx/error.log
```

### SSL не получается
- Убедитесь, что DNS правильно настроен
- Убедитесь, что порт 80 открыт: `ufw allow 80/tcp`
- Проверьте, что домен указывает на правильный IP

### 502 Bad Gateway
- Проверьте, что бот запущен: `pm2 status`
- Проверьте, что порт 3000 слушается: `netstat -tulpn | grep 3000`
- Проверьте логи: `pm2 logs task-bot`

### Порт 80/443 занят
```bash
# Проверьте, что использует порты
lsof -i :80
lsof -i :443

# Остановите конфликтующие сервисы
```
