# Mini App Setup Guide

Этот проект теперь поддерживает Telegram Mini App с веб-интерфейсом!

## Структура проекта

- `src/` - Backend (бот + API сервер)
- `web/` - Frontend (React + Vite)

## Настройка

### 1. Установите зависимости

```bash
# Backend зависимости (уже установлены)
npm install

# Frontend зависимости
cd web
npm install
cd ..
```

### 2. Настройте переменные окружения

Добавьте в `.env`:

```env
BOT_TOKEN=your_bot_token
DATABASE_URL=your_database_url
WEB_APP_URL=https://your-domain.com  # URL вашего Mini App
PORT=3000  # Порт для веб-сервера (опционально)
```

### 3. Настройте Mini App в BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота
3. Используйте команду `/newapp`
4. Выберите вашего бота
5. Укажите название и описание приложения
6. Загрузите иконку (опционально)
7. Укажите URL вашего Mini App (например: `https://your-domain.com`)
8. Сохраните изменения

## Запуск

### Development режим

```bash
# Запустить бота и веб-сервер
npm run dev

# В отдельном терминале запустить frontend dev server
cd web
npm run dev
```

Frontend будет доступен на `http://localhost:5173` с проксированием API запросов на `http://localhost:3000`.

### Production режим

1. Соберите frontend:
```bash
cd web
npm run build
cd ..
```

2. Соберите backend:
```bash
npm run build
```

3. Запустите:
```bash
npm start
```

Веб-сервер автоматически запустится вместе с ботом и будет обслуживать статические файлы из `web/dist`.

## API Endpoints

Все API endpoints находятся под `/api`:

- `GET /api/auth/me` - Информация о текущем пользователе
- `GET /api/auth/spaces` - Список пространств пользователя
- `POST /api/auth/spaces/:spaceId/switch` - Переключить пространство
- `GET /api/spaces/current` - Текущее пространство
- `POST /api/spaces/create` - Создать пространство
- `GET /api/tasks` - Список задач
- `POST /api/tasks` - Создать задачу
- `DELETE /api/tasks/:taskId` - Удалить задачу
- `GET /api/goals` - Список целей
- `POST /api/goals` - Создать цель
- `DELETE /api/goals/:goalId` - Удалить цель
- `GET /api/stats/me` - Статистика пользователя
- `GET /api/stats/leaderboard` - Таблица лидеров
- `GET /api/members` - Список участников
- `POST /api/members/invites` - Создать приглашение

## Аутентификация

Mini App использует Telegram WebApp API для аутентификации. `initData` передается в заголовке `x-telegram-init-data` и автоматически проверяется на сервере.

## Особенности

- ✅ Современный React интерфейс
- ✅ Адаптивный дизайн для мобильных устройств
- ✅ Интеграция с Telegram WebApp API
- ✅ Поддержка тем Telegram
- ✅ Навигация через нижнее меню
- ✅ Все функции бота доступны через веб-интерфейс

## Troubleshooting

### Mini App не открывается

- Убедитесь, что `WEB_APP_URL` указан правильно
- Проверьте, что URL доступен по HTTPS
- Убедитесь, что Mini App настроен в BotFather

### Ошибки аутентификации

- Убедитесь, что приложение открывается из Telegram
- Проверьте, что `BOT_TOKEN` правильный
- Убедитесь, что веб-сервер запущен

### Frontend не загружается

- Проверьте, что `web/dist` существует после сборки
- Убедитесь, что веб-сервер настроен на раздачу статических файлов
- Проверьте логи сервера на наличие ошибок
