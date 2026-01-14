export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface RecurrencePayload {
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;
}

export const XP_PER_LEVEL = 100;

export function calculateLevel(totalXp: number): number {
  return 1 + Math.floor(totalXp / XP_PER_LEVEL);
}

export function getXpForDifficulty(difficulty: number): number {
  return difficulty * 10; // 10, 20, 30, 40, 50 for difficulty 1-5
}