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
export function isTaskAvailable(task: any): boolean {
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  
  // Одноразовые задачи всегда доступны
  if (!isRecurring) {
    return true;
  }
  
  const now = new Date();
  
  // Если нет dueAt, задача доступна (недавно создана, еще не выполнена)
  if (!task.dueAt) {
    return true;
  }
  
  const dueDate = new Date(task.dueAt);
  
  // Проверяем, наступил ли следующий доступный день
  if (dueDate > now) {
    // Следующий доступный день еще не наступил
    return false;
  }
  
  // Проверяем, входит ли текущий день недели в дни повторения (для еженедельных)
  const daysOfWeek = task.recurrencePayload?.daysOfWeek as number[] | undefined;
  if (daysOfWeek && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
    // Еженедельная задача - проверяем текущий день недели
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
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
export function getNextAvailableDate(task: any): Date | null {
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  
  if (!isRecurring || !task.dueAt) {
    return null;
  }
  
  const now = new Date();
  const dueDate = new Date(task.dueAt);
  const daysOfWeek = task.recurrencePayload?.daysOfWeek as number[] | undefined;
  
  // Если есть дни недели и их меньше 7 - это еженедельная задача
  if (daysOfWeek && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
    // Еженедельная задача - находим следующий день недели
    const currentDay = now.getDay();
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
    let nextDay = sortedDays.find((d) => d > currentDay);
    
    if (!nextDay) {
      // Следующий день на следующей неделе
      nextDay = sortedDays[0];
      const nextAvailable = new Date(now);
      nextAvailable.setDate(nextAvailable.getDate() + (7 - currentDay + nextDay));
      nextAvailable.setHours(0, 0, 0, 0);
      return nextAvailable;
    } else {
      // Следующий день на этой неделе
      const nextAvailable = new Date(now);
      nextAvailable.setDate(nextAvailable.getDate() + (nextDay - currentDay));
      nextAvailable.setHours(0, 0, 0, 0);
      return nextAvailable;
    }
  }
  
  // Ежедневная задача (7 дней или daily) - следующий день = dueAt (если в будущем) или завтра
  if (dueDate > now) {
    return dueDate;
  } else {
    // dueAt уже прошел, следующий доступный день = завтра
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

/**
 * Форматирует время до следующего доступного дня
 */
export function formatTimeUntilNext(task: any): string {
  const nextAvailable = getNextAvailableDate(task);
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
