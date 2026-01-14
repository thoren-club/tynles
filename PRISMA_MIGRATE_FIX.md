# Исправление ошибки shadow database

## Проблема

Prisma Migrate пытается создать временную "shadow database" для валидации миграций, но у пользователя БД нет прав на создание баз данных.

## Решение 1: Дать права на создание БД (рекомендуется)

На сервере:

```bash
sudo -u postgres psql
```

В консоли PostgreSQL:

```sql
-- Дать права на создание баз данных
ALTER USER taskbot_user CREATEDB;

-- Проверить права
\du taskbot_user

-- Выход
\q
```

Затем снова выполните:
```bash
npm run db:migrate
```

## Решение 2: Использовать существующую shadow БД

Если не хотите давать права CREATEDB, можно создать shadow БД вручную:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE task_bot_db_shadow;
GRANT ALL PRIVILEGES ON DATABASE task_bot_db_shadow TO taskbot_user;
\q
```

Затем установите переменную окружения:
```bash
export PRISMA_SHADOW_DATABASE_URL="postgresql://taskbot_user:пароль@localhost:5432/task_bot_db_shadow"
```

Или добавьте в `.env`:
```
PRISMA_SHADOW_DATABASE_URL=postgresql://taskbot_user:пароль@localhost:5432/task_bot_db_shadow
```

## Решение 3: Использовать db push (для разработки)

Если вы в процессе разработки и не нужна история миграций:

```bash
npm run db:push
```

**Внимание:** `db push` не создаёт файлы миграций и не рекомендуется для production.

## Решение 4: Использовать пользователя postgres (только для разработки)

Можно временно использовать суперпользователя postgres (НЕ рекомендуется для production):

В `.env` измените:
```
DATABASE_URL=postgresql://postgres:пароль_postgres@localhost:5432/task_bot_db
```

## Рекомендация

Для production используйте **Решение 1** - дать права CREATEDB пользователю. Это безопасно, так как пользователь всё равно работает только со своими БД.
