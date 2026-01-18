import { useLanguage } from '../../contexts/LanguageContext';
import './DateTimePickerWithPresets.css';

interface DateTimePickerWithPresetsProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fullWidth?: boolean;
  showPresets?: boolean;
}

export function DateTimePickerWithPresets({
  label,
  value,
  onChange,
  fullWidth = false,
  showPresets = true,
}: DateTimePickerWithPresetsProps) {
  const { tr } = useLanguage();

  const setPreset = (preset: 'today' | 'tomorrow' | 'week') => {
    const now = new Date();
    let targetDate = new Date();

    switch (preset) {
      case 'today':
        // Сегодня 23:59
        targetDate.setHours(23, 59, 0, 0);
        break;
      case 'tomorrow':
        // Завтра 23:59
        targetDate.setDate(now.getDate() + 1);
        targetDate.setHours(23, 59, 0, 0);
        break;
      case 'week':
        // Через неделю 23:59
        targetDate.setDate(now.getDate() + 7);
        targetDate.setHours(23, 59, 0, 0);
        break;
    }

    // Форматируем в datetime-local формат: YYYY-MM-DDTHH:mm
    const formatted = targetDate.toISOString().slice(0, 16);
    
    // Создаем синтетическое событие
    const syntheticEvent = {
      target: { value: formatted },
      currentTarget: { value: formatted },
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  return (
    <div className={`datetime-picker-with-presets ${fullWidth ? 'full-width' : ''}`}>
      {label && <label className="datetime-label">{label}</label>}
      
      {showPresets && (
        <div className="datetime-presets">
          <button
            type="button"
            className="preset-button"
            onClick={() => setPreset('today')}
          >
            {tr('Сегодня', 'Today')}
          </button>
          <button
            type="button"
            className="preset-button"
            onClick={() => setPreset('tomorrow')}
          >
            {tr('Завтра', 'Tomorrow')}
          </button>
          <button
            type="button"
            className="preset-button"
            onClick={() => setPreset('week')}
          >
            {tr('Через неделю', 'In a week')}
          </button>
        </div>
      )}
      
      <input
        type="datetime-local"
        className="datetime-input"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
