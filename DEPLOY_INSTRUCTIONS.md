# Инструкция по развертыванию на сервере

## Быстрый старт

### 1. Подключитесь к серверу

```bash
ssh root@89.104.70.86
```

### 2. Загрузите файлы на сервер

**Вариант A: Через Git (если проект в репозитории)**
```bash
# На сервере
cd /root
git clone ваш_repo_url
cd название_папки
```

**Вариант B: Через SCP (с вашего компьютера)**
```powershell
# В PowerShell на вашем компьютере
scp -r F:\Unnamed\* root@89.104.70.86:/root/task-bot/
```

**Вариант C: Через SFTP (FileZilla, WinSCP)**
- Хост: `89.104.70.86`
- Пользователь: `root`
- Порт: `22`
- Загрузите все файлы в `/root/task-bot/`

### 3. Запустите скрипт настройки сервера

```bash
# На сервере
cd /root/task-bot  # или куда вы загрузили проект
chmod +x server-setup.sh
./server-setup.sh
```

Скрипт автоматически:
- ✅ Обновит систему
- ✅ Установит Node.js 20.x
- ✅ Установит PostgreSQL
- ✅ Создаст базу данных и пользователя
- ✅ Установит PM2
- ✅ Настроит firewall (опционально)

**ВАЖНО:** Сохраните DATABASE_URL, который выведет скрипт!

### 4. Создайте файл .env

```bash
nano .env
```

Вставьте следующее (замените значения):
```env
BOT_TOKEN=ваш_токен_от_BotFather
DATABASE_URL=postgresql://taskbot_user:пароль_из_скрипта@localhost:5432/task_bot_db
WEB_APP_URL=https://your-domain.com
PORT=3000
LOG_LEVEL=info
```

**Сохранение в nano:**
- `Ctrl + O` (сохранить)
- `Enter` (подтвердить)
- `Ctrl + X` (выйти)

### 5. Запустите скрипт развертывания

```bash
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

Скрипт автоматически:
- ✅ Установит зависимости
- ✅ Соберет frontend
- ✅ Соберет backend
- ✅ Применит миграции БД
- ✅ Запустит бота через PM2

### 6. Настройте автозапуск PM2

```bash
pm2 startup
```

Выполните команду, которую покажет PM2 (обычно что-то вроде):
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

### 7. Проверьте работу

```bash
# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs task-bot

# Должно быть сообщение "Bot started"
```

## Ручная настройка (если скрипты не работают)

### Установка Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Установка PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### Создание базы данных
```bash
sudo -u postgres psql
```

В консоли PostgreSQL:
```sql
CREATE DATABASE task_bot_db;
CREATE USER taskbot_user WITH PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE task_bot_db TO taskbot_user;
\q
```

### Установка зависимостей и сборка
```bash
npm install
cd web && npm install && npm run build && cd ..
npm run db:generate
npm run db:migrate
npm run build
```

### Установка и запуск PM2
```bash
npm install -g pm2
pm2 start dist/index.js --name task-bot
pm2 save
pm2 startup
```

## Настройка Mini App (опционально)

Если вы хотите использовать Mini App, вам нужно:

1. **Настроить домен и SSL:**
   - Настройте DNS для вашего домена
   - Установите Nginx и SSL сертификат (Let's Encrypt)

2. **Обновите WEB_APP_URL в .env:**
   ```env
   WEB_APP_URL=https://your-domain.com
   ```

3. **Настройте Mini App в BotFather:**
   - Откройте [@BotFather](https://t.me/BotFather)
   - Используйте `/newapp`
   - Укажите URL вашего Mini App

## Полезные команды

```bash
# PM2
pm2 status              # статус
pm2 logs task-bot       # логи
pm2 restart task-bot    # перезапуск
pm2 stop task-bot       # остановка

# Обновление проекта
git pull                # если используете git
npm install
cd web && npm install && npm run build && cd ..
npm run build
pm2 restart task-bot

# База данных
npm run db:studio       # открыть Prisma Studio
npm run db:migrate      # применить миграции

# Логи
pm2 logs task-bot --lines 100  # последние 100 строк
```

## Troubleshooting

### Бот не запускается
```bash
pm2 logs task-bot --lines 50
cat .env  # проверьте переменные
```

### Ошибка подключения к БД
```bash
systemctl status postgresql
sudo -u postgres psql -d task_bot_db -U taskbot_user
```

### Порт занят
```bash
lsof -i :3000
# или
netstat -tulpn | grep 3000
```

### PM2 не сохраняет процессы
```bash
pm2 save
pm2 startup
# Выполните команду, которую покажет PM2
```
