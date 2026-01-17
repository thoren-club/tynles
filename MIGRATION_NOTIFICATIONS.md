# Миграция для добавления системы напоминаний и пинков

## Описание изменений

Добавлены таблицы для хранения информации о пинках и настройках уведомлений пользователей.

## Изменения в схеме

### Таблица `pokes`
```prisma
model Poke {
  id          BigInt   @id @default(autoincrement())
  fromUserId  BigInt   @map("from_user_id")
  toUserId    BigInt   @map("to_user_id")
  spaceId     BigInt   @map("space_id")
  createdAt   DateTime @default(now()) @map("created_at")
  ...
}
```

### Таблица `user_notification_settings`
```prisma
model UserNotificationSettings {
  userId      BigInt   @id @map("user_id")
  taskRemindersEnabled Boolean @default(true) @map("task_reminders_enabled")
  reminderHoursBefore Int @default(2) @map("reminder_hours_before")
  pokeEnabled Boolean @default(true) @map("poke_enabled")
  ...
}
```

## Миграция базы данных

Выполните миграцию Prisma:

```bash
npx prisma migrate dev --name add_notifications_and_pokes
```

Или создайте миграцию вручную:

```sql
-- Таблица для хранения пинков
CREATE TABLE pokes (
  id BIGSERIAL PRIMARY KEY,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  space_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_poke_from_user FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_poke_to_user FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_poke_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_poke_from_to_space_date ON pokes(from_user_id, to_user_id, space_id, created_at);
CREATE INDEX idx_poke_to_date ON pokes(to_user_id, created_at);

-- Таблица для настроек уведомлений
CREATE TABLE user_notification_settings (
  user_id BIGINT PRIMARY KEY,
  task_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_hours_before INTEGER NOT NULL DEFAULT 2,
  poke_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Что было реализовано:

### Backend:

1. **Utils (`src/utils/telegram.ts`)**:
   - `sendTelegramMessage()` - отправка сообщений через Telegram Bot API
   - `generateTaskReminderMessage()` - генерация эмоциональных текстов для напоминаний

2. **Utils (`src/utils/reminders.ts`)**:
   - `sendTaskReminders()` - функция для отправки напоминаний о задачах (для cron job)

3. **Routes (`src/web/api/routes/stats.ts`)**:
   - `POST /stats/leaderboard/:userId/poke` - endpoint для пинка игрока
   - Добавлена информация о статусе пинка в ответ лидерборда (`canPoke`, `isPokedToday`)

4. **Routes (`src/web/api/routes/notifications.ts`)**:
   - `GET /notifications/settings` - получение настроек уведомлений
   - `PUT /notifications/settings` - обновление настроек уведомлений
   - `POST /notifications/reminders/send` - ручной запуск отправки напоминаний (для тестирования)

### Frontend:

1. **Leaderboard (`web/src/pages/Leaderboard.tsx`)**:
   - Добавлена кнопка "Пнуть" для каждого игрока в локальном лидерборде
   - Отображение статуса пинка (можно/нельзя/уже пнули)
   - Компонент `LeaderboardItem` с поддержкой пинков

2. **Settings (`web/src/pages/Settings.tsx`)**:
   - Настройки напоминаний о задачах (включение/выключение)
   - Настройка времени напоминаний (1, 2, 6, 12, 24 часа до дедлайна)
   - Настройка разрешения на пинки (можно/нельзя пнуть этого пользователя)

3. **API (`web/src/api/index.ts`)**:
   - `pokeUser(userId)` - метод для пинка игрока
   - `getNotificationSettings()` - получение настроек
   - `updateNotificationSettings(settings)` - обновление настроек

## Настройка Cron Job:

Для автоматической отправки напоминаний нужно настроить cron job, который будет вызывать функцию `sendTaskReminders()` из `src/utils/reminders.ts`.

Пример настройки (каждый час):
```javascript
import { sendTaskReminders } from './utils/reminders';
import cron from 'node-cron';

// Запускаем каждые 60 минут
cron.schedule('0 * * * *', async () => {
  try {
    await sendTaskReminders();
  } catch (error) {
    logger.error({ error }, 'Cron job failed to send reminders');
  }
});
```

Или можно использовать endpoint `POST /notifications/reminders/send` с внешним cron сервисом.

## Важные заметки:

- **Пинки**: Один пользователь может пнуть другого только раз в день (сброс в полночь)
- **Напоминания**: Отправляются только для задач с дедлайном, которые скоро истекают или уже просрочены
- **Настройки**: По умолчанию все уведомления включены
- **Эмоциональные тексты**: Генерируются случайным образом из предопределенного списка
