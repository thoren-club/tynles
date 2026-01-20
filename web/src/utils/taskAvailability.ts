/**
 * Утилита для определения доступности повторяющихся задач
 */

/**
 * Проверяет, доступна ли задача для выполнения
 * 
 * Логика:
 * - Одноразовые задачи всегда доступны (если не выполнены)
 * - Повторяющиеся задачи доступны, если:
 *   1. dueAt <= текущее время (наступил следующий доступный день)
 *   2. Текущий день недели входит в daysOfWeek (для еженедельных задач)
 */
import { addDaysInTimeZone, getStartOfDayInTimeZone, getWeekdayInTimeZone } from './timezone';

export function isTaskAvailable(task: any, timeZone?: string): boolean {
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  
  // Одноразовые задачи всегда доступны
  if (!isRecurring) {
    return true;
  }
  
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  
  // Если нет dueAt, задача доступна (недавно создана, еще не выполнена)
  if (!task.dueAt) {
    return true;
  }
  
  const dueDate = new Date(task.dueAt);
  
  // Для повторяющихся: окно выполнения по TZ пространства
  const windowStart = getStartOfDayInTimeZone(dueDate, tz);
  const hasTime = !!task.recurrencePayload?.timeOfDay;
  const windowEnd = hasTime ? dueDate : addDaysInTimeZone(windowStart, 1, tz);

  // Окно выполнения ещё не наступило
  if (now < windowStart) return false;

  // Окно выполнения уже прошло
  if (now > windowEnd) return false;

  // Если задача уже выполнена в текущем окне — недоступна
  if (task.updatedAt) {
    const lastUpdate = new Date(task.updatedAt);
    if (lastUpdate >= windowStart) return false;
  }
  
  // Проверяем, входит ли текущий день недели в дни повторения (для еженедельных)
  const daysOfWeek = task.recurrencePayload?.daysOfWeek as number[] | undefined;
  if (daysOfWeek && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
    // Еженедельная задача - проверяем текущий день недели
    const currentDay = getWeekdayInTimeZone(now, tz); // 0 = воскресенье, 1 = понедельник, ...
    if (!daysOfWeek.includes(currentDay)) {
      // Сегодня не входит в дни повторения
      return false;
    }
  }
  
  // Задача доступна
  return true;
}

/**
 * Получает следующий доступный день для повторяющейся задачи
 */
export function getNextAvailableDate(task: any, timeZone?: string): Date | null {
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  
  if (!isRecurring || !task.dueAt) {
    return null;
  }
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  const dueDate = new Date(task.dueAt);
  const windowStart = getStartOfDayInTimeZone(dueDate, tz);
  const daysOfWeek = task.recurrencePayload?.daysOfWeek as number[] | undefined;

  // Если окно ещё не наступило — следующее доступное время это начало окна
  if (now < windowStart) {
    return windowStart;
  }
  
  // Если сейчас в окне, но задача выполнена — следующее окно (будет выставлено сервером в dueAt)
  if (now >= windowStart && now <= dueDate && task.updatedAt) {
    const lastUpdate = new Date(task.updatedAt);
    if (lastUpdate >= windowStart) {
      // сервер после выполнения уже переведёт dueAt на следующий день,
      // но если фронт ещё не обновился — покажем начало следующего дня
      return addDaysInTimeZone(windowStart, 1, tz);
    }
  }
  
  // Если есть дни недели и их меньше 7 - это еженедельная задача
  if (daysOfWeek && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
    // Еженедельная задача - находим следующий день недели
    const currentDay = getWeekdayInTimeZone(now, tz);
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
    let nextDay = sortedDays.find((d) => d > currentDay);
    
    if (!nextDay) {
      // Следующий день на следующей неделе
      nextDay = sortedDays[0];
      return addDaysInTimeZone(now, 7 - currentDay + nextDay, tz);
    } else {
      // Следующий день на этой неделе
      return addDaysInTimeZone(now, nextDay - currentDay, tz);
    }
  }
  
  // Ежедневная задача (7 дней или daily) - следующий день = dueAt (если в будущем) или завтра
  return addDaysInTimeZone(now, 1, tz);
}

/**
 * Форматирует время до следующего доступного дня
 */
export function formatTimeUntilNext(task: any, timeZone?: string): string {
  const nextAvailable = getNextAvailableDate(task, timeZone);
  if (!nextAvailable) return '';
  
  const now = new Date();
  const diffMs = nextAvailable.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `Доступна через ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
  } else if (diffHours > 0) {
    return `Доступна через ${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`;
  } else if (diffMinutes > 0) {
    return `Доступна через ${diffMinutes} ${diffMinutes === 1 ? 'минуту' : diffMinutes < 5 ? 'минуты' : 'минут'}`;
  } else {
    return 'Доступна сейчас';
  }
}
