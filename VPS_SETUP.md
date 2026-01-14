# Пошаговая настройка VPS Ubuntu с нуля

## Шаг 1: Подключение к серверу

Если вы используете Windows, установите PuTTY или используйте встроенный SSH в Windows 10/11:

```bash
ssh root@ваш_ip_адрес
```

Или если используется другой пользователь:
```bash
ssh ваш_пользователь@ваш_ip_адрес
```

При первом подключении подтвердите подключение (введите `yes`).

## Шаг 2: Обновление системы

```bash
apt update
apt upgrade -y
```

## Шаг 3: Установка Node.js 20

```bash
# Установка curl (если его нет)
apt install -y curl

# Добавление репозитория Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Установка Node.js
apt install -y nodejs

# Проверка версии
node --version  # должно быть v20.x.x
npm --version
```

## Шаг 4: Установка PostgreSQL

```bash
# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Запуск и автозапуск PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Проверка статуса
systemctl status postgresql
```

## Шаг 5: Настройка базы данных

```bash
# Переключение на пользователя postgres
sudo -u postgres psql
```

В консоли PostgreSQL выполните:
```sql
-- Создание базы данных
CREATE DATABASE task_bot_db;

-- Создание пользователя и установка пароля (замените 'ваш_пароль' на свой)
CREATE USER taskbot_user WITH PASSWORD 'ваш_надежный_пароль';

-- Выдача прав
GRANT ALL PRIVILEGES ON DATABASE task_bot_db TO taskbot_user;

-- Выход
\q
```

**ВАЖНО:** Запомните пароль! Он понадобится для DATABASE_URL.

## Шаг 6: Загрузка проекта на сервер

### Вариант A: Через Git (если проект в репозитории)

```bash
# Установка Git (если нет)
apt install -y git

# Клонирование репозитория
git clone ваш_repo_url
cd название_папки_проекта
```

### Вариант B: Через SFTP (FileZilla, WinSCP и т.д.)

1. Установите FileZilla (https://filezilla-project.org/)
2. Подключитесь к серверу через SFTP:
   - Хост: ваш_ip_адрес
   - Пользователь: root (или ваш_пользователь)
   - Пароль: ваш_пароль
   - Порт: 22
3. Загрузите все файлы проекта в папку (например, `/root/task-bot`)

### Вариант C: Через SCP (из Windows PowerShell)

На вашем компьютере:
```powershell
scp -r F:\Unnamed\* root@ваш_ip:/root/task-bot/
```

## Шаг 7: Установка зависимостей проекта

```bash
# Переход в папку проекта
cd /root/task-bot  # или куда вы загрузили проект

# Установка зависимостей
npm install
```

## Шаг 8: Создание .env файла

```bash
# Создание .env файла
nano .env
```

В редакторе nano вставьте:
```
BOT_TOKEN=ваш_токен_от_BotFather
DATABASE_URL=postgresql://taskbot_user:ваш_пароль@localhost:5432/task_bot_db
LOG_LEVEL=info
```

**Замените:**
- `ваш_токен_от_BotFather` - токен, который вы получили от @BotFather
- `ваш_пароль` - пароль, который вы задали для пользователя taskbot_user

**Сохранение в nano:**
- Нажмите `Ctrl + O` (сохранить)
- Нажмите `Enter` (подтвердить имя файла)
- Нажмите `Ctrl + X` (выйти)

## Шаг 9: Генерация Prisma клиента и миграции

```bash
# Генерация Prisma клиента
npm run db:generate

# Создание таблиц в базе данных
npm run db:migrate
```

Если всё успешно, вы увидите сообщение о создании миграции.

## Шаг 10: Компиляция проекта

```bash
npm run build
```

## Шаг 11: Установка PM2 (менеджер процессов)

```bash
npm install -g pm2
```

## Шаг 12: Запуск бота

```bash
# Запуск бота
pm2 start dist/index.js --name task-bot

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs task-bot
```

## Шаг 13: Автозапуск при перезагрузке сервера

```bash
# Сохранение текущего списка процессов
pm2 save

# Настройка автозапуска (выполните команду, которую покажет PM2)
pm2 startup
```

PM2 покажет команду вида:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ваш_пользователь --hp /home/ваш_пользователь
```

Скопируйте и выполните эту команду.

## Шаг 14: Проверка работы

1. Проверьте логи:
   ```bash
   pm2 logs task-bot
   ```

2. Должно быть сообщение "Bot started"

3. Откройте Telegram, найдите вашего бота

4. Отправьте `/start`

5. Бот должен ответить!

## Полезные команды PM2

```bash
pm2 status              # статус всех процессов
pm2 logs task-bot       # просмотр логов
pm2 restart task-bot    # перезапуск
pm2 stop task-bot       # остановка
pm2 delete task-bot     # удаление из списка
```

## Обновление бота (после изменений)

```bash
# Если используете git:
git pull

# Обновление зависимостей
npm install

# Компиляция
npm run build

# Если были изменения в схеме БД:
npm run db:migrate

# Перезапуск
pm2 restart task-bot
```

## Настройка firewall (опционально, но рекомендуется)

```bash
# Разрешить SSH
ufw allow 22/tcp

# Включить firewall
ufw enable

# Проверка статуса
ufw status
```

## Возможные проблемы

### Ошибка "EACCES" при npm install -g pm2
```bash
sudo npm install -g pm2
```

### Бот не запускается
```bash
# Проверьте логи
pm2 logs task-bot --lines 50

# Проверьте .env файл
cat .env

# Проверьте подключение к БД
sudo -u postgres psql -d task_bot_db -U taskbot_user
```

### База данных не подключается
- Проверьте пароль в DATABASE_URL
- Убедитесь, что PostgreSQL запущен: `systemctl status postgresql`
- Проверьте права пользователя в PostgreSQL
