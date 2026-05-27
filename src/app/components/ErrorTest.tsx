import { useState } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, Zap } from 'lucide-react';
import { debugErrorLogs, downloadErrorLogs, getErrorLogStats } from '../utils/errorLogger';

/**
 * ErrorTest - Componente de teste para Error Boundary
 * 
 * ATENÇÃO: Este componente é apenas para testes de desenvolvimento!
 * Não deve ser usado em produção.
 * 
 * Como testar:
 * 1. Adicione <ErrorTest /> temporariamente em qualquer página
 * 2. Clique em "Causar Erro de Renderização"
 * 3. Veja o Error Boundary em ação
 * 4. Remova o componente após os testes
 */
export function ErrorTest() {
  const [shouldThrowError, setShouldThrowError] = useState(false);

  if (shouldThrowError) {
    // Simula um erro de renderização
    throw new Error('Erro de teste: Componente forçou uma exceção para testar o Error Boundary');
  }

  const handleThrowError = () => {
    setShouldThrowError(true);
  };

  const handleAsyncError = async () => {
    // Simula erro assíncrono (não será capturado pelo Error Boundary)
    setTimeout(() => {
      throw new Error('Erro assíncrono de teste (não capturado pelo Error Boundary)');
    }, 100);
  };

  const handleShowLogs = () => {
    const stats = getErrorLogStats();
    console.group('📊 Error Logs Stats');
    console.log('Total:', stats.total);
    console.log('Errors:', stats.errors);
    console.log('Warnings:', stats.warnings);
    console.log('Infos:', stats.infos);
    console.log('Last 24h:', stats.last24h);
    console.log('Last 7 days:', stats.last7days);
    console.groupEnd();
    
    debugErrorLogs();
  };

  const handleDownloadLogs = () => {
    downloadErrorLogs('json');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 shadow-xl max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="text-yellow-600" size={20} />
        <h3 className="font-semibold text-yellow-900 text-sm">
          🧪 Error Boundary Test
        </h3>
      </div>
      
      <p className="text-xs text-yellow-700 mb-3">
        Apenas para desenvolvimento. Remova antes de fazer deploy!
      </p>
      
      <div className="space-y-2">
        <Button
          onClick={handleThrowError}
          variant="destructive"
          size="sm"
          className="w-full text-xs"
        >
          <Zap size={14} className="mr-1" />
          Causar Erro de Renderização
        </Button>
        
        <Button
          onClick={handleAsyncError}
          variant="outline"
          size="sm"
          className="w-full text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
        >
          Causar Erro Assíncrono
        </Button>
        
        <Button
          onClick={handleShowLogs}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Mostrar Logs (Console)
        </Button>
        
        <Button
          onClick={handleDownloadLogs}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Download Logs (JSON)
        </Button>
      </div>
    </div>
  );
}
