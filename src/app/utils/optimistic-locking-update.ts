// 🔒 UTILITÁRIO: SALVAMENTO COM OPTIMISTIC LOCKING
// Este arquivo contém a versão otimizada da função updateProgressImmediately
// que previne race conditions em edições simultâneas

import { createClient } from './supabase/client';

/**
 * 🔒 SALVAMENTO IMEDIATO E SEGURO DO PROGRESS COM OPTIMISTIC LOCKING
 * 
 * Esta função salva o progress IMEDIATAMENTE após cada bipagem
 * e usa versionamento para evitar que dados sejam perdidos quando
 * múltiplos usuários editam o mesmo chassis simultaneamente.
 * 
 * @param sessionId - ID da sessão ativa
 * @param chassisIndex - Índice do chassis na lista
 * @param tireSets - Array de conjuntos de pneus
 * @param currentUserId - ID do usuário atual
 * @param countCheckedTires - Função para contar pneus conferidos
 * 
 * @returns true se salvou com sucesso, false se falhou
 * 
 * REQUISITO: Coluna progress_version deve existir na tabela conference_sessions
 * Execute /MIGRACAO-OPTIMISTIC-LOCKING.sql antes de usar esta função!
 */
export async function updateProgressWithOptimisticLocking(
  sessionId: string,
  chassisIndex: number,
  tireSets: any[],
  currentUserId: string | null,
  countCheckedTires: (tireSets: any[]) => number
): Promise<boolean> {
  const MAX_RETRIES = 5; // Mais tentativas para lidar com conflitos
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const supabase = createClient();
      
      console.log(`🔒 [Tentativa ${attempt}/${MAX_RETRIES}] Salvando progress IMEDIATAMENTE...`, {
        sessionId,
        chassisIndex,
        tiresCount: tireSets.reduce((acc: number, set: any) => 
          acc + set.tires.filter((t: any) => t.codigo !== '-').length, 0
        )
      });
      
      // 1️⃣ BUSCA progress ATUAL + VERSÃO (Optimistic Locking)
      const { data: session, error: fetchError } = await supabase
        .from('conference_sessions')
        .select('progress, progress_version, updated_at')
        .eq('id', sessionId)
        .single();
      
      if (fetchError || !session) {
        console.error('❌ Erro ao buscar sessão:', fetchError);
        throw new Error('Erro ao buscar sessão');
      }
      
      // Verifica se a coluna progress_version existe
      const hasVersioning = 'progress_version' in session;
      const currentVersion = session.progress_version || 0;
      
      if (!hasVersioning) {
        console.warn('⚠️ AVISO: Coluna progress_version NÃO existe!');
        console.warn('   Sistema funcionará SEM proteção contra race conditions.');
        console.warn('   Execute /MIGRACAO-OPTIMISTIC-LOCKING.sql no Supabase!');
      } else {
        console.log(`   📌 Versão atual do progress: ${currentVersion}`);
        console.log(`   📌 Última atualização: ${session.updated_at}`);
      }
      
      // 2️⃣ MESCLA com progress MAIS RECENTE (pode ter sido atualizado por outro usuário)
      const updatedProgress = {
        ...(session.progress || {}),
        [chassisIndex]: {
          tireSets: tireSets.map((set: any) => ({
            jogo: set.jogo,
            label: set.label,
            montadoNoCarro: set.montadoNoCarro,
            tires: set.tires.map((tire: any) => ({
              posicao: tire.posicao,
              codigo: tire.codigo,
              piloto: tire.piloto,
              ano: tire.ano,
              set: tire.set,
              tipo: tire.tipo,
              voltas: tire.voltas,
              situacao: tire.situacao,
              divergencia: tire.divergencia,
              pilotoInvalido: tire.pilotoInvalido,
              observacao: tire.observacao,
              validacao: tire.validacao,
              _originalIndex: tire._originalIndex,
              registeredBy: tire.registeredBy,
              registeredAt: tire.registeredAt
            }))
          })),
          tiresChecked: countCheckedTires(tireSets),
          completed: false,
          lockedBy: currentUserId,
          lockedAt: new Date().toISOString()
        }
      };
      
      // 3️⃣ SALVA COM OPTIMISTIC LOCK (se coluna existir)
      let query = supabase
        .from('conference_sessions')
        .update({
          progress: updatedProgress,
          ...(hasVersioning && { progress_version: currentVersion + 1 }), // Incrementa versão
          updated_at: new Date().toISOString(),
          updated_by: currentUserId
        })
        .eq('id', sessionId);
      
      // 🔒 TRAVA: só atualiza se versão não mudou (se coluna existir)
      if (hasVersioning) {
        query = query.eq('progress_version', currentVersion);
      }
      
      const { data: updated, error: updateError } = await query.select();
      
      // 4️⃣ VERIFICA SE ATUALIZOU
      if (updateError) {
        console.error(`❌ Erro ao atualizar progress:`, updateError);
        throw new Error(`Erro ao atualizar: ${updateError.message}`);
      }
      
      if (hasVersioning && (!updated || updated.length === 0)) {
        // ⚠️ CONFLITO DETECTADO: Outro usuário salvou antes!
        console.warn(`⚠️ CONFLITO DETECTADO! Outro usuário atualizou o progress.`);
        console.warn(`   Versão esperada: ${currentVersion}, mas foi modificada por outro usuário.`);
        console.warn(`   Refazendo merge com dados mais recentes...`);
        
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Espera 200ms
          continue; // Tenta novamente com a versão mais recente
        }
        
        throw new Error('Conflito após múltiplas tentativas');
      }
      
      if (hasVersioning) {
        console.log(`✅ Progress salvo com sucesso! Nova versão: ${currentVersion + 1}`);
      } else {
        console.log(`✅ Progress salvo (sem versionamento - APLIQUE A MIGRAÇÃO!)`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Tentativa ${attempt} falhou:`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      
      // Se todas as tentativas falharam
      console.error('🚨 ERRO CRÍTICO: Não foi possível salvar após 5 tentativas!');
      return false;
    }
  }
  
  return false;
}
