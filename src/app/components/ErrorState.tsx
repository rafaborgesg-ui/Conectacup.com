import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Database, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from './ui/utils';

interface ErrorStateProps {
  type?: 'network' | 'server' | 'database' | 'not-found' | 'generic';
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  className,
  compact = false
}: ErrorStateProps) {
  
  // Configurações por tipo de erro
  const errorConfig = {
    network: {
      icon: WifiOff,
      defaultTitle: 'Sem conexão',
      defaultMessage: 'Verifique sua conexão com a internet e tente novamente.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    server: {
      icon: ServerCrash,
      defaultTitle: 'Erro no servidor',
      defaultMessage: 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    database: {
      icon: Database,
      defaultTitle: 'Erro no banco de dados',
      defaultMessage: 'Ocorreu um erro ao acessar os dados. Por favor, tente novamente.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    'not-found': {
      icon: XCircle,
      defaultTitle: 'Não encontrado',
      defaultMessage: 'O recurso solicitado não foi encontrado.',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    generic: {
      icon: AlertCircle,
      defaultTitle: 'Algo deu errado',
      defaultMessage: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  };

  const config = errorConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-4 border rounded-lg', config.bgColor, config.borderColor, className)}>
        <Icon className={cn('w-5 h-5 flex-shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm', config.color)}>{displayTitle}</p>
          <p className="text-xs text-gray-600 truncate">{displayMessage}</p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      'flex flex-col items-center justify-center text-center p-8 sm:p-12',
      config.bgColor,
      config.borderColor,
      className
    )}>
      {/* Ícone com animação */}
      <div className={cn(
        'mb-4 p-4 rounded-full',
        config.bgColor,
        'ring-4',
        config.borderColor.replace('border-', 'ring-')
      )}>
        <Icon className={cn('w-12 h-12', config.color)} />
      </div>

      {/* Título */}
      <h3 className={cn('text-xl font-semibold mb-2', config.color)}>
        {displayTitle}
      </h3>

      {/* Mensagem */}
      <p className="text-gray-600 mb-6 max-w-md">
        {displayMessage}
      </p>

      {/* Botão de retry */}
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="default"
          className="bg-[#D50000] hover:bg-[#B00000] text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      )}
    </Card>
  );
}

// Variação inline (para usar em alerts)
export function InlineError({ 
  message, 
  onDismiss 
}: { 
  message: string; 
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <p className="flex-1 text-red-900">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 flex-shrink-0"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Error boundary component
export function ErrorBoundaryFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="mb-4 p-4 rounded-full bg-red-100 inline-block">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ocorreu um erro
        </h2>

        <p className="text-gray-600 mb-4">
          A aplicação encontrou um erro inesperado.
        </p>

        {/* Detalhes do erro (apenas em dev) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              Detalhes técnicos
            </summary>
            <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-auto max-h-40 text-red-600">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={resetErrorBoundary}
            variant="default"
            className="bg-[#D50000] hover:bg-[#B00000]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>

          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Voltar ao Início
          </Button>
        </div>
      </Card>
    </div>
  );
}
