import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary capturou erro:', error);
    console.error('📍 Component Stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo
    });
    
    // TODO: Enviar para serviço de monitoramento
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, {
    //     extra: {
    //       componentStack: errorInfo.componentStack
    //     }
    //   });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    // ✅ Usa router em vez de window.location.reload() para evitar IframeMessageAbortError
    // Força remontagem do componente limpando o erro
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Se foi fornecido um fallback customizado, usa ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-2xl w-full bg-white shadow-xl rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg">
                  <AlertTriangle className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Erro Inesperado
                  </h1>
                  <p className="text-red-100 mt-1">
                    Algo deu errado. Não se preocupe, seus dados estão seguros.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Ocorreu um erro inesperado na aplicação. Você pode tentar uma das opções abaixo:
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw size={18} />
                  <span>Tentar Novamente</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Home size={18} />
                  <span>Ir para Início</span>
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw size={18} />
                  <span>Recarregar Página</span>
                </button>
              </div>

              {/* Error Details (apenas em desenvolvimento) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <summary className="cursor-pointer font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-600" />
                    Detalhes Técnicos (apenas visível em desenvolvimento)
                  </summary>
                  
                  <div className="space-y-4">
                    {/* Error Message */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">MENSAGEM:</p>
                      <pre className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 overflow-x-auto">
                        {this.state.error.message}
                      </pre>
                    </div>

                    {/* Stack Trace */}
                    {this.state.error.stack && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">STACK TRACE:</p>
                        <pre className="text-xs text-gray-700 bg-gray-100 p-3 rounded border border-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component Stack */}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">COMPONENT STACK:</p>
                        <pre className="text-xs text-gray-700 bg-gray-100 p-3 rounded border border-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Instruções para produção */}
              {!import.meta.env.DEV && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">💡 Dica:</span> Se o problema persistir, tente limpar o cache do navegador ou entre em contato com o suporte técnico.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Conecta Cup - Sistema de Conferência de Pneus
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar ErrorBoundary de forma funcional
 * 
 * Exemplo:
 * ```tsx
 * function MyComponent() {
 *   const throwError = useErrorHandler();
 *   
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       throwError(error);
 *     }
 *   };
 * }
 * ```
 */
export function useErrorHandler() {
  const [, setError] = React.useState();
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}