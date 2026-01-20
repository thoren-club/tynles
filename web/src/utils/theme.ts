export type ThemeName = 'orange' | 'green' | 'blue';

const STORAGE_KEY = 'theme';

export const getTheme = (): ThemeName => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'green' || raw === 'blue' || raw === 'orange') {
    return raw;
  }
  return 'orange';
};

export const applyTheme = (theme: ThemeName) => {
  const root = document.documentElement;
  if (theme === 'orange') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
};

export const setTheme = (theme: ThemeName) => {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
};
