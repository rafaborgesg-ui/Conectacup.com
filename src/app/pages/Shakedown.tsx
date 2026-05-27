import { ClipboardCheck, Plus, ChevronDown, ChevronUp, AlertTriangle, X, Save, ArrowLeft, Trash2, ChevronRight, Info, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTireCheckSessions, getActiveConferenceSessions, getPilotSlickTires, findIdealSet, findSecondBestSet, getActiveSession, type TireCheckSession, type ChassisCheckData } from '../utils/tireCheckSupabase';
import { getSeasons, getSeasonStages, type Season, type SeasonStage } from '../utils/seasonStorage';
import { getShakedownLists, createShakedownList, deleteShakedownList, updateShakedownTracking, groupShakedownListsBySeasonAndStage, type ShakedownList } from '../utils/shakedownStorage';
import { sanitizeFileName } from '../utils/stringUtils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Tooltip } from '../components/Tooltip';
import { CollectorStyles } from '../components/CollectorStyles';

type NavigationLevel = 'home' | 'categories' | 'chassis' | 'tires';

// 🔥 Chave para sessionStorage (dados temporários da lista em andamento)
const TEMP_SESSION_KEY = 'shakedown_temp_session';

// 🔥 Função para abreviar posições de pneus (para o coletor)
function abbreviatePosition(position: string): string {
  const abbreviations: Record<string, string> = {
    'Dianteiro Esquerdo': 'DE',
    'Dianteiro Direito': 'DD',
    'Traseiro Esquerdo': 'TE',
    'Traseiro Direito': 'TD',
  };
  return abbreviations[position] || position;
}

export default function Shakedown() {
  // Tab states
  const [activeTab, setActiveTab] = useState<'conferencia' | 'acompanhamento'>('conferencia');
  
  // Navegação
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('home');
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  
  // Estados da lista
  const [isLoading, setIsLoading] = useState(false);
  const [savedLists, setSavedLists] = useState<ShakedownList[]>([]);
  const [currentSession, setCurrentSession] = useState<TireCheckSession | null>(null);
  const [expandedChassis, setExpandedChassis] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Estados de expansão (accordion)
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  // Parâmetros de Shakedown
  const [minVoltas, setMinVoltas] = useState(10);
  const [maxVoltas, setMaxVoltas] = useState(50);
  
  // Validações de inversão por pneu individual
  const [tireInversaoValidations, setTireInversaoValidations] = useState<Record<string, boolean>>({});
  
  // Informações do jogo ideal por chassis
  const [idealSetInfo, setIdealSetInfo] = useState<Record<string, { setName: string; voltasDisplay: string; secondBest?: string; secondBestDisplay?: string } | null>>({});
  
  // 🔥 Lista selecionada para acompanhamento (independente da sessão ativa)
  const [selectedListForTracking, setSelectedListForTracking] = useState<string | null>(null);
  
  // 🔥 Chassis finalizados (por lista) - { listId: { chassis: boolean } }
  const [finalizadosMap, setFinalizadosMap] = useState<Record<string, Record<string, boolean>>>({});
  
  // 🔥 Mostrar 2º jogo (por lista) - { listId: { chassis: boolean } }
  const [segundoJogoMap, setSegundoJogoMap] = useState<Record<string, Record<string, boolean>>>({});
  
  // 🔥 Filtro de busca por chassis ou piloto
  const [filterText, setFilterText] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [stages, setStages] = useState<SeasonStage[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);

  // 🔥 Carrega listas salvas ao montar o componente
  useEffect(() => {
    loadShakedownLists();
    loadTempSession(); // Carrega sessão temporária se existir
  }, []);

  // 🔥 Carrega os estados salvos quando uma lista é selecionada para acompanhamento
  useEffect(() => {
    if (!selectedListForTracking) return;

    const trackingList = savedLists.find(list => list.id === selectedListForTracking);
    if (!trackingList) return;

    // Carrega os estados de inversão completa e segundo jogo solicitado
    const newFinalizadosMap: Record<string, boolean> = {};
    const newSegundoJogoMap: Record<string, boolean> = {};

    trackingList.chassis_data.forEach(chassisData => {
      if (chassisData.inversao_completa) {
        newFinalizadosMap[chassisData.chassis] = true;
      }
      if (chassisData.segundo_jogo_solicitado) {
        newSegundoJogoMap[chassisData.chassis] = true;
      }
    });

    // Atualiza os maps
    setFinalizadosMap(prev => ({
      ...prev,
      [selectedListForTracking]: newFinalizadosMap
    }));

    setSegundoJogoMap(prev => ({
      ...prev,
      [selectedListForTracking]: newSegundoJogoMap
    }));
  }, [selectedListForTracking, savedLists]);

  const loadShakedownLists = async () => {
    setIsLoading(true);
    try {
      const lists = await getShakedownLists();
      
      // 🔥 SINCRONIZAÇÃO COM RECÁLCULO DE VALIDAÇÕES
      const [allSessions, activeSessions] = await Promise.all([
        getTireCheckSessions(),
        getActiveConferenceSessions()
      ]);
      
      const allConferenceSessions = [...allSessions, ...activeSessions];
      
      const updatedLists = await Promise.all(lists.map(async list => {
        const matchingSession = allConferenceSessions.find(
          session => 
            session.season_name === list.season_name && 
            session.stage_name === list.stage_name
        );
        
        if (!matchingSession) {
          console.log(`ℹ️ Lista ${list.id}: Nenhuma sessão correspondente encontrada`);
          return list;
        }
        
        console.log(`🔄 Lista ${list.id}: Sincronizando com sessão ${matchingSession.id}`);
        
        const minVoltaslist = list.min_voltas || 10;
        const maxVoltaslist = list.max_voltas || 50;
        
        const updatedChassisData = await Promise.all(list.chassis_data.map(async listChassis => {
          const sessionChassis = matchingSession.chassis_data.find(
            sc => sc.chassis === listChassis.chassis
          );
          
          if (!sessionChassis) {
            return listChassis;
          }
          
          let idealSetUpdated: string | null = listChassis.idealSet || null;
          const corridaValue = sessionChassis.corrida?.toUpperCase();
          const isConfirmed = corridaValue === 'SIM';
          const isUnconfirmedOrUndefined = corridaValue === 'NÃO' || !corridaValue || corridaValue === '';
          
          if (isConfirmed && sessionChassis.piloto && sessionChassis.piloto.trim() !== '') {
            const pilotTires = await getPilotSlickTires(sessionChassis.piloto);
            idealSetUpdated = findIdealSet(pilotTires, minVoltaslist, maxVoltaslist);
          }
          
          const updatedTireSets = sessionChassis.tireSets.map(set => ({
            ...set,
            tires: set.tires.map(tire => {
              if (tire.codigo === '-' || !set.montadoNoCarro) return tire;
              
              if (tire.tipo === 'W' || tire.tipo === 'Wet' || tire.tipo === 'W1') {
                return { ...tire, validacao: 'INVERSÃO NECESSÁRIA' as const };
              }
              
              if (tire.tipo !== 'N' && tire.tipo !== 'U' && tire.tipo !== 'Slick') {
                return tire;
              }
              
              const voltasNum = parseInt(tire.voltas) || 0;
              const isOutOfRange = voltasNum < minVoltaslist || voltasNum > maxVoltaslist;
              
              if (isUnconfirmedOrUndefined) {
                const isDiscarded = tire.situacao === 'Descartar';
                const isToKeep = tire.situacao === 'Guardar';
                
                if (isToKeep) {
                  return { ...tire, validacao: 'INVERSÃO NECESSÁRIA' as const };
                }
                
                const effectiveIsOutOfRange = isDiscarded ? false : isOutOfRange;
                const shouldShowAnaliseMessage = isDiscarded && !effectiveIsOutOfRange;
                
                return {
                  ...tire,
                  validacao: shouldShowAnaliseMessage ? 'CUP - ANALISE VOLTAS' as const : 'INVERSÃO NECESSÁRIA' as const
                };
              }
              
              let tireSetIdentifier = tire.set;
              if (/[A-D]$/.test(tire.set)) {
                tireSetIdentifier = tire.set.slice(0, -1);
              }
              
              const belongsToIdealSet = idealSetUpdated !== null && tireSetIdentifier === idealSetUpdated;
              const hasDivergence = tire.divergencia || tire.pilotoInvalido || tire.situacao === 'Descartar';
              const needsInversion = isOutOfRange || hasDivergence || (idealSetUpdated !== null && !belongsToIdealSet);
              
              return {
                ...tire,
                validacao: needsInversion ? 'INVERSÃO NECESSÁRIA' as const : 'OK' as const
              };
            })
          }));
          
          return {
            ...listChassis,
            tireSets: updatedTireSets,
            corrida: sessionChassis.corrida,
            idealSet: idealSetUpdated,
            piloto: sessionChassis.piloto,
          };
        }));
        
        return {
          ...list,
          chassis_data: updatedChassisData
        };
      }));
      
      setSavedLists(updatedLists);
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
      toast.error('Erro ao carregar listas de Shakedown');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovaLista = async () => {
    setShowModal(true);
    setLoadingSeasons(true);
    try {
      const allSeasons = await getSeasons();
      const activeSeasons = allSeasons.filter(s => s.status === 'ativa' || s.status === 'active');
      setSeasons(activeSeasons);
      
      if (activeSeasons.length === 0) {
        toast.error('Nenhuma temporada ativa encontrada');
      }
    } catch (error) {
      console.error('Erro ao buscar temporadas:', error);
      toast.error('Erro ao carregar temporadas');
    } finally {
      setLoadingSeasons(false);
    }
  };

  const handleSeasonSelect = async (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setSelectedStageId('');
    setLoadingStages(true);
    try {
      const stagesList = await getSeasonStages(seasonId);
      setStages(stagesList);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      toast.error('Erro ao carregar etapas');
    } finally {
      setLoadingStages(false);
    }
  };

  const loadTempSession = () => {
    const storedSession = sessionStorage.getItem(TEMP_SESSION_KEY);
    if (storedSession) {
      const { session, listId, voltas } = JSON.parse(storedSession);
      setCurrentSession(session);
      setCurrentListId(listId);
      setMinVoltas(voltas.min);
      setMaxVoltas(voltas.max);
      setCurrentLevel('categories');
    }
  };

  const saveTempSession = (session: TireCheckSession, listId: string, voltas: { min: number; max: number }) => {
    sessionStorage.setItem(TEMP_SESSION_KEY, JSON.stringify({ session, listId, voltas }));
  };

  const clearTempSession = () => {
    sessionStorage.removeItem(TEMP_SESSION_KEY);
  };

  const handleConfirmarLista = async () => {
    if (!currentSession) {
      toast.error('Nenhuma sessão ativa encontrada');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Salvando lista com validações calculadas...');
      
      // 🔥 Mapeia os chassis_data e aplica as validações calculadas
      const chassisDataWithValidations = currentSession.chassis_data.map(chassisData => {
        console.log(`🔄 Processando chassis ${chassisData.chassis}...`);
        
        // 🔥 Usa os valores calculados
        const idealSet = idealSetInfo[chassisData.chassis]?.setName || null;
        const idealSetVoltas = idealSetInfo[chassisData.chassis]?.voltasDisplay || null;
        
        console.log('   idealSet:', idealSet, '| idealSetVoltas:', idealSetVoltas);
        
        // 🔥 Usa os valores calculados
        const secondBestSet = idealSetInfo[chassisData.chassis]?.secondBest || null;
        const secondBestVoltas = idealSetInfo[chassisData.chassis]?.secondBestDisplay || null;
        
        console.log('   secondBestSet:', secondBestSet, '| secondBestVoltas:', secondBestVoltas);
        
        return {
          ...chassisData,
          idealSet, // 🔥 Salva o jogo ideal junto com o chassis
          idealSetVoltas, // 🔥 Salva as voltas do SET SD
          secondBestSet, // 🔥 Salva o segundo melhor jogo junto com o chassis
          secondBestVoltas, // 🔥 Salva as voltas do 2º SET
          tireSets: chassisData.tireSets.map(set => ({
            ...set,
            tires: set.tires.map(tire => {
              if (tire.codigo === '-') return tire;
              
              // 🔥 Busca a validação calculada para este pneu
              const tireKey = `${chassisData.chassis}-${set.jogo}-${tire.posicao}-${tire.codigo}`;
              const needsInversion = tireInversaoValidations[tireKey] || false;
              
              // 🔥 Determina a validação apropriada
              const corridaValue = chassisData.corrida?.toUpperCase();
              const isUnconfirmedOrUndefined = corridaValue === 'NÃO' || !corridaValue || corridaValue === '';
              const isWet = tire.tipo === 'W' || tire.tipo === 'Wet' || tire.tipo === 'W1';
              const isDiscarded = tire.situacao === 'Descartar';
              const shouldShowAnaliseMessage = isUnconfirmedOrUndefined && isDiscarded && !isWet && !needsInversion;
              
              let validacao: 'OK' | 'TROCAR PNEU' | 'INVERSÃO NECESSÁRIA' | 'CUP - ANALISE VOLTAS' | null = null;
              
              if (needsInversion) {
                validacao = 'INVERSÃO NECESSÁRIA';
              } else if (shouldShowAnaliseMessage) {
                validacao = 'CUP - ANALISE VOLTAS';
              } else {
                validacao = 'OK';
              }
              
              return {
                ...tire,
                validacao
              };
            })
          }))
        };
      });
      
      const result = await createShakedownList(
        currentSession.season_name,
        currentSession.stage_name,
        currentSession.check_date,
        minVoltas,
        maxVoltas,
        chassisDataWithValidations
      );

      if (result) {
        toast.success('Lista salva com sucesso!');
        setCurrentListId(result.id);
        clearTempSession(); // Limpa a sessão temporária após salvar
        await loadShakedownLists();
        // 🔥 Volta para o início da página
        setCurrentLevel('home');
        setSelectedCategory(null);
      } else {
        toast.error('Erro ao salvar lista');
      }
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
      toast.error('Erro ao salvar lista');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 Função para marcar/desmarcar chassis como finalizado (com salvamento automático)
  const handleToggleFinalizado = async (listId: string, chassis: string) => {
    // Atualiza o estado local primeiro
    const newValue = !finalizadosMap[listId]?.[chassis];
    
    setFinalizadosMap(prev => {
      const current = { ...prev };
      if (!current[listId]) {
        current[listId] = {};
      }
      current[listId] = {
        ...current[listId],
        [chassis]: newValue
      };
      return current;
    });

    // Salva no banco de dados
    await handleUpdateField(listId, chassis, 'inversao_completa', newValue);
  };

  // 🔥 Função para marcar/desmarcar "Solicitar 2º jogo" (com salvamento automático)
  const handleToggleSegundoJogo = async (listId: string, chassis: string) => {
    // Atualiza o estado local primeiro
    const newValue = !segundoJogoMap[listId]?.[chassis];
    
    setSegundoJogoMap(prev => {
      const current = { ...prev };
      if (!current[listId]) {
        current[listId] = {};
      }
      current[listId] = {
        ...current[listId],
        [chassis]: newValue
      };
      return current;
    });

    // Salva no banco de dados
    await handleUpdateField(listId, chassis, 'segundo_jogo_solicitado', newValue);
  };

  // 🔥 Função genérica para atualizar um campo específico de um chassis
  const handleUpdateField = async (listId: string, chassis: string, field: string, value: any) => {
    try {
      const trackingList = savedLists.find(list => list.id === listId);
      if (!trackingList) return;

      // Atualiza apenas o chassis específico
      const updatedChassisData = trackingList.chassis_data.map(chassisData => {
        if (chassisData.chassis === chassis) {
          return {
            ...chassisData,
            [field]: value
          };
        }
        return chassisData;
      });

      const result = await updateShakedownTracking(listId, updatedChassisData);
      
      if (result) {
        // Recarrega as listas para refletir as mudanças
        await loadShakedownLists();
        // Toast discreto de confirmação
        toast.success('✓ Salvo automaticamente', { duration: 1500 });
      }
    } catch (error) {
      console.error('Erro ao salvar alteração:', error);
      toast.error('Erro ao salvar alteração');
    }
  };

  // 🔥 Calcula status de inversão por chassis
  const getChassisInversionStatus = (chassisData: ChassisCheckData): 'SIM' | 'NÃO' | 'ANALISE' => {
    const tireStatuses: Array<'SIM' | 'NÃO' | 'ANALISE'> = [];
    
    for (const set of chassisData.tireSets) {
      if (set.montadoNoCarro) {
        for (const tire of set.tires) {
          if (tire.codigo === '-') continue;
          
          // 🔥 Usa a validação salva no próprio dado do pneu
          const needsInversion = tire.validacao === 'INVERSÃO NECESSÁRIA';
          
          // 🔥 Verifica se é chassis não confirmado/indefinido
          const corridaValue = chassisData.corrida?.toUpperCase();
          const isUnconfirmedOrUndefined = corridaValue === 'NÃO' || !corridaValue || corridaValue === '';
          const isWet = tire.tipo === 'W' || tire.tipo === 'Wet' || tire.tipo === 'W1';
          const isDiscarded = tire.situacao === 'Descartar';
          const shouldShowAnaliseMessage = isUnconfirmedOrUndefined && isDiscarded && !isWet;
          
          // 🔥 Determina o status individual do pneu
          if (needsInversion) {
            tireStatuses.push('SIM');
          } else if (shouldShowAnaliseMessage) {
            tireStatuses.push('ANALISE');
          } else {
            tireStatuses.push('NÃO');
          }
        }
      }
    }
    
    // 🔥 HIERARQUIA DE REGRAS (em ordem de prioridade):
    
    // 🔥 REGRA 1 (MÁXIMA PRIORIDADE): Se QUALQUER pneu = SIM → chassis = SIM
    if (tireStatuses.includes('SIM')) {
      return 'SIM';
    }
    
    // 🔥 REGRA 2: Se TODOS os pneus = NÃO → chassis = NÃO
    // (Isso significa que todos pertencem ao jogo ideal e não precisam inversão)
    const allNo = tireStatuses.every(status => status === 'NÃO');
    if (allNo) {
      return 'NÃO';
    }
    
    // 🔥 REGRA 3: Caso contrário (se há "ANALISE" e/ou "NÃO", mas nenhum "SIM") → chassis = ANALISE
    // Isso cobre:
    // - Todos os pneus = "ANALISE"
    // - Mix de "ANALISE" e "NÃO" (sem nenhum "SIM")
    return 'ANALISE';
  };

  const handleExportInversionList = async () => {
    if (!selectedListForTracking) {
      toast.error('Selecione uma lista primeiro');
      return;
    }

    const trackingList = savedLists.find(list => list.id === selectedListForTracking);
    if (!trackingList) {
      toast.error('Lista não encontrada');
      return;
    }

    try {
      // Cria um novo documento PDF em orientação paisagem
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Agrupa chassis por categoria
      const categoryChassisMap: Record<string, Array<{ chassis: string; inversao: string }>> = {};
      
      trackingList.chassis_data.forEach(chassisData => {
        // Extrai categoria do sheetName (padrão usado na tela)
        const match = chassisData.sheetName?.match(/\(([^)]+)\)$/);
        const category = match ? match[1] : chassisData.categoria || 'SEM CATEGORIA';
        
        if (!categoryChassisMap[category]) {
          categoryChassisMap[category] = [];
        }
        
        // 🔥 Usa a mesma função que calcula o status na tela de acompanhamento
        const status = getChassisInversionStatus(chassisData);
        
        categoryChassisMap[category].push({
          chassis: chassisData.chassis,
          inversao: status === 'ANALISE' ? 'VERIFIQUE ESTADO DOS PNEUS' : status // 'SIM', 'NÃO' ou 'VERIFIQUE ESTADO DOS PNEUS'
        });
      });

      const categories = Object.keys(categoryChassisMap).sort();
      
      // Título do documento
      doc.setFontSize(16);
      doc.text('LISTA DE INVERSÕES - SHAKEDOWN', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`${trackingList.season_name} - ${trackingList.stage_name}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

      // Configuração das colunas
      const columnWidth = 90;
      const startX = 10;
      const startY = 30;
      const columnYPositions = [startY, startY, startY]; // Y atual de cada coluna
      
      // Função para desenhar uma tabela de categoria
      const drawCategoryTable = (category: string, xPosition: number, yPosition: number) => {
        const chassisList = categoryChassisMap[category];
        let currentY = yPosition;
        
        // Desenha cabeçalho da categoria
        doc.setFillColor(200, 200, 200);
        doc.rect(xPosition, currentY, columnWidth - 5, 8, 'FD');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(category, xPosition + 2, currentY + 5);

        // Desenha cabeçalho da tabela
        currentY += 8;
        doc.setFillColor(220, 220, 220);
        doc.rect(xPosition, currentY, (columnWidth - 5) * 0.35, 6, 'FD');
        doc.rect(xPosition + (columnWidth - 5) * 0.35, currentY, (columnWidth - 5) * 0.65, 6, 'FD');
        doc.setFontSize(8);
        doc.text('Chassis', xPosition + 2, currentY + 4);
        doc.text('Inversão', xPosition + (columnWidth - 5) * 0.35 + 2, currentY + 4);

        // Desenha linhas da tabela
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        chassisList.forEach(item => {
          // Desenha célula do chassis (branco com borda)
          doc.setFillColor(255, 255, 255);
          doc.rect(xPosition, currentY, (columnWidth - 5) * 0.35, 5, 'FD');
          
          // Desenha célula da inversão (colorida com borda)
          if (item.inversao === 'SIM') {
            doc.setFillColor(220, 53, 69); // vermelho
            doc.setTextColor(255, 255, 255);
          } else if (item.inversao === 'VERIFIQUE ESTADO DOS PNEUS') {
            doc.setFillColor(255, 193, 7); // amarelo
            doc.setTextColor(0, 0, 0);
          } else {
            doc.setFillColor(40, 167, 69); // verde
            doc.setTextColor(255, 255, 255);
          }
          
          doc.rect(xPosition + (columnWidth - 5) * 0.35, currentY, (columnWidth - 5) * 0.65, 5, 'FD');
          
          // Desenha bordas
          doc.setDrawColor(0, 0, 0);
          doc.rect(xPosition, currentY, (columnWidth - 5) * 0.35, 5);
          doc.rect(xPosition + (columnWidth - 5) * 0.35, currentY, (columnWidth - 5) * 0.65, 5);
          
          // Texto do chassis (preto)
          doc.setTextColor(0, 0, 0);
          doc.text(item.chassis, xPosition + 2, currentY + 3.5);
          
          // Texto da inversão (já colorido)
          const inversionText = item.inversao === 'VERIFIQUE ESTADO DOS PNEUS' ? 'VERIFIQUE' : item.inversao;
          doc.text(inversionText, xPosition + (columnWidth - 5) * 0.35 + 2, currentY + 3.5);
          
          currentY += 5;
        });
        
        return currentY + 5; // Retorna a próxima posição Y com espaçamento
      };

      // Distribui as categorias em 3 colunas
      let columnIndex = 0;
      categories.forEach(category => {
        const xPosition = startX + (columnIndex * columnWidth);
        const yPosition = columnYPositions[columnIndex];
        
        const nextY = drawCategoryTable(category, xPosition, yPosition);
        columnYPositions[columnIndex] = nextY;
        
        // Se ultrapassou a altura da página, muda para a próxima coluna
        if (nextY > 180) {
          columnIndex = (columnIndex + 1) % 3;
          
          // Se já usou todas as colunas, adiciona nova página
          if (columnIndex === 0) {
            doc.addPage();
            columnYPositions[0] = startY;
            columnYPositions[1] = startY;
            columnYPositions[2] = startY;
          }
        } else {
          columnIndex = (columnIndex + 1) % 3;
        }
      });

      // 🔥 Sanitiza nome do arquivo removendo caracteres inválidos
      const sanitizedSeasonName = sanitizeFileName(trackingList.season_name);
      const sanitizedStageName = sanitizeFileName(trackingList.stage_name);
      
      doc.save(`Lista_Inversoes_${sanitizedSeasonName}_${sanitizedStageName}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportFullReport = async () => {
    if (!selectedListForTracking) {
      toast.error('Selecione uma lista primeiro');
      return;
    }

    const trackingList = savedLists.find(list => list.id === selectedListForTracking);
    if (!trackingList) {
      toast.error('Lista não encontrada');
      return;
    }

    try {
      // Cria um novo workbook
      const wb = XLSX.utils.book_new();

      // Para cada chassis, cria uma aba
      trackingList.chassis_data.forEach(chassisData => {
        const sheetData: any[][] = [];

        // Cabeçalho
        sheetData.push([`RELATÓRIO COMPLETO - ${trackingList.season_name} - ${trackingList.stage_name}`]);
        sheetData.push([]);
        sheetData.push([`Chassis: ${chassisData.chassis}`, `Piloto: ${chassisData.piloto}`, `Corrida: ${chassisData.corrida || '-'}`]);
        sheetData.push([`Jogo Ideal (SET SD): ${chassisData.idealSet || '-'}`, `Voltas: ${chassisData.idealSetVoltas || '-'}`]);
        sheetData.push([]);

        // Para cada jogo de pneus
        chassisData.tireSets.forEach(set => {
          if (set.montadoNoCarro) {
            sheetData.push([`JOGO ${set.label}`]);
            sheetData.push(['Posição', 'Código', 'Piloto', 'Ano', 'SET', 'Tipo', 'Voltas', 'Situação', 'Validação']);
            
            set.tires.forEach(tire => {
              if (tire.codigo !== '-') {
                sheetData.push([
                  tire.posicao,
                  tire.codigo,
                  tire.piloto,
                  tire.ano,
                  tire.set,
                  tire.tipo,
                  tire.voltas,
                  tire.situacao,
                  tire.validacao || '-'
                ]);
              }
            });
            
            sheetData.push([]);
          }
        });

        // Cria a worksheet
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // Adiciona ao workbook (limita nome da aba a 31 caracteres)
        const sheetName = chassisData.chassis.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Salva o arquivo
      // 🔥 Sanitiza nome do arquivo removendo caracteres inválidos
      const sanitizedSeasonName = sanitizeFileName(trackingList.season_name);
      const sanitizedStageName = sanitizeFileName(trackingList.stage_name);
      
      XLSX.writeFile(wb, `Relatorio_Completo_${sanitizedSeasonName}_${sanitizedStageName}.xlsx`);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const result = await deleteShakedownList(listId);
      if (result) {
        toast.success('Lista excluída com sucesso!');
        await loadShakedownLists();
        
        // Se a lista excluída estava selecionada para tracking, limpa a seleção
        if (selectedListForTracking === listId) {
          setSelectedListForTracking(null);
        }
      } else {
        toast.error('Erro ao excluir lista');
      }
    } catch (error) {
      console.error('Erro ao excluir lista:', error);
      toast.error('Erro ao excluir lista');
    }
  };

  // 🔥 Valida se os pneus precisam de inversão (com base nos parâmetros min/max voltas)
  useEffect(() => {
    if (!currentSession) return;

    const validateInversions = async () => {
      const tireValidations: Record<string, boolean> = {};
      const idealSets: Record<string, { setName: string; voltasDisplay: string; secondBest?: string | null; secondBestDisplay?: string } | null> = {};

      for (const chassisData of currentSession.chassis_data) {
        if (!chassisData.piloto || chassisData.piloto.trim() === '') {
          idealSets[chassisData.chassis] = null;
          continue;
        }

        // 🔥 Verifica status de confirmação do chassis
        const corridaValue = chassisData.corrida?.toUpperCase();
        const isConfirmed = corridaValue === 'SIM';
        const isUnconfirmedOrUndefined = corridaValue === 'NÃO' || !corridaValue || corridaValue === '';

        let idealSet: string | null = null;

        // 🔥 Para chassis confirmados: calcula o jogo ideal
        // 🔥 Para chassis não confirmados ou indefinidos: jogo é sempre "CUP"
        if (isConfirmed) {
          const pilotTires = await getPilotSlickTires(chassisData.piloto);
          idealSet = findIdealSet(pilotTires, minVoltas, maxVoltas);

          console.log('🔍 Chassis:', chassisData.chassis, '| Piloto:', chassisData.piloto, '| Status: CONFIRMADO');
          console.log('🏆 Set Ideal identificado:', idealSet);

          if (idealSet !== null) {
            const idealSetTires = pilotTires.filter(t => {
              let setIdentifier = t.set;
              if (/[A-D]$/.test(t.set)) {
                setIdentifier = t.set.slice(0, -1);
              }
              return setIdentifier === idealSet;
            });
            
            const sortedTires = idealSetTires.sort((a, b) => {
              const posA = a.set.match(/[A-D]$/)?.[0] || '';
              const posB = b.set.match(/[A-D]$/)?.[0] || '';
              return posA.localeCompare(posB);
            });
            
            const voltasArray = sortedTires.map(t => t.voltas);
            const allEqual = voltasArray.every(v => v === voltasArray[0]);
            const voltasDisplay = allEqual ? `${voltasArray[0]} voltas` : `${voltasArray.join('/')} voltas`;
            
            console.log('📏 Voltas do SET SD:', voltasDisplay);
            
            // 🔥 Calcula o segundo melhor jogo
            const secondBest = findSecondBestSet(pilotTires, minVoltas, maxVoltas, idealSet);
            console.log('🥈 Segundo melhor set:', secondBest);
            console.log('📊 Pneus disponíveis do piloto:', pilotTires.map(t => `${t.set}(${t.voltas}v)`).join(', '));
            console.log('🎯 Parâmetros: minVoltas=', minVoltas, '| maxVoltas=', maxVoltas, '| idealSet=', idealSet);
            
            let secondBestDisplay: string | null = null;
            if (secondBest) {
              const secondBestTires = pilotTires.filter(t => {
                let setIdentifier = t.set;
                if (/[A-D]$/.test(t.set)) {
                  setIdentifier = t.set.slice(0, -1);
                }
                return setIdentifier === secondBest;
              });
              
              const sortedSecond = secondBestTires.sort((a, b) => {
                const posA = a.set.match(/[A-D]$/)?.[0] || '';
                const posB = b.set.match(/[A-D]$/)?.[0] || '';
                return posA.localeCompare(posB);
              });
              
              const secondVoltasArray = sortedSecond.map(t => t.voltas);
              const secondAllEqual = secondVoltasArray.every(v => v === secondVoltasArray[0]);
              secondBestDisplay = secondAllEqual ? `${secondVoltasArray[0]} voltas` : `${secondVoltasArray.join('/')} voltas`;
              
              console.log('📏 Voltas do 2º SET:', secondBestDisplay);
            }
            
            idealSets[chassisData.chassis] = { setName: idealSet, voltasDisplay, secondBest, secondBestDisplay };
            console.log('✅ Dados salvos para', chassisData.chassis, ':', idealSets[chassisData.chassis]);
          } else {
            idealSets[chassisData.chassis] = null;
          }
        } else if (isUnconfirmedOrUndefined) {
          // 🔥 Chassis não confirmados ou indefinidos: jogo é sempre "CUP"
          console.log('🔍 Chassis:', chassisData.chassis, '| Piloto:', chassisData.piloto, '| Status: NÃO CONFIRMADO/INDEFINIDO');
          console.log('🏆 Jogo do Shakedown: CUP (fixo)');
          console.log('🥈 Segundo jogo: CUP (fixo)');
          idealSets[chassisData.chassis] = { setName: 'CUP', voltasDisplay: 'X', secondBest: 'CUP', secondBestDisplay: 'Analise os pneus' };
        }

        for (const set of chassisData.tireSets) {
          if (set.montadoNoCarro) {
            for (const tire of set.tires) {
              if (tire.codigo === '-') continue;

              // 🔥 KEY ÚNICA: chassis-jogo-posicao-codigo (para evitar colisões)
              const key = `${chassisData.chassis}-${set.jogo}-${tire.posicao}-${tire.codigo}`;
              
              // 🔥 PNEUS WET: Sempre precisam de inversão (não serão usados no Shakedown)
              if (tire.tipo === 'W' || tire.tipo === 'Wet' || tire.tipo === 'W1') {
                tireValidations[key] = true;
                continue;
              }
              
              // 🔥 Pula se não for slick
              if (tire.tipo !== 'N' && tire.tipo !== 'U' && tire.tipo !== 'Slick') continue;

              // 🔥 Calcula se está fora do range (usado em ambas as lógicas)
              const voltasNum = parseInt(tire.voltas) || 0;
              const isOutOfRange = voltasNum < minVoltas || voltasNum > maxVoltas;

              // 🔥 LÓGICA ESPECIAL PARA CHASSIS NÃO CONFIRMADOS/INDEFINIDOS
              if (isUnconfirmedOrUndefined) {
                // Para chassis não confirmados/indefinidos (CUP):
                // - QUALQUER pneu "Guardar": inversão = SIM (OBRIGATÓRIO)
                // - Pneus "Descartar" SLICK (não WET) que não estão fora do range: "Analise o estado do pneu"
                // - Pneus "Descartar" WET ou fora do range: inversão = SIM
                
                const isDiscarded = tire.situacao === 'Descartar';
                const isToKeep = tire.situacao === 'Guardar';
                
                // 🔥 Se é "Guardar", SEMPRE inversão = SIM
                if (isToKeep) {
                  tireValidations[key] = true;
                  console.log(`📌 [NÃO CONFIRMADO] Pneu: ${tire.codigo} | Situação: "Guardar" | INVERSÃO = SIM (OBRIGATÓRIO)`);
                  continue;
                }
                
                // 🔥 Se é descartado, ignora validação de voltas
                const effectiveIsOutOfRange = isDiscarded ? false : isOutOfRange;
                
                // 🔥 Para "Descartar": só mostra "Analise" se for SLICK e não WET
                const shouldShowAnaliseMessage = isDiscarded && !effectiveIsOutOfRange;
                
                tireValidations[key] = !shouldShowAnaliseMessage; // false se deve mostrar "Analise", true se precisa inversão
                
                console.log(`📌 [NÃO CONFIRMADO] Pneu: ${tire.codigo} | Situação: "${tire.situacao}" | É Descartado?: ${isDiscarded} | Voltas: ${tire.voltas} | Fora do range (efetivo): ${effectiveIsOutOfRange} | Mostra "Analise": ${shouldShowAnaliseMessage} | Inversão: ${!shouldShowAnaliseMessage}`);
                continue;
              }

              // 🔥 LÓGICA PARA CHASSIS CONFIRMADOS
              // Extrai identificador do set (remove última letra A-D)
              let tireSetIdentifier = tire.set;
              if (/[A-D]$/.test(tire.set)) {
                tireSetIdentifier = tire.set.slice(0, -1);
              }
              
              console.log(`📌 Pneu: ${tire.codigo} | Set Original: "${tire.set}" | Identificador: "${tireSetIdentifier}" | Set Ideal: "${idealSet}"`);
              
              // 🔥 Verifica se pertence ao set ideal
              const belongsToIdealSet = idealSet !== null && tireSetIdentifier === idealSet;
              
              console.log(`   ➜ Pertence ao set ideal? ${belongsToIdealSet}`);
              
              const hasDivergence = tire.divergencia || tire.pilotoInvalido || tire.situacao === 'Descartar';
              
              // 🔥 Inversão necessária se:
              // 1. Pneu está fora dos parâmetros OU
              // 2. Pneu tem divergência (piloto inválido ou situação descartar) OU
              // 3. Existe jogo ideal E pneu NÃO pertence ao set ideal
              const needsInversion = isOutOfRange || hasDivergence || (idealSet !== null && !belongsToIdealSet);
              
              console.log(`   ➜ Fora do range? ${isOutOfRange} | Divergência? ${hasDivergence} | Precisa inversão? ${needsInversion}`);
              
              tireValidations[key] = needsInversion;
            }
          }
        }
      }

      setTireInversaoValidations(tireValidations);
      setIdealSetInfo(idealSets);
    };

    validateInversions();
  }, [currentSession, minVoltas, maxVoltas]);

  const handleConfirmSelection = async () => {
    if (!selectedSeasonId || !selectedStageId) {
      toast.error('Selecione uma temporada e uma etapa');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 [DEBUG] Iniciando handleConfirmSelection...');
      console.log('🔍 [DEBUG] Season ID:', selectedSeasonId);
      console.log('🔍 [DEBUG] Stage ID:', selectedStageId);
      
      // Verifica o que tem no localStorage
      const localStorageData = localStorage.getItem('active_tire_check_session');
      console.log('🔍 [DEBUG] localStorage (active_tire_check_session):', localStorageData ? 'EXISTE' : 'NÃO EXISTE');
      
      if (localStorageData) {
        const parsed = JSON.parse(localStorageData);
        console.log('🔍 [DEBUG] Dados no localStorage:', {
          season: parsed.season_name,
          stage: parsed.stage_name,
          date: parsed.check_date,
          chassisCount: parsed.chassis_data?.length || 0
        });
      }

      // 🔥 Primeiro, busca da sessão ativa (localStorage)
      let session = await getActiveSession();
      
      console.log('🔍 [DEBUG] Sessão ativa (localStorage):', session ? {
        season: session.season_name,
        stage: session.stage_name,
        chassisCount: session.chassis_data?.length
      } : 'NENHUMA');

      // 🔥 Se não encontrou no localStorage, busca em "conference_sessions" (ativa)
      if (!session) {
        console.log('🔍 [DEBUG] Buscando em conference_sessions (ativas)...');
        const activeSessions = await getActiveConferenceSessions();
        console.log('🔍 [DEBUG] Sessões ativas encontradas:', activeSessions.length);
        
        activeSessions.forEach((s, idx) => {
          console.log(`🔍 [DEBUG] Sessão ativa ${idx + 1}:`, {
            id: s.id,
            season: s.season_name,
            stage: s.stage_name,
            seasonId: s.season_id,
            stageId: s.stage_id,
          });
        });

        const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
        const selectedStage = stages.find(st => st.id === selectedStageId);
        
        console.log('🔍 [DEBUG] Temporada selecionada:', selectedSeason);
        console.log('🔍 [DEBUG] Etapa selecionada:', selectedStage);

        session = activeSessions.find(
          s => s.season_id === selectedSeasonId && s.stage_id === selectedStageId
        ) || null;
        
        console.log('🔍 [DEBUG] Sessão encontrada em conference_sessions:', session ? 'SIM' : 'NÃO');
      }

      // 🔥 Se não encontrou em conference_sessions, busca em "tire_check_sessions" (finalizadas)
      if (!session) {
        console.log('🔍 [DEBUG] Buscando em tire_check_sessions (finalizadas)...');
        const allSessions = await getTireCheckSessions();
        console.log('🔍 [DEBUG] Sessões finalizadas encontradas:', allSessions.length);
        
        allSessions.forEach((s, idx) => {
          console.log(`🔍 [DEBUG] Sessão finalizada ${idx + 1}:`, {
            id: s.id,
            season: s.season_name,
            stage: s.stage_name,
            seasonId: s.season_id,
            stageId: s.stage_id,
          });
        });

        session = allSessions.find(
          s => s.season_id === selectedSeasonId && s.stage_id === selectedStageId
        ) || null;
        
        console.log('🔍 [DEBUG] Sessão encontrada em tire_check_sessions:', session ? 'SIM' : 'NÃO');
      }

      if (!session) {
        console.log('❌ [DEBUG] NENHUMA SESSÃO ENCONTRADA!');
        toast.error('Nenhuma conferência encontrada para esta temporada e etapa');
        return;
      }

      console.log('✅ [DEBUG] Sessão selecionada:', {
        id: session.id,
        season: session.season_name,
        stage: session.stage_name,
        chassisCount: session.chassis_data?.length
      });

      setCurrentSession(session);
      setCurrentListId(null);
      
      // Salva sessão temporária
      saveTempSession(session, '', { min: minVoltas, max: maxVoltas });
      
      setCurrentLevel('categories');
      setShowModal(false);
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao buscar conferência:', error);
      toast.error('Erro ao buscar conferência');
    } finally {
      setIsLoading(false);
    }
  };

  // Renderiza a navegação de categorias
  const renderCategories = () => {
    if (!currentSession) return null;

    // Agrupa chassis por categoria
    const categoryMap: Record<string, ChassisCheckData[]> = {};
    
    currentSession.chassis_data.forEach(chassisData => {
      // Extrai categoria do sheetName (ex: "987#1 (SPRINT TROPHY)" -> "SPRINT TROPHY")
      const match = chassisData.sheetName?.match(/\(([^)]+)\)$/);
      const category = match ? match[1] : chassisData.categoria || 'SEM CATEGORIA';
      
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push(chassisData);
    });

    const categories = Object.keys(categoryMap).sort();

    return (
      <div className="space-y-2 collector-adapt-card-container">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center justify-center rounded-lg collector-adapt-icon"
                style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
                }}
              >
                <ClipboardCheck size={24} strokeWidth={2} className="text-white collector-adapt-icon-small" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 collector-adapt-title">Categorias</h1>
                <p className="text-gray-500 mt-1 text-sm collector-adapt-subtitle">
                  {currentSession.season_name} - {currentSession.stage_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentLevel('home');
                setCurrentSession(null);
                clearTempSession();
              }}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 border-2 collector-adapt-button"
              style={{
                background: '#FFFFFF',
                borderColor: '#D50000',
                color: '#D50000',
              }}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          </div>
        </div>

        {/* Parâmetros de Shakedown */}
        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 collector-adapt-subtitle">Parâmetros do Shakedown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 collector-adapt-label">Voltas Mínimas</label>
              <input
                type="number"
                value={minVoltas}
                onChange={(e) => setMinVoltas(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent collector-adapt-input"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 collector-adapt-label">Voltas Máximas</label>
              <input
                type="number"
                value={maxVoltas}
                onChange={(e) => setMaxVoltas(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent collector-adapt-input"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Grid de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => {
            const chassisList = categoryMap[category];
            
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentLevel('chassis');
                }}
                className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-red-600 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors collector-adapt-subtitle">
                    {category}
                  </h3>
                  <div 
                    className="flex items-center justify-center rounded-lg group-hover:bg-red-600 transition-colors"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
                    }}
                  >
                    <ChevronRight size={20} className="text-white" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm collector-adapt-label">
                  {chassisList.length} {chassisList.length === 1 ? 'chassis' : 'chassis'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Botão de Salvar Lista */}
        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
          <button
            onClick={handleConfirmarLista}
            disabled={isLoading}
            className="w-full px-6 py-3 rounded-lg font-bold text-white text-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed collector-adapt-button"
            style={{
              background: isLoading ? '#9CA3AF' : 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
            }}
          >
            {isLoading ? 'Salvando...' : 'Confirmar Lista de Shakedown'}
          </button>
        </div>
      </div>
    );
  };

  // Renderiza a lista de chassis da categoria selecionada
  const renderChassisList = () => {
    if (!currentSession || !selectedCategory) return null;

    // Filtra chassis da categoria selecionada
    const chassisList = currentSession.chassis_data.filter(chassisData => {
      const match = chassisData.sheetName?.match(/\(([^)]+)\)$/);
      const category = match ? match[1] : chassisData.categoria || 'SEM CATEGORIA';
      return category === selectedCategory;
    });

    return (
      <div className="space-y-2 collector-adapt-card-container">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center justify-center rounded-lg collector-adapt-icon"
                style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
                }}
              >
                <ClipboardCheck size={24} strokeWidth={2} className="text-white collector-adapt-icon-small" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 collector-adapt-title">{selectedCategory}</h1>
                <p className="text-gray-500 mt-1 text-sm collector-adapt-subtitle">
                  {currentSession.season_name} - {currentSession.stage_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentLevel('categories');
                setSelectedCategory(null);
              }}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 border-2 collector-adapt-button"
              style={{
                background: '#FFFFFF',
                borderColor: '#D50000',
                color: '#D50000',
              }}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          </div>
        </div>

        {/* Grid de Chassis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chassisList.map(chassisData => {
            // Calcula quantos pneus precisam de inversão
            let tiresThatNeedInversion = 0;
            
            chassisData.tireSets.forEach(set => {
              if (set.montadoNoCarro) {
                set.tires.forEach(tire => {
                  if (tire.codigo === '-') return;
                  
                  const tireKey = `${chassisData.chassis}-${set.jogo}-${tire.posicao}-${tire.codigo}`;
                  const needsInversion = tireInversaoValidations[tireKey] || false;
                  
                  if (needsInversion) {
                    tiresThatNeedInversion++;
                  }
                });
              }
            });

            const idealInfo = idealSetInfo[chassisData.chassis];

            return (
              <button
                key={chassisData.chassis}
                onClick={() => {
                  setExpandedChassis(prev => ({
                    ...prev,
                    [chassisData.chassis]: !prev[chassisData.chassis]
                  }));
                }}
                className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200 hover:border-red-600 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 collector-adapt-subtitle">{chassisData.chassis}</h3>
                  {expandedChassis[chassisData.chassis] ? (
                    <ChevronUp size={20} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500" />
                  )}
                </div>
                
                <div className="space-y-1 text-sm collector-adapt-label">
                  <p className="text-gray-600">
                    <span className="font-semibold">Piloto:</span> {chassisData.piloto || '-'}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">Corrida:</span> {chassisData.corrida || '-'}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">SET SD:</span> {idealInfo?.setName || '-'} ({idealInfo?.voltasDisplay || '-'})
                  </p>
                  {idealInfo?.secondBest && (
                    <p className="text-gray-600">
                      <span className="font-semibold">2º SET:</span> {idealInfo.secondBest} ({idealInfo.secondBestDisplay || '-'})
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {tiresThatNeedInversion > 0 ? (
                      <>
                        <AlertTriangle size={16} className="text-red-600" />
                        <span className="font-semibold text-red-600">
                          {tiresThatNeedInversion} {tiresThatNeedInversion === 1 ? 'pneu precisa' : 'pneus precisam'} de inversão
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-green-600">
                        ✓ Todos os pneus OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {expandedChassis[chassisData.chassis] && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {chassisData.tireSets.map(set => {
                      if (!set.montadoNoCarro) return null;

                      return (
                        <div key={set.jogo} className="mb-3">
                          <h4 className="font-semibold text-gray-900 mb-2 collector-adapt-label">{set.label}</h4>
                          <div className="space-y-1">
                            {set.tires.map((tire, idx) => {
                              if (tire.codigo === '-') return null;

                              const tireKey = `${chassisData.chassis}-${set.jogo}-${tire.posicao}-${tire.codigo}`;
                              const needsInversion = tireInversaoValidations[tireKey] || false;

                              return (
                                <div
                                  key={idx}
                                  className={`p-2 rounded text-xs collector-adapt-label ${
                                    needsInversion ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{abbreviatePosition(tire.posicao)}</span>
                                    <span>{tire.codigo}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span>{tire.piloto} | {tire.set}</span>
                                    <span className={needsInversion ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                                      {tire.voltas}v | {needsInversion ? 'INVERTER' : 'OK'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderiza a tela inicial
  const renderHome = () => {
    return (
      <div className="space-y-4 collector-adapt-card-container">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center rounded-lg collector-adapt-icon"
              style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
              }}
            >
              <ClipboardCheck size={24} strokeWidth={2} className="text-white collector-adapt-icon-small" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 collector-adapt-title">Shakedown - Conferência dos Carros</h1>
              <p className="text-gray-500 mt-1 text-sm collector-adapt-subtitle">Crie uma nova lista de Shakedown</p>
            </div>
          </div>
        </div>

        {/* Botão de Nova Lista */}
        <button
          onClick={handleNovaLista}
          disabled={isLoading}
          className="w-full bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-red-600 hover:shadow-lg transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center justify-center rounded-lg group-hover:bg-red-600 transition-colors"
              style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
              }}
            >
              <Plus size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors collector-adapt-subtitle">
                Nova Lista de Shakedown
              </h2>
              <p className="text-gray-500 mt-1 text-sm collector-adapt-label">
                Selecione uma conferência existente
              </p>
            </div>
          </div>
        </button>
      </div>
    );
  };

  // Renderiza a tela de acompanhamento
  const renderAcompanhamento = () => {
    // Agrupa listas por temporada e etapa
    const groupedLists = groupShakedownListsBySeasonAndStage(savedLists);
    const seasons = Object.keys(groupedLists).sort();

    return (
      <div className="space-y-4 collector-adapt-card-container">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center rounded-lg collector-adapt-icon"
              style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
              }}
            >
              <ClipboardCheck size={20} strokeWidth={2} className="text-white collector-adapt-icon-small" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 collector-adapt-title">Shakedown - Acompanhamento</h1>
              <p className="text-gray-500 mt-1 text-sm collector-adapt-subtitle">Selecione uma lista para acompanhar</p>
            </div>
          </div>
        </div>

        {/* Accordion de Temporadas e Etapas */}
        {!selectedListForTracking && (
          <div className="space-y-2">
            {seasons.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 text-center">
                <p className="text-gray-500">Nenhuma lista de Shakedown encontrada</p>
              </div>
            )}

            {seasons.map(season => {
              const isSeasonExpanded = expandedSeasons.has(season);
              const stages = Object.keys(groupedLists[season]).sort();

              return (
                <div key={season} className="bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden">
                  {/* Header da Temporada */}
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedSeasons);
                      if (isSeasonExpanded) {
                        newExpanded.delete(season);
                      } else {
                        newExpanded.add(season);
                      }
                      setExpandedSeasons(newExpanded);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h2 className="text-lg font-bold text-gray-900 collector-adapt-subtitle">{season}</h2>
                    {isSeasonExpanded ? (
                      <ChevronUp size={20} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-500" />
                    )}
                  </button>

                  {/* Etapas */}
                  {isSeasonExpanded && (
                    <div className="border-t border-gray-200">
                      {stages.map(stage => {
                        const isStageExpanded = expandedStages.has(`${season}-${stage}`);
                        const lists = groupedLists[season][stage];

                        return (
                          <div key={stage} className="border-b border-gray-200 last:border-b-0">
                            {/* Header da Etapa */}
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedStages);
                                const key = `${season}-${stage}`;
                                if (isStageExpanded) {
                                  newExpanded.delete(key);
                                } else {
                                  newExpanded.add(key);
                                }
                                setExpandedStages(newExpanded);
                              }}
                              className="w-full px-6 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <h3 className="text-base font-semibold text-gray-800 collector-adapt-label">{stage}</h3>
                              {isStageExpanded ? (
                                <ChevronUp size={18} className="text-gray-500" />
                              ) : (
                                <ChevronDown size={18} className="text-gray-500" />
                              )}
                            </button>

                            {/* Listas */}
                            {isStageExpanded && (
                              <div className="bg-gray-50 px-6 py-2 space-y-2">
                                {lists.map(list => (
                                  <div
                                    key={list.id}
                                    className="bg-white rounded-lg p-3 border border-gray-200 hover:border-red-600 hover:shadow-md transition-all"
                                  >
                                    <div className="flex items-center justify-between">
                                      <button
                                        onClick={() => setSelectedListForTracking(list.id)}
                                        className="flex-1 text-left"
                                      >
                                        <p className="text-sm font-semibold text-gray-900 collector-adapt-label">
                                          {new Date(list.check_date).toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 collector-adapt-label">
                                          Parâmetros: {list.min_voltas} - {list.max_voltas} voltas | {list.chassis_data.length} chassis | {list.created_by}
                                        </p>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteList(list.id)}
                                        className="ml-3 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Excluir lista"
                                      >
                                        <Trash2 size={16} className="text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Exibição da Lista Selecionada */}
        {selectedListForTracking && (() => {
          const trackingList = savedLists.find(list => list.id === selectedListForTracking);
          if (!trackingList) return null;

          // Filtro de busca
          const filteredChassisData = trackingList.chassis_data.filter(chassisData => {
            if (!filterText.trim()) return true;
            const searchTerm = filterText.toLowerCase();
            return (
              chassisData.chassis.toLowerCase().includes(searchTerm) ||
              chassisData.piloto.toLowerCase().includes(searchTerm)
            );
          });

          return (
            <div className="space-y-3">
              {/* Header com botão de voltar */}
              <div className="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 collector-adapt-subtitle">
                      {trackingList.season_name} - {trackingList.stage_name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 collector-adapt-label">
                      {new Date(trackingList.check_date).toLocaleDateString('pt-BR')} | Parâmetros: {trackingList.min_voltas} - {trackingList.max_voltas} voltas
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedListForTracking(null);
                      setFilterText('');
                    }}
                    className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 border-2 collector-adapt-button"
                    style={{
                      background: '#FFFFFF',
                      borderColor: '#D50000',
                      color: '#D50000',
                    }}
                  >
                    <ArrowLeft size={18} />
                    Voltar
                  </button>
                </div>

                {/* Campo de busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Buscar por chassis ou piloto..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent collector-adapt-input"
                  />
                </div>
              </div>

              {/* Botões de Exportação */}
              <div className="flex gap-3">
                <button
                  onClick={handleExportInversionList}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 border-2 collector-adapt-button"
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#D50000',
                    color: '#D50000',
                  }}
                >
                  <Save size={18} />
                  Exportar Lista de Inversões
                </button>
                <button
                  onClick={handleExportFullReport}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 border-2 collector-adapt-button"
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#D50000',
                    color: '#D50000',
                  }}
                >
                  <Save size={18} />
                  Exportar Relatório Completo
                </button>
              </div>

              {/* 🔥 Barra de Progresso Geral */}
              {(() => {
                // Calcula totais gerais de todas as categorias
                let totalGeralComInversao = 0;
                let totalGeralFinalizados = 0;
                
                trackingList.chassis_data.forEach(chassisData => {
                  const status = getChassisInversionStatus(chassisData);
                  
                  // Conta apenas chassis com inversão = 'SIM'
                  if (status === 'SIM') {
                    totalGeralComInversao++;
                    
                    // Verifica se está finalizado
                    if (finalizadosMap[selectedListForTracking || '']?.[chassisData.chassis]) {
                      totalGeralFinalizados++;
                    }
                  }
                });
                
                // Calcula a porcentagem
                const porcentagemGeral = totalGeralComInversao > 0 
                  ? Math.round((totalGeralFinalizados / totalGeralComInversao) * 100) 
                  : 0;
                
                // Se não há chassis que precisam de inversão, não mostra nada
                if (totalGeralComInversao === 0) {
                  return null;
                }
                
                return (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: '#F9FAFB', border: '2px solid #E5E7EB' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 font-bold" style={{ fontSize: '11px', minWidth: '100px' }}>
                        PROGRESSO GERAL
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-gray-600" style={{ fontSize: '10px', minWidth: '75px' }}>
                          Inversões: <span className="font-bold">{totalGeralFinalizados}/{totalGeralComInversao}</span>
                        </span>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${porcentagemGeral}%`,
                              background: porcentagemGeral === 100 ? '#10B981' : '#D50000'
                            }}
                          />
                        </div>
                        <span className="text-gray-700 font-bold" style={{ fontSize: '11px', minWidth: '36px', textAlign: 'right' }}>
                          {porcentagemGeral}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grid de Tabelas por Categoria */}
              {(() => {
                // 🔥 Agrupa chassis por categoria com status e jogo ideal SALVO
                const categoryChassisMap: Record<string, Array<{ 
                  chassis: string; 
                  piloto: string; 
                  status: 'SIM' | 'NÃO' | 'ANALISE'; 
                  idealSet: string | null; 
                  idealSetVoltas: string | null;
                  secondBestSet: string | null;
                  secondBestVoltas: string | null;
                  corrida: string; // 🔥 Adiciona campo corrida para diferenciar confirmados/não confirmados
                }>> = {};
                
                filteredChassisData.forEach(chassisData => {
                  const match = chassisData.sheetName?.match(/\(([^)]+)\)$/);
                  const category = match ? match[1] : chassisData.categoria || 'SEM CATEGORIA';
                  
                  if (!categoryChassisMap[category]) {
                    categoryChassisMap[category] = [];
                  }
                  
                  const status = getChassisInversionStatus(chassisData);
                  
                  categoryChassisMap[category].push({
                    chassis: chassisData.chassis,
                    piloto: chassisData.piloto,
                    status,
                    idealSet: chassisData.idealSet || null, // 🔥 Usa o jogo ideal SALVO
                    idealSetVoltas: chassisData.idealSetVoltas || null, // 🔥 Voltas do SET SD
                    secondBestSet: chassisData.secondBestSet || null, // 🔥 Usa o segundo melhor jogo SALVO
                    secondBestVoltas: chassisData.secondBestVoltas || null, // 🔥 Voltas do 2º SET
                    corrida: chassisData.corrida || '' // 🔥 Salva o status de corrida
                  });
                });
                
                const categoriesSorted = Object.keys(categoryChassisMap).sort();

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoriesSorted.map(category => {
                      const chassisList = categoryChassisMap[category];
                      
                      return (
                        <div 
                          key={category}
                          className="rounded-lg border overflow-hidden"
                          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
                        >
                          {/* Header da Categoria */}
                          <div 
                            className="px-2 py-2 font-bold text-white text-center text-xs"
                            style={{ background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)' }}
                          >
                            {category}
                          </div>

                          {/* Tabela */}
                          <div>
                            <table className="w-full text-xs">
                              <thead style={{ background: '#F3F4F6' }}>
                                <tr>
                                  <th className="px-1 py-1 text-left font-semibold text-gray-700" style={{ fontSize: '10px' }}>Chassis</th>
                                  <th className="px-1 py-1 text-left font-semibold text-gray-700" style={{ fontSize: '10px' }}>Inversão</th>
                                  <th className="px-1 py-1 text-left font-semibold text-gray-700" style={{ fontSize: '10px' }}>SET SD</th>
                                  <th className="px-1 py-1 text-left font-semibold text-gray-700" style={{ fontSize: '10px' }}>Voltas</th>
                                  <th className="px-1 py-1 text-center font-semibold text-gray-700" style={{ fontSize: '10px' }}>Fin.</th>
                                  <th className="px-1 py-1 text-center font-semibold text-gray-700" style={{ fontSize: '10px' }}>2º</th>
                                  {chassisList.some(item => segundoJogoMap[selectedListForTracking || '']?.[item.chassis]) && (
                                    <>
                                      <th className="px-1 py-1 text-left font-semibold text-gray-700" style={{ fontSize: '10px' }}>2º SET</th>
                                      <th className="px-1 py-1 text-left font-semibold text-gray-700" style={{ fontSize: '10px' }}>Voltas</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {chassisList.map((item, idx) => {
                                  const isFinalizado = finalizadosMap[selectedListForTracking || '']?.[item.chassis] || false;
                                  const mostrar2Jogo = segundoJogoMap[selectedListForTracking || '']?.[item.chassis] || false;
                                  
                                  return (
                                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-1 py-1.5 font-semibold text-gray-900" style={{ fontSize: '10px' }}>
                                        {item.chassis}
                                      </td>
                                      <td className="px-1 py-1.5" style={{ fontSize: '10px' }}>
                                        <span
                                          className="px-1.5 py-0.5 rounded font-semibold inline-block"
                                          style={{
                                            background: item.status === 'SIM' ? '#FEE2E2' : item.status === 'ANALISE' ? '#FEF3C7' : '#D1FAE5',
                                            color: item.status === 'SIM' ? '#DC2626' : item.status === 'ANALISE' ? '#D97706' : '#059669',
                                            fontSize: '9px'
                                          }}
                                        >
                                          {item.status}
                                        </span>
                                      </td>
                                      <td className="px-1 py-1.5 font-semibold text-gray-900" style={{ fontSize: '10px' }}>
                                        {item.idealSet || '-'}
                                      </td>
                                      <td className="px-1 py-1.5 text-gray-600" style={{ fontSize: '9px' }}>
                                        {item.idealSetVoltas || '-'}
                                      </td>
                                      <td className="px-1 py-1.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isFinalizado}
                                          onChange={() => handleToggleFinalizado(selectedListForTracking || '', item.chassis)}
                                          className="w-3.5 h-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                        />
                                      </td>
                                      <td className="px-1 py-1.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={mostrar2Jogo}
                                          onChange={() => handleToggleSegundoJogo(selectedListForTracking || '', item.chassis)}
                                          className="w-3.5 h-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                        />
                                      </td>
                                      {mostrar2Jogo && (
                                        <>
                                          <td className="px-1 py-1.5 font-semibold text-gray-900" style={{ fontSize: '10px' }}>
                                            {item.secondBestSet || '-'}
                                          </td>
                                          <td className="px-1 py-1.5 text-gray-600" style={{ fontSize: '9px' }}>
                                            {item.secondBestVoltas || '-'}
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>
    );
  };

  // Modal de Seleção de Temporada e Etapa
  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Nova Lista de Shakedown</h2>
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedSeasonId('');
                setSelectedStageId('');
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Seleção de Temporada */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Temporada</label>
              {loadingSeasons ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Carregando temporadas...</p>
                </div>
              ) : (
                <select
                  value={selectedSeasonId}
                  onChange={(e) => handleSeasonSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione uma temporada</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Seleção de Etapa */}
            {selectedSeasonId && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Etapa</label>
                {loadingStages ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Carregando etapas...</p>
                  </div>
                ) : (
                  <select
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma etapa</option>
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedSeasonId('');
                setSelectedStageId('');
              }}
              className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedSeasonId || !selectedStageId || isLoading}
              className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: !selectedSeasonId || !selectedStageId || isLoading
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
              }}
            >
              {isLoading ? 'Carregando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 collector-adapt-container">
      <CollectorStyles />
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-4 border-2 border-gray-200 overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setActiveTab('conferencia')}
            className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === 'conferencia'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Conferência dos Carros
          </button>
          <button
            onClick={() => setActiveTab('acompanhamento')}
            className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === 'acompanhamento'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Acompanhamento
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'conferencia' && (
        <>
          {currentLevel === 'home' && renderHome()}
          {currentLevel === 'categories' && renderCategories()}
          {currentLevel === 'chassis' && renderChassisList()}
        </>
      )}

      {activeTab === 'acompanhamento' && renderAcompanhamento()}

      {/* Modal */}
      {renderModal()}
    </div>
  );
}
