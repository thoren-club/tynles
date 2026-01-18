import { useState, useRef, useEffect } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import './Dropdown.css';

export interface DropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  value: string | number | null;
  options: DropdownOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Dropdown (Select) компонент согласно DESIGN_GUIDELINES.md
 */
export default function Dropdown({
  value,
  options,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  fullWidth = false,
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder || '';

  const baseClass = 'ui-dropdown-wrapper';
  const widthClass = fullWidth ? 'ui-dropdown-full-width' : '';
  const errorClass = error ? 'ui-dropdown-error' : '';
  const openClass = isOpen ? 'ui-dropdown-open' : '';
  const combinedClass = `${baseClass} ${widthClass} ${errorClass} ${openClass} ${className}`.trim();

  const handleSelect = (optionValue: string | number) => {
    if (options.find((opt) => opt.value === optionValue)?.disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={combinedClass} ref={dropdownRef}>
      {label && (
        <label className="ui-dropdown-label">
          {label}
        </label>
      )}
      <div className="ui-dropdown-container">
        <button
          type="button"
          className="ui-dropdown-trigger"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="ui-dropdown-value">{displayText}</span>
          <IconChevronDown 
            size={18} 
            className={`ui-dropdown-icon ${isOpen ? 'ui-dropdown-icon-open' : ''}`}
          />
        </button>
        {isOpen && (
          <div className="ui-dropdown-menu">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`ui-dropdown-option ${value === option.value ? 'ui-dropdown-option-selected' : ''} ${option.disabled ? 'ui-dropdown-option-disabled' : ''}`}
                onClick={() => handleSelect(option.value)}
                disabled={option.disabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <div className="ui-dropdown-error-message">
          {error}
        </div>
      )}
    </div>
  );
}
