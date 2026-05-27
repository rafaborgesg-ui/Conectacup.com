import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2, Upload, Download, Trash2, Save, Send } from 'lucide-react';
import { cn } from './ui/utils';

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';
type FeedbackSize = 'sm' | 'md' | 'lg';

interface VisualFeedbackProps {
  type: FeedbackType;
  message: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
  size?: FeedbackSize;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 🎨 Componente de feedback visual otimizado
 * 
 * Features:
 * - ✅ Animações suaves com Motion
 * - ✅ Auto-dismiss configurável
 * - ✅ Ícones contextuais
 * - ✅ Ações opcionais (Undo, etc)
 * - ✅ Responsive
 * - ✅ Acessível (ARIA)
 */
export const VisualFeedback = memo(({
  type,
  message,
  description,
  duration = 4000,
  onClose,
  size = 'md',
  icon,
  action
}: VisualFeedbackProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0 && type !== 'loading') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, type, onClose]);

  // Configurações por tipo
  const config = {
    success: {
      icon: icon || <CheckCircle className="w-6 h-6" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-900',
      iconColor: 'text-green-500'
    },
    error: {
      icon: icon || <XCircle className="w-6 h-6" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-900',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: icon || <AlertCircle className="w-6 h-6" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-900',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: icon || <Info className="w-6 h-6" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-500'
    },
    loading: {
      icon: icon || <Loader2 className="w-6 h-6 animate-spin" />,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-500',
      textColor: 'text-gray-900',
      iconColor: 'text-gray-500'
    }
  }[type];

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg'
  }[size];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          className={cn(
            'rounded-xl border-l-4 shadow-lg backdrop-blur-sm',
            config.bgColor,
            config.borderColor,
            sizeClasses,
            'max-w-md w-full'
          )}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {/* Ícone */}
            <div className={cn('flex-shrink-0', config.iconColor)}>
              {config.icon}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className={cn('font-medium', config.textColor)}>
                {message}
              </p>
              {description && (
                <p className={cn('mt-1 text-sm opacity-80', config.textColor)}>
                  {description}
                </p>
              )}

              {/* Ação opcional */}
              {action && (
                <button
                  onClick={action.onClick}
                  className={cn(
                    'mt-2 text-sm font-medium underline hover:no-underline',
                    config.textColor
                  )}
                >
                  {action.label}
                </button>
              )}
            </div>

            {/* Botão fechar */}
            {onClose && type !== 'loading' && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(() => onClose(), 300);
                }}
                className={cn(
                  'flex-shrink-0 hover:opacity-70 transition-opacity',
                  config.iconColor
                )}
                aria-label="Fechar"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Barra de progresso (para loading) */}
          {type === 'loading' && duration > 0 && (
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className={cn('mt-3 h-1 rounded-full', config.borderColor.replace('border-', 'bg-'))}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

VisualFeedback.displayName = 'VisualFeedback';

/**
 * 🎯 Feedback de transição entre telas
 */
export const PageTransition = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
    >
      {children}
    </motion.div>
  );
});

PageTransition.displayName = 'PageTransition';

/**
 * 🎯 Loading state com progresso
 */
export const LoadingProgress = memo(({ 
  message = 'Carregando...', 
  progress 
}: { 
  message?: string; 
  progress?: number;
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      {/* Spinner animado */}
      <div className="relative w-20 h-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute inset-0"
        >
          <div className="w-full h-full border-4 border-gray-200 border-t-[#D50000] rounded-full" />
        </motion.div>
        
        {progress !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-[#D50000]">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      {/* Mensagem */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-600"
      >
        {message}
      </motion.p>

      {/* Barra de progresso */}
      {progress !== undefined && (
        <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-[#D50000]"
          />
        </div>
      )}
    </div>
  );
});

LoadingProgress.displayName = 'LoadingProgress';

/**
 * 🎯 Feedback de ação (Upload, Download, Delete, etc)
 */
interface ActionFeedbackProps {
  type: 'upload' | 'download' | 'delete' | 'save' | 'send';
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  progress?: number;
}

export const ActionFeedback = memo(({ 
  type, 
  status, 
  message,
  progress 
}: ActionFeedbackProps) => {
  const icons = {
    upload: <Upload className="w-6 h-6" />,
    download: <Download className="w-6 h-6" />,
    delete: <Trash2 className="w-6 h-6" />,
    save: <Save className="w-6 h-6" />,
    send: <Send className="w-6 h-6" />
  };

  const labels = {
    upload: { loading: 'Enviando...', success: 'Enviado!', error: 'Erro ao enviar' },
    download: { loading: 'Baixando...', success: 'Baixado!', error: 'Erro ao baixar' },
    delete: { loading: 'Excluindo...', success: 'Excluído!', error: 'Erro ao excluir' },
    save: { loading: 'Salvando...', success: 'Salvo!', error: 'Erro ao salvar' },
    send: { loading: 'Enviando...', success: 'Enviado!', error: 'Erro ao enviar' }
  };

  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          className={cn(
            'fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-md',
            'border-2 max-w-sm',
            status === 'loading' && 'bg-gray-50/90 border-gray-300',
            status === 'success' && 'bg-green-50/90 border-green-500',
            status === 'error' && 'bg-red-50/90 border-red-500'
          )}
        >
          <div className="flex items-center gap-3">
            {/* Ícone animado */}
            <motion.div
              animate={status === 'loading' ? { rotate: 360 } : {}}
              transition={status === 'loading' ? {
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              } : {}}
              className={cn(
                status === 'loading' && 'text-gray-600',
                status === 'success' && 'text-green-600',
                status === 'error' && 'text-red-600'
              )}
            >
              {status === 'success' ? <CheckCircle className="w-6 h-6" /> :
               status === 'error' ? <XCircle className="w-6 h-6" /> :
               icons[type]}
            </motion.div>

            {/* Mensagem */}
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {message || labels[type][status as 'loading' | 'success' | 'error']}
              </p>
              
              {/* Progresso */}
              {status === 'loading' && progress !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gray-600"
                    />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ActionFeedback.displayName = 'ActionFeedback';

/**
 * 🎯 Empty state com animação
 */
export const AnimatedEmptyState = memo(({ 
  icon, 
  title, 
  description,
  action
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.1
        }}
        className="mb-4 text-gray-400"
      >
        {icon}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-medium text-gray-900 mb-2"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 mb-6 max-w-md"
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
});

AnimatedEmptyState.displayName = 'AnimatedEmptyState';
