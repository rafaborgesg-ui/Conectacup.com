import { Loader2 } from 'lucide-react';
import { cn } from '../components/ui/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary',
  text,
  className,
  fullScreen = false
}: LoadingSpinnerProps) {
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16'
  };

  const variantClasses = {
    primary: 'text-[#D50000]',
    secondary: 'text-gray-600',
    white: 'text-white'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      className
    )}>
      {/* Spinner animado */}
      <div className="relative">
        {/* Círculo externo (fundo) */}
        <div 
          className={cn(
            'rounded-full border-4 border-gray-200',
            sizeClasses[size]
          )}
        />
        
        {/* Círculo animado (foreground) */}
        <Loader2 
          className={cn(
            'absolute inset-0 animate-spin',
            sizeClasses[size],
            variantClasses[variant]
          )}
          strokeWidth={3}
        />
      </div>

      {/* Texto opcional */}
      {text && (
        <p className={cn(
          'font-medium',
          textSizeClasses[size],
          variant === 'white' ? 'text-white' : 'text-gray-700'
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

// Variação com logo Porsche Cup (para telas principais)
export function LoadingPorsche({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      {/* Logo animado */}
      <div className="relative">
        {/* Pulse effect externo */}
        <div className="absolute inset-0 animate-ping rounded-full bg-[#D50000] opacity-20" />
        
        {/* Logo container */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#D50000] to-[#B00000] shadow-lg">
          {/* Iniciais */}
          <span className="text-3xl font-bold text-white">PC</span>
        </div>
      </div>

      {/* Spinner ring ao redor */}
      <div className="relative -mt-16">
        <Loader2 className="w-28 h-28 text-[#D50000] animate-spin" strokeWidth={2} />
      </div>

      {/* Texto */}
      {text && (
        <p className="text-base font-semibold text-gray-700 animate-pulse">
          {text}
        </p>
      )}
      
      {/* Texto secundário */}
      <p className="text-xs text-gray-500">
        Porsche Cup Brasil
      </p>
    </div>
  );
}

// Loading para botões
export function ButtonLoading({ text = 'Carregando...' }: { text?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      {text}
    </span>
  );
}

// Loading inline (para usar dentro de textos)
export function InlineLoading() {
  return (
    <Loader2 className="inline w-4 h-4 animate-spin text-[#D50000] mx-1" />
  );
}
