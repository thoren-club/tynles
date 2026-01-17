import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Переводы
const translations: Record<Language, Record<string, string>> = {
  ru: {
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.no_tasks': 'Задач нет',
    'dashboard.can_add_task': 'Вы можете добавить задачу',
    'dashboard.tasks_completed': 'выполнено',
    'dashboard.current_tasks': 'Актуальные задачи',
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.deals': 'Дела',
    'nav.leaderboard': 'Лидерборд',
    'nav.spaces': 'Spaces',
    // Common
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.create': 'Создать',
    'common.complete': 'Выполнить',
    // Settings
    'settings.title': 'Настройки',
    'settings.general': 'Основные',
    'settings.language': 'Язык',
    'settings.notifications': 'Уведомления',
    'settings.security': 'Безопасность',
    'settings.about': 'О приложении',
    // Add more translations as needed
  },
  en: {
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.no_tasks': 'No tasks',
    'dashboard.can_add_task': 'You can add a task',
    'dashboard.tasks_completed': 'completed',
    'dashboard.current_tasks': 'Current Tasks',
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.deals': 'Deals',
    'nav.leaderboard': 'Leaderboard',
    'nav.spaces': 'Spaces',
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.complete': 'Complete',
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.about': 'About',
    // Add more translations as needed
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved && (saved === 'ru' || saved === 'en') ? saved : 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
