import React from 'react';
import './Button.css';
import { useLanguage } from '../../contexts/LanguageContext';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const { t } = useLanguage();
  const baseClass = 'ui-button';
  const variantClass = `ui-button-${variant}`;
  const widthClass = fullWidth ? 'ui-button-full-width' : '';
  const combinedClass = `${baseClass} ${variantClass} ${widthClass} ${className}`.trim();

  return (
    <button
      type={type}
      className={combinedClass}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? t('common.loading') : children}
    </button>
  );
}
