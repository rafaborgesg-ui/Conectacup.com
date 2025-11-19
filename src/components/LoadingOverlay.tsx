import { motion, AnimatePresence } from 'motion/react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  isOpen: boolean;
  text?: string;
  progress?: number;
  onClose?: () => void;
}

export function LoadingOverlay({ isOpen, text, progress, onClose }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="xl" text={text} />
            </div>
            
            {progress !== undefined && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progresso</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-[#D50000] to-[#B00000] rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Variação compacta (inline)
export function InlineLoadingOverlay({ isOpen, text }: { isOpen: boolean; text?: string }) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
