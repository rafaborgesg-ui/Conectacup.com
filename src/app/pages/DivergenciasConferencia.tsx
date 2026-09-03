import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, User, Car, Eye, CheckCircle, ChevronDown, ChevronRight, Filter, X, Check } from 'lucide-react';
import { getTireCheckSessions, getTireDivergences, solveTireDivergence, saveTireDivergence, TireDivergence } from '../utils/tireCheckSupabase';
import { getCurrentUser, createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

interface TireData {
  posicao: string;
  codigo: string;
  piloto: string;
  ano?: string;
  set?: string;
  tipo?: string;
  voltas?: string;
  situacao: string;
  validacao?: string;
  divergencia?: boolean;
  pilotoInvalido?: boolean;
}

interface TireSet {
  jogo: number;
  label: string;
  montadoNoCarro: boolean;
  tires: TireData[];
}

interface ChassisConferenceData {
  chassis: string;
  piloto: string;
  corrida: string;
  categoria: string;
  sheetName: string;
  tiresChecked: number;
  tireSets: TireSet[];
  // Lista de pilotos válidos para este chassis
  pilotosValidos?: string[];
}

interface TireCheckSession {
  id: string;
  season_name: string;
  stage_name: string;
  check_date: string;
  chassis_data: ChassisConferenceData[];
  created_by: string;
  created_at: string;
}

interface DivergenciaTire extends TireData {
  chassis: string;
  sessionId: string;
  sessionDate: string;
  stageName: string;
  seasonName: string;
  createdBy: string;
  jogo: number;
  pilotosValidos?: string[];
  solucionada?: boolean;
  motivoDivergencia?: string;
  comoSolucionada?: string;
  dataResolucao?: string;
  resolvidoPor?: string;
}

interface GroupedDivergencias {
  [seasonName: string]: {
    stages: {
      [stageName: string]: {
        sessionDate: string;
        createdBy: string;
        chassis: {
          [chassisName: string]: {
            divergencias: DivergenciaTire[];
            pilotoConfirmado?: string; // 🔥 Piloto confirmado do chassis
          };
        };
      };
    };
  };
}

export function DivergenciasConferencia() {
  const [sessions, setSessions] = useState<TireCheckSession[]>([]);
  const [divergenciasSupabase, setDivergenciasSupabase] = useState<TireDivergence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [divergenciaType, setDivergenciaType] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [expandedChassis, setExpandedChassis] = useState<Set<string>>(new Set());
  const [selectedTire, setSelectedTire] = useState<DivergenciaTire | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [motivoDivergencia, setMotivoDivergencia] = useState('');
  const [comoSolucionada, setComoSolucionada] = useState('');
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({}); // 🔥 Mapa de IDs para nomes

  useEffect(() => {
    loadDivergencias();
    
    // 🔥 Listener em tempo real do Supabase (mais eficiente que polling)
    const supabase = createClient();
    const channel = supabase
      .channel('tire-divergences-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tire_divergences'
        },
        () => {
          console.log('🔥 Divergência atualizada em tempo real, recarregando...');
          loadDivergencias(false); // Recarrega sem mostrar loading
        }
      )
      .subscribe();
    
    // Cleanup ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDivergencias = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      console.log('🔄 ============ CARREGANDO DIVERGÊNCIAS ============');
      
      const supabase = createClient();
      
      // Carrega sessões, divergências e usuários do Supabase
      const [sessionsData, divergenciasData] = await Promise.all([
        getTireCheckSessions(),
        getTireDivergences()
      ]);
      
      setSessions(sessionsData);
      setDivergenciasSupabase(divergenciasData);
      
      // 🔥 Busca usuários da tabela de profiles do Supabase
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, name, email');
      
      console.log('👥 Resposta da busca de usuários:', { usersData, usersError });
      
      // 🔥 Cria mapa de IDs de usuários para nomes/emails
      const usersMap: Record<string, string> = {};
      if (usersData && !usersError) {
        usersData.forEach((user: any) => {
          usersMap[user.user_id] = user.name || user.email || 'Usuário';
        });
      }
      setUserNamesMap(usersMap);
      
      console.log('📊 Sessões carregadas:', sessionsData.length);
      console.log('📊 Divergências já salvas no Supabase:', divergenciasData.length);
      console.log('📊 Divergências existentes:', divergenciasData);
      console.log('👥 Usuários carregados:', Object.keys(usersMap).length);
      console.log('👥 Mapa de usuários:', usersMap);
      
      // 🔍 DEBUG: Verifica se as sessões têm season_name e stage_name
      if (sessionsData.length > 0) {
        console.log('🔍 DETALHES DAS SESSÕES:');
        sessionsData.forEach((session, idx) => {
          console.log(`  [${idx}] ID: ${session.id} - Temporada: "${session.season_name}" - Etapa: "${session.stage_name}"`);
        });
      }
      
      // 🔍 DEBUG: Log detalhado das divergências
      if (divergenciasData.length > 0) {
        console.log('🔍 DETALHES DAS DIVERGÊNCIAS:');
        divergenciasData.forEach((div, idx) => {
          console.log(`  [${idx}] ${div.tire_code} - Sessão: ${div.session_id} - Status: ${div.status} - Tipo: ${div.divergence_type}`);
        });
      } else {
        console.log('⚠️ NENHUMA DIVERGÊNCIA ENCONTRADA NO SUPABASE!');
      }
      
      // 🔍 FALLBACK: Identifica divergências novas nas sessões antigas que ainda não foram salvas
      // (Sessões antigas podem ter sido finalizadas antes da implementação do salvamento em tempo real)
      // Novas divergências são salvas em tempo real durante a conferência
      const divergenciasNovas: Array<Omit<TireDivergence, 'id' | 'created_at' | 'updated_at'>> = [];
      
      for (const session of sessionsData) {
        console.log(`\n🔍 ===== Analisando sessão: ${session.stage_name} =====`);
        console.log(`   ID da sessão: ${session.id}`);
        
        // 🔥 Verifica se chassis_data existe e é um array
        if (!session.chassis_data || !Array.isArray(session.chassis_data)) {
          console.log(`   ⚠️ Sessão sem chassis_data válido, pulando...`);
          continue;
        }
        
        for (const chassis of session.chassis_data) {
          console.log(`\n  🚗 Chassis: ${chassis.chassis}`);
          
          // 🔥 Verifica se tireSets existe e é um array
          if (!chassis.tireSets || !Array.isArray(chassis.tireSets)) {
            console.log(`    ⚠️ Chassis sem tireSets válido, pulando...`);
            continue;
          }
          
          for (const tireSet of chassis.tireSets) {
            console.log(`\n    🔧 Jogo ${tireSet.jogo} (${tireSet.tires ? tireSet.tires.length : 0} pneus):`);
            
            // 🔥 Verifica se tires existe e é um array
            if (!tireSet.tires || !Array.isArray(tireSet.tires)) {
              console.log(`      ⚠️ TireSet sem tires válido, pulando...`);
              continue;
            }
            
            for (const tire of tireSet.tires) {
              const logPrefix = `      [${tire.codigo}]`;
              console.log(`${logPrefix} Posição: ${tire.posicao}, Validação: ${tire.validacao}, Divergencia: ${tire.divergencia}, Situação: ${tire.situacao}`);
              
              // Verifica se tem validação TROCAR PNEU (critério igual ao da exibição na linha 246)
              if (tire.validacao === 'TROCAR PNEU') {
                console.log(`${logPrefix} ⚠️ DIVERGÊNCIA DETECTADA!`);
                
                // Verifica se já existe no Supabase
                const jaExiste = divergenciasData.some(
                  d => d.session_id === session.id && 
                       d.tire_code === tire.codigo && 
                       d.jogo === tireSet.jogo &&
                       d.posicao === tire.posicao
                );
                
                console.log(`${logPrefix} Já existe no Supabase? ${jaExiste}`);
                
                if (!jaExiste) {
                  // Determina o tipo de divergência
                  let divergenceType: 'piloto_diferente' | 'status_descartar' | 'ambos' = 'ambos';
                  if (tire.pilotoInvalido && tire.situacao === 'Guardar') {
                    divergenceType = 'piloto_diferente';
                  } else if (!tire.pilotoInvalido && tire.situacao === 'Descartar') {
                    divergenceType = 'status_descartar';
                  }
                  
                  const novaDivergencia = {
                    session_id: session.id,
                    tire_code: tire.codigo,
                    chassis: chassis.chassis,
                    jogo: tireSet.jogo,
                    posicao: tire.posicao,
                    piloto: tire.piloto,
                    ano: tire.ano || '',
                    set: tire.set || '',
                    tipo: tire.tipo || '',
                    voltas: tire.voltas || '',
                    situacao: tire.situacao,
                    divergence_type: divergenceType,
                    status: 'pendente' as const
                  };
                  
                  console.log(`${logPrefix} ➕ Adicionando à lista (tipo: ${divergenceType})`);
                  divergenciasNovas.push(novaDivergencia);
                }
              }
            }
          }
        }
      }
      
      console.log(`\n💾 ===== TOTAL DE NOVAS DIVERGÊNCIAS: ${divergenciasNovas.length} =====`);
      
      // Salva novas divergências no Supabase
      if (divergenciasNovas.length > 0) {
        console.log(`💾 Salvando divergências...`);
        
        let successCount = 0;
        let errorCount = 0;
        let foreignKeyErrors = 0; // 🔥 Conta erros de FK separadamente
        
        for (const div of divergenciasNovas) {
          console.log(`\n  💾 Salvando: ${div.tire_code} (Jogo ${div.jogo}, ${div.posicao})`);
          console.log(`     Dados:`, div);
          
          const result = await saveTireDivergence(div);
          
          if (result.success) {
            console.log(`  ✅ Salvo com sucesso! ID: ${result.divergenceId}`);
            successCount++;
          } else {
            // 🔥 Tratamento especial para erros de foreign key
            if (result.error?.includes('foreign key') || result.error?.includes('23503')) {
              console.log(`  ℹ️ Divergência aguardando finalização da conferência`);
              foreignKeyErrors++;
            } else if (result.error?.includes('network_error') || result.error?.includes('Failed to fetch')) {
              // 🔥 Tratamento especial para erros de rede - ignora silenciosamente
              console.log(`  ℹ️ Erro de rede temporário - operação será reprocessada`);
            } else {
              console.error(`  ❌ Erro ao salvar:`, result.error);
              errorCount++;
            }
          }
        }
        
        console.log(`\n✅ Salvamento concluído: ${successCount} sucesso, ${errorCount} erros, ${foreignKeyErrors} aguardando finalização`);
        
        // Recarrega as divergências após salvar
        const divergenciasAtualizadas = await getTireDivergences();
        setDivergenciasSupabase(divergenciasAtualizadas);
        console.log(`📊 Divergências atualizadas no state: ${divergenciasAtualizadas.length}`);
        
        // 🔇 Removido toast para não poluir a cada polling
        // if (successCount > 0) {
        //   toast.success(`${successCount} nova(s) divergência(s) detectada(s) e salva(s)`);
        // }
        // 🔥 Apenas mostra toast se houver erros REAIS (não foreign key)
        if (errorCount > 0) {
          toast.error(`${errorCount} divergência(s) com erro ao salvar`);
        }
      } else {
        console.log('✅ Nenhuma divergência nova para salvar');
      }
      
      console.log('✅ ============ CARREGAMENTO CONCLUÍDO ============\n');
    } catch (error: any) {
      // 🔥 Trata erros de rede de forma silenciosa
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        console.log('ℹ️ Erro de rede temporário ao carregar divergências');
        return; // Não mostra toast de erro para problemas de rede temporários
      }

      console.error('❌ Erro ao carregar divergências:', error);

      // Verifica se o erro é de tabela não existente
      if (error?.message?.includes('tire_divergences') || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        console.error('❌ TABELA NÃO EXISTE! Execute o SQL em /supabase/tire_divergences_schema.sql');
        toast.error('Tabela de divergências não encontrada. Verifique o arquivo INSTRUCOES_SUPABASE.md', {
          duration: 10000
        });
      } else {
        toast.error('Erro ao carregar divergências');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 Usa divergências diretamente da tabela tire_divergences ao invés de extrair das sessões
  // Isso permite mostrar divergências em tempo real, mesmo antes de finalizar a conferência
  const allDivergencias: DivergenciaTire[] = divergenciasSupabase.map((div, idx) => {
    // Busca dados da sessão para informações adicionais
    const session = sessions.find(s => s.id === div.session_id);
    
    // 🔍 DEBUG: Log detalhado do mapeamento
    if (idx === 0) {
      console.log('🔍 MAPEANDO PRIMEIRA DIVERGÊNCIA:');
      console.log('  - Divergência do Supabase:', div);
      console.log('  - Sessão encontrada:', session);
      console.log('  - Session ID da divergência:', div.session_id);
      console.log('  - IDs de sessões disponíveis:', sessions.map(s => s.id));
      console.log('  - Season Name da sessão:', session?.season_name);
      console.log('  - Stage Name da sessão:', session?.stage_name);
    }
    
    // 🔥 Mapeia IDs de usuários para nomes
    const createdByUserId = session?.created_by || '';
    const resolvidoPorUserId = div.resolvido_por || '';
    
    if (idx === 0) {
      console.log('  - Created By UUID:', createdByUserId);
      console.log('  - Created By Nome:', userNamesMap[createdByUserId]);
      console.log('  - Resolvido Por UUID:', resolvidoPorUserId);
      console.log('  - Resolvido Por Nome:', userNamesMap[resolvidoPorUserId]);
      console.log('  - UsersMap completo:', userNamesMap);
    }
    
    return {
      posicao: div.posicao,
      codigo: div.tire_code,
      piloto: div.piloto,
      ano: div.ano,
      set: div.set,
      tipo: div.tipo,
      voltas: div.voltas,
      situacao: div.situacao,
      validacao: 'TROCAR PNEU', // Todas as divergências têm essa validação
      divergencia: true,
      pilotoInvalido: div.divergence_type === 'piloto_diferente' || div.divergence_type === 'ambos',
      chassis: div.chassis,
      sessionId: div.session_id,
      sessionDate: session?.check_date || '',
      stageName: session?.stage_name || '',
      seasonName: session?.season_name || '',
      createdBy: userNamesMap[createdByUserId] || createdByUserId || 'Desconhecido',
      jogo: div.jogo,
      solucionada: div.status === 'solucionada',
      motivoDivergencia: div.motivo_divergencia,
      comoSolucionada: div.como_solucionada,
      dataResolucao: div.data_resolucao,
      resolvidoPor: userNamesMap[resolvidoPorUserId] || resolvidoPorUserId || ''
    };
  });

  // 🔍 DEBUG: Log das divergências mapeadas
  console.log('🔍 DIVERGÊNCIAS MAPEADAS:', allDivergencias.length);
  if (allDivergencias.length > 0) {
    console.log('🔍 Primeira divergência:', allDivergencias[0]);
  }

  // Calcula estatísticas
  const totalDivergencias = allDivergencias.length;
  const pilotoDiferente = allDivergencias.filter(d => d.pilotoInvalido && d.situacao === 'Guardar').length;
  const chassisConfirmadoDescartar = allDivergencias.filter(d => {
    // Chassis confirmado + descartar
    const corrida = d.validacao === 'TROCAR PNEU' && d.situacao === 'Descartar';
    return corrida;
  }).length;
  const chassisNaoConfirmadoGuardar = allDivergencias.filter(d => {
    // Chassis não confirmado + guardar (sem ser por piloto diferente)
    const corrida = d.validacao !== 'TROCAR PNEU' && d.situacao === 'Guardar' && !d.pilotoInvalido;
    return corrida;
  }).length;
  const naoSolucionadas = allDivergencias.filter(d => !d.solucionada).length;

  // Agrupa divergências por temporada e depois por etapa e chassis
  const groupedDivergencias = allDivergencias.reduce<GroupedDivergencias>((acc, div) => {
    const seasonKey = div.seasonName || 'Sem Temporada';
    const stageKey = div.stageName || 'Sem Etapa';
    const chassisKey = div.chassis || 'Sem Chassis';
    
    // 🔍 DEBUG: Log apenas se realmente vazio (não loga mais warning)
    if (!div.seasonName || !div.stageName) {
      console.log(`ℹ️ Divergência ${div.codigo} aguardando metadados da sessão ${div.sessionId}`);
    }
    
    if (!acc[seasonKey]) {
      acc[seasonKey] = {
        stages: {}
      };
    }
    
    if (!acc[seasonKey].stages[stageKey]) {
      acc[seasonKey].stages[stageKey] = {
        sessionDate: div.sessionDate || new Date().toISOString(),
        createdBy: div.createdBy || 'Desconhecido',
        chassis: {}
      };
    }
    
    if (!acc[seasonKey].stages[stageKey].chassis[chassisKey]) {
      // 🔥 Busca o piloto confirmado para esse chassis na sessão original
      const session = sessions.find(s => s.id === div.sessionId);
      let pilotoConfirmado = 'Sem piloto';
      
      if (session?.chassis_data) {
        // 🔥 chassis_data pode vir como array ou objeto do Supabase
        const chassisArray = Array.isArray(session.chassis_data) 
          ? session.chassis_data 
          : Object.values(session.chassis_data);
        
        // 🔥 Procura pelo chassis matching exatamente o número
        const chassisData = chassisArray.find((c: any) => c?.chassis === chassisKey);
        pilotoConfirmado = chassisData?.piloto || 'Sem piloto';
      }
      
      acc[seasonKey].stages[stageKey].chassis[chassisKey] = {
        divergencias: [],
        pilotoConfirmado: pilotoConfirmado
      };
    }
    
    acc[seasonKey].stages[stageKey].chassis[chassisKey].divergencias.push(div);
    return acc;
  }, {});



  const toggleStage = (stageKey: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageKey)) {
      newExpanded.delete(stageKey);
    } else {
      newExpanded.add(stageKey);
    }
    setExpandedStages(newExpanded);
  };

  const toggleSeason = (seasonKey: string) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonKey)) {
      newExpanded.delete(seasonKey);
    } else {
      newExpanded.add(seasonKey);
    }
    setExpandedSeasons(newExpanded);
  };

  const toggleChassis = (chassisKey: string) => {
    const newExpanded = new Set(expandedChassis);
    if (newExpanded.has(chassisKey)) {
      newExpanded.delete(chassisKey);
    } else {
      newExpanded.add(chassisKey);
    }
    setExpandedChassis(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para obter a descrição do motivo da divergência
  const getMotivoDivergencia = (tire: DivergenciaTire): string => {
    const temPilotoInvalido = tire.pilotoInvalido && tire.situacao === 'Guardar';
    const temStatusDescartar = tire.situacao === 'Descartar';
    
    if (temPilotoInvalido && temStatusDescartar) {
      return 'Piloto diferente E Status Descartar';
    } else if (temPilotoInvalido) {
      return 'Piloto diferente do chassis';
    } else if (temStatusDescartar) {
      return 'Chassis confirmado + Status Descartar';
    } else {
      // Caso padrão: chassis não confirmado + guardar
      return 'Chassis não confirmado + Status Guardar';
    }
  };

  const openDetailsModal = (tire: DivergenciaTire) => {
    setSelectedTire(tire);
    setShowDetailsModal(true);
  };

  const openSolutionModal = (tire: DivergenciaTire) => {
    setSelectedTire(tire);
    setMotivoDivergencia('');
    setComoSolucionada('');
    setShowSolutionModal(true);
  };

  const handleSaveSolution = async () => {
    if (!motivoDivergencia.trim() || !comoSolucionada.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!selectedTire) {
      toast.error('Pneu não selecionado');
      return;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      console.log('\n🔍 ===== SALVANDO SOLUÇÃO =====');
      console.log('Session ID:', selectedTire.sessionId);
      console.log('Tire Code:', selectedTire.codigo);
      console.log('Jogo:', selectedTire.jogo);
      console.log('Posição:', selectedTire.posicao);
      console.log('Total de divergências no state:', divergenciasSupabase.length);
      
      // Busca a divergência existente no Supabase
      const divergenciaExistente = divergenciasSupabase.find(
        d => {
          const match = d.session_id === selectedTire.sessionId && 
                       d.tire_code === selectedTire.codigo && 
                       d.jogo === selectedTire.jogo &&
                       d.posicao === selectedTire.posicao;
          console.log(`Comparando com ID ${d.id}:`, {
            session_match: d.session_id === selectedTire.sessionId,
            tire_match: d.tire_code === selectedTire.codigo,
            jogo_match: d.jogo === selectedTire.jogo,
            posicao_match: d.posicao === selectedTire.posicao,
            match
          });
          return match;
        }
      );

      console.log('Divergência encontrada:', divergenciaExistente);

      if (divergenciaExistente?.id) {
        console.log('💾 Salvando solução para divergência ID:', divergenciaExistente.id);
        console.log('Motivo:', motivoDivergencia);
        console.log('Solução:', comoSolucionada);
        console.log('Resolvido por:', currentUser.email);
        
        // Atualiza a divergência existente
        const result = await solveTireDivergence(
          divergenciaExistente.id,
          motivoDivergencia,
          comoSolucionada,
          currentUser.email || 'Usuário'
        );

        console.log('Resultado do salvamento:', result);

        if (result.success) {
          console.log('✅ Solução salva com sucesso!');
          toast.success('Solução salva com sucesso!');
          setShowSolutionModal(false);
          setMotivoDivergencia('');
          setComoSolucionada('');
          
          // 🔥 Listener em tempo real vai atualizar automaticamente, não precisa recarregar manualmente
          console.log('✅ Divergência resolvida! Atualização em tempo real ativa.');
        } else {
          console.error('❌ Erro no resultado:', result.error);
          toast.error(`Erro ao salvar solução: ${result.error}`);
        }
      } else {
        console.error('❌ Divergência não encontrada no banco de dados');
        console.error('Divergências disponíveis:', divergenciasSupabase.map(d => ({
          id: d.id,
          session_id: d.session_id,
          tire_code: d.tire_code,
          jogo: d.jogo,
          posicao: d.posicao
        })));
        toast.error('Divergência não encontrada. Tente recarregar a página.');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar solução:', error);
      toast.error('Erro ao salvar solução');
    }
  };

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div 
        className="border-b"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)'
              }}
            >
              <AlertTriangle size={24} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Divergências Detectadas
              </h1>
              <p className="text-gray-500 mt-1">
                Pneus com divergências encontradas durante a conferência de baia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div 
            className="rounded-xl border p-4"
            style={{ background: '#FFFBEB', borderColor: '#FEF3C7' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">TOTAL DIVERGÊNCIAS</div>
            <div className="text-2xl font-bold text-gray-900">{totalDivergencias}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#FFF7ED', borderColor: '#FFEDD5' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">PILOTO DIFERENTE</div>
            <div className="text-2xl font-bold text-gray-900">{pilotoDiferente}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#FEF2F2', borderColor: '#FEE2E2' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">CHASSIS CONFIRMADO + DESCARTAR</div>
            <div className="text-2xl font-bold text-gray-900">{chassisConfirmadoDescartar}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">NÃO SOLUCIONADAS</div>
            <div className="text-2xl font-bold text-gray-900">{naoSolucionadas}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">CHASSIS NÃO CONFIRMADO + GUARDAR</div>
            <div className="text-2xl font-bold text-gray-900">{chassisNaoConfirmadoGuardar}</div>
          </div>
        </div>

        {/* Filtros */}
        <div 
          className="rounded-xl border p-6 mb-6"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Filter size={20} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Divergência
              </label>
              <select
                value={divergenciaType}
                onChange={(e) => setDivergenciaType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="todas">Todas as Divergências</option>
                <option value="piloto">Piloto Diferente (Guardar)</option>
                <option value="chassis_confirmado_descartar">Chassis Confirmado + Descartar</option>
                <option value="chassis_nao_confirmado_guardar">Chassis Não Confirmado + Guardar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">Pendentes</option>
                <option value="solucionada">Solucionadas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Divergências Agrupadas */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-500"></div>
            <p className="text-gray-600 mt-4">Carregando divergências...</p>
          </div>
        ) : Object.keys(groupedDivergencias).length === 0 ? (
          <div 
            className="rounded-xl border p-12 text-center"
            style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          >
            <AlertTriangle size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma divergência encontrada
            </h3>
            <p className="text-gray-500">
              Não há divergências para exibir no momento.
            </p>
          </div>
        ) : (
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          >
            <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
              {Object.entries(groupedDivergencias)
                .filter(([seasonKey, seasonData]) => {
                  // Filtra temporadas que tenham pelo menos 1 divergência que atende aos filtros
                  return Object.values(seasonData.stages).some(stageData => 
                    Object.values(stageData.chassis).some(chassisData =>
                      chassisData.divergencias.some(tire => {
                        // Aplicar filtros
                        const matchesDivergenciaType = 
                          divergenciaType === 'todas' || 
                          (divergenciaType === 'piloto' && tire.pilotoInvalido && tire.situacao === 'Guardar') ||
                          (divergenciaType === 'chassis_confirmado_descartar' && tire.validacao === 'TROCAR PNEU' && tire.situacao === 'Descartar') ||
                          (divergenciaType === 'chassis_nao_confirmado_guardar' && tire.validacao !== 'TROCAR PNEU' && tire.situacao === 'Guardar' && !tire.pilotoInvalido);
                        
                        const matchesStatus = 
                          statusFilter === 'todos' ||
                          (statusFilter === 'pendente' && !tire.solucionada) ||
                          (statusFilter === 'solucionada' && tire.solucionada);
                        
                        return matchesDivergenciaType && matchesStatus;
                      })
                    )
                  );
                })
                .map(([seasonKey, seasonData]) => {
                  const isExpanded = expandedSeasons.has(seasonKey);
                  
                  return (
                  <div key={seasonKey}>
                    {/* Season */}
                    <button
                      onClick={() => toggleSeason(seasonKey)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: '#FEF3C7' }}
                        >
                          <AlertTriangle size={20} className="text-orange-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{seasonKey}</div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={14} />
                              {Object.values(seasonData.stages).reduce((acc, stage) => acc + Object.values(stage.chassis).reduce((chassisAcc, chassis) => chassisAcc + chassis.divergencias.length, 0), 0)} divergências
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span 
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ background: '#FEF3C7', color: '#92400E' }}
                        >
                          {Object.values(seasonData.stages).reduce((acc, stage) => acc + Object.values(stage.chassis).reduce((chassisAcc, chassis) => chassisAcc + chassis.divergencias.length, 0), 0)} pneus
                        </span>
                        {isExpanded ? (
                          <ChevronDown size={20} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Stages */}
                    {isExpanded && Object.entries(seasonData.stages).map(([stageKey, stageData]) => {
                      const isExpandedStage = expandedStages.has(stageKey);
                      
                      return (
                        <div key={stageKey}>
                          {/* Etapa */}
                          <button
                            onClick={() => toggleStage(stageKey)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            style={{ paddingLeft: '2rem' }}
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: '#FEF3C7' }}
                              >
                                <AlertTriangle size={20} className="text-orange-600" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-gray-900">{stageKey}</div>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                  <span>{formatDate(stageData.sessionDate)}</span>
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle size={14} />
                                    {Object.values(stageData.chassis).reduce((acc, chassis) => acc + chassis.divergencias.length, 0)} divergências
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span 
                                className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{ background: '#FEF3C7', color: '#92400E' }}
                              >
                                {Object.values(stageData.chassis).reduce((acc, chassis) => acc + chassis.divergencias.length, 0)} pneus
                              </span>
                              {isExpandedStage ? (
                                <ChevronDown size={20} className="text-gray-400" />
                              ) : (
                                <ChevronRight size={20} className="text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Chassis */}
                          {isExpandedStage && Object.entries(stageData.chassis).map(([chassisKey, chassisData]) => {
                            const isExpandedChassis = expandedChassis.has(`${stageKey}-${chassisKey}`);
                            
                            return (
                              <div key={chassisKey}>
                                {/* Chassis */}
                                <button
                                  onClick={() => toggleChassis(`${stageKey}-${chassisKey}`)}
                                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                  style={{ paddingLeft: '4rem' }}
                                >
                                  <div className="flex items-center gap-4">
                                    <div 
                                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                                      style={{ background: '#DBEAFE' }}
                                    >
                                      <Car size={20} className="text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                      <div className="font-semibold text-gray-900">
                                        {chassisKey}
                                        <span className="text-gray-500 font-normal ml-2">
                                          • Piloto: {chassisData.pilotoConfirmado || 'Sem piloto'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1">
                                          <AlertTriangle size={14} />
                                          {chassisData.divergencias.length} divergências
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span 
                                      className="px-3 py-1 rounded-full text-sm font-medium"
                                      style={{ background: '#DBEAFE', color: '#1E40AF' }}
                                    >
                                      {chassisData.divergencias.length} pneus
                                    </span>
                                    {isExpandedChassis ? (
                                      <ChevronDown size={20} className="text-gray-400" />
                                    ) : (
                                      <ChevronRight size={20} className="text-gray-400" />
                                    )}
                                  </div>
                                </button>

                                {/* Lista de Pneus com Divergências */}
                                {isExpandedChassis && (
                                  <div className="bg-gray-50 border-t" style={{ borderColor: '#E5E7EB' }}>
                                    <div className="px-6 py-3 bg-white border-b" style={{ borderColor: '#E5E7EB', paddingLeft: '4rem' }}>
                                      <div className="text-sm font-semibold text-gray-700">
                                        Pneus com Divergências ({chassisData.divergencias.length})
                                      </div>
                                    </div>
                                    
                                    <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
                                      {chassisData.divergencias.map((tire, idx) => {
                                        const isSolucionada = divergenciasSupabase.some(div => div.tire_code === tire.codigo && div.status === 'solucionada');
                                  
                                        return (
                                          <div
                                            key={idx}
                                            className="px-6 py-4 transition-colors"
                                            style={{ 
                                              borderLeft: isSolucionada ? '4px solid #10B981' : '4px solid #F97316',
                                              background: isSolucionada ? '#F0FDF4' : '#FFFFFF',
                                              paddingLeft: '4rem'
                                            }}
                                          >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                          <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ background: isSolucionada ? '#D1FAE5' : '#FEF3C7' }}
                                          >
                                            {isSolucionada ? (
                                              <CheckCircle size={20} className="text-green-600" />
                                            ) : (
                                              <AlertTriangle size={20} className="text-orange-600" />
                                            )}
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-gray-900">{tire.codigo}</span>
                                              {isSolucionada && (
                                                <span 
                                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                                  style={{ background: '#D1FAE5', color: '#065F46' }}
                                                >
                                                  ✓ Solucionada
                                                </span>
                                              )}
                                              <span className="text-gray-400">•</span>
                                              <span className="text-sm text-gray-600">
                                                <Car size={14} className="inline mr-1" />
                                                {tire.chassis}
                                              </span>
                                              <span className="text-gray-400">•</span>
                                              <span className="text-sm text-gray-600">
                                                Jogo {tire.jogo} - {tire.posicao}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {tire.situacao === 'Descartar' && (
                                                <span 
                                                  className="px-2 py-1 rounded text-xs font-medium"
                                                  style={{ background: '#FEE2E2', color: '#991B1B' }}
                                                >
                                                  ⚠️ Status Descartar
                                                </span>
                                              )}
                                              {tire.pilotoInvalido && (
                                                <span 
                                                  className="px-2 py-1 rounded text-xs font-medium"
                                                  style={{ background: '#FED7AA', color: '#9A3412' }}
                                                >
                                                  ⚠️ Piloto: {tire.piloto}
                                                </span>
                                              )}
                                              <span className="text-xs text-gray-500">
                                                {tire.tipo || '-'} • {tire.voltas || '-'} voltas
                                              </span>
                                            </div>
                                            {/* Motivo da Divergência */}
                                            <div className="mt-2">
                                              <div 
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium inline-block"
                                                style={{ background: '#FEF3C7', color: '#78350F', border: '1px solid #FDE68A' }}
                                              >
                                                📋 {getMotivoDivergencia(tire)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => openDetailsModal(tire)}
                                            className="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2"
                                            style={{ color: '#F97316', background: '#FFF7ED' }}
                                          >
                                            <Eye size={16} />
                                            Detalhes
                                          </button>
                                          {!isSolucionada && (
                                            <button
                                              onClick={() => openSolutionModal(tire)}
                                              className="px-4 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2"
                                              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                                            >
                                              <Check size={16} />
                                              Solucionar
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedTire && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes da Divergência</h2>
                  <p className="text-gray-500 text-sm mt-1">Informações completas do pneu divergente</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Informações do Pneu */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Informações do Pneu</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Código</div>
                    <div className="font-semibold text-gray-900">{selectedTire.codigo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Posição</div>
                    <div className="font-semibold text-gray-900">{selectedTire.posicao}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Chassis</div>
                    <div className="font-semibold text-gray-900">{selectedTire.chassis}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Piloto</div>
                    <div className="font-semibold text-gray-900">{selectedTire.piloto}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Jogo</div>
                    <div className="font-semibold text-gray-900">{selectedTire.jogo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tipo</div>
                    <div className="font-semibold text-gray-900">{selectedTire.tipo || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Voltas</div>
                    <div className="font-semibold text-gray-900">{selectedTire.voltas || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Situação</div>
                    <div className="font-semibold text-gray-900">{selectedTire.situacao}</div>
                  </div>
                </div>
              </div>

              {/* Informações da Sessão */}
              <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="font-semibold text-gray-900 mb-3">Informações da Conferência</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Temporada</div>
                    <div className="font-semibold text-gray-900">{selectedTire.seasonName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Etapa</div>
                    <div className="font-semibold text-gray-900">{selectedTire.stageName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Data da Conferência</div>
                    <div className="font-semibold text-gray-900">{formatDate(selectedTire.sessionDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Conferido por</div>
                    <div className="font-semibold text-gray-900">{selectedTire.createdBy}</div>
                  </div>
                </div>
              </div>

              {/* Motivo da Divergência */}
              <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="font-semibold text-gray-900 mb-3">Motivo da Divergência</h3>
                <div 
                  className="px-4 py-3 rounded-lg"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#78350F' }}>
                    {getMotivoDivergencia(selectedTire)}
                  </p>
                </div>
              </div>

              {/* Informações da Solução (se resolvida) */}
              {selectedTire.solucionada && (
                <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <h3 className="font-semibold text-gray-900 mb-3">Solução</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Motivo da Divergência</div>
                      <div 
                        className="px-4 py-3 rounded-lg text-sm"
                        style={{ background: '#F3F4F6' }}
                      >
                        {selectedTire.motivoDivergencia || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Como foi Solucionada</div>
                      <div 
                        className="px-4 py-3 rounded-lg text-sm"
                        style={{ background: '#F3F4F6' }}
                      >
                        {selectedTire.comoSolucionada || '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Data de Resolução</div>
                        <div className="font-semibold text-gray-900">
                          {selectedTire.dataResolucao ? formatDate(selectedTire.dataResolucao) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Resolvido por</div>
                        <div className="font-semibold text-gray-900">{selectedTire.resolvidoPor || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-6 py-3 rounded-lg text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solução */}
      {showSolutionModal && selectedTire && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSolutionModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Solucionar Divergência</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Pneu: {selectedTire.codigo} - {selectedTire.chassis} - Jogo {selectedTire.jogo}
                  </p>
                </div>
                <button
                  onClick={() => setShowSolutionModal(false)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da Divergência *
                </label>
                <textarea
                  value={motivoDivergencia}
                  onChange={(e) => setMotivoDivergencia(e.target.value)}
                  placeholder="Descreva o motivo da divergência..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Como foi Solucionada *
                </label>
                <textarea
                  value={comoSolucionada}
                  onChange={(e) => setComoSolucionada(e.target.value)}
                  placeholder="Descreva como a divergência foi solucionada..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowSolutionModal(false)}
                className="flex-1 px-6 py-3 rounded-lg font-semibold border"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSolution}
                className="flex-1 px-6 py-3 rounded-lg text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                Salvar Solução
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
