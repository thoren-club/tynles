# Отправка кода на GitHub с токеном

## После создания Personal Access Token:

1. **Добавьте файлы (если ещё не добавлены):**
   ```bash
   git add .
   ```

2. **Сделайте коммит (если ещё не сделали):**
   ```bash
   git commit -m "Initial commit: Telegram task bot"
   ```

3. **Проверьте ветку:**
   ```bash
   git branch
   ```
   Если ветка называется `master`, переименуйте в `main`:
   ```bash
   git branch -M main
   ```

4. **Отправьте код:**
   ```bash
   git push -u origin main
   ```

5. **При запросе авторизации:**
   - Username: `thoren_club` (ваш GitHub username)
   - Password: **вставьте ваш Personal Access Token** (НЕ пароль от GitHub!)

## Если токен не работает:

Проверьте:
- Токен скопирован полностью (начинается с `ghp_`)
- В токене включен scope `repo`
- Токен не истёк
- Репозиторий существует: https://github.com/thoren_club/tynles

## Альтернатива: использование GitHub CLI

Если установлен GitHub CLI:
```bash
gh auth login
```

Затем просто:
```bash
git push
```
