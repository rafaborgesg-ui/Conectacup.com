/**
 * 🔧 Script de Auto-Correção do RLS
 * 
 * Tenta executar automaticamente a correção do RLS ao iniciar a aplicação.
 * Se falhar, não bloqueia o app - apenas loga o erro.
 * 
 * NOTA: Este auto-fix provavelmente NÃO funcionará porque requer permissões
 * especiais do banco de dados. A correção DEVE ser feita manualmente via
 * Supabase SQL Editor. Este código existe apenas como tentativa de conveniência.
 */

import { projectId, publicAnonKey } from './supabase/info';

let FIX_ATTEMPTED = false;

async function tryFixRLS() {
  // Executa apenas uma vez
  if (FIX_ATTEMPTED) return;
  FIX_ATTEMPTED = true;

  try {
    console.log('🔧 [AUTO-FIX] Verificando se RLS precisa ser corrigido...');
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-641f9dbc/migrations/fix-rls-conference-sessions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    // Se a rota não existe (404), ignora silenciosamente
    if (response.status === 404) {
      console.log('ℹ️ [AUTO-FIX] Rota de auto-correção não disponível. Use /administracao/debug se necessário.');
      return;
    }
    
    // Verifica se a resposta é JSON válido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Ignora silenciosamente - não é crítico
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ [AUTO-FIX] RLS corrigido automaticamente!');
    } else if (data.needsManualExecution) {
      console.log('ℹ️ [AUTO-FIX] Use /administracao/debug para corrigir RLS manualmente se necessário.');
    }
    
  } catch (error: any) {
    // Ignora silenciosamente - auto-fix não é crítico
    // Usuário pode corrigir manualmente quando o erro RLS aparecer
  }
}

// Executa após 2 segundos (dá tempo do Supabase inicializar)
setTimeout(() => {
  tryFixRLS();
}, 2000);

export {};