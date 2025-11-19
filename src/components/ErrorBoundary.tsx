import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorCount: number;
}

/**
 * ErrorBoundary - Captura erros React globalmente
 * 
 * Funcionalidades:
 * - Captura erros não tratados
 * - Exibe UI amigável ao usuário
 * - Logs automáticos para debug
 * - Opções de recuperação
 * - Stack trace expandível
 * - Copy to clipboard
 * 
 * Uso:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: props.showDetails || false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro para o console
    console.error('🚨 Error Boundary capturou um erro:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);

    // Incrementa contador de erros
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Callback personalizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log estruturado para possível envio a serviço de monitoramento
    this.logError(error, errorInfo);

    // Toast notification
    toast.error('Erro detectado', {
      description: 'Um erro inesperado ocorreu. A aplicação foi estabilizada.',
      duration: 5000,
    });
  }

  logError(error: Error, errorInfo: ErrorInfo) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorCount: this.state.errorCount + 1,
    };

    // Log no console em formato estruturado
    console.group('🚨 Error Boundary - Detalhes Completos');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Timestamp:', errorLog.timestamp);
    console.error('URL:', errorLog.url);
    console.error('Contador:', errorLog.errorCount);
    console.groupEnd();

    // Salvar no localStorage para debug posterior
    try {
      const savedErrors = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
      savedErrors.push(errorLog);
      
      // Mantém apenas os últimos 10 erros
      const recentErrors = savedErrors.slice(-10);
      localStorage.setItem('app_error_logs', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Não foi possível salvar log de erro no localStorage:', e);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    
    toast.success('Aplicação reiniciada', {
      description: 'Você pode continuar de onde parou.',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo } = this.state;
    
    const errorText = `
Erro na Aplicação - Porsche Cup Brasil
========================================

MENSAGEM:
${error?.message || 'Erro desconhecido'}

STACK TRACE:
${error?.stack || 'Não disponível'}

COMPONENT STACK:
${errorInfo?.componentStack || 'Não disponível'}

INFORMAÇÕES DO SISTEMA:
- Data/Hora: ${new Date().toLocaleString('pt-BR')}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
- Contador de Erros: ${this.state.errorCount}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      toast.success('Copiado!', {
        description: 'Detalhes do erro copiados para a área de transferência.',
        duration: 3000,
      });
    } catch (e) {
      console.error('Erro ao copiar:', e);
      toast.error('Erro ao copiar', {
        description: 'Não foi possível copiar os detalhes.',
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI padrão de erro
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-6 sm:p-8 shadow-xl border-2 border-gray-200">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-[#D50000]" size={24} />
              </div>
              <div className="flex-1">
                <h1 className="text-gray-900 text-xl sm:text-2xl mb-2">
                  Algo deu errado
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Um erro inesperado ocorreu na aplicação. Não se preocupe, seus dados estão seguros.
                </p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-900 text-sm font-mono break-words">
                {this.state.error?.message || 'Erro desconhecido'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <Button
                onClick={this.handleReset}
                className="w-full bg-[#D50000] hover:bg-[#B00000] text-white"
              >
                <RefreshCw size={16} className="mr-2" />
                Tentar Novamente
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                <RefreshCw size={16} className="mr-2" />
                Recarregar Página
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home size={16} className="mr-2" />
                Ir para Início
              </Button>
            </div>

            {/* Details Toggle */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={this.toggleDetails}
                className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Detalhes técnicos do erro</span>
                {this.state.showDetails ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              {/* Expanded Details */}
              {this.state.showDetails && (
                <div className="mt-4 space-y-4">
                  {/* Stack Trace */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Stack Trace
                      </p>
                      <Button
                        onClick={this.copyErrorToClipboard}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        <Copy size={12} className="mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {this.state.error?.stack || 'Stack trace não disponível'}
                      </pre>
                    </div>
                  </div>

                  {/* Component Stack */}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                        Component Stack
                      </p>
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-words">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* System Info */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      Informações do Sistema
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 text-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="font-mono">{new Date().toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">URL:</span>
                        <span className="font-mono truncate ml-2 max-w-xs" title={window.location.href}>
                          {window.location.pathname}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Erros nesta sessão:</span>
                        <span className="font-mono">{this.state.errorCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Se o problema persistir, entre em contato com o suporte técnico e forneça os detalhes acima.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary - HOC para adicionar Error Boundary a um componente
 * 
 * Uso:
 * export default withErrorBoundary(MyComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * ErrorBoundaryReset - Hook para componentes funcionais
 * Permite que componentes filhos resetem o error boundary
 */
export const ErrorBoundaryContext = React.createContext<{
  resetError: () => void;
} | null>(null);
