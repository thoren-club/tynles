# Инструкция по сборке веба и запуску через PM2

## Быстрая сборка и запуск

### Вариант 1: Использовать готовый скрипт (рекомендуется)

```bash
# На сервере в папке проекта
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

Скрипт автоматически:
- ✅ Установит зависимости backend и frontend
- ✅ Соберет frontend (React приложение)
- ✅ Соберет backend (TypeScript → JavaScript)
- ✅ Запустит бота через PM2 (веб-сервер запустится автоматически)

### Вариант 2: Ручная сборка

```bash
# 1. Установка зависимостей backend
npm install

# 2. Установка зависимостей frontend
cd web
npm install
cd ..

# 3. Генерация Prisma клиента
npm run db:generate

# 4. Сборка frontend
cd web
npm run build
cd ..

# 5. Сборка backend
npm run build

# 6. Остановка старого процесса (если есть)
pm2 stop task-bot || true
pm2 delete task-bot || true

# 7. Запуск через PM2
pm2 start dist/index.js --name task-bot

# 8. Сохранение конфигурации
pm2 save
```

## Проверка работы

```bash
# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs task-bot

# Проверка веб-сервера (должен быть на порту 3000)
curl http://localhost:3000/api/auth/me

# Или проверьте в браузере (если есть доступ)
# http://ваш_сервер:3000
```

## Структура после сборки

После успешной сборки должны появиться:
- `web/dist/` - собранный frontend (HTML, CSS, JS)
- `dist/` - собранный backend (JavaScript файлы)
- `dist/index.js` - главный файл бота и веб-сервера

## Важные моменты

1. **Веб-сервер запускается автоматически** вместе с ботом (если `BOT_ONLY !== 'true'` в .env)
2. **Frontend должен быть собран** перед запуском, иначе веб-сервер не сможет отдавать статические файлы
3. **Порт 3000** должен быть открыт в firewall (если используете)

## Troubleshooting

### Ошибка при сборке frontend

```bash
cd web
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Веб-сервер не запускается

Проверьте логи:
```bash
pm2 logs task-bot --lines 100
```

Убедитесь, что в .env нет `BOT_ONLY=true`

### Порт 3000 занят

```bash
# Проверить, что использует порт
lsof -i :3000
# или
netstat -tulpn | grep 3000

# Остановить процесс или изменить PORT в .env
```

### Frontend не загружается

Убедитесь, что:
1. `web/dist` существует и содержит файлы
2. Веб-сервер запущен (`pm2 status`)
3. Порт открыт в firewall
