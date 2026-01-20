import { useLanguage } from '../contexts/LanguageContext';
import './WeeklyXpChart.css';

interface WeeklyXpSeries {
  userId: string;
  name: string;
  color?: string;
  data: number[];
}

interface WeeklyXpChartProps {
  labels: string[];
  series: WeeklyXpSeries[];
  loading?: boolean;
}

/**
 * Компонент линейного графика XP за неделю (7 дней).
 */
export default function WeeklyXpChart({ labels, series, loading = false }: WeeklyXpChartProps) {
  const { tr, locale } = useLanguage();
  const isRussian = locale === 'ru-RU';
  const dayLabels = isRussian
    ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const normalizedLabels = labels.length === 7 ? labels : dayLabels;
  const palette = [
    'var(--color-primary-500)',
    'var(--color-success-500)',
    '#38bdf8',
    '#a855f7',
    '#f97316',
    '#ef4444',
    '#facc15',
    '#14b8a6',
  ];
  const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
    }
    return hash;
  };
  const getStableColor = (userId: string) => {
    const index = Math.abs(hashString(userId)) % palette.length;
    return palette[index];
  };
  const normalizedSeries = series
    .map((item) => ({
      ...item,
      color: item.color || getStableColor(item.userId),
      data: item.data.length === 7 ? item.data : Array.from({ length: 7 }, (_, i) => item.data[i] || 0),
    }))
    .sort((a, b) => {
      const sumA = a.data.reduce((total, value) => total + value, 0);
      const sumB = b.data.reduce((total, value) => total + value, 0);
      return sumB - sumA;
    })
    .slice(0, 3);
  const maxXp = Math.max(
    1,
    ...normalizedSeries.flatMap((item) => item.data),
  );

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
            {normalizedSeries.map((line) => (
              <polyline
                key={line.userId}
                fill="none"
                stroke={line.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={line.data
                  .map((xp, index) => {
                    const x = (index / 6) * 100;
                    const y = 40 - (xp / maxXp) * 36;
                    return `${x},${Math.max(4, Math.min(36, y))}`;
                  })
                  .join(' ')}
              />
            ))}
            {normalizedSeries.map((line) =>
              line.data.map((xp, index) => {
                const x = (index / 6) * 100;
                const y = 40 - (xp / maxXp) * 36;
                return (
                  <circle
                    key={`${line.userId}-${index}`}
                    cx={x}
                    cy={Math.max(4, Math.min(36, y))}
                    r="2.5"
                    fill={line.color}
                  />
                );
              }),
            )}
          </svg>
        </div>
        <div className="chart-labels">
          {normalizedLabels.map((label, index) => (
            <div key={index} className="chart-label">
              {label}
            </div>
          ))}
        </div>
        {normalizedSeries.length > 0 && (
          <div className="chart-legend">
            {normalizedSeries.map((item) => (
              <div key={item.userId} className="chart-legend-item">
                <span className="chart-legend-dot" style={{ background: item.color }} />
                <span className="chart-legend-name">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
