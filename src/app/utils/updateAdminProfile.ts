/**
 * Script para atualizar o perfil de administrador no Supabase
 * Este script deve ser executado sempre que novas páginas forem adicionadas ao sistema
 * para garantir que o perfil admin tenha acesso a todas elas.
 */

import { createClient } from './supabase/client';
import { PAGES, FEATURES } from './permissions';

/**
 * Atualiza o perfil de administrador com todas as páginas e funcionalidades do sistema
 */
export async function updateAdminProfileWithAllPages() {
  try {
    console.log('🔄 Atualizando perfil de administrador...');
    
    const supabase = createClient();
    
    // Obtém todas as páginas e funcionalidades
    const allPages = Object.values(PAGES);
    const allFeatures = Object.values(FEATURES);
    
    console.log(`📋 Total de páginas: ${allPages.length}`);
    console.log(`⚙️ Total de funcionalidades: ${allFeatures.length}`);
    
    // Atualiza o perfil admin
    const { data, error } = await supabase
      .from('access_profiles')
      .update({
        pages: allPages,
        features: allFeatures,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'admin')
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar perfil admin:', error);
      return false;
    }
    
    console.log('✅ Perfil admin atualizado com sucesso!');
    console.log('📋 Páginas atualizadas:', data);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil admin:', error);
    return false;
  }
}

/**
 * Função para ser chamada no console do navegador
 * Execute: window.updateAdminProfile()
 */
if (typeof window !== 'undefined') {
  (window as any).updateAdminProfile = async () => {
    const success = await updateAdminProfileWithAllPages();
    if (success) {
      alert('✅ Perfil admin atualizado! Faça logout e login novamente para aplicar as mudanças.');
    } else {
      alert('❌ Erro ao atualizar perfil admin. Verifique o console para mais detalhes.');
    }
  };
  
  console.log('💡 Para atualizar o perfil admin, execute: window.updateAdminProfile()');
}
