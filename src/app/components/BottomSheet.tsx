import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ReactNode, useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  showCloseButton?: boolean;
  preventClose?: boolean;
}

/**
 * Bottom Sheet Component - iOS/Android Style
 * 
 * Features:
 * - Swipe down to dismiss
 * - Backdrop blur
 * - Smooth animations
 * - Haptic feedback (vibration)
 * - Auto height adjustment
 * - Keyboard aware
 * 
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <BottomSheet 
 *   isOpen={isOpen} 
 *   onClose={() => setIsOpen(false)}
 *   title="Novo Pneu"
 * >
 *   <form>...</form>
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  showHandle = true,
  showCloseButton = true,
  preventClose = false,
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // ✅ WCAG 2.1 AA - Focus Trap para acessibilidade
  useFocusTrap(sheetRef, isOpen);

  // Haptic feedback quando abre/fecha
  useEffect(() => {
    if (isOpen && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [isOpen]);

  // Previne scroll no body quando sheet está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC para fechar
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !preventClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, preventClose]);

  const handleClose = () => {
    if (!preventClose) {
      if (navigator.vibrate) navigator.vibrate(15);
      onClose();
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);

    // Se arrastou mais de 100px para baixo, fecha
    if (info.offset.y > 100) {
      handleClose();
    }
  };

  const getMaxHeight = () => {
    switch (height) {
      case 'half':
        return '50vh';
      case 'full':
        return '95vh';
      default:
        return '90vh';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            style={{ touchAction: 'none' }}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300 
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ 
              maxHeight: getMaxHeight(),
              touchAction: 'none',
            }}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
                {title && (
                  <h3 id="bottom-sheet-title" className="text-gray-900 flex-1">{title}</h3>
                )}
                {!title && <div />}
                
                {showCloseButton && !preventClose && (
                  <button
                    onClick={handleClose}
                    aria-label="Fechar painel"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                  >
                    <X size={20} className="text-gray-500" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div 
              className="overflow-y-auto overscroll-contain"
              style={{ 
                maxHeight: `calc(${getMaxHeight()} - ${title ? '80px' : '40px'})`,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="p-6">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook para controlar BottomSheet
 * 
 * @example
 * ```tsx
 * const { isOpen, open, close, toggle } = useBottomSheet();
 * 
 * <button onClick={open}>Abrir</button>
 * <BottomSheet isOpen={isOpen} onClose={close}>
 *   Conteúdo
 * </BottomSheet>
 * ```
 */
export function useBottomSheet(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    setIsOpen,
  };
}
