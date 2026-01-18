import { useLanguage } from '../contexts/LanguageContext';
import './WeeklyXpChart.css';

interface WeeklyXpChartProps {
  data: Array<{ day: number; xp: number; label: string }>; // day: 0-6 (Sun-Sat), xp: количество, label: "ПН", "ВТ", etc.
  loading?: boolean;
}

/**
 * Компонент графика XP за неделю (7 дней).
 * Показывает столбцы для каждого дня недели.
 */
export default function WeeklyXpChart({ data, loading = false }: WeeklyXpChartProps) {
  const { tr, locale } = useLanguage();

  // Находим максимальное значение для нормализации высоты столбцов
  const maxXp = Math.max(...data.map((d) => d.xp), 1);
  const isRussian = locale === 'ru-RU';

  // Дни недели для подписей (начинаем с понедельника)
  const dayLabels = isRussian
    ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Переупорядочиваем данные: понедельник = 0, воскресенье = 6
  // В JavaScript: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Нам нужно: 0 = Monday, ..., 6 = Sunday
  const reorderedData = Array.from({ length: 7 }, (_, index) => {
    // index 0 = понедельник (Monday = 1 в JS)
    // index 6 = воскресенье (Sunday = 0 в JS)
    const jsDayOfWeek = index === 6 ? 0 : index + 1;
    const dayData = data.find((d) => d.day === jsDayOfWeek) || {
      day: jsDayOfWeek,
      xp: 0,
      label: dayLabels[index],
    };
    return { ...dayData, label: dayLabels[index] };
  });

  if (loading) {
    return (
      <div className="weekly-xp-chart">
        <div className="weekly-xp-chart-header">
          <div className="chart-title-skeleton" />
        </div>
        <div className="chart-container">
          <div className="chart-bars">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="chart-bar-wrapper">
                <div className="chart-bar-skeleton" />
              </div>
            ))}
          </div>
          <div className="chart-labels">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="chart-label-skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-xp-chart">
      <div className="weekly-xp-chart-header">
        <h3 className="chart-title">
          {tr('Опыт за неделю', 'Weekly XP')}
        </h3>
      </div>
      <div className="chart-container">
        <div className="chart-bars">
          {reorderedData.map((dayData, index) => {
            const heightPercent = maxXp > 0 ? (dayData.xp / maxXp) * 100 : 0;
            return (
              <div key={index} className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  title={`${dayData.label}: ${dayData.xp} XP`}
                >
                  {dayData.xp > 0 && (
                    <span className="chart-bar-value">{dayData.xp}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="chart-labels">
          {reorderedData.map((dayData, index) => (
            <div key={index} className="chart-label">
              {dayData.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
