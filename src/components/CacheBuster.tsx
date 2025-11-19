import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * CacheBuster - Componente de diagnóstico de cache
 * Detecta quando o código está em cache antigo e força reload
 */

// Versão do código - MUDE ESTE NÚMERO QUANDO FIZER UPDATES CRÍTICOS
const CODE_VERSION = '2.3.0'; // FIX: Erros de status removidos + Mobile enhancements integrado

export function CacheBuster() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // ⏱️ DELAY: Aguarda 3 segundos antes de verificar versão
    // Isso evita que o banner apareça imediatamente após login
    const checkVersionTimeout = setTimeout(() => {
      // Verifica a versão armazenada
      const storedVersion = localStorage.getItem('app-code-version');
      
      console.log(`🔍 CacheBuster: Versão atual: ${CODE_VERSION}, Armazenada: ${storedVersion || 'nenhuma'}`);
      
      if (!storedVersion) {
        // Primeira execução - salva versão
        localStorage.setItem('app-code-version', CODE_VERSION);
        console.log('✅ CacheBuster: Primeira execução, versão salva');
      } else if (storedVersion !== CODE_VERSION) {
        // Versão diferente - precisa atualizar
        console.warn('⚠️ CacheBuster: VERSÃO DESATUALIZADA! Necessário hard refresh.');
        console.warn(`   Esperado: ${CODE_VERSION}, Atual: ${storedVersion}`);
        
        // Verifica se usuário já dispensou este alerta na sessão atual
        const dismissedInSession = sessionStorage.getItem('cache-buster-dismissed');
        if (!dismissedInSession) {
          setNeedsRefresh(true);
        }
      } else {
        console.log('✅ CacheBuster: Versão atualizada');
      }
    }, 3000); // 3 segundos de delay
    
    return () => clearTimeout(checkVersionTimeout);
  }, []);

  const handleHardRefresh = () => {
    console.log('🔄 CacheBuster: Executando hard refresh...');
    setIsRefreshing(true);
    
    // Atualiza a versão no localStorage
    localStorage.setItem('app-code-version', CODE_VERSION);
    
    // Desregistra service workers (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('🗑️ Desregistrando service worker...');
          registration.unregister();
        });
      });
    }
    
    // Limpa cache do service worker
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log(`🗑️ Limpando cache: ${name}`);
          caches.delete(name);
        });
      });
    }
    
    // Aguarda um pouco e força reload
    setTimeout(() => {
      console.log('🔄 Forçando reload...');
      // Hard reload - força buscar do servidor
      window.location.reload();
    }, 500);
  };

  const handleDismiss = () => {
    // Marca como dispensado na sessão atual
    sessionStorage.setItem('cache-buster-dismissed', 'true');
    setIsDismissed(true);
    setNeedsRefresh(false);
  };

  if (!needsRefresh || isDismissed) {
    return null; // Não mostra nada se está atualizado ou foi dispensado
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#D50000]/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#D50000]" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Atualização Disponível
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Uma nova versão do sistema está disponível. Recomendamos atualizar para garantir o melhor funcionamento.
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Versão atual (cache):</span>
                <span className="font-mono font-semibold text-[#D50000]">
                  {localStorage.getItem('app-code-version') || 'desconhecida'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Versão nova (servidor):</span>
                <span className="font-mono font-semibold text-[#00A86B]">
                  {CODE_VERSION}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleHardRefresh}
                disabled={isRefreshing}
                className="w-full bg-[#D50000] hover:bg-[#B00000] text-white"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar Agora
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="w-full"
                disabled={isRefreshing}
              >
                Continuar Sem Atualizar
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-2">
                Você pode continuar usando o sistema normalmente. A atualização estará disponível no próximo acesso.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
