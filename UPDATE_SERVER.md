# Обновление проекта на сервере

## Шаг 1: Закоммитить изменения локально

На вашем компьютере:

```bash
git add .
git commit -m "Fix Prisma schema: Reward composite key and TelegramUser relation"
git push
```

## Шаг 2: На сервере обновить код

Подключитесь к серверу:
```bash
ssh root@ваш_ip
```

Перейдите в папку проекта:
```bash
cd /root/tynles  # или путь, куда клонировали
```

Обновите код:
```bash
git pull
```

## Шаг 3: Обновить зависимости (если нужно)

```bash
npm install
```

## Шаг 4: Применить изменения в базе данных

Если были изменения в схеме Prisma:
```bash
npm run db:generate
npm run db:migrate
```

## Шаг 5: Перекомпилировать проект

```bash
npm run build
```

## Шаг 6: Перезапустить бота

```bash
pm2 restart task-bot
```

Или если бот ещё не запущен:
```bash
pm2 start dist/index.js --name task-bot
```

## Шаг 7: Проверить логи

```bash
pm2 logs task-bot
```

## Полная последовательность команд на сервере:

```bash
cd /root/tynles
git pull
npm install
npm run db:generate
npm run db:migrate
npm run build
pm2 restart task-bot
pm2 logs task-bot
```
