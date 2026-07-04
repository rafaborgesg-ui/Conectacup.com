/**
 * Hook para verificação de permissões
 * Facilita o uso do sistema RBAC em componentes React
 */

import { useState, useEffect, useRef } from 'react';
import {
  getCurrentUserProfile,
  getCurrentUserProfileAsync,
  reloadCurrentUserProfile,
  canAccessPage,
  canAccessFeature,
  isAdmin,
  isAdministratorProfile,
  hasPageAccess as profileHasPageAccess,
  hasFeatureAccess as profileHasFeatureAccess,
  PageKey,
  FeatureKey,
  AccessProfile,
} from './permissions';

// 🆕 SINGLETON - Garante uma única instância do perfil carregado
let GLOBAL_PROFILE: AccessProfile | null = null;
let GLOBAL_LOADING = false;
let PROFILE_LOAD_PROMISE: Promise<AccessProfile | null> | null = null;

export function usePermissions() {
  const [profile, setProfile] = useState<AccessProfile | null>(GLOBAL_PROFILE);
  const [isLoading, setIsLoading] = useState(GLOBAL_LOADING);
  const loadAttempted = useRef(false); // Evita múltiplas chamadas

  // Carrega perfil do Supabase na inicialização
  useEffect(() => {
    // Se já carregou, usa o perfil global
    if (GLOBAL_PROFILE && !loadAttempted.current) {
      console.log('✅ usePermissions - Usando perfil global em cache');
      setProfile(GLOBAL_PROFILE);
      setIsLoading(false);
      loadAttempted.current = true;
      return;
    }

    // Se já está carregando, aguarda a promessa
    if (PROFILE_LOAD_PROMISE) {
      console.log('⏳ usePermissions - Aguardando carregamento em andamento...');
      setIsLoading(true);
      PROFILE_LOAD_PROMISE.then(loadedProfile => {
        setProfile(loadedProfile);
        setIsLoading(false);
      });
      return;
    }

    // Inicia novo carregamento
    if (!loadAttempted.current) {
      loadAttempted.current = true;
      loadProfile();
    }
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      GLOBAL_LOADING = true;
      console.log('🔐 usePermissions - Carregando perfil do Supabase...');
      
      // Verifica se há usuário logado primeiro
      const userStr = localStorage.getItem('porsche-cup-user');
      if (!userStr) {
        console.warn('⚠️ usePermissions - Nenhum usuário logado');
        setProfile(null);
        setIsLoading(false);
        GLOBAL_LOADING = false;
        GLOBAL_PROFILE = null;
        return;
      }
      
      // 🚀 FAST PATH: Carrega perfil do cache LOCAL primeiro (instantâneo)
      const cachedProfile = getCurrentUserProfile();
      if (cachedProfile) {
        console.log('⚡ Fast path - Usando perfil do cache:', cachedProfile.name);
        GLOBAL_PROFILE = cachedProfile;
        setProfile(cachedProfile);
        setIsLoading(false); // ✅ Para o loading imediatamente
        GLOBAL_LOADING = false;
      }
      
      // 🔄 Background: Tenta atualizar do Supabase (não bloqueia UI)
      try {
        console.log('🔄 Background - Verificando atualizações no Supabase...');
        PROFILE_LOAD_PROMISE = getCurrentUserProfileAsync();
        const currentProfile = await PROFILE_LOAD_PROMISE;
        
        if (currentProfile) {
          console.log('✅ Perfil do Supabase carregado:', currentProfile.name);
          console.log('🔄 Atualizando perfil com versão do Supabase');
          GLOBAL_PROFILE = currentProfile;
          setProfile(currentProfile);
        }
      } catch (bgError) {
        // Falha silenciosa - já temos o cache
        console.log('ℹ️ Supabase indisponível - usando perfil do cache');
      }
      
    } catch (error) {
      // Trata erros de forma silenciosa - não loga como erro crítico
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('⚠️ usePermissions - Erro de conexão (offline ou Supabase indisponível)');
      } else {
        console.warn('⚠️ usePermissions - Erro ao carregar perfil:', error);
      }
      
      // Fallback para cache local
      const cachedProfile = getCurrentUserProfile();
      if (cachedProfile) {
        console.log('ℹ️ usePermissions - Usando perfil do cache local:', cachedProfile.name);
        GLOBAL_PROFILE = cachedProfile;
      }
      setProfile(cachedProfile);
    } finally {
      setIsLoading(false);
      GLOBAL_LOADING = false;
      PROFILE_LOAD_PROMISE = null;
    }
  }

  // Função para recarregar perfil manualmente
  const refreshProfile = async () => {
    try {
      setIsLoading(true);
      GLOBAL_LOADING = true;
      console.log('🔄 Recarregando perfil...');
      
      const updatedProfile = await reloadCurrentUserProfile();
      
      if (updatedProfile) {
        console.log('✅ Perfil atualizado:', updatedProfile.name);
        GLOBAL_PROFILE = updatedProfile;
        setProfile(updatedProfile);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao recarregar perfil:', error);
      return false;
    } finally {
      setIsLoading(false);
      GLOBAL_LOADING = false;
    }
  };

  // Verifica se tem acesso a uma página
  const hasPageAccess = (page: PageKey): boolean => {
    if (!profile) return false;
    
    // 🔥 REGRA ESPECIAL: Se tem acesso à página pai, tem acesso às páginas de detalhes
    // Exemplo: conferir-pneus → conferir-pneus-detalhes
    if (page === 'conferir_pneus_detalhes' && profileHasPageAccess(profile, 'conferir_pneus' as PageKey)) {
      return true;
    }
    
    return profileHasPageAccess(profile, page);
  };

  // Verifica se tem acesso a uma funcionalidade
  const hasFeatureAccess = (feature: FeatureKey): boolean => {
    if (!profile) return false;
    return profileHasFeatureAccess(profile, feature);
  };

  // Verifica se é admin
  const isUserAdmin = (): boolean => {
    return isAdministratorProfile(profile);
  };

  // Verifica se tem acesso a múltiplas funcionalidades (OR)
  const hasAnyFeatureAccess = (features: FeatureKey[]): boolean => {
    if (!profile) return false;
    if (isAdministratorProfile(profile)) return true;
    return features.some(feature => profileHasFeatureAccess(profile, feature));
  };

  // Verifica se tem acesso a todas as funcionalidades (AND)
  const hasAllFeaturesAccess = (features: FeatureKey[]): boolean => {
    if (!profile) return false;
    if (isAdministratorProfile(profile)) return true;
    return features.every(feature => profileHasFeatureAccess(profile, feature));
  };

  // Verifica se tem acesso a múltiplas páginas (OR)
  const hasAnyPageAccess = (pages: PageKey[]): boolean => {
    if (!profile) return false;
    if (isAdministratorProfile(profile)) return true;
    return pages.some(page => profileHasPageAccess(profile, page));
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

// 🆕 Função para limpar cache global (útil para logout)
export function clearPermissionsCache() {
  GLOBAL_PROFILE = null;
  GLOBAL_LOADING = false;
  PROFILE_LOAD_PROMISE = null;
  console.log('🧹 Cache de permissões limpo');
}
