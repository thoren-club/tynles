import { useLanguage } from '../../contexts/LanguageContext';
import './ImportanceSelector.css';

interface ImportanceSelectorProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  fullWidth?: boolean;
}

export function ImportanceSelector({
  label,
  value,
  onChange,
  fullWidth = false,
}: ImportanceSelectorProps) {
  const { tr } = useLanguage();

  const importanceLevels = [
    { value: 1, label: tr('Низкая', 'Low'), icon: '🔵', color: 'low' },
    { value: 2, label: tr('Средняя', 'Medium'), icon: '🟢', color: 'medium' },
    { value: 3, label: tr('Высокая', 'High'), icon: '🟠', color: 'high' },
    { value: 4, label: tr('Критическая', 'Critical'), icon: '🔴', color: 'urgent' },
  ];

  return (
    <div className={`importance-selector ${fullWidth ? 'full-width' : ''}`}>
      {label && <label className="importance-label">{label}</label>}
      
      <div className="importance-buttons">
        {importanceLevels.map((level) => (
          <button
            key={level.value}
            type="button"
            className={`importance-button importance-${level.color} ${value === level.value ? 'active' : ''}`}
            onClick={() => onChange(level.value)}
          >
            <span className="importance-icon">{level.icon}</span>
            <span className="importance-text">{level.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
