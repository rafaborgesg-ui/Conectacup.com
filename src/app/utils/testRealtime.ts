// 🔍 DIAGNÓSTICO DE REALTIME - Execute este arquivo no console do navegador
// Cole este código no DevTools Console para testar a conexão Realtime

import { createClient } from './supabase/client';

export async function testRealtimeConnection() {
  console.log('🔍🔍🔍 ========================================');
  console.log('🔍 INICIANDO DIAGNÓSTICO DE REALTIME');
  console.log('🔍 ========================================');
  
  const supabase = createClient();
  
  // Passo 1: Verificar se há sessões ativas
  console.log('\n📊 PASSO 1: Verificando sessões ativas...');
  const { data: sessions, error: sessionsError } = await supabase
    .from('conference_sessions')
    .select('*')
    .eq('is_active', true);
  
  if (sessionsError) {
    console.error('❌ Erro ao buscar sessões:', sessionsError);
    return;
  }
  
  if (!sessions || sessions.length === 0) {
    console.warn('⚠️ Nenhuma sessão ativa encontrada');
    console.log('💡 Carregue uma planilha primeiro para criar uma sessão');
    return;
  }
  
  const session = sessions[0];
  console.log('✅ Sessão ativa encontrada:', session.id);
  console.log('   - Nome:', session.season_name);
  console.log('   - Arquivo:', session.file_name);
  console.log('   - Criada em:', session.created_at);
  
  // Passo 2: Verificar se a tabela está na publicação Realtime
  console.log('\n📊 PASSO 2: Verificando publicação Realtime...');
  const { data: publications, error: pubError } = await supabase
    .from('pg_publication_tables')
    .select('*')
    .eq('pubname', 'supabase_realtime')
    .eq('tablename', 'conference_sessions');
  
  if (pubError) {
    console.error('❌ Erro ao verificar publicação:', pubError);
  } else if (!publications || publications.length === 0) {
    console.error('❌❌❌ TABELA NÃO ESTÁ NA PUBLICAÇÃO REALTIME!');
    console.log('💡 Execute este SQL no SQL Editor:');
    console.log(`
    ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_sessions;
    `);
    return;
  } else {
    console.log('✅ Tabela está na publicação Realtime');
  }
  
  // Passo 3: Criar canal de teste
  console.log('\n📊 PASSO 3: Criando canal de teste...');
  const testChannel = supabase
    .channel(`test-realtime-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conference_sessions',
        filter: `id=eq.${session.id}`
      },
      (payload) => {
        console.log('🎉🎉🎉 ========================================');
        console.log('🎉 UPDATE RECEBIDO EM TEMPO REAL!');
        console.log('🎉 Timestamp:', new Date().toISOString());
        console.log('🎉 Payload:', payload);
        console.log('🎉 ========================================');
      }
    )
    .subscribe((status, err) => {
      console.log('\n📡 STATUS DA SUBSCRIPTION:');
      console.log('   - Status:', status);
      console.log('   - Erro:', err || 'nenhum');
      
      if (status === 'SUBSCRIBED') {
        console.log('✅✅✅ CANAL INSCRITO COM SUCESSO!');
        console.log('\n🧪 TESTE PRONTO!');
        console.log('💡 Agora vá em outro navegador/aba e bipe um código de pneu');
        console.log('💡 Você deverá ver a mensagem "UPDATE RECEBIDO EM TEMPO REAL!" aqui');
        console.log('\n⏱️ Aguardando atualizações...');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌❌❌ ERRO NO CANAL!', err);
        console.log('💡 Possíveis causas:');
        console.log('   1. Realtime não está habilitado no Supabase Dashboard');
        console.log('   2. A tabela não foi adicionada à publicação');
        console.log('   3. Row Level Security (RLS) está bloqueando');
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️❌ TIMEOUT NA CONEXÃO');
        console.log('💡 A conexão demorou muito. Verifique sua internet e configuração do Supabase');
      }
    });
  
  console.log('✅ Canal criado:', testChannel);
  
  // Salvar referência para cleanup
  (window as any).__realtimeTestChannel = testChannel;
  console.log('\n💡 Para parar o teste, execute: window.__realtimeTestChannel.unsubscribe()');
}

// Execute automaticamente se estiver no navegador
if (typeof window !== 'undefined') {
  console.log('🔍 Função de teste disponível!');
  console.log('💡 Execute: testRealtimeConnection()');
  (window as any).testRealtimeConnection = testRealtimeConnection;
}
