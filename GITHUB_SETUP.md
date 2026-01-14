# Выгрузка проекта на GitHub

## ⚠️ ВАЖНО: Безопасность

**НЕ ЗАГРУЖАЙТЕ файл `.env` в GitHub!** В нём содержится ваш BOT_TOKEN и пароли.

Убедитесь, что `.env` находится в `.gitignore` (уже должен быть там).

## Шаг 1: Проверка .gitignore

Убедитесь, что файл `.gitignore` содержит:
```
node_modules/
dist/
.env
*.log
.DS_Store
```

## Шаг 2: Инициализация Git (если ещё не сделано)

```bash
git init
```

## Шаг 3: Проверка, что .env не будет добавлен

```bash
git status
```

Убедитесь, что `.env` НЕ отображается в списке файлов для добавления.

Если `.env` всё же показывается:
```bash
# Добавьте в .gitignore (если там нет)
echo ".env" >> .gitignore

# Удалите из индекса (если уже добавлен)
git rm --cached .env
```

## Шаг 4: Создание .env.example (шаблон без реальных данных)

Создайте файл `.env.example`:
```
BOT_TOKEN=your_telegram_bot_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/task_bot_db
LOG_LEVEL=info
```

Этот файл безопасно хранить в Git - он содержит только примеры.

## Шаг 5: Добавление файлов

```bash
# Добавление всех файлов (кроме тех, что в .gitignore)
git add .

# Проверка, что добавлено
git status
```

**Убедитесь, что `.env` НЕ в списке!**

## Шаг 6: Первый коммит

```bash
git commit -m "Initial commit: Telegram task bot with gamification"
```

## Шаг 7: Создание репозитория на GitHub

1. Зайдите на https://github.com
2. Нажмите "+" → "New repository"
3. Введите имя (например: `telegram-task-bot`)
4. НЕ добавляйте README, .gitignore, license (у нас уже есть)
5. Нажмите "Create repository"

## Шаг 8: Подключение к GitHub и отправка

GitHub покажет команды. Обычно это:

```bash
# Добавление удалённого репозитория (замените на ваш URL)
git remote add origin https://github.com/ваш_username/telegram-task-bot.git

# Переименование ветки в main (если нужно)
git branch -M main

# Отправка кода
git push -u origin main
```

Если GitHub просит авторизацию:
- Используйте Personal Access Token (не пароль)
- Создайте токен: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- При создании выберите scope `repo`

## Шаг 9: Проверка

Откройте ваш репозиторий на GitHub и убедитесь:
- ✅ Все файлы загружены
- ✅ Файл `.env` НЕ виден
- ✅ Файл `.env.example` есть

## Если случайно загрузили .env в GitHub

**СРОЧНО:**

1. Удалите токен в @BotFather (отзовите старый токен)
2. Создайте новый токен
3. Обновите .env на сервере
4. Удалите .env из истории Git:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env file"
   git push
   ```
5. Удалите репозиторий и создайте новый (если токен был виден другим)

## Дальнейшая работа

После первого коммита, для обновления:

```bash
git add .
git commit -m "Описание изменений"
git push
```
