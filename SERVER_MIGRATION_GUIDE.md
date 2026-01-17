# Инструкция по применению миграции на сервере

## Проблема
При выполнении `git pull` на сервере возник конфликт с файлом `prisma/schema.prisma`, так как в нем есть новые модели (`Poke` и `UserNotificationSettings`) и поле `photoUrl`.

## Решение

### Вариант 1: Если изменения еще не применены (рекомендуется)

1. **Сохраните текущие изменения (если есть):**
```bash
git stash
# или
git commit -am "Local changes before pull"
```

2. **Получите последние изменения:**
```bash
git pull origin main
```

3. **Создайте и примените миграцию:**
```bash
npx prisma migrate dev --name add_notifications_and_pokes
npx prisma generate
```

4. **Если были сохранены изменения через stash, примените их обратно:**
```bash
git stash pop
```

### Вариант 2: Если конфликт уже произошел

1. **Посмотрите статус:**
```bash
git status
```

2. **Если файл `prisma/schema.prisma` в конфликте, разрешите его:**
   - Откройте файл и найдите маркеры конфликта (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Оставьте версию с новыми моделями (`Poke` и `UserNotificationSettings`)
   - Удалите маркеры конфликта

3. **После разрешения конфликта:**
```bash
git add prisma/schema.prisma
git commit -m "Merge remote changes with notifications feature"
```

4. **Примените миграцию:**
```bash
npx prisma migrate deploy
npx prisma generate
```

### Вариант 3: Полный сброс и применение миграций (осторожно!)

⚠️ **Внимание:** Этот метод удалит все несохраненные изменения в схеме!

```bash
# Сбросить изменения в schema.prisma
git checkout -- prisma/schema.prisma

# Получить последние изменения
git pull origin main

# Применить миграцию
npx prisma migrate deploy
npx prisma generate
```

## Проверка после миграции

Убедитесь, что таблицы созданы:

```bash
# Подключитесь к базе данных и выполните:
psql $DATABASE_URL -c "\dt" | grep -E "pokes|user_notification_settings|users"
```

Должны быть видны:
- `pokes`
- `user_notification_settings`
- `users` (с полем `photo_url`)

## Важные заметки:

1. **`prisma migrate deploy`** используется для применения миграций на сервере (production), а не `prisma migrate dev`
2. **`prisma generate`** нужно запустить после миграции, чтобы обновить Prisma Client
3. Если база данных уже содержит данные, миграция не удалит их (только добавит новые таблицы/поля)
4. Убедитесь, что у вас есть резервная копия базы данных перед применением миграций на production!

## Если миграция уже была применена ранее:

Если на сервере уже есть таблицы `pokes` и `user_notification_settings`, но схема Prisma не синхронизирована:

```bash
# Синхронизируйте схему с базой данных (осторожно - может перезаписать схему!)
npx prisma db pull

# Или просто обновите Prisma Client:
npx prisma generate
```
