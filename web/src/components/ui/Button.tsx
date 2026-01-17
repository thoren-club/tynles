import React from 'react';
import './Button.css';

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
      {loading ? 'Загрузка...' : children}
    </button>
  );
}
