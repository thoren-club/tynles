import { RecurrenceType, RecurrencePayload } from '../types';

export function calculateNextDueDate(
  recurrenceType: string,
  payload: RecurrencePayload | null,
  currentDate: Date,
): Date {
  const next = new Date(currentDate);

  switch (recurrenceType) {
    case RecurrenceType.DAILY:
      next.setDate(next.getDate() + 1);
      break;

    case RecurrenceType.WEEKLY:
      if (payload?.daysOfWeek && payload.daysOfWeek.length > 0) {
        // Find next day of week
        const currentDay = next.getDay();
        const daysOfWeek = payload.daysOfWeek.sort((a, b) => a - b);
        let nextDay = daysOfWeek.find((d) => d > currentDay);
        if (!nextDay) {
          nextDay = daysOfWeek[0];
          next.setDate(next.getDate() + 7 - currentDay + nextDay);
        } else {
          next.setDate(next.getDate() + (nextDay - currentDay));
        }
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;

    case RecurrenceType.MONTHLY:
      if (payload?.dayOfMonth) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(payload.dayOfMonth);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}