import React from 'react';
import { IconCalendar, IconClock } from '@tabler/icons-react';
import './DateTimePicker.css';

export interface DateTimePickerProps {
  value: string; // ISO string or empty
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

/**
 * DateTimePicker компонент (input type="datetime-local") согласно DESIGN_GUIDELINES.md
 */
export default function DateTimePicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  fullWidth = false,
  className = '',
  min,
  max,
}: DateTimePickerProps) {
  const baseClass = 'ui-datetimepicker-wrapper';
  const widthClass = fullWidth ? 'ui-datetimepicker-full-width' : '';
  const errorClass = error ? 'ui-datetimepicker-error' : '';
  const combinedClass = `${baseClass} ${widthClass} ${errorClass} ${className}`.trim();

  return (
    <div className={combinedClass}>
      {label && (
        <label className="ui-datetimepicker-label">
          {label}
        </label>
      )}
      <div className="ui-datetimepicker-container">
        <IconCalendar size={20} className="ui-datetimepicker-icon ui-datetimepicker-icon-calendar" />
        <IconClock size={20} className="ui-datetimepicker-icon ui-datetimepicker-icon-clock" />
        <input
          type="datetime-local"
          className="ui-datetimepicker"
          value={value}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
        />
      </div>
      {error && (
        <div className="ui-datetimepicker-error-message">
          {error}
        </div>
      )}
    </div>
  );
}
