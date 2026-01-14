# Исправление ошибки "Repository not found"

## Возможные причины

### 1. Неправильный URL репозитория

Проверьте правильность URL:
```bash
git remote -v
```

URL должен быть:
- HTTPS: `https://github.com/ваш_username/название_репо.git`
- SSH: `git@github.com:ваш_username/название_репо.git`

### 2. Проблема с авторизацией (самая частая!)

GitHub больше не принимает пароли. Нужен **Personal Access Token**.

#### Создание токена:

1. Зайдите на GitHub → Settings (ваш профиль → Settings)
2. Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Название: `task-bot-token`
5. Выберите scope: **repo** (полный доступ к репозиториям)
6. Generate token
7. **СКОПИРУЙТЕ ТОКЕН СРАЗУ!** (он показывается только один раз)

#### Использование токена:

При `git push` будет запрос пароля - **введите токен вместо пароля**.

Или используйте SSH вместо HTTPS (тогда токен не нужен).

### 3. Исправление URL (если неправильный)

```bash
# Удалить старый remote
git remote remove origin

# Добавить правильный
git remote add origin https://github.com/ваш_username/название_репо.git

# Проверить
git remote -v
```

### 4. Проверка существования репозитория

Убедитесь, что:
- Репозиторий существует на GitHub
- Название репозитория правильное (с учётом регистра)
- Вы авторизованы в браузере GitHub

### 5. Использование SSH (альтернатива)

SSH проще для постоянного использования:

```bash
# Генерация SSH ключа (если нет)
ssh-keygen -t ed25519 -C "ваш_email@example.com"
# Нажимайте Enter на все вопросы

# Показать публичный ключ
cat ~/.ssh/id_ed25519.pub
```

Затем:
1. Скопируйте вывод команды выше
2. GitHub → Settings → SSH and GPG keys → New SSH key
3. Вставьте ключ
4. Измените remote на SSH:
   ```bash
   git remote set-url origin git@github.com:ваш_username/название_репо.git
   ```

### 6. Проверка доступа

```bash
# Тест подключения (для HTTPS)
git ls-remote origin

# Если используете SSH
ssh -T git@github.com
```

## Пошаговая диагностика

1. Проверьте URL:
   ```bash
   git remote -v
   ```

2. Убедитесь, что репозиторий существует:
   - Откройте в браузере: `https://github.com/ваш_username/название_репо`
   - Должен открыться репозиторий

3. Попробуйте клонировать заново (для проверки):
   ```bash
   cd /tmp
   git clone https://github.com/ваш_username/название_репо.git
   ```
   Если клонирование работает - проблема в настройках remote

4. Переподключите remote:
   ```bash
   git remote remove origin
   git remote add origin https://github.com/ваш_username/название_репо.git
   git push -u origin main
   ```
