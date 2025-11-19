/**
 * Componente de Proteção de Rotas
 * Verifica se o usuário tem permissão para acessar uma página
 */

import { ReactNode } from 'react';
import { Shield, Lock } from 'lucide-react';
import { usePermissions } from '../utils/usePermissions';
import { PageKey, PAGES } from '../utils/permissions';

interface ProtectedRouteProps {
  page: PageKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ page, children, fallback }: ProtectedRouteProps) {
  const { hasPageAccess, getProfileName, isLoading } = usePermissions();

  // Mostra loading enquanto carrega perfil
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
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
        </div>
      </div>
    );
  }

  // Tem acesso - renderiza o componente filho
  return <>{children}</>;
}

/**
 * Componente de Botão Protegido
 * Desabilita o botão se o usuário não tiver a funcionalidade necessária
 */

import { FeatureKey } from '../utils/permissions';
import { Button } from './ui/button';

interface ProtectedButtonProps {
  feature: FeatureKey;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function ProtectedButton({
  feature,
  children,
  onClick,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  title,
  type = 'button',
}: ProtectedButtonProps) {
  const { hasFeatureAccess } = usePermissions();
  
  const hasAccess = hasFeatureAccess(feature);
  const isDisabled = disabled || !hasAccess;
  
  return (
    <Button
      type={type}
      onClick={onClick}
      className={className}
      variant={variant}
      size={size}
      disabled={isDisabled}
      title={!hasAccess ? 'Você não tem permissão para esta ação' : title}
    >
      {children}
      {!hasAccess && (
        <Lock className="ml-2 w-3 h-3 opacity-50" />
      )}
    </Button>
  );
}

/**
 * Componente de Ação Condicional
 * Renderiza conteúdo apenas se o usuário tiver a funcionalidade
 */

interface ConditionalFeatureProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConditionalFeature({ feature, children, fallback = null }: ConditionalFeatureProps) {
  const { hasFeatureAccess } = usePermissions();
  
  if (!hasFeatureAccess(feature)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
