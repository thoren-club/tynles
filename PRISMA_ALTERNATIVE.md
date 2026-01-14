# Альтернативные способы настройки БД

## Вариант 1: db:push (самый простой для начала)

Вместо миграций используйте `db:push` - он применит схему напрямую:

```bash
npm run db:generate
npm run db:push
```

**Важно:** `db:push` не создаёт файлы миграций, но для MVP это нормально.

## Вариант 2: Создать shadow database вручную

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE task_bot_db_shadow;
GRANT ALL PRIVILEGES ON DATABASE task_bot_db_shadow TO taskbot_user;
\q
```

Затем в `.env` добавьте:
```
PRISMA_SHADOW_DATABASE_URL=postgresql://taskbot_user:пароль@localhost:5432/task_bot_db_shadow
```

И снова:
```bash
npm run db:migrate
```

## Вариант 3: Использовать пользователя postgres

Временно можно использовать суперпользователя (только для разработки):

В `.env`:
```
DATABASE_URL=postgresql://postgres:пароль_postgres@localhost:5432/task_bot_db
```

Затем:
```bash
npm run db:migrate
```

**Внимание:** Не рекомендуется для production, но для начала можно.

## Вариант 4: Проверить права пользователя

Убедитесь, что пользователь имеет все нужные права:

```bash
sudo -u postgres psql
```

```sql
-- Проверить пользователя
\du taskbot_user

-- Дать все права
ALTER USER taskbot_user WITH CREATEDB CREATEROLE;

-- Проверить права на БД
\l task_bot_db
\q
```

## Рекомендация для новичка

Используйте **Вариант 1 (db:push)** - самый простой и быстрый способ начать работу.
