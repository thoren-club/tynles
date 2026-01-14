# Исправление прав доступа к схеме public

## Проблема

Ошибка `permission denied for schema public` означает, что у пользователя нет прав на работу со схемой public.

## Решение

Подключитесь к PostgreSQL как суперпользователь:

```bash
sudo -u postgres psql
```

Выполните:

```sql
-- Подключиться к базе данных
\c task_bot_db

-- Дать все права на схему public пользователю
GRANT ALL ON SCHEMA public TO taskbot_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskbot_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO taskbot_user;

-- Дать права на создание объектов в схеме
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO taskbot_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO taskbot_user;

-- Выход
\q
```

## Альтернатива: Пересоздать пользователя с правильными правами

Если не помогло, можно пересоздать пользователя:

```bash
sudo -u postgres psql
```

```sql
-- Удалить пользователя (если нужно)
DROP USER IF EXISTS taskbot_user;

-- Создать пользователя с правами
CREATE USER taskbot_user WITH PASSWORD 'ваш_пароль' CREATEDB;

-- Подключиться к БД
\c task_bot_db

-- Дать все права
GRANT ALL ON SCHEMA public TO taskbot_user;
GRANT ALL PRIVILEGES ON DATABASE task_bot_db TO taskbot_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO taskbot_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO taskbot_user;

\q
```

## После исправления прав

Выполните снова:

```bash
npm run db:push
```

## Полная команда для копирования (быстрый вариант)

```bash
sudo -u postgres psql -d task_bot_db -c "GRANT ALL ON SCHEMA public TO taskbot_user; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskbot_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO taskbot_user; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO taskbot_user; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO taskbot_user;"
```
