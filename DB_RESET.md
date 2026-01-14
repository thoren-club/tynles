# Пересоздание базы данных

## На сервере (Ubuntu)

### Полное пересоздание БД

```bash
# Подключение к PostgreSQL
sudo -u postgres psql
```

В консоли PostgreSQL:
```sql
-- Удаление базы данных (если существует)
DROP DATABASE IF EXISTS task_bot_db;

-- Удаление пользователя (если существует)
DROP USER IF EXISTS taskbot_user;

-- Создание новой базы данных
CREATE DATABASE task_bot_db;

-- Создание нового пользователя с паролем (замените 'ваш_пароль' на свой)
CREATE USER taskbot_user WITH PASSWORD 'ваш_надежный_пароль';

-- Выдача прав
GRANT ALL PRIVILEGES ON DATABASE task_bot_db TO taskbot_user;

-- Выход
\q
```

### Применение миграций заново

```bash
# Переход в папку проекта
cd /root/task-bot  # или ваш путь

# Применение миграций
npm run db:migrate
```

Если есть проблемы с миграциями, можно сбросить их:
```bash
# Удалить все миграции из БД (осторожно!)
npm run db:migrate reset
# Или вручную:
npx prisma migrate reset
```

### Альтернативный вариант: через SQL

Если нужно просто очистить все таблицы:

```bash
sudo -u postgres psql -d task_bot_db
```

```sql
-- Очистка всех таблиц (осторожно!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO taskbot_user;
\q
```

Затем применить миграции:
```bash
npm run db:migrate
```
