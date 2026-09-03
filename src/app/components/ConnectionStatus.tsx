/**
 * Componente de Status de Conexão
 * 
 * Exibe o status atual da conexão e operações pendentes na queue offline
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { offlineQueue, QueueStats } from '../utils/offlineQueue';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    failed: 0,
    syncing: false,
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Listener para mudanças na queue
    const handleQueueUpdate = (stats: QueueStats) => {
      setQueueStats(stats);
    };

    offlineQueue.addListener(handleQueueUpdate);

    // Listeners de conexão
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      offlineQueue.removeListener(handleQueueUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Não mostra nada se estiver online e sem operações pendentes
  if (isOnline && queueStats.total === 0) {
    return null;
  }

  const handleSyncNow = () => {
    offlineQueue.forceSyncNow();
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {/* Banner Principal */}
      <div
        className={`
          rounded-lg shadow-lg border-2 p-3 transition-all duration-300
          ${isOnline 
            ? queueStats.syncing
              ? 'bg-blue-50 border-blue-300'
              : queueStats.pending > 0
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Ícone de Status */}
          <div className="flex-shrink-0">
            {isOnline ? (
              queueStats.syncing ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : queueStats.pending > 0 ? (
                <Cloud className="h-5 w-5 text-yellow-600" />
              ) : (
                <Wifi className="h-5 w-5 text-green-600" />
              )
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-sm ${
                isOnline ? 'text-gray-800' : 'text-red-800'
              }`}>
                {isOnline 
                  ? queueStats.syncing 
                    ? 'Sincronizando...' 
                    : queueStats.pending > 0
                      ? 'Operações Pendentes'
                      : 'Conectado'
                  : 'Sem Conexão'
                }
              </h3>
              
              {queueStats.total > 0 && (
                <Badge variant={queueStats.failed > 0 ? "destructive" : "secondary"} className="text-xs">
                  {queueStats.total}
                </Badge>
              )}
            </div>

            <p className="text-xs text-gray-600 mb-2">
              {isOnline ? (
                queueStats.syncing ? (
                  'Enviando dados para o servidor...'
                ) : queueStats.pending > 0 ? (
                  `${queueStats.pending} ${queueStats.pending === 1 ? 'operação aguardando' : 'operações aguardando'} sincronização`
                ) : (
                  'Todas as operações foram salvas'
                )
              ) : (
                'Suas alterações serão salvas quando a conexão voltar'
              )}
            </p>

            {/* Detalhes Expandíveis */}
            {queueStats.total > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
              </button>
            )}

            {showDetails && queueStats.total > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Pendentes:</span>
                  <span className="font-medium">{queueStats.pending}</span>
                </div>
                {queueStats.failed > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Com erro:</span>
                    <span className="font-medium text-red-600">{queueStats.failed}</span>
                  </div>
                )}
                {isOnline && !queueStats.syncing && queueStats.pending > 0 && (
                  <Button
                    onClick={handleSyncNow}
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 text-xs h-7"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sincronizar Agora
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Botão Fechar (apenas quando expandido) */}
          {showDetails && (
            <button
              onClick={() => setShowDetails(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Alerta para Offline */}
        {!isOnline && (
          <div className="mt-3 pt-3 border-t border-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Continue trabalhando. Seus dados estão sendo salvos localmente e serão sincronizados automaticamente quando a conexão voltar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
