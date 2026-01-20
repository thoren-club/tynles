import { RecurrenceType, RecurrencePayload } from '../types';
import { addDaysInTimeZone, getDatePartsInTimeZone, getStartOfDayInTimeZone, getWeekdayInTimeZone, makeDateInTimeZone } from './timezone';

export function calculateNextDueDate(
  recurrenceType: string,
  payload: RecurrencePayload | null,
  currentDate: Date,
  timeZone?: string,
): Date {
  const tz = timeZone || 'UTC';
  let next = getStartOfDayInTimeZone(currentDate, tz);

  switch (recurrenceType) {
    case RecurrenceType.DAILY:
      next = addDaysInTimeZone(currentDate, 1, tz);
      break;

    case RecurrenceType.WEEKLY:
      if (payload?.daysOfWeek && payload.daysOfWeek.length > 0) {
        // Find next day of week in timezone
        const currentDay = getWeekdayInTimeZone(currentDate, tz);
        const daysOfWeek = payload.daysOfWeek.sort((a, b) => a - b);
        let nextDay = daysOfWeek.find((d) => d > currentDay);
        let daysToAdd = 0;
        if (!nextDay) {
          nextDay = daysOfWeek[0];
          daysToAdd = 7 - currentDay + nextDay;
        } else {
          daysToAdd = nextDay - currentDay;
        }
        if (daysToAdd === 0) daysToAdd = 7;
        next = addDaysInTimeZone(currentDate, daysToAdd, tz);
      } else {
        next = addDaysInTimeZone(currentDate, 7, tz);
      }
      break;

    case RecurrenceType.MONTHLY:
      if (payload?.dayOfMonth) {
        const parts = getDatePartsInTimeZone(currentDate, tz);
        const targetMonth = parts.month;
        const targetYear = parts.year + (targetMonth === 12 ? 1 : 0);
        const month = targetMonth === 12 ? 1 : targetMonth + 1;
        next = makeDateInTimeZone(
          { year: targetYear, month, day: payload.dayOfMonth, hour: 0, minute: 0, second: 0 },
          tz,
        );
      } else {
        const parts = getDatePartsInTimeZone(currentDate, tz);
        const targetMonth = parts.month;
        const targetYear = parts.year + (targetMonth === 12 ? 1 : 0);
        const month = targetMonth === 12 ? 1 : targetMonth + 1;
        next = makeDateInTimeZone(
          { year: targetYear, month, day: parts.day, hour: 0, minute: 0, second: 0 },
          tz,
        );
      }
      break;

    default:
      next = addDaysInTimeZone(currentDate, 1, tz);
  }

  if (payload?.timeOfDay) {
    const [hours, minutes] = payload.timeOfDay.split(':').map((part) => parseInt(part, 10));
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const parts = getDatePartsInTimeZone(next, tz);
      next = makeDateInTimeZone(
        { year: parts.year, month: parts.month, day: parts.day, hour: hours, minute: minutes, second: 0 },
        tz,
      );
    }
  }

  return next;
}