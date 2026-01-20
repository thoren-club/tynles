import { useLanguage } from '../contexts/LanguageContext';
import './WeeklyXpChart.css';

interface WeeklyXpChartProps {
  data: Array<{ day: number; xp: number; label: string }>; // day: 0-6 (Sun-Sat), xp: количество, label: "ПН", "ВТ", etc.
  loading?: boolean;
}

/**
 * Компонент линейного графика XP за неделю (7 дней).
 */
export default function WeeklyXpChart({ data, loading = false }: WeeklyXpChartProps) {
  const { tr, locale } = useLanguage();
  const isRussian = locale === 'ru-RU';
  const dayLabels = isRussian
    ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const normalized = data.length === 7 ? data : Array.from({ length: 7 }, (_, i) => ({
    day: i,
    xp: data[i]?.xp || 0,
    label: data[i]?.label || dayLabels[i],
  }));
  const maxXp = Math.max(...normalized.map((d) => d.xp), 1);

  if (loading) {
    return (
      <div className="weekly-xp-chart">
        <div className="weekly-xp-chart-header">
          <div className="chart-title-skeleton" />
        </div>
        <div className="chart-container">
          <div className="chart-line-skeleton" />
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
        <div className="chart-line">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="var(--color-primary-500)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={normalized
                .map((point, index) => {
                  const x = (index / 6) * 100;
                  const y = 40 - (point.xp / maxXp) * 36;
                  return `${x},${Math.max(4, Math.min(36, y))}`;
                })
                .join(' ')}
            />
            {normalized.map((point, index) => {
              const x = (index / 6) * 100;
              const y = 40 - (point.xp / maxXp) * 36;
              return (
                <circle
                  key={point.day}
                  cx={x}
                  cy={Math.max(4, Math.min(36, y))}
                  r="2.5"
                  fill="var(--color-primary-500)"
                />
              );
            })}
          </svg>
        </div>
        <div className="chart-labels">
          {normalized.map((dayData, index) => (
            <div key={index} className="chart-label">
              {dayData.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
