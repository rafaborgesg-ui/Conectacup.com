import { createClient } from './supabase/client';
import { getCurrentUser } from './supabase/client';

// Tipos para a conferência de pneus
export interface TireCheckData {
  posicao: string;
  codigo: string;
  piloto: string;
  ano: string;
  set: string;
  tipo: string;
  voltas: string;
  situacao: 'Guardar' | 'Descartar' | '-'; // 🆕 Aceita "-" para pneus não cadastrados
  divergencia?: boolean;
  pilotoInvalido?: boolean;
  validacao?: 'OK' | 'TROCAR PNEU' | 'INVERSÃO NECESSÁRIA' | 'CUP - ANALISE VOLTAS' | null;
  observacao?: string; // 🆕 Campo de observações (dispensa bipagem se preenchido)
}

export interface TireSetData {
  jogo: number;
  label: string;
  montadoNoCarro: boolean;
  tires: TireCheckData[];
}

export interface ChassisCheckData {
  chassis: string;
  piloto: string;
  corrida: string;
  categoria: string;
  sheetName: string;
  tiresChecked: number;
  tireSets: TireSetData[];
  idealSet?: string | null; // 🔥 Jogo ideal do Shakedown
  idealSetVoltas?: string | null; // 🔥 Voltas do jogo ideal
  secondBestSet?: string | null; // 🔥 Segundo melhor jogo do Shakedown
  secondBestVoltas?: string | null; // 🔥 Voltas do segundo melhor jogo
  inversao_completa?: boolean; // 🔥 Indica se a inversão foi marcada como completa
  segundo_jogo_solicitado?: boolean; // 🔥 Indica se o segundo jogo foi solicitado
}

export interface TireCheckSession {
  id?: string;
  season_id?: string;
  stage_id?: string | null;
  season_name: string;
  stage_name: string;
  check_date: string;
  chassis_data: ChassisCheckData[];
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Salva uma sessão de conferência de pneus no Supabase
 */
export async function saveTireCheckSession(
  seasonName: string,
  stageName: string,
  chassisData: ChassisCheckData[]
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // Prepara os dados para salvar
    const sessionData: Omit<TireCheckSession, 'id' | 'created_at' | 'updated_at'> = {
      season_name: seasonName,
      stage_name: stageName,
      check_date: new Date().toISOString(),
      chassis_data: chassisData,
      created_by: user.id,
    };

    // Insere no Supabase
    const { data, error } = await supabase
      .from('tire_check_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao salvar conferência:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Conferência salva com sucesso:', data);
    return { success: true, sessionId: data.id };
  } catch (error) {
    console.error('❌ Erro inesperado ao salvar conferência:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Busca todas as sessões de conferência (busca de conference_sessions para divergências em tempo real)
 */
export async function getTireCheckSessions(): Promise<TireCheckSession[]> {
  try {
    const supabase = createClient();

    // 🔥 Busca de AMBAS as tabelas: tire_check_sessions (finalizadas) E conference_sessions (em andamento)
    
    // 1. Busca conferências finalizadas (tire_check_sessions)
    const { data: finalizedSessions, error: finalizedError } = await supabase
      .from('tire_check_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (finalizedError) {
      console.error('❌ Erro ao buscar conferências finalizadas:', finalizedError);
    }

    // 2. Busca conferências em andamento (conference_sessions - TODAS para incluir nas divergências)
    const { data: inProgressSessions, error: inProgressError } = await supabase
      .from('conference_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (inProgressError) {
      console.error('❌ Erro ao buscar conferências em andamento:', inProgressError);
    }

    // Combina ambos os resultados
    const allSessions: TireCheckSession[] = [];

    // Adiciona conferências finalizadas (tire_check_sessions)
    if (finalizedSessions && finalizedSessions.length > 0) {
      finalizedSessions.forEach(session => {
        allSessions.push({
          id: session.id,
          season_name: session.season_name || '',
          stage_name: session.stage_name || '',
          check_date: session.check_date || session.created_at,
          chassis_data: session.chassis_data || [],
          created_by: session.created_by || '',
          created_at: session.created_at,
          updated_at: session.updated_at
        });
      });
    }

    // Adiciona conferências desativadas (conference_sessions) - convertendo para o formato correto
    if (inProgressSessions && inProgressSessions.length > 0) {
      inProgressSessions.forEach(session => {
        // Mescla excel_data com progress para obter dados completos
        const chassisData = mergeExcelDataWithProgress(session.excel_data, session.progress);
        
        allSessions.push({
          id: session.id,
          season_name: session.season_name || '',
          stage_name: session.etapa_name || '',
          check_date: session.created_at,
          chassis_data: chassisData,
          created_by: session.created_by || '',
          created_at: session.created_at,
          updated_at: session.updated_at
        });
      });
    }

    // Ordena por data de criação (mais recente primeiro)
    allSessions.sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime();
      const dateB = new Date(b.created_at || '').getTime();
      return dateB - dateA;
    });

    console.log(`✅ Total de conferências carregadas: ${allSessions.length} (${finalizedSessions?.length || 0} finalizadas + ${inProgressSessions?.length || 0} em andamento)`);

    return allSessions;
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar conferências:', error);
    return [];
  }
}

/**
 * Helper: Mescla excel_data com progress para obter ChassisCheckData completo
 */
function mergeExcelDataWithProgress(excelData: any[], progress: any): ChassisCheckData[] {
  if (!excelData || !Array.isArray(excelData)) {
    return [];
  }

  return excelData.map((chassis, index) => {
    const chassisProgress = progress?.[index];
    
    return {
      chassis: chassis.chassis || '',
      piloto: chassis.piloto || '',
      corrida: chassis.corrida || '',
      categoria: chassis.matchedChassis?.categoria || chassis.categoria || chassis.sheetName || '',
      sheetName: chassis.sheetName || '',
      tiresChecked: chassisProgress?.tiresChecked || chassis.tiresChecked || 0,
      tireSets: chassisProgress?.tireSets || [],
      idealSet: chassisProgress?.idealSet || null,
      idealSetVoltas: chassisProgress?.idealSetVoltas || null,
      secondBestSet: chassisProgress?.secondBestSet || null,
      secondBestVoltas: chassisProgress?.secondBestVoltas || null,
      inversao_completa: chassisProgress?.inversao_completa || false,
      segundo_jogo_solicitado: chassisProgress?.segundo_jogo_solicitado || false
    };
  });
}

/**
 * Busca todos os pneus slick de um piloto com status "Piloto" do ESTOQUE (stock_entries)
 * Esta função é usada para calcular o jogo ideal no Shakedown
 */
export async function getPilotSlickTires(pilotName: string): Promise<{
  codigo: string;
  set: string;
  voltas: number;
  tipo: string;
}[]> {
  try {
    const supabase = createClient();

    console.log(`🔍 Buscando pneus slick no ESTOQUE para piloto: ${pilotName}`);

    // 🔥 Busca diretamente da tabela de estoque (stock_entries)
    const { data: stockTires, error } = await supabase
      .from('stock_entries')
      .select('*')
      .eq('model_type', 'Slick') // Apenas slick
      .eq('status', 'Piloto'); // Status "Piloto" = pneu guardado para o piloto

    if (error) {
      console.error('❌ Erro ao buscar pneus do estoque:', error);
      return [];
    }

    console.log(`📦 Total de pneus slick com status Piloto encontrados no estoque: ${stockTires?.length || 0}`);

    // Filtra pelos pneus do piloto específico e mapeia para o formato esperado
    const allTires: { codigo: string; set: string; voltas: number; tipo: string }[] = [];

    stockTires?.forEach((tire) => {
      // Normaliza nome do piloto para comparação
      const normalizedTirePilot = tire.pilot?.trim().toUpperCase() || '';
      const normalizedPilotName = pilotName?.trim().toUpperCase() || '';
      
      // Filtra: piloto correto, código válido, set válido
      if (
        normalizedTirePilot === normalizedPilotName &&
        tire.barcode &&
        tire.barcode !== '-' &&
        tire.set_pneu &&
        tire.set_pneu !== '-'
      ) {
        allTires.push({
          codigo: tire.barcode,
          set: tire.set_pneu,
          voltas: parseInt(tire.tempo_vida || '0') || 0,
          tipo: 'Slick'
        });
      }
    });

    console.log(`✅ Total de pneus slick do piloto ${pilotName}: ${allTires.length}`);
    console.log(`📊 Detalhes dos pneus:`, allTires);
    
    return allTires;
  } catch (error) {
    console.error('❌ Erro ao buscar pneus do piloto:', error);
    return [];
  }
}

/**
 * Encontra o jogo ideal (com mais voltas) dentro dos parâmetros de shakedown
 */
export function findIdealSet(
  tires: { codigo: string; set: string; voltas: number; tipo: string }[],
  minVoltas: number,
  maxVoltas: number
): string | null {
  // Agrupa pneus por set (extraindo o identificador completo do set, removendo apenas a posição final)
  const setGroups: Record<string, { codigo: string; voltas: number; tipo: string; originalSet: string }[]> = {};
  
  tires.forEach((tire) => {
    // Extrai o identificador do set removendo a última letra (posição: A, B, C, D)
    // Exemplos: "1A" -> "1", "C5" -> "C5", "10B" -> "10", "C1/C2/C3/C4" -> "C1/C2/C3/C4"
    let setIdentifier = tire.set;
    
    // Se o set termina com uma única letra (A, B, C, D), remove essa letra
    if (/[A-D]$/.test(tire.set)) {
      setIdentifier = tire.set.slice(0, -1);
    }
    
    // Se ainda não começar com letra ou número, pula
    if (!setIdentifier) return;
    
    if (!setGroups[setIdentifier]) {
      setGroups[setIdentifier] = [];
    }
    setGroups[setIdentifier].push({
      codigo: tire.codigo,
      voltas: tire.voltas,
      tipo: tire.tipo,
      originalSet: tire.set
    });
  });

  console.log('🔍 Sets agrupados por identificador:', setGroups);
  console.log('📊 Contagem de pneus por set:', Object.entries(setGroups).map(([set, tires]) => ({ set, count: tires.length })));

  // Encontra o set com mais voltas dentro dos parâmetros
  let bestSet: string | null = null;
  let bestVoltas = -1;

  Object.entries(setGroups).forEach(([setIdentifier, setTires]) => {
    // Verifica se o set tem 4 pneus (completo)
    if (setTires.length === 4) {
      console.log(`✅ Set ${setIdentifier} está completo (4 pneus)`);
      console.log(`   Pneus: ${setTires.map(t => `${t.originalSet}(${t.voltas}v)`).join(', ')}`);
      
      // Verifica se TODOS os pneus estão dentro dos parâmetros
      const allTiresInRange = setTires.every(t => t.voltas >= minVoltas && t.voltas <= maxVoltas);
      
      if (!allTiresInRange) {
        const outOfRangeTires = setTires.filter(t => t.voltas < minVoltas || t.voltas > maxVoltas);
        console.log(`  ❌ Set ${setIdentifier} tem pneus fora dos parâmetros: ${outOfRangeTires.map(t => `${t.originalSet}(${t.voltas}v)`).join(', ')}`);
        return;
      }
      
      // Calcula média de voltas do set (só para comparação)
      const avgVoltas = setTires.reduce((sum, t) => sum + t.voltas, 0) / 4;
      
      console.log(`  ✔️ Set ${setIdentifier} está dentro dos parâmetros (${minVoltas}-${maxVoltas}) - Média: ${avgVoltas.toFixed(1)} voltas`);
      
      // 🔥 PRIORIZA SET COM MAIS VOLTAS (não apenas média igual)
      if (avgVoltas > bestVoltas) {
        bestVoltas = avgVoltas;
        bestSet = setIdentifier;
        console.log(`  🏆 Set ${setIdentifier} é o novo melhor! (${avgVoltas.toFixed(1)} voltas)`);
      }
    } else {
      console.log(`⚠️ Set ${setIdentifier} incompleto (${setTires.length}/4 pneus)`);
    }
  });

  console.log(`🏁 Set ideal final: ${bestSet || 'NENHUM'} (${bestVoltas > 0 ? bestVoltas.toFixed(1) : '0'} voltas)`);

  return bestSet;
}

/**
 * Encontra o segundo melhor jogo (com mais voltas) dentro dos parâmetros de shakedown
 */
export function findSecondBestSet(
  tires: { codigo: string; set: string; voltas: number; tipo: string }[],
  minVoltas: number,
  maxVoltas: number,
  excludeSet: string | null
): string | null {
  console.log(`\n🔎 findSecondBestSet - Iniciando busca do segundo melhor set`);
  console.log(`   Parâmetros: min=${minVoltas}, max=${maxVoltas}, excludeSet=${excludeSet}`);
  console.log(`   Total de pneus recebidos: ${tires.length}`);
  
  // Agrupa pneus por set
  const setGroups: Record<string, { codigo: string; voltas: number; tipo: string; originalSet: string }[]> = {};
  
  tires.forEach((tire) => {
    let setIdentifier = tire.set;
    
    if (/[A-D]$/.test(tire.set)) {
      setIdentifier = tire.set.slice(0, -1);
    }
    
    if (!setIdentifier) return;
    
    if (!setGroups[setIdentifier]) {
      setGroups[setIdentifier] = [];
    }
    setGroups[setIdentifier].push({
      codigo: tire.codigo,
      voltas: tire.voltas,
      tipo: tire.tipo,
      originalSet: tire.set
    });
  });

  console.log(`📊 Sets agrupados:`, Object.keys(setGroups));
  console.log(`📊 Contagem por set:`, Object.entries(setGroups).map(([set, tires]) => `${set}(${tires.length})`).join(', '));

  // Encontra o segundo set com mais voltas dentro dos parâmetros
  let secondBestSet: string | null = null;
  let secondBestVoltas = -1;

  Object.entries(setGroups).forEach(([setIdentifier, setTires]) => {
    // Pula o set ideal (primeiro melhor)
    if (excludeSet && setIdentifier === excludeSet) {
      console.log(`⏭️ Pulando set ${setIdentifier} (é o ideal)`);
      return;
    }

    // Verifica se o set tem 4 pneus (completo)
    if (setTires.length === 4) {
      // Verifica se TODOS os pneus estão dentro dos parâmetros
      const allTiresInRange = setTires.every(t => t.voltas >= minVoltas && t.voltas <= maxVoltas);
      
      if (!allTiresInRange) {
        return;
      }
      
      // Calcula média de voltas do set
      const avgVoltas = setTires.reduce((sum, t) => sum + t.voltas, 0) / 4;
      
      console.log(`  ✔️ Set ${setIdentifier} é candidato ao segundo melhor (${avgVoltas.toFixed(1)} voltas)`);
      
      // 🔥 PRIORIZA SET COM MAIS VOLTAS (não apenas média igual)
      if (avgVoltas > secondBestVoltas) {
        secondBestVoltas = avgVoltas;
        secondBestSet = setIdentifier;
        console.log(`  🏆 Set ${setIdentifier} é o novo segundo melhor! (${avgVoltas.toFixed(1)} voltas)`);
      }
    } else {
      console.log(`⚠️ Set ${setIdentifier} incompleto (${setTires.length}/4 pneus)`);
    }
  });

  console.log(`🏁 Set segundo melhor final: ${secondBestSet || 'NENHUM'} (${secondBestVoltas > 0 ? secondBestVoltas.toFixed(1) : '0'} voltas)`);

  return secondBestSet;
}

/**
 * Busca uma sessão específica por ID
 */
export async function getTireCheckSessionById(sessionId: string): Promise<TireCheckSession | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tire_check_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar conferência:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar conferência:', error);
    return null;
  }
}

/**
 * Busca sessões por temporada
 */
export async function getTireCheckSessionsBySeason(seasonName: string): Promise<TireCheckSession[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tire_check_sessions')
      .select('*')
      .eq('season_name', seasonName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar conferências da temporada:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar conferências da temporada:', error);
    return [];
  }
}

/**
 * Busca sessões por etapa
 */
export async function getTireCheckSessionsByStage(
  seasonName: string,
  stageName: string
): Promise<TireCheckSession[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tire_check_sessions')
      .select('*')
      .eq('season_name', seasonName)
      .eq('stage_name', stageName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar conferências da etapa:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar conferências da etapa:', error);
    return [];
  }
}

/**
 * Deleta uma sessão de conferência
 */
export async function deleteTireCheckSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('tire_check_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('❌ Erro ao deletar conferência:', error);
      return false;
    }

    console.log('✅ Conferência deletada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado ao deletar conferência:', error);
    return false;
  }
}

// ====== DIVERGÊNCIAS ======

export interface TireDivergence {
  id?: string;
  session_id: string;
  tire_code: string;
  chassis: string;
  jogo: number;
  posicao: string;
  piloto: string;
  ano?: string;
  set?: string;
  tipo?: string;
  voltas?: string;
  situacao: string;
  divergence_type: 'piloto_diferente' | 'status_descartar' | 'ambos';
  status: 'pendente' | 'solucionada';
  motivo_divergencia?: string;
  como_solucionada?: string;
  data_resolucao?: string;
  resolvido_por?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Salva uma divergência no Supabase
 */
export async function saveTireDivergence(
  divergence: Omit<TireDivergence, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; error?: string; divergenceId?: string }> {
  try {
    const supabase = createClient();

    // 🔥 REMOVIDA VALIDAÇÃO DE SESSÃO: A validação já é feita em saveTireDivergenceRealtime
    // Se chegou aqui, a sessão já foi validada anteriormente

    // 🔥 Verifica se já existe uma divergência idêntica
    const { data: existingData, error: checkError } = await supabase
      .from('tire_divergences')
      .select('id')
      .eq('session_id', divergence.session_id)
      .eq('tire_code', divergence.tire_code)
      .eq('jogo', divergence.jogo)
      .eq('posicao', divergence.posicao)
      .limit(1)
      .maybeSingle();

    if (checkError) {
      // 🔥 Trata erros de rede de forma silenciosa
      if (checkError.message?.includes('Failed to fetch')) {
        console.log('ℹ️ Erro de rede ao verificar divergência existente');
        return { success: false, error: 'network_error' };
      }
      console.error('❌ Erro ao verificar divergência existente:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingData) {
      console.log('ℹ️ Divergência já existe, pulando insert:', existingData.id);
      return { success: true, divergenceId: existingData.id };
    }

    // Insere nova divergência
    const { data, error } = await supabase
      .from('tire_divergences')
      .insert([divergence])
      .select()
      .single();

    if (error) {
      // 🔥 TRATAMENTO ESPECÍFICO: Erros de foreign key são esperados durante conferência ativa
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        console.log('ℹ️ Divergência registrada localmente - sessão será validada ao finalizar');
        return { success: false, error: 'foreign key constraint' };
      }

      // 🔥 TRATAMENTO ESPECÍFICO: Erros de rede
      if (error.message?.includes('Failed to fetch')) {
        console.log('ℹ️ Erro de rede ao salvar divergência');
        return { success: false, error: 'network_error' };
      }

      console.error('❌ Erro ao salvar divergência:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Divergência salva com sucesso:', data);
    return { success: true, divergenceId: data.id };
  } catch (error: any) {
    // 🔥 TRATAMENTO ESPECÍFICO: Erros de foreign key são esperados durante conferência ativa
    if (error?.code === '23503' || error?.message?.includes('foreign key')) {
      console.log('ℹ️ Divergência registrada localmente - sessão será validada ao finalizar');
      return { success: false, error: 'foreign key constraint' };
    }

    // 🔥 TRATAMENTO ESPECÍFICO: Erros de rede (Failed to fetch)
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      console.log('ℹ️ Erro de rede ao salvar divergência - operação será reprocessada');
      return { success: false, error: 'network_error' };
    }

    console.error('❌ Erro inesperado ao salvar divergência:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Busca todas as divergências
 */
export async function getTireDivergences(): Promise<TireDivergence[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tire_divergences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar divergências:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar divergências:', error);
    return [];
  }
}

/**
 * Busca divergências por sessão
 */
export async function getTireDivergencesBySession(sessionId: string): Promise<TireDivergence[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tire_divergences')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar divergências da sessão:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar divergências da sessão:', error);
    return [];
  }
}

/**
 * Atualiza uma divergência para solucionada
 */
export async function solveTireDivergence(
  divergenceId: string,
  motivoDivergencia: string,
  comoSolucionada: string,
  resolvidoPor: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('tire_divergences')
      .update({
        status: 'solucionada',
        motivo_divergencia: motivoDivergencia,
        como_solucionada: comoSolucionada,
        data_resolucao: new Date().toISOString(),
        resolvido_por: resolvidoPor,
        updated_at: new Date().toISOString()
      })
      .eq('id', divergenceId);

    if (error) {
      console.error('❌ Erro ao solucionar divergência:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Divergência solucionada com sucesso');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro inesperado ao solucionar divergência:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Deleta uma divergência
 */
export async function deleteTireDivergence(divergenceId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('tire_divergences')
      .delete()
      .eq('id', divergenceId);

    if (error) {
      console.error('❌ Erro ao deletar divergência:', error);
      return false;
    }

    console.log('✅ Divergência deletada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado ao deletar divergência:', error);
    return false;
  }
}

// ====== SESSÃO ATIVA (TEMPO REAL) ======

const ACTIVE_SESSION_KEY = 'active_tire_check_session';

/**
 * Salva a sessão ativa no localStorage (dados em tempo real durante a conferência)
 */
export function saveActiveSession(
  seasonName: string,
  stageName: string,
  chassisData: ChassisCheckData[]
): void {
  try {
    const sessionData = {
      season_name: seasonName,
      stage_name: stageName,
      check_date: new Date().toISOString(),
      chassis_data: chassisData,
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionData));
    console.log('✅ Sessão ativa salva no localStorage');
  } catch (error) {
    console.error('❌ Erro ao salvar sessão ativa:', error);
  }
}

/**
 * Busca a sessão ativa do localStorage
 */
export function getActiveSession(): {
  season_name: string;
  stage_name: string;
  check_date: string;
  chassis_data: ChassisCheckData[];
  updated_at: string;
} | null {
  try {
    const data = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Erro ao buscar sessão ativa:', error);
    return null;
  }
}

/**
 * Limpa a sessão ativa do localStorage
 */
export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    console.log('✅ Sessão ativa limpa do localStorage');
  } catch (error) {
    console.error('❌ Erro ao limpar sessão ativa:', error);
  }
}

/**
 * Busca conferências da tabela conference_sessions (conferências em andamento)
 * Retorna no mesmo formato de TireCheckSession para compatibilidade
 */
export async function getActiveConferenceSessions(): Promise<TireCheckSession[]> {
  try {
    const supabase = createClient();

    // 🔥 Busca com JOIN para pegar o nome da temporada
    const { data, error } = await supabase
      .from('conference_sessions')
      .select(`
        *,
        seasons(name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar conferências ativas:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Converte conference_sessions para o formato TireCheckSession
    return data.map(session => {
      // Garante que season_name sempre tenha um valor válido
      let seasonName = `Temporada ${new Date(session.created_at).getFullYear()}`;
      
      if (session.seasons && typeof session.seasons === 'object' && 'name' in session.seasons) {
        seasonName = session.seasons.name || seasonName;
      }

      return {
        id: session.id,
        season_id: session.season_id,
        stage_id: session.stage_id,
        season_name: seasonName,
        stage_name: session.etapa_name || '',
        check_date: session.created_at,
        chassis_data: convertExcelDataToChassisData(session.excel_data, session.progress),
        created_by: session.created_by || '',
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    });
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar conferências ativas:', error);
    return [];
  }
}

/**
 * Converte dados do Excel + progress para ChassisCheckData
 * 🔥 FILTRA apenas chassis com jogo montado no carro e os 4 pneus lidos
 */
function convertExcelDataToChassisData(excelData: any[], progress: any): ChassisCheckData[] {
  if (!excelData || !Array.isArray(excelData)) {
    return [];
  }

  const allChassis = excelData.map((chassis, index) => {
    const chassisProgress = progress?.[index];
    
    return {
      chassis: chassis.chassis || '',
      piloto: chassis.piloto || '',
      corrida: chassis.corrida || '',
      categoria: chassis.matchedChassis?.categoria || chassis.categoria || '',
      sheetName: chassis.sheetName || '',
      tiresChecked: chassisProgress?.tiresChecked || chassis.tiresChecked || 0,
      tireSets: chassisProgress?.tireSets || [],
      idealSet: chassisProgress?.idealSet || null,
      idealSetVoltas: chassisProgress?.idealSetVoltas || null,
      secondBestSet: chassisProgress?.secondBestSet || null,
      secondBestVoltas: chassisProgress?.secondBestVoltas || null,
      inversao_completa: chassisProgress?.inversao_completa || false,
      segundo_jogo_solicitado: chassisProgress?.segundo_jogo_solicitado || false
    };
  });

  // 🔥 FILTRA: apenas chassis com jogo montado no carro e os 4 pneus lidos
  return allChassis.filter(chassis => {
    // Busca o jogo montado no carro
    const jogoMontado = chassis.tireSets.find((set: any) => set.montadoNoCarro === true);
    
    if (!jogoMontado) {
      console.log(`⏭️ Chassis ${chassis.chassis} (${chassis.piloto}) - SEM jogo montado no carro`);
      return false; // Não tem jogo montado no carro
    }

    // Verifica se o jogo montado tem os 4 pneus lidos (código diferente de '-')
    const pneusLidos = jogoMontado.tires.filter((tire: any) => 
      tire && tire.codigo && tire.codigo !== '-'
    );

    if (pneusLidos.length < 4) {
      console.log(`⏭️ Chassis ${chassis.chassis} (${chassis.piloto}) - Jogo montado incompleto (${pneusLidos.length}/4 pneus lidos)`);
      return false; // Jogo montado incompleto
    }

    console.log(`✅ Chassis ${chassis.chassis} (${chassis.piloto}) - Jogo montado COMPLETO (4 pneus lidos)`);
    return true; // Jogo montado completo
  });
}

/**
 * Verifica se existe uma sessão ativa
 */
export function hasActiveSession(): boolean {
  return localStorage.getItem(ACTIVE_SESSION_KEY) !== null;
}

/**
 * Atualiza sessão ativa no Supabase em tempo real
 * Esta função deve ser chamada sempre que houver mudanças nos dados da conferência
 */
export async function updateConferenceSessionRealtime(
  sessionId: string,
  chassisIndex: number,
  tireSets: TireSetData[],
  tiresChecked: number,
  completed: boolean = false
): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      console.error('❌ Usuário não autenticado');
      return false;
    }

    // Busca a sessão atual
    const { data: session, error: fetchError } = await supabase
      .from('conference_sessions')
      .select('progress, excel_data')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('❌ Erro ao buscar sessão:', fetchError);
      return false;
    }

    // 🔥🔥🔥 VALIDAÇÃO CRÍTICA: Verifica se chassisIndex é válido
    if (!session.excel_data || !Array.isArray(session.excel_data)) {
      console.error('❌ excel_data inválido na sessão');
      return false;
    }

    if (chassisIndex < 0 || chassisIndex >= session.excel_data.length) {
      console.error(`❌❌❌ ÍNDICE INVÁLIDO: ${chassisIndex} (length: ${session.excel_data.length})`);
      console.error('   OPERAÇÃO BLOQUEADA para evitar corrupção de dados!');
      return false;
    }

    const chassisAtIndex = session.excel_data[chassisIndex];
    console.log(`🔍🔍🔍 VALIDAÇÃO PRÉ-SALVAMENTO:`);
    console.log(`   Chassis Index: ${chassisIndex}`);
    console.log(`   Chassis no índice: ${chassisAtIndex?.chassis} (${chassisAtIndex?.piloto})`);
    console.log(`   _originalIndex: ${chassisAtIndex?._originalIndex}`);
    console.log(`   Jogos a salvar: ${tireSets.length}`);
    console.log(`   Pneus: ${tireSets.flatMap(s => s.tires.filter((t: any) => t.codigo !== '-').map((t: any) => t.codigo)).join(', ')}`);

    // 🔥🔥🔥 VALIDAÇÃO CRÍTICA: Verifica se _originalIndex coincide com chassisIndex
    if (chassisAtIndex._originalIndex !== undefined && chassisAtIndex._originalIndex !== chassisIndex) {
      console.error(`❌❌❌ ERRO CRÍTICO: Tentativa de salvar no índice errado!`);
      console.error(`   Tentando salvar no índice: ${chassisIndex}`);
      console.error(`   Mas _originalIndex do chassis é: ${chassisAtIndex._originalIndex}`);
      console.error(`   Chassis: ${chassisAtIndex.chassis} (${chassisAtIndex.piloto})`);
      console.error(`   🛑 OPERAÇÃO BLOQUEADA para evitar corrupção de dados!`);
      return false;
    }

    // 🚨 VALIDAÇÃO CRÍTICA: Verifica se tireSets não está vazio antes de salvar
    console.log(`🔍 updateConferenceSessionRealtime - Chassis ${chassisIndex}:`, {
      tireSets_length: tireSets.length,
      tireSets: tireSets,
      tiresChecked,
      completed
    });
    
    if (tireSets.length === 0) {
      console.error(`🚨🚨🚨 BLOQUEIO DE SEGURANÇA!`);
      console.error(`   Tentativa de salvar tireSets VAZIO para Chassis ${chassisIndex}`);
      console.error(`   Operação BLOQUEADA para evitar perda de dados!`);
      return false; // 🔥 BLOQUEIA salvamento de dados vazios
    }
    
    // Atualiza o progresso do chassis específico
    const updatedProgress = {
      ...(session.progress || {}),
      [chassisIndex]: {
        tireSets,
        tiresChecked,
        completed,
        lockedBy: completed ? null : user.id,
        lockedAt: completed ? null : new Date().toISOString()
      }
    };

    // Atualiza excel_data com tiresChecked
    const updatedExcelData = session.excel_data ? [...session.excel_data] : [];
    if (updatedExcelData[chassisIndex]) {
      updatedExcelData[chassisIndex] = {
        ...updatedExcelData[chassisIndex],
        tiresChecked
      };
    }

    // Atualiza no banco
    console.log('📡📡📡 ========================================');
    console.log('📡 ENVIANDO UPDATE PARA SUPABASE');
    console.log('📡 Session ID:', sessionId);
    console.log('📡 Chassis Index:', chassisIndex);
    console.log('📡 Timestamp:', new Date().toISOString());
    console.log('📡 ========================================');
    
    const { error: updateError } = await supabase
      .from('conference_sessions')
      .update({
        progress: updatedProgress,
        excel_data: updatedExcelData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('❌❌❌ ERRO AO ATUALIZAR SESSÃO:', updateError);
      console.error('   Detalhes:', JSON.stringify(updateError, null, 2));
      return false;
    }

    console.log('✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!');
    console.log(`   📌 Chassis salvo [${chassisIndex}]: ${chassisAtIndex?.chassis} (${chassisAtIndex?.piloto})`);
    console.log(`   📌 Códigos salvos: ${tireSets.flatMap(s => s.tires.filter((t: any) => t.codigo !== '-').map((t: any) => t.codigo)).join(', ')}`);
    console.log('   💡 Outros dispositivos devem receber UPDATE em tempo real');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado ao atualizar sessão:', error);
    return false;
  }
}