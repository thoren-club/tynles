import { Context } from 'grammy';

export type Language = 'en' | 'ru';

export interface Translations {
  [key: string]: string | Translations;
}

const translations: Record<Language, Translations> = {
  en: {
    welcome: 'Welcome! I\'m a task and goal management bot with gamification.',
    commands: {
      start: 'Use /space_create to create a space or /space_list to see your spaces.',
      help: 'Available commands',
    },
    space: {
      created: 'Space "{name}" created! ID: {id}',
      list: 'Your spaces:',
      notFound: 'You are not a member of any space. Use /space_create to create one.',
      switched: 'Switched to space: {name}',
      info: 'Space: {name}\nID: {id}\nTimezone: {timezone}\nYour role: {role}\nYour level: {level}\nYour XP: {xp}\nTasks: {tasks}\nGoals: {goals}\nMembers: {members}',
    },
    stats: {
      yourStats: '📊 Your Stats:',
      level: 'Level:',
      totalXp: 'Total XP:',
      progress: 'Progress to next level:',
      notFound: 'Stats not found.',
    },
    leaderboard: {
      title: '🏆 Leaderboard:',
      noStats: 'No stats found.',
    },
    // Добавим остальные переводы по мере необходимости
  },
  ru: {
    welcome: 'Добро пожаловать! Я бот для управления задачами и целями с геймификацией.',
    commands: {
      start: 'Используйте /space_create чтобы создать пространство или /space_list чтобы увидеть ваши пространства.',
      help: 'Доступные команды',
    },
    space: {
      created: 'Пространство "{name}" создано! ID: {id}',
      list: 'Ваши пространства:',
      notFound: 'Вы не участник ни одного пространства. Используйте /space_create чтобы создать.',
      switched: 'Переключено на пространство: {name}',
      info: 'Пространство: {name}\nID: {id}\nЧасовой пояс: {timezone}\nВаша роль: {role}\nВаш уровень: {level}\nВаш XP: {xp}\nЗадач: {tasks}\nЦелей: {goals}\nУчастников: {members}',
    },
    stats: {
      yourStats: '📊 Ваша статистика:',
      level: 'Уровень:',
      totalXp: 'Всего XP:',
      progress: 'Прогресс до следующего уровня:',
      notFound: 'Статистика не найдена.',
    },
    leaderboard: {
      title: '🏆 Таблица лидеров:',
      noStats: 'Статистика не найдена.',
    },
  },
};

function getNestedTranslation(obj: Translations, path: string): string {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return path; // Fallback to key if not found
    }
  }
  return typeof current === 'string' ? current : path;
}

export function t(lang: Language, key: string, params?: Record<string, string | number>): string {
  let translation = getNestedTranslation(translations[lang], key);
  
  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }
  
  return translation;
}

// Default language detection (can be improved with user preferences)
export function getUserLanguage(ctx: Context): Language {
  // Можно использовать язык пользователя из Telegram
  const userLang = ctx.from?.language_code?.split('-')[0];
  if (userLang === 'ru') return 'ru';
  return 'en'; // Default to English
}