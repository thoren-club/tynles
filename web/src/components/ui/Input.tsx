import React from 'react';
import './Input.css';

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export default function Input({
  type = 'text',
  value,
  onChange,
  onKeyPress,
  placeholder,
  label,
  icon,
  error,
  disabled = false,
  fullWidth = false,
  className = '',
  autoFocus = false,
}: InputProps) {
  const baseClass = 'ui-input-wrapper';
  const widthClass = fullWidth ? 'ui-input-full-width' : '';
  const errorClass = error ? 'ui-input-error' : '';
  const combinedClass = `${baseClass} ${widthClass} ${errorClass} ${className}`.trim();

  return (
    <div className={combinedClass}>
      {label && (
        <label className="ui-input-label">
          {label}
        </label>
      )}
      <div className="ui-input-container">
        {icon && (
          <div className="ui-input-icon">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={`ui-input ${icon ? 'ui-input-with-icon' : ''}`}
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </div>
      {error && (
        <div className="ui-input-error-message">
          {error}
        </div>
      )}
    </div>
  );
}
