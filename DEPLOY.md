# Инструкция по развертыванию

## Требования для VPS

- OS: Ubuntu 20.04+ или Debian 11+
- RAM: минимум 512MB (рекомендуется 1GB+)
- CPU: 1 ядро
- Диск: 10GB+

## Настройка сервера

### 1. Подключение к серверу

```bash
ssh root@your-server-ip
```

### 2. Установка Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

Проверка:
```bash
node --version
npm --version
```

### 3. Установка PostgreSQL

```bash
apt update
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql
```

### 4. Настройка базы данных

```bash
sudo -u postgres psql
```

В psql:
```sql
CREATE DATABASE task_bot_db;
CREATE USER taskbot_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE task_bot_db TO taskbot_user;
\q
```

### 5. Загрузка проекта

Вариант A: Git (если проект в репозитории)
```bash
git clone your-repo-url
cd project-name
npm install
```

Вариант B: Загрузка файлов через SFTP/SCP
```bash
# На локальной машине
scp -r . user@server:/path/to/project
```

### 6. Настройка переменных окружения

```bash
nano .env
```

Содержимое `.env`:
```
BOT_TOKEN=your_telegram_bot_token_here
DATABASE_URL=postgresql://taskbot_user:your_secure_password@localhost:5432/task_bot_db
LOG_LEVEL=info
```

**Как получить BOT_TOKEN:**
1. Напишите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен

### 7. Запуск миграций

```bash
npm run db:generate
npm run db:migrate
```

### 8. Компиляция TypeScript

```bash
npm run build
```

### 9. Запуск через PM2 (рекомендуется)

Установка PM2:
```bash
npm install -g pm2
```

Запуск бота:
```bash
pm2 start dist/index.js --name task-bot
pm2 save
pm2 startup  # выполните команду, которую он покажет
```

Управление:
```bash
pm2 status
pm2 logs task-bot
pm2 restart task-bot
pm2 stop task-bot
```

### Альтернатива: systemd service

Создайте файл `/etc/systemd/system/task-bot.service`:

```ini
[Unit]
Description=Telegram Task Bot
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/project
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Затем:
```bash
systemctl daemon-reload
systemctl enable task-bot
systemctl start task-bot
systemctl status task-bot
```

## Проверка работы

```bash
# Логи
pm2 logs task-bot
# или
journalctl -u task-bot -f

# Статус
pm2 status
```

Бот должен отвечать на команду `/start` в Telegram.

## Обновление

```bash
git pull  # если используете git
npm install
npm run build
npm run db:migrate  # если были изменения в схеме
pm2 restart task-bot
```

## Безопасность

1. Настройте firewall:
```bash
ufw allow 22/tcp
ufw enable
```

2. Используйте сильные пароли для БД
3. Не коммитьте `.env` в git
4. Регулярно обновляйте систему: `apt update && apt upgrade`