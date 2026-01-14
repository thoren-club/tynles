# Telegram Task & Goal Management Bot

Telegram-бот для управления задачами и целями с геймификацией (XP, уровни, награды).

## Функциональность

### Пространства (Spaces)
- Создание и управление пространствами
- Переключение между пространствами
- Система ролей: Admin, Editor, Viewer

### Задачи (Tasks)
- Создание задач с сложностью (1-5)
- Периодичность: none, daily, weekly, monthly
- Напоминания
- Начисление XP за выполнение

### Цели (Goals)
- Создание целей с сложностью (1-5)
- Начисление XP за выполнение

### Геймификация
- Система уровней и XP
- Таблица лидеров
- Награды за уровни (только для Admin)

### Приглашения
- Создание invite кодов
- Присоединение по коду

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения:
```bash
cp .env.example .env
# Отредактируйте .env и добавьте BOT_TOKEN и DATABASE_URL
```

3. Настройте базу данных:
```bash
npm run db:generate
npm run db:migrate
```

4. Запустите бота:
```bash
npm run dev  # для разработки
# или
npm run build
npm start
```

## Команды

### Пространства
- `/space_create <name>` - создать пространство
- `/space_list` - список пространств
- `/space_switch <id>` - переключиться на пространство
- `/space_info` - информация о текущем пространстве

### Задачи
- `/task_add` - создать задачу (wizard)
- `/task_list [today|upcoming|all]` - список задач
- `/task_done <id>` - отметить задачу выполненной
- `/task_pause <id>` - приостановить задачу
- `/task_resume <id>` - возобновить задачу
- `/task_delete <id>` - удалить задачу

### Цели
- `/goal_add` - создать цель (wizard)
- `/goal_list` - список целей
- `/goal_done <id>` - отметить цель выполненной
- `/goal_delete <id>` - удалить цель

### Уровни и XP
- `/me` - ваша статистика
- `/leaderboard` - таблица лидеров

### Приглашения и участники
- `/invite_create <role>` - создать invite код (Admin only)
- `/invite_use <code>` - использовать invite код
- `/members` - список участников
- `/member_role <username> <role>` - изменить роль (Admin only)
- `/member_kick <username>` - удалить участника (Admin only)

### Награды
- `/reward_set <level> <text>` - установить награду (Admin only)
- `/reward_list` - список наград
- `/reward_delete <level>` - удалить награду (Admin only)

## Права доступа

- **Viewer**: только просмотр (list/info команды)
- **Editor**: всё по задачам/целям + done
- **Admin**: всё + members/invites + rewards + настройки

## Технологии

- TypeScript
- Node.js
- grammY (Telegram Bot Framework)
- PostgreSQL
- Prisma ORM
- pino (логирование)

## Архитектура

Проект организован модульно:
- `src/commands/` - команды бота
- `src/middleware/` - middleware (авторизация, проверка прав)
- `src/utils/` - утилиты (XP, wizard, scheduler)
- `prisma/` - схема базы данных

## Разработка

Для разработки используется `tsx watch`:
```bash
npm run dev
```

Для просмотра базы данных:
```bash
npm run db:studio
```