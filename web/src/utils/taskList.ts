import { getNextAvailableDate } from './taskAvailability';
import { getTaskDueGroupKey, TaskDueGroupKey } from './taskDate';

type TranslateFn = (ru: string, en: string) => string;

export const getTaskSections = (tr: TranslateFn) => [
  { key: 'overdue', label: tr('Просрочено', 'Overdue') },
  { key: 'today', label: tr('Сегодня', 'Today') },
  { key: 'upcoming', label: tr('Ближайшие 7 дней', 'Next 7 days') },
  { key: 'later', label: tr('Позже', 'Later') },
  { key: 'no-date', label: tr('Без срока', 'No due date') },
] as const;

export const getTaskDueGroup = (task: any): TaskDueGroupKey => {
  return getTaskDueGroupKey(task?.dueAt || null);
};

export const sortTasksByDue = (items: any[]) => {
  return [...items].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
};

export const groupTasksByDue = (tasks: any[]) => {
  const grouped: Record<TaskDueGroupKey, any[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    later: [],
    'no-date': [],
  };

  tasks.forEach((task) => {
    const group = getTaskDueGroup(task);
    grouped[group].push(task);
  });

  return grouped;
};

export const applyRecurringCompletion = (tasks: any[], taskId: string, timeZone?: string) => {
  let updated = false;
  const nextTasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    const nextDate = getNextAvailableDate(task, timeZone);
    updated = true;
    return {
      ...task,
      dueAt: nextDate ? nextDate.toISOString() : task.dueAt,
      isCompleted: false,
    };
  });

  return { updated, tasks: nextTasks };
};
