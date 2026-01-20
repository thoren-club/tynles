import { useEffect, useRef, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import './BottomSheet.css';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showHeader?: boolean;
  showCloseButton?: boolean;
  enableSwipe?: boolean;
  size?: 'low' | 'medium' | 'high';
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
  contentClassName = '',
  showHeader = false,
  showCloseButton = true,
  enableSwipe = true,
  size = 'medium',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeCurrentY, setSwipeCurrentY] = useState<number | null>(null);
  const [sheetTransform, setSheetTransform] = useState(0);
  const [canSwipe, setCanSwipe] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setSwipeStartY(null);
      setSwipeCurrentY(null);
      setSheetTransform(0);
      setCanSwipe(false);
    }
  }, [isOpen]);

  const checkCanSwipe = (target: HTMLElement): boolean => {
    if (target.closest('.bottom-sheet-handle') || target.closest('.bottom-sheet-header')) {
      return true;
    }
    if (contentRef.current) {
      return contentRef.current.scrollTop === 0;
    }
    return false;
  };

  const handleSwipeStart = (clientY: number, target: HTMLElement) => {
    if (!enableSwipe) return;
    const canSwipeNow = checkCanSwipe(target);
    if (canSwipeNow) {
      setCanSwipe(true);
      setSwipeStartY(clientY);
      setSwipeCurrentY(clientY);
    }
  };

  const handleSwipeMove = (clientY: number, e: React.TouchEvent | React.MouseEvent) => {
    if (swipeStartY === null || !canSwipe || !enableSwipe) return;
    const deltaY = clientY - swipeStartY;
    if (deltaY > 0) {
      e.preventDefault();
      setSwipeCurrentY(clientY);
      setSheetTransform(deltaY);
    } else {
      setSheetTransform(0);
    }
  };

  const handleSwipeEnd = () => {
    if (swipeStartY === null || swipeCurrentY === null || !canSwipe || !enableSwipe) {
      setSwipeStartY(null);
      setSwipeCurrentY(null);
      setCanSwipe(false);
      return;
    }
    const deltaY = swipeCurrentY - swipeStartY;
    const threshold = 100;
    if (deltaY > threshold) {
      onClose();
    } else {
      setSheetTransform(0);
    }
    setSwipeStartY(null);
    setSwipeCurrentY(null);
    setCanSwipe(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enableSwipe) return;
    const target = e.target as HTMLElement;
    handleSwipeStart(e.clientY, target);
    const handleMouseMove = (event: MouseEvent) => {
      handleSwipeMove(event.clientY, event as any);
    };
    const handleMouseUp = () => {
      handleSwipeEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    const target = e.target as HTMLElement;
    handleSwipeStart(e.touches[0].clientY, target);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartY !== null && canSwipe && enableSwipe) {
      handleSwipeMove(e.touches[0].clientY, e);
    }
  };

  const handleTouchEnd = () => {
    if (swipeStartY !== null && enableSwipe) {
      handleSwipeEnd();
    }
  };

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
        className={`bottom-sheet bottom-sheet--${size} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: sheetTransform > 0 ? `translateY(${sheetTransform}px)` : 'none',
          transition: swipeStartY === null ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {/* Индикатор перетаскивания (handle) */}
        <div className="bottom-sheet-handle" onClick={onClose}>
          <div className="bottom-sheet-handle-bar" />
        </div>

        {/* Заголовок и кнопка закрытия */}
        {showHeader && (
          <div className="bottom-sheet-header">
            <div className="bottom-sheet-header-spacer" />
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
        <div ref={contentRef} className={`bottom-sheet-content ${contentClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}
