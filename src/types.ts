export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface RecurrencePayload {
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;
  timeOfDay?: string; // HH:mm
  assigneeUserId?: string;
  assigneeScope?: 'user' | 'space';
}

/**
 * Базовая константа для расчета опыта за уровень
 * В среднем каждый уровень требует 100-200 задач для прохождения
 */
export const BASE_XP_PER_LEVEL = 100;

/**
 * Варианты важности (difficulty) и базовый опыт за каждую:
 * 1 - Не обязательно: 10 XP
 * 2 - Можно не торопиться: 25 XP
 * 3 - Нужно торопиться: 50 XP
 * 4 - Подпекает: 75 XP
 */
const BASE_XP_BY_DIFFICULTY: Record<number, number> = {
  1: 10,   // Не обязательно
  2: 25,   // Можно не торопиться
  3: 50,   // Нужно торопиться
  4: 75,   // Подпекает
};

/**
 * Модификатор для повторяющихся задач
 * Влияет незначительно (+10% для ежедневных, +5% для еженедельных)
 */
const RECURRENCE_MODIFIERS: Record<string, number> = {
  'daily': 1.1,    // Ежедневные задачи дают +10% опыта
  'weekly': 1.05,  // Еженедельные задачи дают +5% опыта
  'none': 1.0,     // Одноразовые задачи - без модификатора
};

/**
 * Рассчитывает уровень на основе общего опыта
 * Прогрессия: каждый уровень требует больше опыта (экспоненциальный рост)
 * Формула: level = 1 + floor(totalXp / (BASE_XP_PER_LEVEL * (1 + levelBonus)))
 * Где levelBonus увеличивается с уровнем для более медленного прогресса
 */
export function calculateLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  
  // Линейная прогрессия для простоты (можно улучшить до экспоненциальной)
  // Уровень 1: 0-100 XP
  // Уровень 2: 100-200 XP
  // Уровень 3: 200-300 XP
  // и т.д.
  
  // Базовый расчет
  let level = 1;
  let xpRequired = BASE_XP_PER_LEVEL;
  let currentXp = totalXp;
  
  // Каждый следующий уровень требует немного больше опыта
  while (currentXp >= xpRequired && level < 80) {
    currentXp -= xpRequired;
    level++;
    // Небольшое увеличение требований для каждого уровня (экспоненциальный рост)
    xpRequired = Math.floor(BASE_XP_PER_LEVEL * (1 + (level - 1) * 0.02)); // +2% за каждый уровень
  }
  
  return Math.min(level, 80); // Максимум 80 уровень
}

/**
 * Получает базовый опыт для задачи на основе важности (difficulty)
 */
export function getXpForDifficulty(difficulty: number): number {
  return BASE_XP_BY_DIFFICULTY[difficulty] || BASE_XP_BY_DIFFICULTY[1];
}

/**
 * Рассчитывает итоговый опыт для задачи с учетом важности и частоты повторения
 * 
 * @param difficulty - Важность задачи (1-4)
 * @param recurrenceType - Тип повторения ('daily' | 'weekly' | 'none')
 * @returns Итоговый опыт за выполнение задачи
 */
export function calculateTaskXp(difficulty: number, recurrenceType: string = 'none'): number {
  const baseXp = getXpForDifficulty(difficulty);
  const modifier = RECURRENCE_MODIFIERS[recurrenceType] || 1.0;
  
  // Округляем до целого числа
  return Math.round(baseXp * modifier);
}

/**
 * Получает опыт, требуемый для достижения следующего уровня
 */
export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= 80) return 0;
  
  // Базовый опыт + небольшое увеличение для каждого уровня
  return Math.floor(BASE_XP_PER_LEVEL * (1 + currentLevel * 0.02));
}

/**
 * Получает общий опыт, требуемый для достижения определенного уровня
 */
export function getTotalXpForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  
  let totalXp = 0;
  for (let level = 1; level < targetLevel; level++) {
    totalXp += getXpForNextLevel(level);
  }
  
  return totalXp;
}

/**
 * Получает среднее количество задач для достижения уровня
 * На основе средней важности задач (difficulty ~2.5, т.е. ~37 XP за задачу)
 */
export function getEstimatedTasksForLevel(level: number): number {
  const totalXp = getTotalXpForLevel(level);
  const avgXpPerTask = 37; // Средний опыт за задачу (между 25 и 50)
  return Math.round(totalXp / avgXpPerTask);
}