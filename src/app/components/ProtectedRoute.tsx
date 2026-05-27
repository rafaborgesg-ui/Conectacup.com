/**
 * Componente de Proteção de Rotas
 * Verifica se o usuário tem permissão para acessar uma página
 */

import { ReactNode, useEffect, useState } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { usePermissions } from '../utils/usePermissions';
import { PageKey, PAGES } from '../utils/permissions';

interface ProtectedRouteProps {
  page: PageKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ page, children, fallback }: ProtectedRouteProps) {
  const { hasPageAccess, getProfileName, isLoading, profile } = usePermissions();
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Timeout de segurança: se demorar mais de 3 segundos, assume que algo deu errado
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ ProtectedRoute - Timeout ao carregar perfil (3s)');
        setLoadTimeout(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Mostra loading enquanto carrega perfil (máximo 3 segundos)
  if (isLoading && !loadTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
          <p className="text-gray-400 text-sm mt-2">Carregando perfil de acesso</p>
        </div>
      </div>
    );
  }

  // Se deu timeout mas ainda está loading, mostra erro
  if (loadTimeout && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-gray-900 mb-3 text-2xl">Erro ao Carregar Permissões</h2>
          <p className="text-gray-600 mb-4">
            Não foi possível carregar seu perfil de acesso. Isso pode ser um problema de conexão.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-[#D50000] text-white rounded-lg hover:bg-[#B00000] transition-colors"
          >
            Tentar Novamente
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Se o problema persistir, entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  // Se não tem perfil carregado, mostra erro
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-gray-900 mb-3 text-2xl">Perfil Não Encontrado</h2>
          <p className="text-gray-600 mb-4">
            Não foi possível encontrar um perfil de acesso para seu usuário.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-[#D50000] text-white rounded-lg hover:bg-[#B00000] transition-colors"
          >
            Voltar para Home
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Entre em contato com um administrador para configurar suas permissões.
          </p>
        </div>
      </div>
    );
  }

  // Verifica se tem acesso à página
  if (!hasPageAccess(page)) {
    // Renderiza fallback personalizado ou página padrão de acesso negado
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-gray-900 mb-3 text-2xl">Acesso Negado</h2>
          <p className="text-gray-600 mb-2">
            Você não tem permissão para acessar esta página.
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Seu perfil:</strong> {getProfileName()}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Entre em contato com um administrador se você acredita que deveria ter acesso a esta área.
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Tem acesso - renderiza o componente filho
  return <>{children}</>;
}