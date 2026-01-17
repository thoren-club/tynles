import React from 'react';
import { IconCalendar } from '@tabler/icons-react';
import './DatePicker.css';

export interface DatePickerProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

export default function DatePicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  fullWidth = false,
  className = '',
  min,
  max,
}: DatePickerProps) {
  const baseClass = 'ui-datepicker-wrapper';
  const widthClass = fullWidth ? 'ui-datepicker-full-width' : '';
  const errorClass = error ? 'ui-datepicker-error' : '';
  const combinedClass = `${baseClass} ${widthClass} ${errorClass} ${className}`.trim();

  return (
    <div className={combinedClass}>
      {label && (
        <label className="ui-datepicker-label">
          {label}
        </label>
      )}
      <div className="ui-datepicker-container">
        <IconCalendar size={20} className="ui-datepicker-icon" />
        <input
          type="date"
          className="ui-datepicker"
          value={value}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
        />
      </div>
      {error && (
        <div className="ui-datepicker-error-message">
          {error}
        </div>
      )}
    </div>
  );
}
