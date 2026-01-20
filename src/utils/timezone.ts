export function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const asUTC = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
  return (asUTC - date.getTime()) / 60000;
}

export function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '01';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  };
}

export function makeDateInTimeZone(
  params: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string,
) {
  const utc = Date.UTC(
    params.year,
    params.month - 1,
    params.day,
    params.hour ?? 0,
    params.minute ?? 0,
    params.second ?? 0,
  );
  const utcDate = new Date(utc);
  const offsetMinutes = getTimeZoneOffsetMinutes(utcDate, timeZone);
  return new Date(utc - offsetMinutes * 60000);
}

export function getStartOfDayInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return makeDateInTimeZone({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function getWeekdayInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function addDaysInTimeZone(date: Date, days: number, timeZone: string) {
  const start = getStartOfDayInTimeZone(date, timeZone);
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getEndOfDayInTimeZone(date: Date, timeZone: string) {
  const start = getStartOfDayInTimeZone(date, timeZone);
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setMilliseconds(next.getMilliseconds() - 1);
  return next;
}
