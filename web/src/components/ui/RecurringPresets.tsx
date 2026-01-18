import { useLanguage } from '../../contexts/LanguageContext';
import './RecurringPresets.css';

interface RecurringPresetsProps {
  label?: string;
  selectedDays: number[];
  onChange: (days: number[]) => void;
  fullWidth?: boolean;
}

export function RecurringPresets({
  label,
  selectedDays,
  onChange,
  fullWidth = false,
}: RecurringPresetsProps) {
  const { tr } = useLanguage();

  const presets = [
    {
      id: 'daily',
      label: tr('Каждый день', 'Every day'),
      icon: '🔄',
      days: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      id: 'weekdays',
      label: tr('Будни', 'Weekdays'),
      icon: '💼',
      days: [1, 2, 3, 4, 5],
    },
    {
      id: 'weekend',
      label: tr('Выходные', 'Weekend'),
      icon: '🏖️',
      days: [0, 6],
    },
  ];

  const weekDays = [
    { value: 1, label: tr('ПН', 'Mon') },
    { value: 2, label: tr('ВТ', 'Tue') },
    { value: 3, label: tr('СР', 'Wed') },
    { value: 4, label: tr('ЧТ', 'Thu') },
    { value: 5, label: tr('ПТ', 'Fri') },
    { value: 6, label: tr('СБ', 'Sat') },
    { value: 0, label: tr('ВС', 'Sun') },
  ];

  const isPresetActive = (presetDays: number[]) => {
    if (selectedDays.length !== presetDays.length) return false;
    return presetDays.every((day) => selectedDays.includes(day));
  };

  const handlePresetClick = (presetDays: number[]) => {
    // Если пресет уже активен, снимаем выделение
    if (isPresetActive(presetDays)) {
      onChange([]);
    } else {
      onChange(presetDays);
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  return (
    <div className={`recurring-presets ${fullWidth ? 'full-width' : ''}`}>
      {label && <label className="recurring-label">{label}</label>}
      
      {/* Быстрые пресеты */}
      <div className="presets-buttons">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-button ${isPresetActive(preset.days) ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset.days)}
          >
            <span className="preset-icon">{preset.icon}</span>
            <span className="preset-text">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Ручной выбор дней */}
      <div className="days-of-week">
        {weekDays.map((day) => (
          <button
            key={day.value}
            type="button"
            className={`day-button ${selectedDays.includes(day.value) ? 'active' : ''}`}
            onClick={() => toggleDay(day.value)}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}
