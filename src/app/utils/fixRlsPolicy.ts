/**
 * 🔧 FIX RLS POLICY - Corrige automaticamente a política RLS de conference_sessions
 * 
 * PROBLEMA: A política USING (is_active = true) impede desativar sessões
 * SOLUÇÃO: Muda para USING (true) permitindo qualquer atualização
 */

import { createClient } from './supabase/client';

/**
 * Tenta corrigir a política RLS automaticamente
 * Retorna true se conseguiu corrigir, false se precisa de Service Role Key
 */
export async function tryFixRlsPolicy(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();
    
    console.log('🔧 Tentando corrigir política RLS automaticamente...');
    
    // Tenta executar o SQL de correção
    // NOTA: Isso só funciona se o usuário tiver permissões de admin
    const { error } = await supabase.rpc('fix_conference_sessions_rls_policy');
    
    if (error) {
      console.error('❌ Não foi possível corrigir automaticamente:', error);
      return {
        success: false,
        message: 'Você precisa executar o SQL manualmente no Supabase Dashboard'
      };
    }
    
    console.log('✅ Política RLS corrigida automaticamente!');
    return {
      success: true,
      message: 'Política RLS corrigida com sucesso!'
    };
  } catch (error) {
    console.error('❌ Erro ao tentar corrigir RLS:', error);
    return {
      success: false,
      message: 'Erro ao tentar corrigir automaticamente'
    };
  }
}

/**
 * Retorna o SQL que precisa ser executado manualmente
 */
export function getRlsFixSql(): string {
  return `
-- ============================================
-- FIX RLS ERROR: conference_sessions
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Pronto! Erro corrigido.
-- ============================================
`.trim();
}

/**
 * Copia o SQL para a área de transferência
 */
export async function copyRlsFixSqlToClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getRlsFixSql());
    return true;
  } catch (error) {
    console.error('Erro ao copiar para área de transferência:', error);
    return false;
  }
}
