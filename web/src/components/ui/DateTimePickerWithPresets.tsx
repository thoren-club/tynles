import { useLanguage } from '../../contexts/LanguageContext';
import './DateTimePickerWithPresets.css';

interface DateTimePickerWithPresetsProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fullWidth?: boolean;
  showPresets?: boolean;
  showTime?: boolean;
}

export function DateTimePickerWithPresets({
  label,
  value,
  onChange,
  fullWidth = false,
  showPresets = true,
  showTime = true,
}: DateTimePickerWithPresetsProps) {
  const { tr } = useLanguage();

  const formatValue = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (!showTime) {
      return datePart;
    }
    return `${datePart}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const getPresetValue = (preset: 'today' | 'tomorrow' | 'week') => {
    const now = new Date();
    const targetDate = new Date();

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

    return formatValue(targetDate);
  };

  const setPreset = (preset: 'today' | 'tomorrow' | 'week') => {
    const formatted = getPresetValue(preset);

    // Создаем синтетическое событие
    const syntheticEvent = {
      target: { value: formatted },
      currentTarget: { value: formatted },
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  const clearValue = () => {
    const syntheticEvent = {
      target: { value: '' },
      currentTarget: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const activePreset = value
    ? (['today', 'tomorrow', 'week'] as const).find((preset) => getPresetValue(preset) === value)
    : undefined;

  return (
    <div className={`datetime-picker-with-presets ${fullWidth ? 'full-width' : ''}`}>
      {(label || value) && (
        <div className="datetime-label-row">
          {label && <label className="datetime-label">{label}</label>}
          {value && (
            <button type="button" className="datetime-clear" onClick={clearValue}>
              {tr('Сбросить', 'Clear')}
            </button>
          )}
        </div>
      )}
      
      {showPresets && (
        <div className="datetime-presets">
          <button
            type="button"
            className={`preset-button${activePreset === 'today' ? ' active' : ''}`}
            onClick={() => setPreset('today')}
          >
            {tr('Сегодня', 'Today')}
          </button>
          <button
            type="button"
            className={`preset-button${activePreset === 'tomorrow' ? ' active' : ''}`}
            onClick={() => setPreset('tomorrow')}
          >
            {tr('Завтра', 'Tomorrow')}
          </button>
          <button
            type="button"
            className={`preset-button${activePreset === 'week' ? ' active' : ''}`}
            onClick={() => setPreset('week')}
          >
            {tr('Через неделю', 'In a week')}
          </button>
        </div>
      )}
      
      <input
        type={showTime ? 'datetime-local' : 'date'}
        className="datetime-input"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
