# Установка PM2

## Установка PM2 глобально

```bash
npm install -g pm2
```

## Проверка установки

```bash
pm2 --version
```

## Если ошибка прав доступа (EACCES)

Если видите ошибку типа `EACCES: permission denied`, используйте sudo:

```bash
sudo npm install -g pm2
```

Или настройте npm для работы без sudo (рекомендуется):

```bash
# Создать директорию для глобальных пакетов
mkdir ~/.npm-global

# Настроить npm
npm config set prefix '~/.npm-global'

# Добавить в PATH (добавьте в ~/.bashrc или ~/.profile)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Теперь можно устанавливать без sudo
npm install -g pm2
```

## После установки

Проверьте:
```bash
pm2 --version
```

Должна показаться версия, например: `5.3.0`

## Использование PM2

После установки можно использовать все команды PM2:
```bash
pm2 start dist/index.js --name task-bot
pm2 status
pm2 logs task-bot
pm2 save
pm2 startup
```
