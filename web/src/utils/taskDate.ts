type TranslateFn = (ru: string, en: string) => string;

const DAY_AFTER_TOMORROW = {
  ru: 'Послезавтра',
  en: 'Day after tomorrow',
};

const capitalize = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const getTaskDateParts = (
  dueAt: string | null,
  locale: string,
  tr: TranslateFn,
) => {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startDue.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24));

  let label = '';
  let isOverdue = false;

  if (diffDays < 0) {
    isOverdue = true;
    if (diffDays === -1) {
      label = tr('Вчера', 'Yesterday');
    } else if (diffDays === -2) {
      label = tr('Позавчера', 'Day before yesterday');
    } else {
      const showYear = date.getFullYear() !== now.getFullYear();
      label = date.toLocaleDateString(locale, showYear
        ? { day: '2-digit', month: 'long', year: 'numeric' }
        : { day: '2-digit', month: 'long' });
    }
  } else if (diffDays === 0) {
    label = tr('Сегодня', 'Today');
  } else if (diffDays === 1) {
    label = tr('Завтра', 'Tomorrow');
  } else if (diffDays === 2) {
    label = tr(DAY_AFTER_TOMORROW.ru, DAY_AFTER_TOMORROW.en);
  } else {
    label = capitalize(date.toLocaleDateString(locale, { weekday: 'long' }));
  }

  const isNoTime = date.getHours() === 23 && date.getMinutes() === 59;
  const hasTime = !isNoTime && (date.getHours() !== 0 || date.getMinutes() !== 0);
  const time = hasTime
    ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null;

  return { label, time, isOverdue };
};
