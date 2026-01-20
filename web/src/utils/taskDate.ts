type TranslateFn = (ru: string, en: string) => string;

export type DueStatus = 'overdue' | 'soon' | 'far';
export type TaskDueGroupKey = 'overdue' | 'today' | 'upcoming' | 'later' | 'no-date';

export type TaskDateParts = {
  label: string;
  time: string | null;
  isOverdue: boolean;
  dueStatus: DueStatus;
};

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export const getDueDayDiff = (dueAt: string | null) => {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((startDue.getTime() - startToday.getTime()) / MS_IN_DAY);
};

export const getTaskDueGroupKey = (dueAt: string | null): TaskDueGroupKey => {
  const diffDays = getDueDayDiff(dueAt);
  if (diffDays === null) return 'no-date';
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'upcoming';
  return 'later';
};

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
  options?: { hideTime?: boolean },
): TaskDateParts | null => {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  const diffDays = getDueDayDiff(dueAt);
  if (diffDays === null) return null;

  const now = new Date();
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

  const isNoTime = date.getHours() === 0 && date.getMinutes() === 0;
  const hasTime = options?.hideTime === true
    ? false
    : options?.hideTime === false
    ? true
    : !isNoTime;
  const time = hasTime
    ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null;

  const dueStatus: DueStatus = isOverdue ? 'overdue' : diffDays <= 1 ? 'soon' : 'far';

  return { label, time, isOverdue, dueStatus };
};
