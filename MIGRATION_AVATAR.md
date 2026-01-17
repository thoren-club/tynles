# Миграция для добавления аватарок пользователей

## Описание изменений

Добавлено поле `photoUrl` в таблицу `users` для хранения URL аватарок пользователей из Telegram.

## Изменения в схеме

```prisma
model TelegramUser {
  ...
  photoUrl   String?  @map("photo_url") @db.VarChar(500)
  ...
}
```

## Миграция базы данных

Выполните миграцию Prisma:

```bash
npx prisma migrate dev --name add_user_photo_url
```

Или создайте миграцию вручную:

```sql
ALTER TABLE users ADD COLUMN photo_url VARCHAR(500) NULL;
```

## Что было реализовано:

1. **Backend (`src/web/api/middleware/auth.ts`)**:
   - Извлечение `photo_url` из Telegram WebApp initData
   - Сохранение `photoUrl` при создании нового пользователя
   - Обновление `photoUrl` при обновлении данных пользователя

2. **Backend (`src/web/api/routes/stats.ts`)**:
   - Возврат `photoUrl` в глобальном лидерборде
   - Возврат `photoUrl` в локальном лидерборде (лидерборд пространства)

3. **Frontend (`web/src/pages/Leaderboard.tsx`)**:
   - Отображение аватарок пользователей в лидерборде
   - Fallback на placeholder с первой буквой имени, если фото недоступно
   - Обработка ошибок загрузки изображений

4. **Frontend (`web/src/pages/Leaderboard.css`)**:
   - Стили для аватарок (круглые, 40x40px)
   - Стили для placeholder-аватарок

## Важные заметки:

- `photo_url` может отсутствовать в Telegram initData в зависимости от настроек приватности пользователя
- URL фото обновляется при каждом запросе аутентификации
- Если фото не загрузилось, отображается placeholder с первой буквой имени
