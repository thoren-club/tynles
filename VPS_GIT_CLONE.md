# Загрузка проекта на сервер через Git

## Предварительные условия

✅ Node.js установлен  
✅ PostgreSQL установлен  
✅ Git установлен (если нет: `apt install -y git`)

## Шаг 1: Подключение к серверу

```bash
ssh root@ваш_ip_адрес
```

## Шаг 2: Переход в рабочую директорию

```bash
cd /root
# или
cd /home/ваш_пользователь
```

## Шаг 3: Клонирование репозитория

```bash
git clone https://github.com/thoren_club/tynles.git
```

Или если хотите указать имя папки:
```bash
git clone https://github.com/thoren_club/tynles.git task-bot
```

После клонирования:
```bash
cd tynles  # или cd task-bot
```

## Шаг 4: Установка зависимостей

```bash
npm install
```

## Шаг 5: Создание .env файла

```bash
nano .env
```

Вставьте (замените на ваши данные):
```
BOT_TOKEN=ваш_токен_от_BotFather
DATABASE_URL=postgresql://taskbot_user:ваш_пароль@localhost:5432/task_bot_db
LOG_LEVEL=info
```

**Сохранение в nano:**
- `Ctrl + O` → `Enter` (сохранить)
- `Ctrl + X` (выйти)

## Шаг 6: Настройка базы данных

Если БД ещё не создана:
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE task_bot_db;
CREATE USER taskbot_user WITH PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE task_bot_db TO taskbot_user;
\q
```

## Шаг 7: Применение миграций

```bash
npm run db:generate
npm run db:migrate
```

## Шаг 8: Компиляция проекта

```bash
npm run build
```

## Шаг 9: Запуск через PM2

```bash
# Установка PM2 (если ещё не установлен)
npm install -g pm2

# Запуск бота
pm2 start dist/index.js --name task-bot

# Проверка
pm2 status
pm2 logs task-bot
```

## Шаг 10: Автозапуск

```bash
pm2 save
pm2 startup
# Выполните команду, которую покажет PM2
```

## Обновление проекта (когда делаете изменения)

На сервере:
```bash
cd /root/tynles  # путь к проекту
git pull
npm install
npm run build
npm run db:migrate  # если были изменения в схеме БД
pm2 restart task-bot
```

## Альтернатива: клонирование через SSH (если настроен SSH ключ)

Если вы добавили SSH ключ на GitHub:

```bash
git clone git@github.com:thoren_club/tynles.git
```

Тогда токен не нужен.
