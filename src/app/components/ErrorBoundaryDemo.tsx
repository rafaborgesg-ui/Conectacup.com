import { useState } from 'react';
import { AlertTriangle, Bug } from 'lucide-react';
import { useErrorHandler } from './ErrorBoundary';

/**
 * 🧪 COMPONENTE DE DEMONSTRAÇÃO - ErrorBoundary
 * 
 * Este componente serve para TESTAR o ErrorBoundary.
 * NÃO deve ser usado em produção.
 * 
 * Para usar:
 * 1. Importar em qualquer página
 * 2. Adicionar <ErrorBoundaryDemo /> no JSX
 * 3. Clicar nos botões de teste
 */
export function ErrorBoundaryDemo() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const throwError = useErrorHandler();
  
  // Simula erro síncrono (capturado pelo ErrorBoundary)
  if (shouldThrow) {
    throw new Error('🧪 ERRO DE TESTE: Simulação de erro síncrono no componente React');
  }
  
  // Simula erro assíncrono (via useErrorHandler)
  const handleAsyncError = async () => {
    try {
      // Simula chamada API que falha
      await new Promise((_, reject) => 
        setTimeout(() => reject(new Error('🧪 ERRO DE TESTE: Simulação de erro assíncrono (ex: API falhou)')), 1000)
      );
    } catch (error) {
      throwError(error as Error);
    }
  };
  
  // Simula erro em event handler
  const handleEventError = () => {
    try {
      // @ts-ignore - Força erro proposital
      const obj = null;
      obj.propriedade.inexistente;
    } catch (error) {
      throwError(error as Error);
    }
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-w-sm">
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bug className="text-orange-600" size={20} />
          <h3 className="font-bold text-orange-900">🧪 Teste ErrorBoundary</h3>
        </div>
        
        <p className="text-xs text-orange-700 mb-3">
          Use os botões abaixo para testar se o ErrorBoundary está funcionando corretamente.
        </p>
        
        <div className="space-y-2">
          {/* Teste 1: Erro Síncrono */}
          <button
            onClick={() => setShouldThrow(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            <AlertTriangle size={16} />
            <span>Erro Síncrono (Render)</span>
          </button>
          
          {/* Teste 2: Erro Assíncrono */}
          <button
            onClick={handleAsyncError}
            className="w-full flex items-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
          >
            <AlertTriangle size={16} />
            <span>Erro Assíncrono (API)</span>
          </button>
          
          {/* Teste 3: Erro em Event Handler */}
          <button
            onClick={handleEventError}
            className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
          >
            <AlertTriangle size={16} />
            <span>Erro em Event Handler</span>
          </button>
        </div>
        
        <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
          <strong>Resultado esperado:</strong> Tela de erro profissional com 3 opções de recovery.
        </div>
      </div>
    </div>
  );
}

/**
 * Versão inline para adicionar em qualquer página rapidamente
 */
export const ErrorTestButton = () => {
  const [show, setShow] = useState(false);
  
  if (show) {
    throw new Error('🧪 Teste de ErrorBoundary');
  }
  
  return (
    <button
      onClick={() => setShow(true)}
      className="fixed bottom-4 right-4 z-[9999] px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors"
    >
      🧪 Testar ErrorBoundary
    </button>
  );
};
