import React, { useState, useEffect } from 'react';
import { ClipboardList, Calculator, BarChart3, AlertCircle, ChevronDown, ChevronRight, Filter, CloudOff, CloudRain, Settings, RotateCcw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

interface Season {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  championships?: {
    preseason: {
      active: boolean;
      wildcards: number;
      slicks_per_stage: number;
      wets_per_stage: number;
    };
    sprint: {
      active: boolean;
      wildcards: number;
      slicks_per_stage: number;
      wets_per_stage: number;
    };
    endurance: {
      active: boolean;
      wildcards: number;
      endurance_300: {
        slicks_per_stage: number;
        wets_per_stage: number;
      };
      endurance_500: {
        slicks_per_stage: number;
        wets_per_stage: number;
      };
    };
    trophy: {
      active: boolean;
      wildcards: number;
      slicks_per_stage: number;
      wets_per_stage: number;
    };
  };
}

interface SeasonStage {
  id: string;
  season_id: string;
  name: string;
  track: string;
  start_date: string;
  end_date: string;
  championship_type: string;
  is_pre_season: boolean;
  categories?: Array<{ name: string; car_count: number }>;
  main_championship: string;
  endurance_type?: string;
  include_trophy: boolean;
}

interface SeasonCategory {
  id: string;
  category_name: string;  // Campo correto da tabela
  car_model: string;
  slick_tires: string[];  // Array de IDs
  wet_tires: string[];    // Array de IDs
}

interface TireModel {
  id: string;
  code: string;
  description: string;
}

interface Championship {
  id: string;
  name: string;
  color: string;
  categories: Category[];
}

interface Category {
  name: string;
  cars: number;
  slicksPerStage: number;
  rainPerStage: number;
  stages: number;
}

function Demanda() {
  const [activeTab, setActiveTab] = useState<'calculo' | 'estoque'>('calculo');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [stages, setStages] = useState<SeasonStage[]>([]);
  const [seasonCategories, setSeasonCategories] = useState<SeasonCategory[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [premissasExpanded, setPremissasExpanded] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [fixingTires, setFixingTires] = useState(false);
  // Map para armazenar car_count editável: key = "stageId-categoryName", value = car_count
  const [editableCarCounts, setEditableCarCounts] = useState<Map<string, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [savedCalculations, setSavedCalculations] = useState<Map<string, any>>(new Map());
  
  // Estados para aba Estoque vs. Demanda
  const [demandData, setDemandData] = useState<any[]>([]);
  const [loadingDemand, setLoadingDemand] = useState(false);
  const [initialStock, setInitialStock] = useState<Map<string, number>>(new Map());
  const [stagesWithoutWet, setStagesWithoutWet] = useState<Set<string>>(new Set());
  const [orderConferences, setOrderConferences] = useState<Map<string, any>>(new Map());
  // Map stageId → lista de pedidos (tire_orders) para suportar múltiplos pedidos por etapa
  const [ordersPerStage, setOrdersPerStage] = useState<Map<string, any[]>>(new Map());
  
  // Estados para edição de premissas
  const [customPremissas, setCustomPremissas] = useState<Map<string, { slicks: number; wets: number }>>(new Map());
  const [editPremissasModal, setEditPremissasModal] = useState(false);
  const [selectedStageForEdit, setSelectedStageForEdit] = useState<SeasonStage | null>(null);
  const [editSlicks, setEditSlicks] = useState(0);
  const [editWets, setEditWets] = useState(0);

  // Mock data para premissas (depois virá do Supabase)
  const [championships, setChampionships] = useState<Championship[]>([
    {
      id: '1',
      name: 'Pré-Temporada',
      color: '#FACC15',
      categories: [
        { name: 'Carrera Cup', cars: 30, slicksPerStage: 3, rainPerStage: 1, stages: 1 },
        { name: 'Sprint Challenge', cars: 25, slicksPerStage: 3, rainPerStage: 1, stages: 1 },
      ]
    },
    {
      id: '2',
      name: 'Sprint',
      color: '#3B82F6',
      categories: [
        { name: 'Carrera Cup', cars: 32, slicksPerStage: 4, rainPerStage: 2, stages: 5 },
        { name: 'Sprint Challenge', cars: 28, slicksPerStage: 4, rainPerStage: 2, stages: 5 },
      ]
    },
    {
      id: '3',
      name: 'Endurance 300km',
      color: '#10B981',
      categories: [
        { name: 'Carrera Cup', cars: 28, slicksPerStage: 5, rainPerStage: 2, stages: 1 },
        { name: 'Sprint Challenge', cars: 24, slicksPerStage: 5, rainPerStage: 2, stages: 1 },
      ]
    },
    {
      id: '4',
      name: 'Endurance 500km',
      color: '#F59E0B',
      categories: [
        { name: 'Carrera Cup', cars: 26, slicksPerStage: 7, rainPerStage: 3, stages: 1 },
        { name: 'Sprint Challenge', cars: 22, slicksPerStage: 7, rainPerStage: 3, stages: 1 },
      ]
    },
    {
      id: '5',
      name: 'Trophy',
      color: '#A855F7',
      categories: [
        { name: 'Sprint Trophy', cars: 20, slicksPerStage: 4, rainPerStage: 2, stages: 4 },
      ]
    },
  ]);

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      setIsInitialLoad(true); // Reset flag ao mudar de temporada
      loadSeasonData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    if (selectedSeason && selectedSeason.championships) {
      buildChampionshipsFromSeason(selectedSeason);
    }
  }, [selectedSeason, stages]);

  // Effect para salvar cálculos automaticamente com debounce (apenas após carregamento inicial)
  useEffect(() => {
    if (!selectedSeasonId || stages.length === 0 || isInitialLoad) return;

    const timer = setTimeout(() => {
      saveDemandCalculations();
    }, 1000); // Salva 1 segundo após última mudança

    return () => clearTimeout(timer);
  }, [editableCarCounts, selectedSeasonId, stages, isInitialLoad]);
  
  // Effect separado para recalcular quando premissas customizadas mudam
  useEffect(() => {
    if (!selectedSeasonId || stages.length === 0 || isInitialLoad) return;
    
    const timer = setTimeout(async () => {
      console.log('🔄 Premissas customizadas mudaram, recalculando...');
      await saveDemandCalculations();
      if (activeTab === 'estoque') {
        await loadDemandAnalysis();
      }
    }, 200); // Delay menor para premissas
    
    return () => clearTimeout(timer);
  }, [customPremissas]);

  // Effect para carregar dados da aba Estoque vs. Demanda
  useEffect(() => {
    if (activeTab === 'estoque' && selectedSeasonId && stages.length > 0 && tireModels.length > 0 && seasonCategories.length > 0) {
      // Recalcula e salva os dados primeiro para garantir que estão atualizados
      const recalculateAndLoad = async () => {
        await saveDemandCalculations();
        await loadDemandAnalysis();
      };
      recalculateAndLoad();
    }
  }, [activeTab, selectedSeasonId, stages, tireModels]);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      console.log('🔄 Demanda: Carregando temporadas do Supabase...');

      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });

      if (error) {
        console.error('❌ Demanda: Erro ao carregar temporadas:', error);
        return;
      }

      if (data) {
        console.log(`✅ Demanda: ${data.length} temporadas carregadas:`, data);
        setSeasons(data);
        
        // Seleciona automaticamente a temporada mais recente (primeira da lista ordenada)
        if (data.length > 0 && !selectedSeasonId) {
          const mostRecentSeason = data[0];
          console.log(`🎯 Demanda: Selecionando automaticamente a temporada mais recente: ${mostRecentSeason.name}`);
          setSelectedSeasonId(mostRecentSeason.id);
        }
      } else {
        console.warn('⚠️ Demanda: Nenhuma temporada retornada do Supabase');
      }
    } catch (error) {
      console.error('❌ Demanda: Erro ao carregar temporadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonData = async (seasonId: string) => {
    try {
      const supabase = createClient();

      console.log(`🔄 Demanda: Carregando dados da temporada ${seasonId}...`);

      // Busca dados da temporada
      const { data: seasonData, error: seasonError } = await supabase
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single();

      if (seasonError) {
        console.error('❌ Demanda: Erro ao carregar temporada:', seasonError);
        return;
      }

      console.log('✅ Demanda: Temporada carregada:', seasonData);
      setSelectedSeason(seasonData);

      // Busca etapas da temporada
      const { data: stagesData, error: stagesError } = await supabase
        .from('season_stages')
        .select('*')
        .eq('season_id', seasonId)
        .order('start_date', { ascending: true });

      if (stagesError) {
        console.error('❌ Demanda: Erro ao carregar etapas:', stagesError);
        return;
      }

      if (stagesData) {
        console.log(`✅ Demanda: ${stagesData.length} etapas carregadas:`, stagesData);
        setStages(stagesData);
      } else {
        console.warn('⚠️ Demanda: Nenhuma etapa retornada do Supabase');
        setStages([]);
      }

      // Busca categorias da temporada
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('season_categories')
        .select('*');

      if (categoriesError) {
        console.error('❌ Demanda: Erro ao carregar categorias:', categoriesError);
        return;
      }

      if (categoriesData) {
        console.log(`✅ Demanda: ${categoriesData.length} categorias carregadas:`, categoriesData);
        setSeasonCategories(categoriesData);
      } else {
        console.warn('⚠️ Demanda: Nenhuma categoria retornada do Supabase');
        setSeasonCategories([]);
      }

      // Busca modelos de pneu
      const { data: tireModelsData, error: tireModelsError } = await supabase
        .from('tire_models')
        .select('*');

      if (tireModelsError) {
        console.error('❌ Demanda: Erro ao carregar modelos de pneu:', tireModelsError);
        return;
      }

      if (tireModelsData) {
        console.log(`✅ Demanda: ${tireModelsData.length} modelos de pneu carregados:`, tireModelsData);
        setTireModels(tireModelsData);
        
        // Correção automática silenciosa dos pneus de chuva da Carrera
        if (categoriesData && categoriesData.length > 0) {
          const carreraCategory = categoriesData.find(sc => sc.category_name === 'Carrera');
          
          if (carreraCategory && carreraCategory.wet_tires?.length === 2) {
            const frontWetModel = tireModelsData.find(tm => tm.code === '30/65-18 P2L');
            const rearWetModel = tireModelsData.find(tm => tm.code === '31/71-18 P2L');
            
            if (frontWetModel && rearWetModel) {
              // Verifica se estão invertidos
              const currentFrontId = carreraCategory.wet_tires[0];
              const currentRearId = carreraCategory.wet_tires[1];
              
              // Se o primeiro ID não é o dianteiro correto, está invertido
              if (currentFrontId !== frontWetModel.id) {
                console.log('🔧 Demanda: Corrigindo ordem dos pneus de chuva da Carrera automaticamente...');
                
                const correctWetTires = [frontWetModel.id, rearWetModel.id];
                
                // Atualiza silenciosamente no banco
                supabase
                  .from('season_categories')
                  .update({ wet_tires: correctWetTires })
                  .eq('id', carreraCategory.id)
                  .then(({ error }) => {
                    if (error) {
                      console.error('❌ Erro ao corrigir pneus automaticamente:', error);
                    } else {
                      console.log('✅ Pneus de chuva da Carrera corrigidos automaticamente!');
                      // Atualiza o estado local
                      setSeasonCategories(prev => 
                        prev.map(sc => 
                          sc.id === carreraCategory.id 
                            ? { ...sc, wet_tires: correctWetTires }
                            : sc
                        )
                      );
                    }
                  });
              }
            }
          }
        }
      } else {
        console.warn('⚠️ Demanda: Nenhum modelo de pneu retornada do Supabase');
        setTireModels([]);
      }

      // Carrega cálculos salvos (se existirem)
      if (stagesData && stagesData.length > 0) {
        await loadDemandCalculations(stagesData);
      }
    } catch (error) {
      console.error('❌ Demanda: Erro ao carregar dados da temporada:', error);
    }
  };

  const loadDemandCalculations = async (stagesData: SeasonStage[]) => {
    try {
      const supabase = createClient();
      
      console.log('🔄 Demanda: Carregando cálculos salvos...');

      // Busca todos os cálculos das etapas desta temporada
      const stageIds = stagesData.map(s => s.id);
      
      const { data: calculationsData, error: calcError } = await supabase
        .from('demand_calculations')
        .select('*')
        .in('stage_id', stageIds);

      if (calcError) {
        console.error('❌ Demanda: Erro ao carregar cálculos:', calcError);
        // Não tem cálculos salvos - salva os padrões
        setIsInitialLoad(false);
        setTimeout(() => {
          saveInitialCalculations();
        }, 500);
        return;
      }

      if (calculationsData && calculationsData.length > 0) {
        console.log(`✅ Demanda: ${calculationsData.length} cálculos carregados`);
        
        // Monta Map de cálculos salvos
        const calcMap = new Map<string, any>();
        calculationsData.forEach(calc => {
          calcMap.set(calc.stage_id, calc);
        });
        setSavedCalculations(calcMap);

        // Inicializa editableCarCounts com valores salvos
        const newEditableCarCounts = new Map<string, number>();
        calculationsData.forEach(calc => {
          if (calc.categories && Array.isArray(calc.categories)) {
            calc.categories.forEach((cat: any) => {
              const key = `${calc.stage_id}-${cat.category_name}`;
              newEditableCarCounts.set(key, cat.car_count);
            });
          }
        });
        setEditableCarCounts(newEditableCarCounts);

        console.log('✅ Demanda: Estados restaurados dos cálculos salvos');
        setLastSaved(new Date());
        
        // Marca como carregado após um pequeno delay
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 500);
      } else {
        console.log('📝 Demanda: Nenhum cálculo salvo encontrado - salvando valores padrão...');
        // Não tem cálculos salvos - salva os padrões
        setIsInitialLoad(false);
        setTimeout(() => {
          saveInitialCalculations();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Demanda: Erro ao carregar cálculos:', error);
      setIsInitialLoad(false);
    }
  };

  const saveInitialCalculations = async () => {
    console.log('💾 Demanda: Salvando cálculos padrão iniciais...');
    await saveDemandCalculations();
  };

  const buildChampionshipsFromSeason = (season: Season) => {
    const championships: Championship[] = [];

    if (!season.championships) {
      console.warn('⚠️ Demanda: Temporada sem configuração de campeonatos');
      setChampionships([]);
      return;
    }

    console.log('🔄 Demanda: Processando campeonatos da temporada:', season.championships);
    console.log('🔄 Demanda: Etapas disponíveis:', stages.length, stages);

    // Helper function para extrair categorias das etapas COM CONTAGEM INDIVIDUAL DE ETAPAS POR CATEGORIA
    const getCategoriesFromStages = (filteredStages: SeasonStage[], excludeCategories: string[] = []) => {
      const categoriesMap = new Map<string, { totalCars: number; stageCount: number; carCounts: number[] }>();
      
      filteredStages.forEach(stage => {
        if (stage.categories && Array.isArray(stage.categories)) {
          stage.categories.forEach((cat: any) => {
            // IMPORTANTE: Ignora strings antigas (legacy) - considera APENAS objetos com car_count
            if (typeof cat === 'object' && cat.name && cat.car_count) {
              const categoryName = cat.name;
              
              // Pula categorias excluídas (ex: Trophy no campeonato Sprint)
              if (excludeCategories.includes(categoryName)) {
                return;
              }
              
              const carCount = cat.car_count;
              
              if (!categoriesMap.has(categoryName)) {
                categoriesMap.set(categoryName, { totalCars: 0, stageCount: 0, carCounts: [] });
              }
              
              const current = categoriesMap.get(categoryName)!;
              current.totalCars += carCount;
              current.stageCount += 1; // Conta uma etapa para esta categoria específica
              current.carCounts.push(carCount);
            }
          });
        }
      });
      
      // Calcula média de carros por categoria E retorna contagem de etapas
      const result: Array<{ name: string; avgCars: number; stages: number }> = [];
      categoriesMap.forEach((value, key) => {
        result.push({
          name: key,
          avgCars: value.carCounts.length > 0 ? Math.round(value.totalCars / value.carCounts.length) : 0,
          stages: value.stageCount // Número de etapas que ESTA CATEGORIA participa
        });
      });
      
      return result;
    };

    // Filtra etapas por tipo de campeonato
    const preseasonStagesList = stages.filter(s => s.main_championship === 'preseason');
    const sprintStagesList = stages.filter(s => s.main_championship === 'sprint');
    const endurance300StagesList = stages.filter(s => s.main_championship === 'endurance' && s.endurance_type === 'endurance_300');
    const endurance500StagesList = stages.filter(s => s.main_championship === 'endurance' && s.endurance_type === 'endurance_500');
    const trophyStagesList = stages.filter(s => s.include_trophy);

    // Conta etapas
    const preseasonStages = preseasonStagesList.length;
    const sprintStages = sprintStagesList.length;
    const endurance300Stages = endurance300StagesList.length;
    const endurance500Stages = endurance500StagesList.length;
    const trophyStages = trophyStagesList.length;

    console.log('📊 Demanda: Contagem de etapas por tipo:', {
      preseason: preseasonStages,
      sprint: sprintStages,
      endurance300: endurance300Stages,
      endurance500: endurance500Stages,
      trophy: trophyStages
    });

    console.log('📊 Demanda: Etapas Sprint:', sprintStagesList.map(s => s.name));
    console.log('📊 Demanda: Etapas Trophy:', trophyStagesList.map(s => s.name));
    console.log('📊 Demanda: Etapas Endurance 300:', endurance300StagesList.map(s => s.name));
    console.log('📊 Demanda: Etapas Endurance 500:', endurance500StagesList.map(s => s.name));

    // Pré-Temporada
    if (season.championships.preseason?.active) {
      const preseasonCategories = getCategoriesFromStages(preseasonStagesList);
      
      console.log('📊 Demanda: Categorias Pré-Temporada:', preseasonCategories);
      
      championships.push({
        id: 'preseason',
        name: 'Pré-Temporada',
        color: '#FACC15',
        categories: preseasonCategories.map(cat => ({
          name: cat.name,
          cars: cat.avgCars || 30, // Fallback para 30 se não houver dados
          slicksPerStage: season.championships.preseason.slicks_per_stage || 0,
          rainPerStage: season.championships.preseason.wets_per_stage || 0,
          stages: cat.stages
        }))
      });
    }

    // Sprint
    if (season.championships.sprint?.active) {
      const sprintCategories = getCategoriesFromStages(sprintStagesList, ['Trophy']);
      
      console.log('📊 Demanda: Categorias Sprint:', sprintCategories);
      
      championships.push({
        id: 'sprint',
        name: 'Sprint',
        color: '#3B82F6',
        categories: sprintCategories.map(cat => ({
          name: cat.name,
          cars: cat.avgCars || 32, // Fallback para 32 se não houver dados
          slicksPerStage: season.championships.sprint.slicks_per_stage || 0,
          rainPerStage: season.championships.sprint.wets_per_stage || 0,
          stages: cat.stages
        }))
      });
    }

    // Endurance 300km
    if (season.championships.endurance?.active && 
        season.championships.endurance.endurance_300) {
      const endurance300Categories = getCategoriesFromStages(endurance300StagesList, ['Trophy']);
      
      console.log('📊 Demanda: Categorias Endurance 300km:', endurance300Categories);
      
      championships.push({
        id: 'endurance300',
        name: 'Endurance 300km',
        color: '#10B981',
        categories: endurance300Categories.map(cat => ({
          name: cat.name,
          cars: cat.avgCars || 28, // Fallback para 28 se não houver dados
          slicksPerStage: season.championships.endurance.endurance_300.slicks_per_stage || 0,
          rainPerStage: season.championships.endurance.endurance_300.wets_per_stage || 0,
          stages: cat.stages
        }))
      });
    }

    // Endurance 500km
    if (season.championships.endurance?.active && 
        season.championships.endurance.endurance_500) {
      const endurance500Categories = getCategoriesFromStages(endurance500StagesList, ['Trophy']);
      
      console.log('📊 Demanda: Categorias Endurance 500km:', endurance500Categories);
      
      championships.push({
        id: 'endurance500',
        name: 'Endurance 500km',
        color: '#F59E0B',
        categories: endurance500Categories.map(cat => ({
          name: cat.name,
          cars: cat.avgCars || 26, // Fallback para 26 se não houver dados
          slicksPerStage: season.championships.endurance.endurance_500.slicks_per_stage || 0,
          rainPerStage: season.championships.endurance.endurance_500.wets_per_stage || 0,
          stages: cat.stages
        }))
      });
    }

    // Trophy
    if (season.championships.trophy?.active) {
      const trophyCategories = getCategoriesFromStages(trophyStagesList, ['Carrera', 'Challenge']);
      
      console.log('📊 Demanda: Categorias Trophy:', trophyCategories);
      
      championships.push({
        id: 'trophy',
        name: 'Trophy',
        color: '#A855F7',
        categories: trophyCategories.map(cat => ({
          name: cat.name,
          cars: cat.avgCars || 20, // Fallback para 20 se não houver dados
          slicksPerStage: season.championships.trophy.slicks_per_stage || 0,
          rainPerStage: season.championships.trophy.wets_per_stage || 0,
          stages: cat.stages
        }))
      });
    }

    console.log(`✅ Demanda: ${championships.length} campeonatos configurados:`, championships);
    setChampionships(championships);
  };

  const handleCarCountChange = (championshipId: string, categoryName: string, newValue: number) => {
    setChampionships(prev => prev.map(champ => {
      if (champ.id === championshipId) {
        return {
          ...champ,
          categories: champ.categories.map(cat => 
            cat.name === categoryName ? { ...cat, cars: newValue } : cat
          )
        };
      }
      return champ;
    }));
  };

  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const handleStageCarCountChange = (stageId: string, categoryName: string, newCarCount: number) => {
    const key = `${stageId}-${categoryName}`;
    setEditableCarCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(key, newCarCount);
      return newMap;
    });
  };

  const getCarCount = (stageId: string, categoryName: string, originalCarCount: number): number => {
    const key = `${stageId}-${categoryName}`;
    return editableCarCounts.get(key) ?? originalCarCount;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Função para corrigir ordem dos pneus de chuva da Carrera
  const fixCarreraWetTires = async () => {
    try {
      setFixingTires(true);
      const supabase = createClient();

      console.log('🔧 Corrigindo ordem dos pneus de chuva da Carrera...');

      // Busca a categoria Carrera
      const carreraCategory = seasonCategories.find(sc => sc.category_name === 'Carrera');
      
      if (!carreraCategory) {
        alert('Categoria Carrera não encontrada!');
        return;
      }

      console.log('📋 Categoria Carrera atual:', carreraCategory);

      // Busca os modelos de pneu pelos códigos
      const frontWetCode = '30/65-18 P2L'; // Dianteiro correto
      const rearWetCode = '31/71-18 P2L';  // Traseiro correto

      const frontWetModel = tireModels.find(tm => tm.code === frontWetCode);
      const rearWetModel = tireModels.find(tm => tm.code === rearWetCode);

      if (!frontWetModel || !rearWetModel) {
        alert('Modelos de pneu de chuva não encontrados!');
        console.error('❌ Modelos não encontrados:', { frontWetCode, rearWetCode, tireModels });
        return;
      }

      console.log('✅ Modelos encontrados:', { 
        front: frontWetModel.code, 
        rear: rearWetModel.code 
      });

      // Atualiza a ordem correta no banco: [dianteiro, traseiro]
      const newWetTires = [frontWetModel.id, rearWetModel.id];

      console.log('🔄 Atualizando wet_tires para:', newWetTires);

      const { error } = await supabase
        .from('season_categories')
        .update({ wet_tires: newWetTires })
        .eq('id', carreraCategory.id);

      if (error) {
        console.error('❌ Erro ao atualizar:', error);
        alert('Erro ao corrigir pneus: ' + error.message);
        return;
      }

      console.log('✅ Pneus de chuva da Carrera corrigidos com sucesso!');
      alert('✅ Pneus de chuva da Carrera corrigidos!\n\nOrdem atualizada:\n• Dianteiro: 30/65-18 P2L\n• Traseiro: 31/71-18 P2L');

      // Recarrega os dados
      if (selectedSeasonId) {
        await loadSeasonData(selectedSeasonId);
      }
    } catch (error) {
      console.error('❌ Erro ao corrigir pneus:', error);
      alert('Erro ao corrigir pneus: ' + error);
    } finally {
      setFixingTires(false);
    }
  };

  // Função para calcular pneus de uma etapa específica
  const calculateStageTires = (stage: SeasonStage) => {
    if (!selectedSeason || !stage.categories) return null;

    // Verifica se os dados necessários estão carregados
    // Só mostra warnings se a temporada foi selecionada mas os dados ainda não carregaram
    if (seasonCategories.length === 0) {
      // Não mostra warning se ainda está carregando
      if (!loading) {
        console.warn('⚠️ seasonCategories vazio! Aguardando carregamento...');
      }
      return null;
    }

    if (tireModels.length === 0) {
      // Não mostra warning se ainda está carregando
      if (!loading) {
        console.warn('⚠️ tireModels vazio! Aguardando carregamento...');
      }
      return null;
    }

    // Determina quantos jogos slicks e chuva baseado no campeonato
    let slicksPerStage = 0;
    let wetsPerStage = 0;

    // Verifica se há premissas customizadas para esta etapa
    const customPremissa = customPremissas.get(stage.id);
    
    if (customPremissa) {
      // Usa premissas customizadas se disponível
      slicksPerStage = customPremissa.slicks;
      wetsPerStage = customPremissa.wets;
      console.log(`🎯 Usando premissas CUSTOMIZADAS para ${stage.name}: Slicks=${slicksPerStage}, Wets=${wetsPerStage}`);
    } else {
      // Usa premissas padrão da temporada
      if (stage.main_championship === 'preseason') {
        slicksPerStage = selectedSeason.championships?.preseason?.slicks_per_stage || 0;
        wetsPerStage = selectedSeason.championships?.preseason?.wets_per_stage || 0;
      } else if (stage.main_championship === 'sprint') {
        slicksPerStage = selectedSeason.championships?.sprint?.slicks_per_stage || 0;
        wetsPerStage = selectedSeason.championships?.sprint?.wets_per_stage || 0;
      } else if (stage.main_championship === 'endurance') {
        if (stage.endurance_type === 'endurance_300') {
          slicksPerStage = selectedSeason.championships?.endurance?.endurance_300?.slicks_per_stage || 0;
          wetsPerStage = selectedSeason.championships?.endurance?.endurance_300?.wets_per_stage || 0;
        } else if (stage.endurance_type === 'endurance_500') {
          slicksPerStage = selectedSeason.championships?.endurance?.endurance_500?.slicks_per_stage || 0;
          wetsPerStage = selectedSeason.championships?.endurance?.endurance_500?.wets_per_stage || 0;
        }
      }
      console.log(`📋 Usando premissas PADRÃO para ${stage.name}: Slicks=${slicksPerStage}, Wets=${wetsPerStage}`);
    }

    // Se a etapa inclui Trophy, adiciona os jogos do Trophy para a categoria Trophy
    const trophySlicksPerStage = selectedSeason.championships?.trophy?.slicks_per_stage || 0;
    const trophyWetsPerStage = selectedSeason.championships?.trophy?.wets_per_stage || 0;

    // Processa cada categoria da etapa
    const categoriesData: Array<{
      name: string;
      carCount: number;
      slicks: number;
      wets: number;
      frontSlickModel: string;
      rearSlickModel: string;
      frontWetModel: string;
      rearWetModel: string;
      frontSlickQty: number;
      rearSlickQty: number;
      frontWetQty: number;
      rearWetQty: number;
      totalTires: number;
    }> = [];

    let stageTotalTires = 0;
    const tiresByModel = new Map<string, number>();

    stage.categories.forEach((cat: any) => {
      if (typeof cat === 'object' && cat.name && cat.car_count) {
        const categoryName = cat.name;
        const carCount = getCarCount(stage.id, categoryName, cat.car_count);

        console.log(`  🔎 Processando categoria "${categoryName}" com ${carCount} carros`);

        // Busca modelos de pneu da categoria
        const categoryConfig = seasonCategories.find(sc => sc.category_name === categoryName);
        
        console.log(`  🔍 Busca categoria "${categoryName}" em seasonCategories:`, {
          found: !!categoryConfig,
          seasonCategories: seasonCategories.map(sc => sc.category_name),
          categoryConfig
        });
        
        if (!categoryConfig) {
          console.warn(`  ⚠️ Categoria "${categoryName}" não encontrada em season_categories!`);
          return;
        }

        // Determina jogos para esta categoria específica
        let categorySlicks = slicksPerStage;
        let categoryWets = wetsPerStage;

        // Se for categoria Trophy em etapa com Trophy, usa configurações do Trophy
        if (categoryName === 'Trophy' && stage.include_trophy) {
          categorySlicks = trophySlicksPerStage;
          categoryWets = trophyWetsPerStage;
        }

        // Calcula pneus
        // CORRETO: 1 jogo = 2 pneus (par)
        // Slicks: carros × jogos slick × 2 pneus por jogo
        const frontSlickQty = carCount * categorySlicks * 2;
        const rearSlickQty = carCount * categorySlicks * 2;
        
        // Chuva: carros × jogos chuva × 2 pneus por jogo  
        const frontWetQty = carCount * categoryWets * 2;
        const rearWetQty = carCount * categoryWets * 2;

        // Total de pneus = slicks + chuva
        const totalTires = frontSlickQty + rearSlickQty + frontWetQty + rearWetQty;

        // Busca códigos dos modelos de pneu usando os IDs dos arrays
        const frontSlickId = categoryConfig.slick_tires[0]; // Primeiro ID = dianteiro
        const rearSlickId = categoryConfig.slick_tires[1];  // Segundo ID = traseiro
        const frontWetId = categoryConfig.wet_tires[0];     // Primeiro ID = dianteiro
        const rearWetId = categoryConfig.wet_tires[1];      // Segundo ID = traseiro

        const frontSlickModel = tireModels.find(tm => tm.id === frontSlickId)?.code || 'N/A';
        const rearSlickModel = tireModels.find(tm => tm.id === rearSlickId)?.code || 'N/A';
        const frontWetModel = tireModels.find(tm => tm.id === frontWetId)?.code || 'N/A';
        const rearWetModel = tireModels.find(tm => tm.id === rearWetId)?.code || 'N/A';

        console.log(`  🔍 Modelos de pneu para ${categoryName}:`, {
          slick_tires_array: categoryConfig.slick_tires,
          wet_tires_array: categoryConfig.wet_tires,
          frontSlickId,
          rearSlickId,
          frontWetId,
          rearWetId,
          frontSlickModel,
          rearSlickModel,
          frontWetModel,
          rearWetModel
        });

        categoriesData.push({
          name: categoryName,
          carCount,
          slicks: categorySlicks,
          wets: categoryWets,
          frontSlickModel,
          rearSlickModel,
          frontWetModel,
          rearWetModel,
          frontSlickQty,
          rearSlickQty,
          frontWetQty,
          rearWetQty,
          totalTires
        });

        stageTotalTires += totalTires;

        // Agrupa por modelo
        tiresByModel.set(
          frontSlickModel,
          (tiresByModel.get(frontSlickModel) || 0) + frontSlickQty
        );
        tiresByModel.set(
          rearSlickModel,
          (tiresByModel.get(rearSlickModel) || 0) + rearSlickQty
        );
        tiresByModel.set(
          frontWetModel,
          (tiresByModel.get(frontWetModel) || 0) + frontWetQty
        );
        tiresByModel.set(
          rearWetModel,
          (tiresByModel.get(rearWetModel) || 0) + rearWetQty
        );
      }
    });

    return {
      categories: categoriesData,
      totalTires: stageTotalTires,
      tiresByModel: Array.from(tiresByModel.entries()).map(([model, qty]) => {
        // Busca a descrição do modelo
        const tireModel = tireModels.find(tm => tm.code === model);
        return { 
          model, 
          qty,
          description: tireModel?.name || ''
        };
      })
    };
  };

  const calculateTotals = () => {
    let totalTires = 0;
    let totalSlicks = 0;
    let totalRain = 0;

    // Soma os valores reais de TODAS as etapas (que já usam editableCarCounts via getCarCount)
    stages.forEach(stage => {
      const stageData = calculateStageTires(stage);
      if (stageData && stageData.categories) {
        stageData.categories.forEach(category => {
          // Soma pneus slick (dianteiro + traseiro)
          totalSlicks += (category.frontSlickQty + category.rearSlickQty);
          // Soma pneus chuva (dianteiro + traseiro)
          totalRain += (category.frontWetQty + category.rearWetQty);
        });
      }
    });

    totalTires = totalSlicks + totalRain;

    return {
      total: totalTires,
      slicks: totalSlicks,
      rain: totalRain,
    };
  };

  const totals = calculateTotals();

  const saveDemandCalculations = async () => {
    if (!selectedSeasonId || stages.length === 0) return;

    setIsSaving(true);

    try {
      const supabase = createClient();

      console.log('💾 Demanda: Salvando cálculos de demanda...');

      // Prepara os dados para salvar
      const dataToSave = stages.map(stage => {
        const stageData = calculateStageTires(stage);

        return {
          stage_id: stage.id,
          total_tires: stageData ? stageData.totalTires : 0,
          tires_by_model: stageData ? stageData.tiresByModel : [],
          exclude_wet_tires: stagesWithoutWet.has(stage.id), // Salva o estado do toggle
          categories: stageData ? stageData.categories.map(cat => ({
            category_name: cat.name,
            car_count: cat.carCount,
            slicks: cat.slicks,
            wets: cat.wets,
            wildcards_count: 0,
            front_slick_model: cat.frontSlickModel,
            rear_slick_model: cat.rearSlickModel,
            front_wet_model: cat.frontWetModel,
            rear_wet_model: cat.rearWetModel,
            front_slick_qty: cat.frontSlickQty,
            rear_slick_qty: cat.rearSlickQty,
            front_wet_qty: cat.frontWetQty,
            rear_wet_qty: cat.rearWetQty,
            total_tires: cat.totalTires
          })) : []
        };
      });

      console.log(`📊 Demanda: Salvando ${dataToSave.length} cálculos de etapas...`);

      // Salva no Supabase com upsert (insere ou atualiza)
      const { error } = await supabase
        .from('demand_calculations')
        .upsert(dataToSave, { onConflict: 'stage_id' });

      if (error) {
        console.error('❌ Demanda: Erro ao salvar cálculos:', error);
        throw error;
      }

      console.log('✅ Demanda: Cálculos salvos com sucesso!');
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('❌ Demanda: Erro ao salvar cálculos:', error);
      // Não mostra alert se for erro de tabela não existir (usuário ainda não criou)
      if (!error.message?.includes('relation "demand_calculations" does not exist')) {
        alert('Erro ao salvar cálculos: ' + error.message);
      } else {
        console.warn('⚠️ Demanda: Tabela demand_calculations não existe. Execute o script SQL primeiro.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const loadDemandAnalysis = async () => {
    if (!selectedSeasonId || stages.length === 0) return;

    setLoadingDemand(true);
    
    try {
      const supabase = createClient();
      
      console.log('🔄 Estoque: Carregando análise de demanda...');

      // Busca o estoque inicial (pneus novos agrupados por modelo)
      console.log('🔄 Estoque: Carregando estoque inicial...');
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('model_name')
        .eq('status', 'Novo');

      if (stockError) {
        console.error('❌ Estoque: Erro ao carregar estoque:', stockError);
      } else if (stockData) {
        // Agrupa por model_name e conta as linhas (cada linha = 1 pneu)
        // Cria um Map indexado por código do modelo (não pelo nome)
        const stockByCode = new Map<string, number>();
        
        stockData.forEach((entry: any) => {
          // Encontra o código correspondente ao nome
          const tireModel = tireModels.find(tm => tm.name === entry.model_name);
          if (tireModel) {
            const currentQty = stockByCode.get(tireModel.code) || 0;
            stockByCode.set(tireModel.code, currentQty + 1);
          }
        });
        
        console.log('✅ Estoque: Estoque inicial carregado:', Object.fromEntries(stockByCode));
        setInitialStock(stockByCode);
      }

      // Busca cálculos de demanda das etapas
      const stageIds = stages.map(s => s.id);
      
      const { data: calculationsData, error: calcError } = await supabase
        .from('demand_calculations')
        .select('*')
        .in('stage_id', stageIds);

      if (calcError) {
        console.error('❌ Estoque: Erro ao carregar cálculos:', calcError);
        setDemandData([]);
        return;
      }

      if (calculationsData && calculationsData.length > 0) {
        console.log(`✅ Estoque: ${calculationsData.length} cálculos carregados`);
        console.log('🔍 Estoque: Stages disponíveis:', stages);
        console.log('🔍 Estoque: Primeiro cálculo:', calculationsData[0]);
        
        // Carrega o estado dos toggles de wet tires
        const newStagesWithoutWet = new Set<string>();
        calculationsData.forEach(calc => {
          if (calc.exclude_wet_tires === true) {
            newStagesWithoutWet.add(calc.stage_id);
          }
        });
        setStagesWithoutWet(newStagesWithoutWet);
        console.log('✅ Estoque: Estados de wet carregados:', Array.from(newStagesWithoutWet));
        
        // Processa os dados para a tabela
        const processedData = calculationsData.map(calc => {
          const stage = stages.find(s => s.id === calc.stage_id);
          console.log('🔍 Estoque: Stage encontrado:', stage);
          
          // Determina o campeonato baseado no main_championship
          let championship = 'N/A';
          if (stage) {
            if (stage.main_championship === 'preseason') {
              championship = 'Pré-Temporada';
            } else if (stage.main_championship === 'sprint') {
              championship = stage.include_trophy ? 'Sprint + Trophy' : 'Sprint';
            } else if (stage.main_championship === 'endurance') {
              if (stage.endurance_type === 'endurance_500') {
                championship = stage.include_trophy ? 'Endurance 500km + Trophy' : 'Endurance 500km';
              } else if (stage.endurance_type === 'endurance_300') {
                championship = 'Endurance 300km';
              } else {
                championship = 'Endurance';
              }
            }
          }
          
          // Enriquece tires_by_model com descrições
          const enrichedTiresByModel = calc.tires_by_model?.map((tire: any) => {
            const tireModel = tireModels.find(tm => tm.code === tire.model);
            return {
              ...tire,
              description: tireModel?.name || ''
            };
          }) || [];
          
          return {
            ...calc,
            stage_name: stage?.name || 'Etapa desconhecida',
            stage_date: stage?.start_date || '',
            championship: championship,
            tires_by_model: enrichedTiresByModel,
          };
        });

        // Ordena por data da etapa
        processedData.sort((a, b) => {
          if (a.stage_date < b.stage_date) return -1;
          if (a.stage_date > b.stage_date) return 1;
          return 0;
        });

        setDemandData(processedData);
        console.log('✅ Estoque: Dados processados:', processedData);
        
        // Busca TODOS os pedidos (tire_orders) da temporada selecionada
        const { data: allOrdersData } = await supabase
          .from('tire_orders')
          .select('*, tire_order_items(*)')
          .eq('season_id', selectedSeasonId)
          .order('created_at', { ascending: true });

        if (allOrdersData && allOrdersData.length > 0) {
          // Fallback: demand_calculations → mapeia order_id → stage_id (para pedidos antigos sem target_stage_id)
          const calcOrderMap = new Map<string, string>(); // order_id → stage_id
          calculationsData.forEach((calc: any) => {
            if (calc.order_id) calcOrderMap.set(calc.order_id, calc.stage_id);
          });

          // Agrupa pedidos por stage_id
          // Prioridade: 1) target_stage_id (novo campo direto), 2) demand_calculations, 3) selected_stages com 1 etapa
          const newOrdersPerStage = new Map<string, any[]>();
          allOrdersData.forEach(order => {
            let stageId: string | null = null;

            if (order.target_stage_id && stageIds.includes(order.target_stage_id)) {
              // ✅ Fonte direta e confiável — funciona para múltiplos pedidos na mesma etapa
              stageId = order.target_stage_id;
            } else if (calcOrderMap.has(order.id)) {
              // Pedido antigo sem target_stage_id mas registrado em demand_calculations
              stageId = calcOrderMap.get(order.id)!;
            } else {
              // Último fallback: selected_stages com exatamente 1 etapa
              const sel: string[] = order.selected_stages || [];
              if (sel.length === 1 && stageIds.includes(sel[0])) stageId = sel[0];
            }

            if (stageId) {
              if (!newOrdersPerStage.has(stageId)) newOrdersPerStage.set(stageId, []);
              if (!newOrdersPerStage.get(stageId)!.find((o: any) => o.id === order.id)) {
                newOrdersPerStage.get(stageId)!.push(order);
              }
            }
          });
          setOrdersPerStage(newOrdersPerStage);
          console.log('✅ Estoque: Pedidos por etapa carregados', Object.fromEntries(newOrdersPerStage));

          // Busca conferências para todos os pedidos encontrados
          const allOrderIds = allOrdersData.map(o => o.id);
          const { data: conferencesData, error: conferencesError } = await supabase
            .from('order_conferences')
            .select('*')
            .in('order_id', allOrderIds)
            .order('conference_date', { ascending: false });

          if (conferencesError) {
            console.error('❌ Estoque: Erro ao carregar conferências:', conferencesError);
          } else if (conferencesData) {
            const conferencesMap = new Map<string, any>();
            conferencesData.forEach(conf => {
              if (!conferencesMap.has(conf.order_id)) {
                conferencesMap.set(conf.order_id, conf);
              }
            });
            console.log('✅ Estoque: Conferências carregadas:', Object.fromEntries(conferencesMap));
            setOrderConferences(conferencesMap);
          }
        } else {
          // Fallback: usa order_id do demand_calculations (comportamento anterior)
          const orderIds = calculationsData
            .filter(calc => calc.order_id)
            .map(calc => calc.order_id);
          if (orderIds.length > 0) {
            const { data: conferencesData } = await supabase
              .from('order_conferences')
              .select('*')
              .in('order_id', orderIds)
              .order('conference_date', { ascending: false });
            if (conferencesData) {
              const conferencesMap = new Map<string, any>();
              conferencesData.forEach(conf => {
                if (!conferencesMap.has(conf.order_id)) conferencesMap.set(conf.order_id, conf);
              });
              setOrderConferences(conferencesMap);
            }
          }
        }
      } else {
        console.log('📝 Estoque: Nenhum cálculo encontrado');
        setDemandData([]);
      }
    } catch (error) {
      console.error('❌ Estoque: Erro ao carregar análise:', error);
      setDemandData([]);
    } finally {
      setLoadingDemand(false);
    }
  };

  // Função para toggle de wet tires em uma etapa
  const toggleWetTires = async (stageId: string) => {
    // Atualiza o state local
    setStagesWithoutWet(prev => {
      const newSet = new Set(prev);
      const isRemoving = !newSet.has(stageId);
      
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      
      // Salva no Supabase de forma assíncrona
      (async () => {
        try {
          const supabase = createClient();
          
          console.log(`💾 Salvando toggle wet para etapa ${stageId}: exclude_wet_tires=${isRemoving}`);
          
          const { error } = await supabase
            .from('demand_calculations')
            .update({ exclude_wet_tires: isRemoving })
            .eq('stage_id', stageId);
          
          if (error) {
            console.error('❌ Erro ao salvar toggle wet:', error);
          } else {
            console.log('✅ Toggle wet salvo com sucesso!');
            // Recalcula e salva os dados atualizados
            await saveDemandCalculations();
          }
        } catch (error) {
          console.error('❌ Erro ao salvar toggle wet:', error);
        }
      })();
      
      return newSet;
    });
  };

  // Função para identificar se um modelo é wet (baseado nas categorias da etapa)
  const isWetModel = (modelCode: string, demand: any): boolean => {
    if (!demand.categories) return false;
    return demand.categories.some((cat: any) => 
      cat.front_wet_model === modelCode || cat.rear_wet_model === modelCode
    );
  };

  // Função para obter premissas atuais (customizadas ou padrão)
  const getCurrentPremissas = (stage: SeasonStage): { slicks: number; wets: number } => {
    const customPremissa = customPremissas.get(stage.id);
    if (customPremissa) {
      return customPremissa;
    }

    // Retorna valores padrão da temporada
    if (!selectedSeason || !selectedSeason.championships) {
      return { slicks: 0, wets: 0 };
    }

    let slicks = 0;
    let wets = 0;

    if (stage.main_championship === 'preseason') {
      slicks = selectedSeason.championships.preseason?.slicks_per_stage || 0;
      wets = selectedSeason.championships.preseason?.wets_per_stage || 0;
    } else if (stage.main_championship === 'sprint') {
      slicks = selectedSeason.championships.sprint?.slicks_per_stage || 0;
      wets = selectedSeason.championships.sprint?.wets_per_stage || 0;
    } else if (stage.main_championship === 'endurance') {
      if (stage.endurance_type === 'endurance_300') {
        slicks = selectedSeason.championships.endurance?.endurance_300?.slicks_per_stage || 0;
        wets = selectedSeason.championships.endurance?.endurance_300?.wets_per_stage || 0;
      } else if (stage.endurance_type === 'endurance_500') {
        slicks = selectedSeason.championships.endurance?.endurance_500?.slicks_per_stage || 0;
        wets = selectedSeason.championships.endurance?.endurance_500?.wets_per_stage || 0;
      }
    }

    return { slicks, wets };
  };

  // Função para abrir modal de edição de premissas
  const openEditPremissas = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (stage) {
      const currentPremissas = getCurrentPremissas(stage);
      setEditSlicks(currentPremissas.slicks);
      setEditWets(currentPremissas.wets);
      setSelectedStageForEdit(stage);
      setEditPremissasModal(true);
    }
  };

  // Função para salvar premissas customizadas
  const saveCustomPremissas = (stageId: string, slicks: number, wets: number) => {
    console.log(`💾 Salvando premissas customizadas: ${stageId} - Slicks: ${slicks}, Wets: ${wets}`);
    const newMap = new Map(customPremissas);
    newMap.set(stageId, { slicks, wets });
    setCustomPremissas(newMap);
    setEditPremissasModal(false);
    setSelectedStageForEdit(null);
  };

  // Função para restaurar premissas padrão de uma etapa
  const restorePremissas = (stageId: string) => {
    console.log(`♻️ Restaurando premissas padrão: ${stageId}`);
    const newMap = new Map(customPremissas);
    newMap.delete(stageId);
    setCustomPremissas(newMap);
    setEditPremissasModal(false);
    setSelectedStageForEdit(null);
  };

  // Função para identificar se uma etapa é internacional (fora da América do Sul)
  const isInternationalStage = (stageId: string): boolean => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) {
      console.log('⚠️ Etapa não encontrada:', stageId);
      return false;
    }
    
    if (!stage.track) {
      console.log('⚠️ Etapa sem track:', stage.name);
      return false;
    }
    
    // Lista de países/locais da América do Sul
    const southAmericaLocations = [
      'brasil', 'brazil', 'argentina', 'uruguai', 'uruguay', 
      'chile', 'paraguai', 'paraguay', 'colômbia', 'colombia',
      'interlagos', 'buenos aires', 'rivera', 'curitiba', 
      'goiânia', 'goiania', 'rio de janeiro', 'são paulo', 'sao paulo',
      'velocitta', 'mogi guaçu', 'mogi guacu'
    ];
    
    const trackLower = stage.track.toLowerCase();
    const isInternational = !southAmericaLocations.some(loc => trackLower.includes(loc));
    
    console.log(`🌍 Etapa: ${stage.name} | Track: ${stage.track} | Internacional: ${isInternational}`);
    
    return isInternational;
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      {/* Tabs */}
      <div className="border-b" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('calculo')}
              className="flex items-center gap-2 px-4 py-4 border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'calculo' ? '#DC2626' : 'transparent',
                color: activeTab === 'calculo' ? '#DC2626' : '#6B7280',
              }}
            >
              <ClipboardList size={20} />
              <span className="font-semibold">Cálculo de Demanda</span>
            </button>
            <button
              onClick={() => setActiveTab('estoque')}
              className="flex items-center gap-2 px-4 py-4 border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'estoque' ? '#DC2626' : 'transparent',
                color: activeTab === 'estoque' ? '#DC2626' : '#6B7280',
              }}
            >
              <BarChart3 size={20} />
              <span className="font-semibold">Estoque vs. Demanda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'calculo' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#DC2626' }}
                >
                  <ClipboardList size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Demanda de Pneus</h2>
                  <p className="text-sm text-gray-600">Cálculo automático por temporada</p>
                </div>
                
                {/* Indicador de salvamento */}
                {selectedSeasonId && (
                  <div className="flex items-center gap-2">
                    {isSaving ? (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        Salvando...
                      </span>
                    ) : lastSaved ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        ✓ Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temporada */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Temporada <span className="text-red-600">*</span>
                  </label>
                  
                  {loading ? (
                    <div className="w-full px-4 py-2 border rounded-lg text-gray-400" style={{ borderColor: '#E5E7EB' }}>
                      Carregando temporadas...
                    </div>
                  ) : seasons.length === 0 ? (
                    <select
                      disabled
                      className="w-full px-4 py-2 border rounded-lg text-gray-400 bg-gray-50"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <option>Nenhuma temporada disponível</option>
                    </select>
                  ) : (
                    <select
                      value={selectedSeasonId}
                      onChange={(e) => setSelectedSeasonId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: '#E5E7EB',
                        '--tw-ring-color': '#DC2626'
                      } as any}
                    >
                      <option value="">Selecione uma temporada</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name} ({stages.length} etapas)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Filtrar Etapa */}
                {selectedSeasonId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Filter size={14} className="inline mr-1" />
                      Filtrar Etapa
                    </label>
                    <select
                      value={selectedStageFilter}
                      onChange={(e) => setSelectedStageFilter(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: '#E5E7EB',
                        '--tw-ring-color': '#DC2626'
                      } as any}
                    >
                      <option value="all">Todas as etapas</option>
                      {stages.map((stage, index) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            {selectedSeasonId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total */}
                  <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                    <div className="text-sm text-gray-600 mb-1">Total</div>
                    <div className="text-3xl font-bold text-gray-900">{totals.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">pneus</div>
                  </div>

                  {/* Slicks */}
                  <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                    <div className="text-sm text-gray-600 mb-1">Slicks</div>
                    <div className="text-3xl font-bold" style={{ color: '#3B82F6' }}>{totals.slicks.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: '#3B82F6' }}>pneus</div>
                  </div>

                  {/* Chuva */}
                  <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                    <div className="text-sm text-gray-600 mb-1">Chuva</div>
                    <div className="text-3xl font-bold" style={{ color: '#10B981' }}>{totals.rain.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: '#10B981' }}>pneus</div>
                  </div>
                </div>

                {/* Premissas de Cálculo - Expansível */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                  <button
                    onClick={() => setPremissasExpanded(!premissasExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between text-white hover:opacity-90 transition-opacity"
                    style={{ background: '#1F2937' }}
                  >
                    <div className="flex items-center gap-3">
                      <Calculator size={20} />
                      <span className="font-semibold">
                        Premissas de Cálculo - Temporada {selectedSeason?.year || ''}
                      </span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span>Clique para {premissasExpanded ? 'recolher' : 'expandir'}</span>
                      {premissasExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </button>

                  {premissasExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead style={{ background: '#F9FAFB' }}>
                          <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Campeonato</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Categoria</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Slicks/Etapa</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Chuva/Etapa</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Etapas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {championships.map((championship) => (
                            championship.categories.map((category, idx) => (
                              <tr key={`${championship.id}-${idx}`} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                                {idx === 0 && (
                                  <td rowSpan={championship.categories.length} className="px-6 py-3 border-r" style={{ borderColor: '#E5E7EB' }}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ background: championship.color }}></div>
                                      <span className="text-sm font-medium text-gray-900">{championship.name}</span>
                                    </div>
                                  </td>
                                )}
                                <td className="px-6 py-3 text-sm text-gray-700">{category.name}</td>
                                <td className="px-6 py-3 text-sm" style={{ color: '#3B82F6' }}>{category.slicksPerStage} jogos</td>
                                <td className="px-6 py-3 text-sm" style={{ color: '#10B981' }}>{category.rainPerStage} jogos</td>
                                <td className="px-6 py-3 text-sm text-gray-700">{category.stages}</td>
                              </tr>
                            ))
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Etapas - Seções Expansíveis */}
                {stages.map((stage, stageIdx) => {
                  const isExpanded = expandedStages.has(stage.id);
                  
                  // Determina o tipo de campeonato
                  let stageType = 'Sprint';
                  if (stage.main_championship === 'preseason') {
                    stageType = 'Pré-Temporada';
                  } else if (stage.main_championship === 'sprint') {
                    stageType = 'Sprint';
                  } else if (stage.main_championship === 'endurance') {
                    if (stage.endurance_type === 'endurance_300') {
                      stageType = 'Endurance 300km';
                    } else if (stage.endurance_type === 'endurance_500') {
                      stageType = 'Endurance 500km';
                    } else {
                      stageType = 'Endurance';
                    }
                  }
                  
                  if (stage.include_trophy) {
                    stageType += ' + Trophy';
                  }

                  // Calcula pneus da etapa
                  const stageData = calculateStageTires(stage);

                  return (
                    <div key={stage.id} className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                      <button
                        onClick={() => toggleStageExpansion(stage.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: '#DC2626' }}></div>
                          <span className="font-semibold text-gray-900">
                            {stage.name}
                          </span>
                          <span className="text-sm text-gray-500">{formatDate(stage.start_date)}</span>
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>
                            {stageType}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {stageData ? stageData.totalTires.toLocaleString() : '0'} pneus
                          </span>
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </button>

                      {isExpanded && stageData && (
                        <div className="border-t px-6 py-6 space-y-6" style={{ borderColor: '#E5E7EB' }}>
                          {/* Renderiza cada categoria */}
                          {stageData.categories.map((category, idx) => (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{category.name}</h4>
                                    <p className="text-sm text-gray-500">
                                      {category.carCount} carros • {category.slicks} jogos slick • {category.wets} jogos chuva
                                    </p>
                                  </div>
                                  
                                  {/* Input editável para quantidade de carros */}
                                  <div className="flex items-center gap-2">
                                    <label htmlFor={`cars-${stage.id}-${category.name}`} className="text-xs font-medium text-gray-600">
                                      Carros:
                                    </label>
                                    <input
                                      id={`cars-${stage.id}-${category.name}`}
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={category.carCount}
                                      onChange={(e) => handleStageCarCountChange(stage.id, category.name, parseInt(e.target.value) || 0)}
                                      className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2"
                                      style={{ 
                                        borderColor: '#E5E7EB',
                                        '--tw-ring-color': '#DC2626'
                                      } as any}
                                    />
                                  </div>
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{category.totalTires} pneus</div>
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                {/* Diant. Slick */}
                                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                  <div className="text-xs text-gray-600 mb-2">Diant. Slick</div>
                                  <div className="font-semibold text-gray-900">{category.frontSlickModel}</div>
                                  <div className="text-sm" style={{ color: '#3B82F6' }}>{category.frontSlickQty} un</div>
                                </div>

                                {/* Tras. Slick */}
                                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                  <div className="text-xs text-gray-600 mb-2">Tras. Slick</div>
                                  <div className="font-semibold text-gray-900">{category.rearSlickModel}</div>
                                  <div className="text-sm" style={{ color: '#3B82F6' }}>{category.rearSlickQty} un</div>
                                </div>

                                {/* Diant. Chuva */}
                                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                  <div className="text-xs text-gray-600 mb-2">Diant. Chuva</div>
                                  <div className="font-semibold text-gray-900">{category.frontWetModel}</div>
                                  <div className="text-sm" style={{ color: '#10B981' }}>{category.frontWetQty} un</div>
                                </div>

                                {/* Tras. Chuva */}
                                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                  <div className="text-xs text-gray-600 mb-2">Tras. Chuva</div>
                                  <div className="font-semibold text-gray-900">{category.rearWetModel}</div>
                                  <div className="text-sm" style={{ color: '#10B981' }}>{category.rearWetQty} un</div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Total por Modelo */}
                          {stageData.tiresByModel.length > 0 && (
                            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                              <div className="text-sm font-semibold text-gray-700 mb-3">Total por Modelo:</div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {stageData.tiresByModel.map((tire, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                                    <span className="text-sm text-gray-700">{tire.model}</span>
                                    <span className="font-semibold text-gray-900">{tire.qty} pneus</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Empty State */}
            {!selectedSeasonId && (
              <div className="bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: '#F3F4F6' }}
                  >
                    <Calculator size={40} style={{ color: '#9CA3AF' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Selecione uma temporada
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    Escolha uma temporada acima para calcular a demanda de pneus
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'estoque' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
                >
                  <BarChart3 size={20} style={{ color: '#FFFFFF' }} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Análise de Compra de Pneus
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Comparação: Estoque vs Demanda
                  </p>
                </div>
              </div>
            </div>

            {/* Card Info - Etapas Internacionais */}
            <div 
              className="flex items-start gap-3 p-4 rounded-lg"
              style={{ background: '#DBEAFE', borderLeft: '4px solid #3B82F6' }}
            >
              <AlertCircle size={20} style={{ color: '#1E40AF', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1E3A8A' }}>
                  Etapas Internacionais (fora da América do Sul)
                </p>
                <p className="text-xs" style={{ color: '#1E40AF' }}>
                  Etapas internacionais como Le Mans e Portugal iniciam com <strong>estoque zero</strong>, 
                  pois os pneus são encomendados diretamente no país. O estoque da última etapa na América do Sul 
                  será mantido para a próxima etapa nacional. Etapas internacionais são marcadas com o badge <span className="inline-flex items-center text-[8px] px-1 py-0.5 rounded mx-1" style={{ background: '#DBEAFE', color: '#1E40AF' }}>INT</span>.
                </p>
              </div>
            </div>

            {/* Seleção de Temporada */}
            <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
              <div className="space-y-4">
                {/* Label */}
                <label className="block">
                  <span className="text-sm font-semibold text-gray-900">
                    Temporadas <span style={{ color: '#DC2626' }}>*</span>
                  </span>
                </label>

                {/* Alert se não tiver temporadas */}
                {seasons.length === 0 && (
                  <div 
                    className="flex items-start gap-3 p-4 rounded-lg"
                    style={{ background: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}
                  >
                    <AlertCircle size={20} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p className="text-sm" style={{ color: '#92400E' }}>
                        Configure temporadas no <span className="font-semibold">Master Data TESTE</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Dropdown de Temporadas */}
                {seasons.length > 0 && (
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    style={{
                      borderColor: '#D1D5DB',
                      fontSize: '14px',
                      color: selectedSeasonId ? '#111827' : '#9CA3AF',
                    }}
                  >
                    <option value="">Selecione uma temporada</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Estado Vazio - Selecione uma temporada */}
            {!selectedSeasonId && seasons.length > 0 && (
              <div 
                className="bg-white rounded-xl shadow-sm border flex items-center justify-center"
                style={{ borderColor: '#E5E7EB', minHeight: '400px' }}
              >
                <div className="text-center px-6">
                  <div className="mb-6 flex justify-center">
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{ background: '#F3F4F6' }}
                    >
                      <ClipboardList size={40} style={{ color: '#9CA3AF' }} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Selecione uma temporada
                  </h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Escolha uma temporada para calcular a necessidade de compra
                  </p>
                </div>
              </div>
            )}

            {/* Conteúdo quando temporada selecionada */}
            {selectedSeasonId && seasons.length > 0 && (
              <>
                {/* Loading State */}
                {loadingDemand && (
                  <div 
                    className="bg-white rounded-xl shadow-sm border flex items-center justify-center"
                    style={{ borderColor: '#E5E7EB', minHeight: '400px' }}
                  >
                    <div className="text-center px-6">
                      <div className="mb-4 flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#DC2626' }}></div>
                      </div>
                      <p className="text-sm text-gray-500">Carregando análise...</p>
                    </div>
                  </div>
                )}

                {/* Sem Dados */}
                {!loadingDemand && demandData.length === 0 && (
                  <div 
                    className="bg-white rounded-xl shadow-sm border flex items-center justify-center"
                    style={{ borderColor: '#E5E7EB', minHeight: '400px' }}
                  >
                    <div className="text-center px-6">
                      <div className="mb-6 flex justify-center">
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center"
                          style={{ background: '#FEF3C7' }}
                        >
                          <AlertCircle size={40} style={{ color: '#F59E0B' }} />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum cálculo encontrado
                      </h3>
                      <p className="text-sm text-gray-500 max-w-md mb-4">
                        Vá para a aba "Cálculo de Demanda" e selecione esta temporada para gerar os dados
                      </p>
                      <button
                        onClick={() => setActiveTab('calculo')}
                        className="px-4 py-2 rounded-lg text-white font-medium transition-colors"
                        style={{ background: '#DC2626' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
                      >
                        Ir para Cálculo de Demanda
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabela de Análise */}
                {!loadingDemand && demandData.length > 0 && (() => {
                  // Coleta todos os modelos únicos de todas as etapas
                  const allTireModelsMap = new Map<string, { model: string; description: string }>();
                  demandData.forEach(demand => {
                    demand.tires_by_model?.forEach((tire: any) => {
                      if (!allTireModelsMap.has(tire.model)) {
                        allTireModelsMap.set(tire.model, {
                          model: tire.model,
                          description: tire.description
                        });
                      }
                    });
                  });
                  const allTireModels = Array.from(allTireModelsMap.values());

                  return (
                  <div className="space-y-3">
                    {/* Header com instruções */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-700">Análise de Estoque vs. Demanda</h3>
                        {isSaving && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                            <span>Sincronizando...</span>
                          </div>
                        )}
                        {!isSaving && lastSaved && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Salvo</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CloudOff size={14} style={{ color: '#EF4444' }} />
                        <span>= Com pneus de chuva</span>
                        <span className="mx-1">|</span>
                        <CloudRain size={14} style={{ color: '#10B981' }} />
                        <span>= Sem pneus de chuva</span>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
                      <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'auto' }}>
                        <table className="w-full table-fixed">
                          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                              <th className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600" style={{ width: '10%', background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 10 }}>
                                <div className="break-words leading-tight">Campeonato</div>
                              </th>
                              <th className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600" style={{ width: '8%', background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 10 }}>
                                <div className="break-words leading-tight">Etapa</div>
                              </th>
                              <th className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600" style={{ width: '10%', background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 10 }}>
                                <div className="break-words leading-tight">Situação</div>
                              </th>
                              {/* Colunas dinâmicas de modelos de pneu - AGORA USA TODOS OS MODELOS */}
                              {allTireModels.map((tire, idx: number) => (
                                <th
                                  key={idx}
                                  className="px-1 py-2 text-center text-[9px] font-semibold text-gray-600"
                                  style={{ width: `${72 / (allTireModels.length || 1)}%`, background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 10 }}
                                >
                                  <div className="break-words leading-tight">
                                    <div className="mb-1">{tire.description}</div>
                                    <div className="text-[8px] text-gray-500">{tire.model}</div>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Cria um Map de estoque acumulado que será atualizado a cada etapa
                              const accumulatedStock = new Map<string, number>();
                              
                              // Inicializa com o estoque inicial
                              allTireModels.forEach(tire => {
                                accumulatedStock.set(tire.model, initialStock.get(tire.model) || 0);
                              });

                              return demandData.map((demand, demandIdx) => {
                                // Para cada etapa, mostra até 4 linhas: Pedidos (se houver), Estoque inicial, Consumo previsto, Estoque final
                                const rows = [];
                                
                                // Verifica se a etapa é internacional
                                const isInternational = isInternationalStage(demand.stage_id);
                                
                                // Verifica se os wet tires estão desabilitados para esta etapa
                                const wetDisabled = stagesWithoutWet.has(demand.stage_id);
                                
                                // Criar um Map dos tires_by_model desta demand para lookup rápido
                                // Filtra os wet se estiverem desabilitados
                                const demandTiresMap = new Map<string, number>();
                                demand.tires_by_model?.forEach((tire: any) => {
                                  // Se wet estiver desabilitado E o modelo for wet, não adiciona
                                  if (wetDisabled && isWetModel(tire.model, demand)) {
                                    return; // Pula este modelo
                                  }
                                  demandTiresMap.set(tire.model, tire.qty);
                                });
                                
                                // Criar um Map dos pedidos desta etapa para lookup rápido
                                const orderedTiresMap = new Map<string, number>();
                                if (demand.ordered_tires) {
                                  demand.ordered_tires.forEach((tire: any) => {
                                    orderedTiresMap.set(tire.model, tire.qty || 0);
                                  });
                                }
                                
                              // Linha 1: Estoque Inicial
                              rows.push(
                                <tr key={`${demand.stage_id}-inicial`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                  <td className="px-1.5 py-2 text-[10px] text-gray-900" style={{ width: '10%' }}>
                                    <div className="break-words leading-tight">{demand.championship || 'N/A'}</div>
                                  </td>
                                  <td className="px-1.5 py-2 text-[10px] text-gray-900" style={{ width: '8%' }}>
                                    <div className="break-words leading-tight flex items-center gap-1">
                                      {demand.stage_name}
                                      {isInternational && (
                                        <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                                          INT
                                        </span>
                                      )}
                                      <button
                                        onClick={() => toggleWetTires(demand.stage_id)}
                                        className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                                        title={wetDisabled ? "Adicionar pneus de chuva" : "Remover pneus de chuva"}
                                      >
                                        {wetDisabled ? (
                                          <CloudRain size={12} style={{ color: '#10B981' }} />
                                        ) : (
                                          <CloudOff size={12} style={{ color: '#EF4444' }} />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-1.5 py-2 text-[10px] font-medium text-gray-700" style={{ width: '10%' }}>
                                    <div className="break-words leading-tight">Estoque inicial</div>
                                  </td>
                                  {allTireModels.map((tire, tireIdx: number) => {
                                    const stockQty = isInternational ? 0 : (accumulatedStock.get(tire.model) || 0);
                                    return (
                                      <td
                                        key={tireIdx}
                                        className="px-1 py-2 text-center text-[10px] font-semibold"
                                        style={{ color: '#6B7280' }}
                                      >
                                        {stockQty}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );

                              // Linha 2+: Todos os Pedidos desta etapa (somente via ordersPerStage — sem fallback de demand_calculations para evitar pedidos fantasma)
                              const ordersToRender = ordersPerStage.get(demand.stage_id) || [];

                              ordersToRender.forEach((order: any, orderIdx: number) => {
                                const ordConference = orderConferences.get(order.id);
                                const pedidoBackground = ordConference ? '#F3F4F6' : '#ECFDF5';
                                const pedidoColor = ordConference ? '#6B7280' : '#059669';

                                // Monta mapa de quantidades: usa tire_order_items se disponível, senão _legacyOrderedTires
                                const thisOrderedTiresMap = new Map<string, number>();
                                if (order.tire_order_items && order.tire_order_items.length > 0) {
                                  order.tire_order_items.forEach((item: any) => {
                                    if (item.model_code) {
                                      const cur = thisOrderedTiresMap.get(item.model_code) || 0;
                                      thisOrderedTiresMap.set(item.model_code, cur + (item.quantity_ordered || item.quantity_needed || 0));
                                    }
                                  });
                                } else if (order._legacyOrderedTires) {
                                  order._legacyOrderedTires.forEach((t: any) => {
                                    thisOrderedTiresMap.set(t.model, t.quantity || 0);
                                  });
                                }

                                const conferencedTiresMap = ordConference?.items_detail ? new Map<string, number>() : null;
                                if (ordConference?.items_detail) {
                                  ordConference.items_detail.forEach((item: any) => {
                                    conferencedTiresMap!.set(item.model_code, item.quantity_scanned || 0);
                                  });
                                }

                                rows.push(
                                  <tr key={`${demand.stage_id}-pedido-${order.id || orderIdx}`} style={{ borderBottom: '1px solid #F3F4F6', background: pedidoBackground }}>
                                    <td className="px-1.5 py-2 text-[10px] text-gray-900" style={{ width: '10%' }} />
                                    <td className="px-1.5 py-2 text-[10px] text-gray-900" style={{ width: '8%' }} />
                                    <td className="px-1.5 py-2 text-[10px] font-medium" style={{ color: pedidoColor, width: '10%' }}>
                                      <div className="break-words leading-tight flex items-center gap-1">
                                        <span>📦</span>
                                        <span>{order.order_name}</span>
                                        {ordConference && <span className="text-[8px]">(Conferido)</span>}
                                      </div>
                                    </td>
                                    {allTireModels.map((tire, tireIdx: number) => {
                                      const quantityOrdered = thisOrderedTiresMap.get(tire.model) || 0;
                                      const quantityConferenced = conferencedTiresMap?.get(tire.model) || 0;
                                      const cellBackground = quantityConferenced > 0 ? '#F3F4F6' : (quantityOrdered > 0 ? '#D1FAE5' : '#F3F4F6');
                                      const cellColor = quantityConferenced > 0 ? '#6B7280' : (quantityOrdered > 0 ? '#065F46' : '#9CA3AF');
                                      return (
                                        <td key={tireIdx} className="px-1 py-2 text-center text-[10px] font-bold" style={{ backgroundColor: cellBackground, color: cellColor }}>
                                          {quantityOrdered > 0 ? `+${quantityOrdered}` : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              });
                              
                              // 🆕 Linhas de Entrada de Estoque — uma por pedido conferido desta etapa
                              ordersToRender.forEach((order: any, orderIdx: number) => {
                                const ordConference = orderConferences.get(order.id);
                                if (!ordConference || !ordConference.items_detail) return;

                                const conferencedTiresMap = new Map<string, number>();
                                let totalConferenced = 0;
                                ordConference.items_detail.forEach((item: any) => {
                                  const qty = item.quantity_scanned || 0;
                                  conferencedTiresMap.set(item.model_code, qty);
                                  totalConferenced += qty;
                                });

                                const entradaBackground = totalConferenced > 0 ? '#ECFDF5' : '#F3F4F6';
                                const entradaColor = totalConferenced > 0 ? '#059669' : '#6B7280';

                                rows.push(
                                  <tr key={`${demand.stage_id}-entrada-${order.id || orderIdx}`} style={{ borderBottom: '1px solid #F3F4F6', background: entradaBackground }}>
                                    <td className="px-1.5 py-2 text-[10px] text-gray-900" style={{ width: '10%' }} />
                                    <td className="px-1.5 py-2 text-[10px] text-gray-900" style={{ width: '8%' }} />
                                    <td className="px-1.5 py-2 text-[10px] font-medium" style={{ color: entradaColor, width: '10%' }}>
                                      <div className="break-words leading-tight flex items-center gap-1">
                                        <span>{totalConferenced > 0 ? '✅' : '⚪'}</span>
                                        <span>Entrada de Estoque</span>
                                      </div>
                                    </td>
                                    {allTireModels.map((tire, tireIdx: number) => {
                                      const quantityConferenced = conferencedTiresMap.get(tire.model) || 0;
                                      return (
                                        <td key={tireIdx} className="px-1 py-2 text-center text-[10px] font-bold"
                                          style={{ backgroundColor: quantityConferenced > 0 ? '#D1FAE5' : '#F9FAFB', color: quantityConferenced > 0 ? '#065F46' : '#9CA3AF' }}>
                                          {quantityConferenced > 0 ? `+${quantityConferenced}` : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              });

                              // Linha 4: Consumo Previsto
                              const hasCustomPremissas = customPremissas.has(demand.stage_id);
                              rows.push(
                                <tr key={`${demand.stage_id}-consumo`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                  <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                  <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                  <td className="px-1.5 py-2 text-[10px] font-medium text-gray-700">
                                    <div className="break-words leading-tight flex items-center gap-1">
                                      <span>Consumo previsto</span>
                                      <button
                                        onClick={() => openEditPremissas(demand.stage_id)}
                                        className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                                        title="Editar premissas de cálculo"
                                      >
                                        <Settings size={12} style={{ color: hasCustomPremissas ? '#DC2626' : '#6B7280' }} />
                                      </button>
                                    </div>
                                  </td>
                                  {allTireModels.map((tire, tireIdx: number) => {
                                    const qty = demandTiresMap.get(tire.model) || 0;
                                    return (
                                      <td 
                                        key={tireIdx}
                                        className="px-1 py-2 text-center text-[10px] font-semibold"
                                        style={{ color: qty > 0 ? '#DC2626' : '#E5E7EB' }}
                                      >
                                        {qty > 0 ? `-${qty}` : '-'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );

                              // Linha 4: Estoque Final (com cor baseada no valor)
                              rows.push(
                                <tr 
                                  key={`${demand.stage_id}-final`} 
                                  style={{ 
                                    borderBottom: demandIdx < demandData.length - 1 ? '2px solid #E5E7EB' : 'none'
                                  }}
                                >
                                  <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                  <td className="px-1.5 py-2 text-[10px] text-gray-900"></td>
                                  <td className="px-1.5 py-2 text-[10px] font-medium text-gray-700">
                                    <div className="break-words leading-tight">Estoque final</div>
                                  </td>
                                  {allTireModels.map((tire, tireIdx: number) => {
                                    // Busca valores para o cálculo
                                    const estoqueInicial = isInternational ? 0 : (accumulatedStock.get(tire.model) || 0);
                                    const consumo = demandTiresMap.get(tire.model) || 0;

                                    // Calcula entrada somando todos os pedidos desta etapa
                                    let entrada = 0;
                                    if (!isInternational && ordersToRender.length > 0) {
                                      ordersToRender.forEach((order: any) => {
                                        const ordConf = orderConferences.get(order.id);
                                        // Monta mapa de quantidades deste pedido
                                        const thisMap = new Map<string, number>();
                                        if (order.tire_order_items?.length > 0) {
                                          order.tire_order_items.forEach((item: any) => {
                                            if (item.model_code) thisMap.set(item.model_code, (thisMap.get(item.model_code) || 0) + (item.quantity_ordered || item.quantity_needed || 0));
                                          });
                                        } else if (order._legacyOrderedTires) {
                                          order._legacyOrderedTires.forEach((t: any) => thisMap.set(t.model, t.qty || 0));
                                        }
                                        const quantityOrdered = thisMap.get(tire.model) || 0;
                                        if (ordConf?.items_detail) {
                                          const confMap = new Map<string, number>();
                                          ordConf.items_detail.forEach((item: any) => confMap.set(item.model_code, item.quantity_scanned || 0));
                                          const quantityConferenced = confMap.get(tire.model) || 0;
                                          entrada += quantityConferenced > 0 ? quantityConferenced : quantityOrdered;
                                        } else {
                                          entrada += quantityOrdered;
                                        }
                                      });
                                    } else if (!isInternational && demand.ordered_tires) {
                                      entrada = orderedTiresMap.get(tire.model) || 0;
                                    }

                                    // Fórmula: Estoque final = Estoque inicial + Entrada - Consumo
                                    const estoqueFinal = estoqueInicial + entrada - consumo;

                                    // Atualiza o estoque acumulado para a próxima etapa APENAS se NÃO for internacional
                                    if (!isInternational) {
                                      accumulatedStock.set(tire.model, estoqueFinal);
                                    }
                                    // Se for internacional, mantém o estoque acumulado inalterado para próxima etapa nacional
                                    
                                    // Define cor baseada no estoque final
                                    let backgroundColor = '#22C55E'; // Verde
                                    let textColor = '#FFFFFF';
                                    
                                    if (isInternational) {
                                      // Para etapas internacionais, usa cor azul para indicar que não afeta estoque
                                      backgroundColor = '#DBEAFE'; // Azul claro
                                      textColor = '#1E40AF'; // Azul escuro
                                    } else if (estoqueFinal < 0) {
                                      backgroundColor = '#EF4444'; // Vermelho
                                    } else if (estoqueFinal === 0) {
                                      backgroundColor = '#EAB308'; // Amarelo
                                    } else if (estoqueFinal < 100) {
                                      backgroundColor = '#EAB308'; // Amarelo
                                    }

                                    // Se não há consumo, usa cor neutra
                                    if (consumo === 0) {
                                      backgroundColor = '#F3F4F6';
                                      textColor = '#9CA3AF';
                                    }

                                    return (
                                      <td 
                                        key={tireIdx}
                                        className="px-1 py-2 text-center text-[10px] font-bold"
                                        style={{ 
                                          backgroundColor,
                                          color: textColor
                                        }}
                                      >
                                        {isInternational ? (consumo === 0 ? '-' : `-${consumo}`) : (consumo === 0 ? '-' : estoqueFinal)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );

                              return rows;
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Legenda */}
                      <div className="px-6 py-4 border-t" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                        <div className="flex items-center gap-6 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: '#22C55E' }}></div>
                            <span className="text-gray-600">Estoque suficiente (&gt;100)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: '#EAB308' }}></div>
                            <span className="text-gray-600">Estoque baixo (0-100)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: '#EF4444' }}></div>
                            <span className="text-gray-600">Estoque negativo (necessita compra)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: '#D1FAE5' }}></div>
                            <span className="text-gray-600">📦 Pedidos realizados</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: '#DBEAFE' }}></div>
                            <span className="text-gray-600">Etapa internacional</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de Edição de Premissas */}
      {editPremissasModal && selectedStageForEdit && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditPremissasModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ border: '1px solid #E5E7EB' }}
          >
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Editar Premissas de Cálculo
              </h3>
              <p className="text-sm text-gray-500">
                {selectedStageForEdit.name}
              </p>
            </div>

            {/* Informações da etapa */}
            <div className="mb-6 p-3 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Campeonato:</span>
                  <span className="font-medium text-gray-900">
                    {selectedStageForEdit.main_championship === 'preseason' ? 'Pré-Temporada' :
                     selectedStageForEdit.main_championship === 'sprint' ? 'Sprint' :
                     selectedStageForEdit.main_championship === 'endurance' ? 
                       (selectedStageForEdit.endurance_type === 'endurance_500' ? 'Endurance 500km' : 'Endurance 300km') : 
                     'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valores {customPremissas.has(selectedStageForEdit.id) ? 'customizados' : 'padrão'}:</span>
                  <span className="font-medium" style={{ color: customPremissas.has(selectedStageForEdit.id) ? '#DC2626' : '#059669' }}>
                    {customPremissas.has(selectedStageForEdit.id) ? 'Editado' : 'Padrão da temporada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jogos de Slick por Etapa
                </label>
                <input
                  type="number"
                  min="0"
                  value={editSlicks}
                  onChange={(e) => setEditSlicks(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: '#E5E7EB'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jogos de Chuva por Etapa
                </label>
                <input
                  type="number"
                  min="0"
                  value={editWets}
                  onChange={(e) => setEditWets(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: '#E5E7EB'
                  }}
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              {customPremissas.has(selectedStageForEdit.id) && (
                <button
                  onClick={() => restorePremissas(selectedStageForEdit.id)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  style={{ background: '#F3F4F6', color: '#374151' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                >
                  <RotateCcw size={14} />
                  Restaurar Padrão
                </button>
              )}
              <button
                onClick={() => setEditPremissasModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ background: '#F3F4F6', color: '#374151' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
              >
                Cancelar
              </button>
              <button
                onClick={() => saveCustomPremissas(selectedStageForEdit.id, editSlicks, editWets)}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors"
                style={{ background: '#DC2626' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Demanda;