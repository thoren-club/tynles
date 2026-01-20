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
    { value: 1, label: tr('Низкая', 'Low'), color: 'low' },
    { value: 2, label: tr('Средняя', 'Medium'), color: 'medium' },
    { value: 3, label: tr('Высокая', 'High'), color: 'high' },
    { value: 4, label: tr('Критическая', 'Critical'), color: 'urgent' },
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
            <span className="importance-text">{level.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
