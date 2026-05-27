/**
 * 🔧 UTILITÁRIO: Executar Migration RLS
 * 
 * Script para corrigir a política RLS da tabela conference_sessions
 * que estava bloqueando UPDATE quando is_active = false
 */

import { projectId, publicAnonKey } from './supabase/info';

export async function fixConferenceSessionsRLS() {
  console.log('🔧 Iniciando correção da política RLS via servidor...');
  
  try {
    // Chama o endpoint do servidor que tem acesso ao SERVICE_ROLE_KEY
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/migrations/fix-rls-conference-sessions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao executar migration:', errorData);
      console.log('\n📋 Execute manualmente no SQL Editor do Supabase:');
      console.log(errorData.sql || 'Ver /supabase/migrations/FIX_RLS_CONFERENCE_SESSIONS_UPDATE.sql');
      return { success: false, error: errorData };
    }
    
    const data = await response.json();
    console.log('✅ Migration disponível!');
    console.log('\n📋 INSTRUÇÕES:');
    console.log('1. Acesse o Supabase Dashboard → SQL Editor');
    console.log('2. Cole e execute o SQL abaixo:\n');
    console.log(data.sql);
    console.log('\n3. Após executar, teste salvando uma conferência');
    
    return { success: true, data };
    
  } catch (err: any) {
    console.error('❌ Erro ao conectar com servidor:', err);
    console.log('\n📋 Execute manualmente no SQL Editor do Supabase:');
    console.log(`
-- Remove política antiga
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

-- Cria política corrigida
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (true);
    `);
    return { success: false, error: err?.message || err };
  }
}

// Função auxiliar para chamar do console do navegador
(window as any).fixConferenceSessionsRLS = fixConferenceSessionsRLS;

console.log('💡 Para corrigir o RLS, execute no console: window.fixConferenceSessionsRLS()');