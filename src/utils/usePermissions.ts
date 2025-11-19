/**
 * Hook para verificação de permissões
 * Facilita o uso do sistema RBAC em componentes React
 */

import { useState, useEffect } from 'react';
import {
  getCurrentUserProfile,
  getCurrentUserProfileAsync,
  reloadCurrentUserProfile,
  canAccessPage,
  canAccessFeature,
  isAdmin,
  PageKey,
  FeatureKey,
  AccessProfile,
} from './permissions';

export function usePermissions() {
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega perfil do Supabase na inicialização
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      console.log('🔐 usePermissions - Carregando perfil do Supabase...');
      
      const currentProfile = await getCurrentUserProfileAsync();
      
      if (currentProfile) {
        console.log('✅ usePermissions - Perfil carregado:', currentProfile.name);
        console.log('📋 Páginas permitidas:', currentProfile.pages);
      } else {
        console.warn('⚠️ usePermissions - Nenhum perfil encontrado');
      }
      
      setProfile(currentProfile);
    } catch (error) {
      console.error('❌ usePermissions - Erro ao carregar perfil:', error);
      
      // Fallback para cache local
      const cachedProfile = getCurrentUserProfile();
      if (cachedProfile) {
        console.log('ℹ️ usePermissions - Usando perfil do cache local:', cachedProfile.name);
      }
      setProfile(cachedProfile);
    } finally {
      setIsLoading(false);
    }
  }

  // Função para recarregar perfil manualmente
  const refreshProfile = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Recarregando perfil...');
      
      const updatedProfile = await reloadCurrentUserProfile();
      
      if (updatedProfile) {
        console.log('✅ Perfil atualizado:', updatedProfile.name);
        setProfile(updatedProfile);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao recarregar perfil:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica se tem acesso a uma página
  const hasPageAccess = (page: PageKey): boolean => {
    if (!profile) return false;
    return profile.pages.includes(page);
  };

  // Verifica se tem acesso a uma funcionalidade
  const hasFeatureAccess = (feature: FeatureKey): boolean => {
    if (!profile) return false;
    return profile.features.includes(feature);
  };

  // Verifica se é admin
  const isUserAdmin = (): boolean => {
    return profile?.id === 'admin';
  };

  // Verifica se tem acesso a múltiplas funcionalidades (OR)
  const hasAnyFeatureAccess = (features: FeatureKey[]): boolean => {
    if (!profile) return false;
    return features.some(feature => profile.features.includes(feature));
  };

  // Verifica se tem acesso a todas as funcionalidades (AND)
  const hasAllFeaturesAccess = (features: FeatureKey[]): boolean => {
    if (!profile) return false;
    return features.every(feature => profile.features.includes(feature));
  };

  // Verifica se tem acesso a múltiplas páginas (OR)
  const hasAnyPageAccess = (pages: PageKey[]): boolean => {
    if (!profile) return false;
    return pages.some(page => profile.pages.includes(page));
  };

  // Obtém o perfil atual
  const currentProfile = (): AccessProfile | null => {
    return profile;
  };

  // Obtém o nome do perfil
  const getProfileName = (): string => {
    return profile?.name || 'Sem perfil';
  };

  // Obtém a descrição do perfil
  const getProfileDescription = (): string => {
    return profile?.description || '';
  };

  return {
    profile,
    isLoading,
    hasPageAccess,
    hasFeatureAccess,
    isUserAdmin,
    hasAnyFeatureAccess,
    hasAllFeaturesAccess,
    hasAnyPageAccess,
    currentProfile,
    getProfileName,
    getProfileDescription,
    refreshProfile,
  };
}