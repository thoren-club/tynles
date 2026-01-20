type TranslateFn = (ru: string, en: string) => string;

export function getGoalTimeframeLabel(
  goal: {
    targetType?: 'year' | 'month' | 'unlimited' | null;
    targetYear?: number | null;
    targetMonth?: number | null;
  },
  locale: string,
  tr: TranslateFn,
) {
  if (goal.targetType === 'year' && goal.targetYear) {
    return tr(`В течение ${goal.targetYear} года`, `Within ${goal.targetYear}`);
  }

  if (goal.targetType === 'month' && goal.targetYear && goal.targetMonth) {
    const monthName = new Date(goal.targetYear, goal.targetMonth - 1, 1).toLocaleString(locale, { month: 'long' });
    return tr(`В течение ${monthName} ${goal.targetYear} года`, `Within ${monthName} ${goal.targetYear}`);
  }

  return tr('Бессрочно', 'Unlimited');
}
