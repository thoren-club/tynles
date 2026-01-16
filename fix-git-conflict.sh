#!/bin/bash

# Скрипт для разрешения конфликта Git
# Используйте если git pull/merge выдает ошибку о локальных изменениях

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info "Разрешение конфликта Git..."

# Вариант 1: Сохранить локальные изменения и обновить
read -p "Сохранить локальные изменения и обновить? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Сохранение локальных изменений..."
    git stash
    
    info "Обновление из репозитория..."
    git pull
    
    info "Применение сохраненных изменений..."
    git stash pop
    
    info "✅ Конфликт разрешен!"
    echo ""
    warn "Если есть конфликты, разрешите их вручную:"
    echo "  git status"
    echo "  # Отредактируйте файлы с конфликтами"
    echo "  git add ."
    echo "  git commit -m 'Resolve conflicts'"
fi

# Вариант 2: Принять локальные изменения (перезаписать удаленные)
read -p "Или принять локальные изменения (перезаписать удаленные)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    warn "Принятие локальных изменений..."
    git checkout --ours setup-domain.sh
    git add setup-domain.sh
    git commit -m "Keep local setup-domain.sh changes"
    
    info "Обновление из репозитория..."
    git pull --no-edit || git pull --rebase
    
    info "✅ Готово!"
fi
