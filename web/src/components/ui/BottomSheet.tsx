import { useEffect, useRef } from 'react';
import { IconX } from '@tabler/icons-react';
import './BottomSheet.css';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

/**
 * BottomSheet — универсальная шторка, которая выезжает снизу вверх
 * Согласно DESIGN_GUIDELINES.md
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  showCloseButton = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.classList.add('modal-open');
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="bottom-sheet-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={sheetRef}
        className={`bottom-sheet ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Индикатор перетаскивания (handle) */}
        <div className="bottom-sheet-handle" onClick={onClose}>
          <div className="bottom-sheet-handle-bar" />
        </div>

        {/* Заголовок и кнопка закрытия */}
        {(title || showCloseButton) && (
          <div className="bottom-sheet-header">
            {title && <h3 className="bottom-sheet-title">{title}</h3>}
            {showCloseButton && (
              <button 
                className="bottom-sheet-close"
                onClick={onClose}
                aria-label="Close"
              >
                <IconX size={24} />
              </button>
            )}
          </div>
        )}

        {/* Контент */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
}
