import { InlineKeyboard } from 'grammy';
import { Language } from '../i18n';

export function getMainMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '📁 Пространства' : '📁 Spaces', 'menu:spaces')
    .text(lang === 'ru' ? '✅ Задачи' : '✅ Tasks', 'menu:tasks').row()
    .text(lang === 'ru' ? '🎯 Цели' : '🎯 Goals', 'menu:goals')
    .text(lang === 'ru' ? '📊 Статистика' : '📊 Stats', 'menu:stats').row()
    .text(lang === 'ru' ? '👥 Участники' : '👥 Members', 'menu:members')
    .text(lang === 'ru' ? '⚙️ Настройки' : '⚙️ Settings', 'menu:settings').row()
    .text(lang === 'ru' ? '❓ Помощь' : '❓ Help', 'menu:help');
}

export function getSpacesMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '➕ Создать' : '➕ Create', 'space:create')
    .text(lang === 'ru' ? '📋 Список' : '📋 List', 'space:list').row()
    .text(lang === 'ru' ? 'ℹ️ Инфо' : 'ℹ️ Info', 'space:info')
    .text(lang === 'ru' ? '🔄 Переключить' : '🔄 Switch', 'space:switch').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}

export function getTasksMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '➕ Добавить' : '➕ Add', 'task:add')
    .text(lang === 'ru' ? '📋 Список' : '📋 List', 'task:list').row()
    .text(lang === 'ru' ? '📅 Сегодня' : '📅 Today', 'task:today')
    .text(lang === 'ru' ? '⏭️ Предстоящие' : '⏭️ Upcoming', 'task:upcoming').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}

export function getGoalsMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '➕ Добавить' : '➕ Add', 'goal:add')
    .text(lang === 'ru' ? '📋 Список' : '📋 List', 'goal:list').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}

export function getStatsMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '👤 Моя статистика' : '👤 My Stats', 'stats:me')
    .text(lang === 'ru' ? '🏆 Лидеры' : '🏆 Leaderboard', 'stats:leaderboard').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}

export function getMembersMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '👥 Список' : '👥 List', 'members:list')
    .text(lang === 'ru' ? '➕ Пригласить' : '➕ Invite', 'members:invite').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}

export function getSettingsMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '🌐 Язык' : '🌐 Language', 'settings:language')
    .text(lang === 'ru' ? '🎁 Награды' : '🎁 Rewards', 'settings:rewards').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}

export function getHelpMenu(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(lang === 'ru' ? '📖 Команды' : '📖 Commands', 'help:commands')
    .text(lang === 'ru' ? '❓ FAQ' : '❓ FAQ', 'help:faq').row()
    .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:main');
}
