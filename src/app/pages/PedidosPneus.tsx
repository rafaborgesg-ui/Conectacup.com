import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, TrendingUp, AlertCircle, ChevronDown, ChevronRight, Plus, Trash2, Save, FileDown, Send, Calendar, CheckSquare, Square, Edit, X, ClipboardCheck, History } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { TireStockEntry, type TireEntry } from '../components/TireStockEntry';
import { toast } from 'sonner';

interface Season {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface SeasonStage {
  id: string;
  season_id: string;
  name: string;
  track: string;
  start_date: string;
  main_championship: string;
  endurance_type?: string;
  include_trophy: boolean;
}

interface TireModel {
  id: string;
  code: string;
  name: string;
  type?: string;
  protheus_code?: string;
  price_by_year?: { year: number; price: number }[];
}

interface DemandCalculation {
  id: string;
  stage_id: string;
  total_tires: number;
  tires_by_model: { model: string; qty: number }[];
  exclude_wet_tires: boolean;
  categories: any[];
  wildcards?: number; // Adicionado para coringas
}

interface StockData {
  model: string;
  current_stock: number;
  total_demand: number;
  shortage: number;
  description: string;
  unit_price?: number;
}

interface PedidoItem {
  id: string;
  model_code: string;
  model_description: string;
  quantity_needed: number;
  quantity_ordered: number;
  unit_price: number;
  total_price: number;
  notes: string;
}

interface Pedido {
  id: string;
  season_id: string;
  season_name: string;
  order_name: string;
  created_at: string;
  status: 'draft' | 'sent' | 'approved' | 'received';
  total_items: number;
  total_quantity: number;
  total_value: number;
  items: PedidoItem[];
  created_by: string;
  notes: string;
  selected_stages?: string[];
}

export default function PedidosPneus() {
  const [activeTab, setActiveTab] = useState<'criar' | 'historico'>('criar');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [stages, setStages] = useState<SeasonStage[]>([]);
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [stockAnalysis, setStockAnalysis] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [pedidoItems, setPedidoItems] = useState<PedidoItem[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [pedidoName, setPedidoName] = useState('');
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [targetStageId, setTargetStageId] = useState<string>(''); // 🆕 Etapa de destino do pedido
  
  // Estados para fracionamento
  const [enableFractionation, setEnableFractionation] = useState(false);
  const [basePedidoName, setBasePedidoName] = useState('');
  const [numberOfFractions, setNumberOfFractions] = useState(2);
  const [fractionStages, setFractionStages] = useState<Map<number, Set<string>>>(new Map());
  const [fractionNames, setFractionNames] = useState<Map<number, string>>(new Map());
  const [fractionStockAnalysis, setFractionStockAnalysis] = useState<Map<number, StockData[]>>(new Map());
  const [fractionPedidoItems, setFractionPedidoItems] = useState<Map<number, PedidoItem[]>>(new Map());
  const [fractionNotes, setFractionNotes] = useState<Map<number, string>>(new Map());

  // Estado para modal de Conferência Física
  const [showConferenciaFisica, setShowConferenciaFisica] = useState(false);
  const [selectedPedidoForConferencia, setSelectedPedidoForConferencia] = useState<string | null>(null);
  const [conferenciaEntries, setConferenciaEntries] = useState<TireEntry[]>([]);
  
  // Estado para conferências salvas
  const [orderConferences, setOrderConferences] = useState<Map<string, any>>(new Map());
  const [orderConferencesHistory, setOrderConferencesHistory] = useState<Map<string, any[]>>(new Map());

  // 🆕 Estados para modal de resultado da conferência
  const [showConferenceResult, setShowConferenceResult] = useState(false);
  const [conferenceResultData, setConferenceResultData] = useState<any>(null);

  // 🆕 Estados para modal de histórico de conferências
  const [showConferenceHistory, setShowConferenceHistory] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<string | null>(null);

  // Função helper para obter o preço mais recente de um modelo
  const getMostRecentPrice = (priceByYear?: any): number => {
    console.log('🔍 getMostRecentPrice - Input:', priceByYear, 'Tipo:', typeof priceByYear);
    
    if (!priceByYear) {
      console.log('⚠️ price_by_year é null/undefined');
      return 0;
    }
    
    // Se for array
    if (Array.isArray(priceByYear)) {
      console.log('📋 price_by_year é um array:', priceByYear);
      if (priceByYear.length === 0) return 0;
      // Ordena por ano decrescente e pega o primeiro
      const sorted = [...priceByYear].sort((a, b) => b.year - a.year);
      console.log('✅ Preço encontrado (array):', sorted[0].price);
      return sorted[0].price || 0;
    }
    
    // Se for objeto
    if (typeof priceByYear === 'object') {
      console.log('📦 price_by_year é um objeto:', priceByYear);
      const keys = Object.keys(priceByYear);
      if (keys.length === 0) return 0;
      const mostRecentYear = keys.sort((a, b) => b.localeCompare(a))[0];
      console.log('✅ Preço encontrado (objeto):', priceByYear[mostRecentYear]);
      return priceByYear[mostRecentYear] || 0;
    }
    
    console.log('⚠️ Formato desconhecido');
    return 0;
  };

  // Função para obter o preço de um modelo pelo código
  const getPriceByModelCode = (modelCode: string): number => {
    console.log('💰 Buscando preço para modelo:', modelCode);
    const model = tireModels.find(m => m.code === modelCode);
    
    if (!model) {
      console.log('❌ Modelo não encontrado:', modelCode);
      return 0;
    }
    
    console.log('✅ Modelo encontrado:', model);
    console.log('📊 price_by_year do modelo:', model.price_by_year);
    
    if (!model.price_by_year) {
      console.log('⚠️ Modelo não tem price_by_year');
      return 0;
    }
    
    const price = getMostRecentPrice(model.price_by_year);
    console.log('💵 Preço final calculado:', price);
    return price;
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
    
    console.log(`🌍 Pedidos: ${stage.name} | Track: ${stage.track} | Internacional: ${isInternational}`);
    
    return isInternational;
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadSeasonStages();
    } else {
      setStages([]);
      setSelectedStages(new Set());
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    // Debounce para evitar múltiplas chamadas ao selecionar/desmarcar etapas rapidamente
    const timer = setTimeout(() => {
      if (selectedSeasonId && selectedStages.size > 0) {
        // Só recalcula se NÃO estiver editando um pedido existente
        if (!editingPedidoId) {
          loadStockAnalysis();
        }
      } else {
        setStockAnalysis([]);
        // Só limpa os itens se NÃO estiver editando
        if (!editingPedidoId) {
          setPedidoItems([]);
        }
      }
    }, 300); // Aguarda 300ms antes de recalcular

    return () => clearTimeout(timer);
  }, [selectedSeasonId, selectedStages, editingPedidoId]);

  useEffect(() => {
    if (enableFractionation) {
      initializeFractions(numberOfFractions);
    }
  }, [enableFractionation, numberOfFractions]);

  useEffect(() => {
    // Desabilita fracionamento se houver apenas 1 ou nenhuma etapa selecionada
    if (selectedStages.size <= 1) {
      setEnableFractionation(false);
    }
    
    // 🆕 Auto-seleciona etapa de destino se houver apenas uma etapa
    if (selectedStages.size === 1) {
      const onlyStageId = Array.from(selectedStages)[0];
      if (targetStageId !== onlyStageId) {
        setTargetStageId(onlyStageId);
      }
    } else if (selectedStages.size === 0) {
      setTargetStageId('');
    }
  }, [selectedStages]);

  useEffect(() => {
    // Carrega análises das frações quando o fracionamento está ativo
    if (enableFractionation && fractionStages.size > 0) {
      loadFractionAnalyses();
    }
  }, [enableFractionation, fractionStages, selectedSeasonId]);

  const loadFractionAnalyses = async () => {
    if (!selectedSeasonId) return;

    setLoadingAnalysis(true);
    const newFractionStockAnalysis = new Map<number, StockData[]>();
    const newFractionPedidoItems = new Map<number, PedidoItem[]>();

    try {
      for (let i = 0; i < numberOfFractions; i++) {
        const stageSet = fractionStages.get(i);
        if (stageSet && stageSet.size > 0) {
          const analysis = await calculateStockAnalysisForStages(stageSet);
          newFractionStockAnalysis.set(i, analysis);

          // Cria itens de pedido automáticos para esta fração
          const items: PedidoItem[] = analysis.map((item, idx) => ({
            id: `${i}-${idx}`,
            model_code: item.model_code,
            model_description: item.model_description,
            quantity_needed: item.shortage,
            quantity_ordered: item.shortage,
            unit_price: item.unit_price,
            total_price: item.shortage * item.unit_price,
            notes: '',
          }));
          newFractionPedidoItems.set(i, items);
        }
      }

      setFractionStockAnalysis(newFractionStockAnalysis);
      setFractionPedidoItems(newFractionPedidoItems);
    } catch (error) {
      console.error('❌ Erro ao carregar análises das frações:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Carrega temporadas
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });

      if (seasonsError) throw seasonsError;
      if (seasonsData) setSeasons(seasonsData);

      // Carrega modelos de pneus
      const { data: tiresData, error: tiresError } = await supabase
        .from('tire_models')
        .select('id, code, name, type, protheus_code, price_by_year')
        .order('code');

      if (tiresError) throw tiresError;
      if (tiresData) {
        console.log('🔧 Modelos de pneus carregados:', tiresData);
        console.log('📊 Primeiro modelo com price_by_year:', tiresData.find(t => t.price_by_year));
        setTireModels(tiresData);
      }

      // Carrega histórico de pedidos
      await loadPedidos();
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonStages = async () => {
    if (!selectedSeasonId) return;

    try {
      const supabase = createClient();

      const { data: stagesData, error: stagesError } = await supabase
        .from('season_stages')
        .select('*')
        .eq('season_id', selectedSeasonId)
        .order('start_date');

      if (stagesError) throw stagesError;
      
      if (stagesData && stagesData.length > 0) {
        setStages(stagesData);
        // Seleciona todas as etapas por padrão (mas só se NÃO estiver editando)
        if (!editingPedidoId) {
          const allStageIds = new Set(stagesData.map(s => s.id));
          setSelectedStages(allStageIds);
        }
      } else {
        setStages([]);
        setSelectedStages(new Set());
      }
    } catch (error) {
      console.error('❌ Erro ao carregar etapas:', error);
      setStages([]);
      setSelectedStages(new Set());
    }
  };

  // Função genérica para calcular análise de estoque para qualquer conjunto de etapas
  const calculateStockAnalysisForStages = async (stageIds: Set<string>): Promise<StockData[]> => {
    if (!selectedSeasonId || stageIds.size === 0) return [];

    try {
      const supabase = createClient();

      // Busca cálculos de demanda de TODAS as etapas da temporada
      const allStageIds = stages.map(s => s.id);
      
      const { data: allCalculations, error: calcError } = await supabase
        .from('demand_calculations')
        .select('*')
        .in('stage_id', allStageIds);

      if (calcError) throw calcError;
      if (!allCalculations || allCalculations.length === 0) return [];

      // Busca estoque inicial
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('model_name')
        .eq('status', 'Novo');

      if (stockError) throw stockError;

      // Agrupa estoque inicial por código do modelo
      const initialStockByCode = new Map<string, number>();
      stockData?.forEach((entry: any) => {
        const tireModel = tireModels.find(tm => tm.name === entry.model_name);
        if (tireModel) {
          const current = initialStockByCode.get(tireModel.code) || 0;
          initialStockByCode.set(tireModel.code, current + 1);
        }
      });

      // Ordena TODAS as etapas por data
      const allStagesSorted = stages
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      // Coleta TODOS os modelos únicos
      const allModelsMap = new Map<string, { code: string; description: string }>();
      allCalculations.forEach(calc => {
        calc.tires_by_model?.forEach((tire: any) => {
          if (!allModelsMap.has(tire.model)) {
            const tireModel = tireModels.find(tm => tm.code === tire.model);
            allModelsMap.set(tire.model, {
              code: tire.model,
              description: tireModel?.name || tire.model,
            });
          }
        });
      });

      // Processa TODAS as etapas em ordem para acumular o estoque corretamente
      const accumulatedStock = new Map<string, number>();
      
      // Inicializa estoque acumulado com estoque inicial
      allModelsMap.forEach((info, modelCode) => {
        accumulatedStock.set(modelCode, initialStockByCode.get(modelCode) || 0);
      });

      // Map para armazenar o estoque no início das etapas selecionadas
      const stockAtSelectedStages = new Map<string, number>();
      
      // Map para armazenar demanda total das etapas selecionadas
      const totalDemandByModel = new Map<string, number>();

      // Flag para saber se já encontramos a primeira etapa selecionada
      let firstSelectedStageFound = false;

      allStagesSorted.forEach((stage) => {
        const calc = allCalculations.find(c => c.stage_id === stage.id);
        if (!calc) return;

        const isInternational = isInternationalStage(stage.id);
        const isSelected = stageIds.has(stage.id);

        // Se for a primeira etapa selecionada, armazena o estoque disponível
        if (isSelected && !firstSelectedStageFound) {
          firstSelectedStageFound = true;
          allModelsMap.forEach((info, modelCode) => {
            const stockBefore = accumulatedStock.get(modelCode) || 0;
            stockAtSelectedStages.set(modelCode, stockBefore);
          });
        }

        // Processa a demanda desta etapa
        calc.tires_by_model?.forEach((tire: any) => {
          const model = tire.model;
          const demand = tire.qty;

          // Se for etapa selecionada, acumula na demanda total
          if (isSelected) {
            const currentTotal = totalDemandByModel.get(model) || 0;
            totalDemandByModel.set(model, currentTotal + demand);
          }

          // Estoque disponível no início desta etapa
          const stockAtStart = isInternational ? 0 : (accumulatedStock.get(model) || 0);

          // Atualiza estoque acumulado SEMPRE (para todas as etapas), mas apenas se não for internacional
          if (!isInternational) {
            const newStock = stockAtStart - demand;
            accumulatedStock.set(model, newStock);
          }
        });
      });

      // Cria análise usando o estoque correto
      const analysis: StockData[] = [];
      
      allModelsMap.forEach((info, modelCode) => {
        const stockAvailable = stockAtSelectedStages.get(modelCode) || 0;
        const totalDemand = totalDemandByModel.get(modelCode) || 0;
        const shortage = Math.max(0, totalDemand - stockAvailable);

        const tireModel = tireModels.find(tm => tm.code === modelCode);
        const unitPrice = getMostRecentPrice(tireModel?.price_by_year);
        
        console.log(`💰 Análise automática - Modelo: ${modelCode}, price_by_year:`, tireModel?.price_by_year, 'Preço calculado:', unitPrice);

        analysis.push({
          id: modelCode,
          model_code: modelCode,
          model_description: info.description,
          stock_available: stockAvailable,
          total_demand: totalDemand,
          shortage: shortage,
          unit_price: unitPrice,
        });
      });

      return analysis.filter(item => item.shortage > 0);
    } catch (error) {
      console.error('❌ Erro ao calcular análise:', error);
      return [];
    }
  };

  const loadStockAnalysis = async () => {
    if (!selectedSeasonId || selectedStages.size === 0) return;

    try {
      setLoadingAnalysis(true);
      const supabase = createClient();

      console.log('🔄 Pedidos: Iniciando cálculo de necessidade...');
      console.log('📋 Etapas selecionadas para o pedido:', Array.from(selectedStages));

      // Busca cálculos de demanda de TODAS as etapas da temporada (não apenas selecionadas)
      const allStageIds = stages.map(s => s.id);
      
      const { data: allCalculations, error: calcError } = await supabase
        .from('demand_calculations')
        .select('*')
        .in('stage_id', allStageIds);

      if (calcError) throw calcError;

      if (!allCalculations || allCalculations.length === 0) {
        console.log('⚠️ Nenhum cálculo encontrado. Salve os cálculos na página "Estoque vs. Demanda" primeiro.');
        setStockAnalysis([]);
        setPedidoItems([]);
        return;
      }

      console.log(`✅ ${allCalculations.length} cálculos encontrados (todas as etapas)`);

      // Busca estoque inicial
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('model_name')
        .eq('status', 'Novo');

      if (stockError) throw stockError;

      // Agrupa estoque inicial por código do modelo
      const initialStockByCode = new Map<string, number>();
      stockData?.forEach((entry: any) => {
        const tireModel = tireModels.find(tm => tm.name === entry.model_name);
        if (tireModel) {
          const current = initialStockByCode.get(tireModel.code) || 0;
          initialStockByCode.set(tireModel.code, current + 1);
        }
      });

      console.log('📊 Estoque inicial da temporada:', Object.fromEntries(initialStockByCode));

      // Ordena TODAS as etapas por data
      const allStagesSorted = stages
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      console.log('📅 Todas as etapas (ordenadas):', allStagesSorted.map(s => ({ 
        name: s.name, 
        date: s.start_date,
        selected: selectedStages.has(s.id)
      })));

      // Coleta TODOS os modelos únicos de TODAS as etapas
      const allModelsMap = new Map<string, { code: string; description: string }>();
      allCalculations.forEach(calc => {
        calc.tires_by_model?.forEach((tire: any) => {
          if (!allModelsMap.has(tire.model)) {
            const tireModel = tireModels.find(tm => tm.code === tire.model);
            allModelsMap.set(tire.model, {
              code: tire.model,
              description: tireModel?.name || tire.model,
            });
          }
        });
      });

      console.log('🔧 Modelos únicos encontrados:', Array.from(allModelsMap.keys()));

      // Processa TODAS as etapas em ordem para acumular o estoque corretamente
      const accumulatedStock = new Map<string, number>();
      
      // Inicializa estoque acumulado com estoque inicial
      allModelsMap.forEach((info, modelCode) => {
        accumulatedStock.set(modelCode, initialStockByCode.get(modelCode) || 0);
      });

      console.log('💾 Estoque acumulado inicial:', Object.fromEntries(accumulatedStock));

      // Map para armazenar o estoque no início das etapas selecionadas
      const stockAtSelectedStages = new Map<string, number>();
      
      // Map para armazenar demanda total das etapas selecionadas
      const totalDemandByModel = new Map<string, number>();

      // Flag para saber se já encontramos a primeira etapa selecionada
      let firstSelectedStageFound = false;

      allStagesSorted.forEach((stage, idx) => {
        const calc = allCalculations.find(c => c.stage_id === stage.id);
        if (!calc) return;

        const isInternational = isInternationalStage(stage.id);
        const isSelected = selectedStages.has(stage.id);
        
        console.log(`\n🏁 Etapa ${idx + 1}/${allStagesSorted.length}: ${stage.name} (${isInternational ? 'INTERNACIONAL' : 'NACIONAL'}) ${isSelected ? '✅ SELECIONADA' : '⚪ não selecionada'}`);

        // Se for a primeira etapa selecionada, armazena o estoque disponível
        if (isSelected && !firstSelectedStageFound) {
          firstSelectedStageFound = true;
          allModelsMap.forEach((info, modelCode) => {
            const stockBefore = accumulatedStock.get(modelCode) || 0;
            stockAtSelectedStages.set(modelCode, stockBefore);
          });
          console.log('📸 Snapshot do estoque no início das etapas selecionadas:', Object.fromEntries(stockAtSelectedStages));
        }

        // Processa a demanda desta etapa
        calc.tires_by_model?.forEach((tire: any) => {
          const model = tire.model;
          const demand = tire.qty;

          // Se for etapa selecionada, acumula na demanda total
          if (isSelected) {
            const currentTotal = totalDemandByModel.get(model) || 0;
            totalDemandByModel.set(model, currentTotal + demand);
            console.log(`  📊 ${model}: Demanda desta etapa: ${demand} | Total acumulado: ${currentTotal + demand}`);
          }

          // Estoque disponível no início desta etapa (para logging)
          const stockAtStart = isInternational ? 0 : (accumulatedStock.get(model) || 0);
          
          if (isSelected) {
            console.log(`  ✅ ${model}: Estoque no início: ${stockAtStart} | Demanda: ${demand}`);
          } else {
            console.log(`  ⚪ ${model}: Estoque no início: ${stockAtStart} | Demanda: ${demand} (não selecionada)`);
          }

          // Atualiza estoque acumulado SEMPRE (para todas as etapas), mas apenas se não for internacional
          if (!isInternational) {
            const newStock = stockAtStart - demand;
            accumulatedStock.set(model, newStock);
            console.log(`  💾 Novo estoque acumulado: ${newStock}`);
          }
        });
      });

      console.log('\n📊 RESUMO FINAL:');
      console.log('Estoque no início das etapas selecionadas:', Object.fromEntries(stockAtSelectedStages));
      console.log('Demanda total das etapas selecionadas:', Object.fromEntries(totalDemandByModel));

      // Cria análise usando o estoque correto (no momento das etapas selecionadas)
      const analysis: StockData[] = [];
      
      allModelsMap.forEach((info, modelCode) => {
        // 🔥 CORREÇÃO: Usa o estoque INICIAL REAL (pneus novos disponíveis)
        // O estoque atual não muda com base nas etapas selecionadas
        const currentStock = initialStockByCode.get(modelCode) || 0;
        const totalDemand = totalDemandByModel.get(modelCode) || 0;
        
        // CORRIGIDO: Calcula falta = max(0, demanda - estoque)
        const shortage = Math.max(0, totalDemand - currentStock);

        // Busca o preço do modelo
        const tireModel = tireModels.find(tm => tm.code === modelCode);
        const unitPrice = getMostRecentPrice(tireModel?.price_by_year);
        
        console.log(`💰 loadStockAnalysis - Modelo: ${modelCode}, price_by_year:`, tireModel?.price_by_year, 'Preço calculado:', unitPrice);

        // Só adiciona se houver demanda para este modelo nas etapas selecionadas
        if (totalDemand > 0) {
          analysis.push({
            model: modelCode,
            current_stock: currentStock,
            total_demand: totalDemand,
            shortage: shortage,
            description: info.description,
            unit_price: unitPrice,
          });

          console.log(`📦 ${modelCode}: Estoque REAL=${currentStock} | Demanda=${totalDemand} | Falta=${shortage}`);
        }
      });

      console.log('Necessidades de compra (calculadas corretamente):', Array.from(allModelsMap.keys()).map(code => ({
        code,
        estoque_real: initialStockByCode.get(code) || 0,
        demanda: totalDemandByModel.get(code) || 0,
        falta: Math.max(0, (totalDemandByModel.get(code) || 0) - (initialStockByCode.get(code) || 0))
      })));

      // Ordena: primeiro os que têm falta (maior falta primeiro), depois os que não têm
      analysis.sort((a, b) => {
        if (a.shortage > 0 && b.shortage === 0) return -1;
        if (a.shortage === 0 && b.shortage > 0) return 1;
        if (a.shortage > 0 && b.shortage > 0) return b.shortage - a.shortage;
        return 0;
      });

      console.log(`\n✅ Análise final: ${analysis.length} modelos`);
      setStockAnalysis(analysis);

      // Auto-preenche itens do pedido APENAS com os que têm falta
      const autoItems: PedidoItem[] = analysis
        .filter(item => item.shortage > 0)
        .map(item => ({
          id: crypto.randomUUID(),
          model_code: item.model,
          model_description: item.description,
          quantity_needed: item.shortage,
          quantity_ordered: item.shortage,
          unit_price: item.unit_price || 0,
          total_price: item.shortage * (item.unit_price || 0),
          notes: '',
        }));
      
      console.log(`📝 ${autoItems.length} itens adicionados ao pedido automaticamente`);
      setPedidoItems(autoItems);

    } catch (error) {
      console.error('❌ Erro ao carregar análise:', error);
      setStockAnalysis([]);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const loadPedidos = async () => {
    try {
      const supabase = createClient();
      
      console.log('📋 Carregando pedidos do Supabase...');
      
      // Busca pedidos do Supabase
      const { data: ordersData, error: ordersError } = await supabase
        .from('tire_orders')
        .select(`
          *,
          tire_order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('❌ Erro ao carregar pedidos:', ordersError);
        return;
      }

      console.log('📦 Pedidos carregados do banco:', ordersData);

      // Formata os dados para o formato esperado
      const formattedPedidos: Pedido[] = (ordersData || []).map(order => ({
        id: order.id,
        season_id: order.season_id,
        season_name: order.season_name,
        order_name: order.order_name,
        created_at: order.created_at,
        status: order.status,
        total_items: order.total_items,
        total_quantity: order.total_quantity,
        total_value: order.total_value,
        items: order.tire_order_items.map((item: any) => ({
          id: item.id,
          model_code: item.model_code,
          model_description: item.model_description,
          quantity_needed: item.quantity_needed,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes || ''
        })),
        created_by: order.created_by,
        notes: order.notes || '',
        selected_stages: order.selected_stages || []
      }));

      console.log('✅ Pedidos formatados:', formattedPedidos.length, 'pedidos');
      setPedidos(formattedPedidos);

      // Carrega conferências associadas aos pedidos
      if (formattedPedidos.length > 0) {
        const orderIds = formattedPedidos.map(p => p.id);
        console.log('🔍 Buscando conferências para pedidos:', orderIds);
        const { data: conferencesData, error: conferencesError } = await supabase
          .from('order_conferences')
          .select('*')
          .in('order_id', orderIds)
          .order('conference_date', { ascending: false });

        if (conferencesError) {
          console.error('❌ Erro ao carregar conferências:', conferencesError);
        } else if (conferencesData) {
          console.log('✅ Conferências carregadas:', conferencesData.length, conferencesData);
          
          // Map com a conferência mais recente (para exibição primária)
          const conferencesMap = new Map<string, any>();
          
          // Map com TODAS as conferências de cada pedido (histórico completo)
          const conferencesHistoryMap = new Map<string, any[]>();
          
          conferencesData.forEach(conf => {
            // Conferência mais recente
            if (!conferencesMap.has(conf.order_id)) {
              conferencesMap.set(conf.order_id, conf);
            }
            
            // Histórico completo
            if (!conferencesHistoryMap.has(conf.order_id)) {
              conferencesHistoryMap.set(conf.order_id, []);
            }
            conferencesHistoryMap.get(conf.order_id)!.push(conf);
          });
          
          console.log('📊 Map de conferências (mais recente):', Object.fromEntries(conferencesMap));
          console.log('📚 Histórico completo de conferências:', Object.fromEntries(conferencesHistoryMap));
          
          setOrderConferences(conferencesMap);
          setOrderConferencesHistory(conferencesHistoryMap);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
    }
  };

  const deletePedido = async (pedidoId: string, pedidoName: string) => {
    const confirmDelete = window.confirm(
      `⚠️ Tem certeza que deseja excluir o pedido "${pedidoName}"?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmDelete) return;

    try {
      const supabase = createClient();

      console.log('🗑️ Iniciando exclusão do pedido:', pedidoId);

      // PRIMEIRO: Verifica se o pedido existe
      const { data: existingOrder, error: checkError } = await supabase
        .from('tire_orders')
        .select('*')
        .eq('id', pedidoId)
        .single();

      if (checkError || !existingOrder) {
        console.error('❌ Pedido não encontrado no banco:', checkError);
        toast.error('Pedido não encontrado', {
          description: 'O pedido não existe no banco de dados'
        });
        return;
      }

      console.log('✅ Pedido encontrado no banco:', existingOrder);

      // Deleta os itens primeiro
      const { error: itemsError, count: deletedItemsCount } = await supabase
        .from('tire_order_items')
        .delete({ count: 'exact' })
        .eq('order_id', pedidoId);

      if (itemsError) {
        console.error('❌ Erro ao excluir itens do pedido:', itemsError);
        toast.error('Erro ao excluir itens do pedido', {
          description: itemsError.message
        });
        throw itemsError;
      }

      console.log('✅ Itens do pedido excluídos:', deletedItemsCount || 0, 'itens');

      // Deleta o pedido
      const { error: orderError, count: deletedOrderCount } = await supabase
        .from('tire_orders')
        .delete({ count: 'exact' })
        .eq('id', pedidoId);

      if (orderError) {
        console.error('❌ Erro ao excluir pedido:', orderError);
        toast.error('Erro ao excluir pedido', {
          description: orderError.message
        });
        throw orderError;
      }

      console.log('✅ Pedido excluído do banco. Registros deletados:', deletedOrderCount);

      // Verifica se realmente foi excluído
      if (deletedOrderCount === 0) {
        console.warn('⚠️ Nenhum registro foi excluído. Possível problema de RLS.');
        toast.warning('Possível problema de permissão', {
          description: 'O pedido pode não ter sido excluído. Verifique as políticas RLS no Supabase.'
        });
      }

      // Limpa os dados do pedido da tabela demand_calculations
      console.log('🧹 Limpando dados do pedido de demand_calculations...');
      const { error: cleanupError } = await supabase
        .from('demand_calculations')
        .update({
          ordered_tires: null,
          order_name: null,
          order_id: null,
          order_date: null
        })
        .eq('order_id', pedidoId);

      if (cleanupError) {
        console.warn('⚠️ Erro ao limpar demand_calculations:', cleanupError);
      } else {
        console.log('✅ Dados do pedido removidos de demand_calculations');
      }

      // Atualiza o estado local removendo o pedido
      setPedidos(prev => prev.filter(p => p.id !== pedidoId));

      toast.success('Pedido excluído com sucesso!', {
        description: `${pedidoName} foi removido do sistema`
      });
    } catch (error: any) {
      console.error('❌ Erro ao excluir pedido:', error);
      toast.error('Erro ao excluir pedido', {
        description: error.message || 'Verifique o console para mais detalhes'
      });
    }
  };

  const editPedido = async (pedido: Pedido) => {
    try {
      console.log('📝 Carregando pedido para edição:', pedido);
      
      // Marca que estamos editando este pedido ANTES de qualquer outra alteração
      setEditingPedidoId(pedido.id);
      
      // Preenche o formulário com os dados do pedido (exceto season_id que vem depois)
      setPedidoName(pedido.order_name || '');
      setNotes(pedido.notes || '');
      
      // Aguarda o carregamento das etapas da temporada
      const supabase = createClient();
      const { data: stagesData } = await supabase
        .from('season_stages')
        .select('*')
        .eq('season_id', pedido.season_id)
        .order('start_date', { ascending: true });
      
      if (stagesData) {
        setStages(stagesData);
      }
      
      // Carrega as etapas selecionadas
      if (pedido.selected_stages && pedido.selected_stages.length > 0) {
        setSelectedStages(new Set(pedido.selected_stages));
      }
      
      // Busca a etapa de destino do pedido em demand_calculations
      const { data: demandData } = await supabase
        .from('demand_calculations')
        .select('stage_id')
        .eq('order_id', pedido.id)
        .limit(1)
        .single();
      
      if (demandData?.stage_id) {
        console.log('📍 Etapa de destino carregada:', demandData.stage_id);
        setTargetStageId(demandData.stage_id);
      } else {
        console.log('ℹ️ Pedido não possui etapa de destino definida');
        setTargetStageId('');
      }
      
      // Agora define a temporada (já que as etapas já foram definidas manualmente)
      setSelectedSeasonId(pedido.season_id);
      
      // Carrega os itens do pedido no estado
      const itemsArray: PedidoItem[] = pedido.items.map(item => ({
        id: item.id,
        model_code: item.model_code,
        model_description: item.model_description,
        quantity_needed: item.quantity_needed,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes || ''
      }));
      setPedidoItems(itemsArray);

      // Volta para a aba "Criar Pedido"
      setActiveTab('criar');

      // Scroll para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });

      console.log('✅ Pedido carregado com sucesso para edição');
      alert(`📝 Pedido "${pedido.season_name}" carregado para edição.\n\n✏️ Ajuste os itens e clique em "Salvar Alterações" ou "Enviar Alterações".`);
    } catch (error) {
      console.error('❌ Erro ao carregar pedido para edição:', error);
      alert('❌ Erro ao carregar pedido. Tente novamente.');
    }
  };

  const toggleStage = (stageId: string) => {
    setSelectedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const selectAllStages = () => {
    const allStageIds = new Set(stages.map(s => s.id));
    setSelectedStages(allStageIds);
  };

  const deselectAllStages = () => {
    setSelectedStages(new Set());
  };

  // Funções para fracionamento
  const initializeFractions = (count: number) => {
    const newFractionStages = new Map<number, Set<string>>();
    const newFractionNames = new Map<number, string>();
    
    for (let i = 0; i < count; i++) {
      newFractionStages.set(i, new Set());
      newFractionNames.set(i, `Fração ${i + 1}`);
    }
    
    setFractionStages(newFractionStages);
    setFractionNames(newFractionNames);
  };

  const toggleFractionStage = (fractionIndex: number, stageId: string) => {
    setFractionStages(prev => {
      const newMap = new Map(prev);
      const stageSet = new Set(newMap.get(fractionIndex) || new Set());
      
      if (stageSet.has(stageId)) {
        stageSet.delete(stageId);
      } else {
        // Remove a etapa de outras frações
        newMap.forEach((stages, idx) => {
          if (idx !== fractionIndex && stages.has(stageId)) {
            stages.delete(stageId);
          }
        });
        stageSet.add(stageId);
      }
      
      newMap.set(fractionIndex, stageSet);
      return newMap;
    });
  };

  const updateFractionName = (fractionIndex: number, name: string) => {
    setFractionNames(prev => {
      const newMap = new Map(prev);
      newMap.set(fractionIndex, name);
      return newMap;
    });
  };

  const handleFinalizarConferencia = async () => {
    if (!selectedPedidoForConferencia) {
      alert('❌ Nenhum pedido selecionado para conferência');
      return;
    }

    try {
      console.log('✅ Iniciando finalização da conferência física...');
      console.log('📦 Pedido ID:', selectedPedidoForConferencia);
      console.log('📋 Entradas lidas:', conferenciaEntries);

      // Busca o pedido selecionado
      const pedido = pedidos.find(p => p.id === selectedPedidoForConferencia);
      if (!pedido) {
        alert('❌ Pedido não encontrado');
        return;
      }

      // Agrupa as entradas lidas por modelo
      const leiturasPorModelo = new Map<string, number>();
      conferenciaEntries.forEach(entry => {
        const modelCode = tireModels.find(tm => tm.name === entry.model)?.code || entry.model;
        const current = leiturasPorModelo.get(modelCode) || 0;
        leiturasPorModelo.set(modelCode, current + 1);
      });

      console.log('📊 Leituras por modelo:', Object.fromEntries(leiturasPorModelo));

      // Valida divergências comparando com o pedido
      const divergencias: { modelo: string; pedido: number; lido: number }[] = [];
      pedido.items.forEach(item => {
        const qtdLida = leiturasPorModelo.get(item.model_code) || 0;
        const qtdPedida = item.quantity_ordered;

        if (qtdLida !== qtdPedida) {
          divergencias.push({
            modelo: `${item.model_code} - ${item.model_description}`,
            pedido: qtdPedida,
            lido: qtdLida
          });
        }
      });

      // Se houver divergências, mostra alerta
      if (divergencias.length > 0) {
        const mensagemDivergencia = [
          '⚠️ DIVERGÊNCIAS ENCONTRADAS NA CONFERÊNCIA',
          '',
          ...divergencias.map(d => 
            `• ${d.modelo}\n  Pedido: ${d.pedido} pneus | Lido: ${d.lido} pneus | Diferença: ${d.lido - d.pedido >= 0 ? '+' : ''}${d.lido - d.pedido}`
          ),
          '',
          'Deseja continuar mesmo assim?'
        ].join('\n');

        const continuar = window.confirm(mensagemDivergencia);
        if (!continuar) {
          return;
        }
      }

      // Salva as entradas no Supabase
      const supabase = createClient();
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      console.log('🔍 Modelos de pneus disponíveis:', tireModels.map(tm => ({ id: tm.id, name: tm.name, code: tm.code, type: tm.type })));

      for (const entry of conferenciaEntries) {
        console.log('🔍 Processando entrada:', { 
          barcode: entry.barcode, 
          model: entry.model, 
          modelId: entry.modelId,
          container: entry.container,
          containerId: entry.containerId
        });

        // Busca o modelo pelo ID (mais confiável que pelo nome)
        const model = tireModels.find(tm => tm.id === entry.modelId);
        if (!model) {
          console.error('❌ Modelo não encontrado pelo ID:', entry.modelId, '- Tentando pelo nome:', entry.model);
          errors.push(`${entry.barcode}: Modelo não encontrado`);
          errorCount++;
          continue;
        }

        if (!model.type) {
          console.error('❌ Modelo sem tipo definido:', model);
          errors.push(`${entry.barcode}: Modelo sem tipo`);
          errorCount++;
          continue;
        }

        const stockEntry = {
          id: entry.id,
          barcode: entry.barcode,
          model_id: model.id,
          model_name: model.name,
          model_type: model.type as 'Slick' | 'Wet',
          container_id: entry.containerId,
          container_name: entry.container,
          created_at: entry.timestamp.toISOString(),
          status: 'Novo' as const,
        };

        console.log('💾 Salvando entrada:', stockEntry);

        const { error } = await supabase
          .from('stock_entries')
          .insert(stockEntry);

        if (error) {
          console.error('❌ Erro ao salvar entrada:', error);
          errors.push(`${entry.barcode}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          console.log('✅ Entrada salva com sucesso:', entry.barcode);
        }
      }

      console.log(`✅ Conferência finalizada: ${successCount} pneus salvos, ${errorCount} erros`);
      
      if (errors.length > 0) {
        console.error('❌ Erros detalhados:', errors);
      }

      // 🆕 Obtém dados do usuário atual
      const userStr = localStorage.getItem('porsche-cup-user');
      let currentUser = null;
      if (userStr) {
        try {
          currentUser = JSON.parse(userStr);
        } catch (e) {
          console.error('Erro ao parsear dados do usuário:', e);
        }
      }

      // 💾 Salva o registro da conferência no Supabase
      console.log('💾 Salvando registro da conferência...');
      const conferenceDate = new Date();
      const conferenciaRecord = {
        order_id: selectedPedidoForConferencia,
        conference_date: conferenceDate.toISOString(),
        total_items_expected: pedido.items.reduce((sum, item) => sum + item.quantity_ordered, 0),
        total_items_scanned: conferenciaEntries.length,
        has_divergences: divergencias.length > 0,
        divergences: divergencias.map(d => ({
          model: d.modelo,
          expected: d.pedido,
          scanned: d.lido,
          difference: d.lido - d.pedido
        })),
        items_detail: pedido.items.map(item => ({
          model_code: item.model_code,
          model_description: item.model_description,
          quantity_ordered: item.quantity_ordered,
          quantity_scanned: leiturasPorModelo.get(item.model_code) || 0
        })),
        success_count: successCount,
        error_count: errorCount,
        errors: errors,
        performed_by_id: currentUser?.id || null,
        performed_by_name: currentUser?.name || 'Usuário desconhecido'
      };

      const { error: conferenceError } = await supabase
        .from('order_conferences')
        .insert(conferenciaRecord);

      if (conferenceError) {
        console.error('❌ Erro ao salvar registro da conferência:', conferenceError);
        // Não bloqueia o fluxo, apenas registra o erro
      } else {
        console.log('✅ Registro da conferência salvo com sucesso');
      }

      // Atualiza o status do pedido para 'received' se não houver erros
      if (errorCount === 0) {
        const { error: updateError } = await supabase
          .from('tire_orders')
          .update({ status: 'received' })
          .eq('id', selectedPedidoForConferencia);

        if (updateError) {
          console.error('❌ Erro ao atualizar status do pedido:', updateError);
        } else {
          console.log('✅ Status do pedido atualizado para "received"');
          // Recarrega a lista de pedidos
          await loadPedidos();
        }
      }

      // 🆕 Prepara dados para o modal de resultado
      const resultData = {
        pedido,
        conferenceDate,
        performedByName: currentUser?.name || 'Usuário desconhecido',
        totalExpected: pedido.items.reduce((sum, item) => sum + item.quantity_ordered, 0),
        totalScanned: conferenciaEntries.length,
        divergencias,
        itemsDetail: pedido.items.map(item => ({
          model_code: item.model_code,
          model_description: item.model_description,
          quantity_ordered: item.quantity_ordered,
          quantity_scanned: leiturasPorModelo.get(item.model_code) || 0,
          difference: (leiturasPorModelo.get(item.model_code) || 0) - item.quantity_ordered
        })),
        successCount,
        errorCount,
        errors
      };

      // Fecha o modal de conferência
      setShowConferenciaFisica(false);
      setSelectedPedidoForConferencia(null);
      setConferenciaEntries([]);

      // 🆕 Abre o modal de resultado
      setConferenceResultData(resultData);
      setShowConferenceResult(true);

    } catch (error) {
      console.error('❌ Erro ao finalizar conferência:', error);
      alert('❌ Erro ao finalizar conferência. Verifique o console.');
    }
  };

  const getStageLabel = (stage: SeasonStage) => {
    let championship = '';
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
    return `${stage.name} (${championship})`;
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setPedidoItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, quantity);
        return {
          ...item,
          quantity_ordered: newQty,
          total_price: newQty * item.unit_price,
        };
      }
      return item;
    }));
  };

  // Função removida - o preço agora é automático baseado no modelo
  // const updateItemPrice = (itemId: string, price: number) => {
  //   setPedidoItems(prev => prev.map(item => {
  //     if (item.id === itemId) {
  //       const newPrice = Math.max(0, price);
  //       return {
  //         ...item,
  //         unit_price: newPrice,
  //         total_price: item.quantity_ordered * newPrice,
  //       };
  //     }
  //     return item;
  //   }));
  // };

  const updateItemNotes = (itemId: string, notes: string) => {
    setPedidoItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const updateItemModel = (itemId: string, modelCode: string) => {
    const model = tireModels.find(tm => tm.code === modelCode);
    const price = getPriceByModelCode(modelCode);
    
    setPedidoItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newItem = { 
          ...item, 
          model_code: modelCode, 
          model_description: model?.name || '',
          unit_price: price,
          total_price: price * item.quantity_ordered
        };
        return newItem;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setPedidoItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addCustomItem = () => {
    const newItem: PedidoItem = {
      id: crypto.randomUUID(),
      model_code: '',
      model_description: '',
      quantity_needed: 0,
      quantity_ordered: 0,
      unit_price: 0,
      total_price: 0,
      notes: '',
    };
    setPedidoItems(prev => [...prev, newItem]);
  };

  // Funções para gerenciar itens de frações
  const updateFractionItemQuantity = (fractionIndex: number, itemId: string, quantity: number) => {
    setFractionPedidoItems(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(fractionIndex) || [];
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(0, quantity);
          return {
            ...item,
            quantity_ordered: newQty,
            total_price: newQty * item.unit_price,
          };
        }
        return item;
      });
      newMap.set(fractionIndex, updatedItems);
      return newMap;
    });
  };

  const updateFractionItemPrice = (fractionIndex: number, itemId: string, price: number) => {
    setFractionPedidoItems(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(fractionIndex) || [];
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const newPrice = Math.max(0, price);
          return {
            ...item,
            unit_price: newPrice,
            total_price: item.quantity_ordered * newPrice,
          };
        }
        return item;
      });
      newMap.set(fractionIndex, updatedItems);
      return newMap;
    });
  };

  const updateFractionItemNotes = (fractionIndex: number, itemId: string, notes: string) => {
    setFractionPedidoItems(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(fractionIndex) || [];
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, notes } : item
      );
      newMap.set(fractionIndex, updatedItems);
      return newMap;
    });
  };

  const removeFractionItem = (fractionIndex: number, itemId: string) => {
    setFractionPedidoItems(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(fractionIndex) || [];
      newMap.set(fractionIndex, items.filter(item => item.id !== itemId));
      return newMap;
    });
  };

  const addFractionCustomItem = (fractionIndex: number) => {
    const newItem: PedidoItem = {
      id: crypto.randomUUID(),
      model_code: '',
      model_description: '',
      quantity_needed: 0,
      quantity_ordered: 0,
      unit_price: 0,
      total_price: 0,
      notes: '',
    };
    setFractionPedidoItems(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(fractionIndex) || [];
      newMap.set(fractionIndex, [...items, newItem]);
      return newMap;
    });
  };

  const updateFractionItemModel = (fractionIndex: number, itemId: string, modelCode: string) => {
    const model = tireModels.find(tm => tm.code === modelCode);
    setFractionPedidoItems(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(fractionIndex) || [];
      const updatedItems = items.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              model_code: modelCode, 
              model_description: model?.name || '',
              unit_price: getMostRecentPrice(model?.price_by_year) || item.unit_price,
              total_price: item.quantity_ordered * (getMostRecentPrice(model?.price_by_year) || item.unit_price)
            }
          : item
      );
      newMap.set(fractionIndex, updatedItems);
      return newMap;
    });
  };

  const addWildcardsToFraction = async (fractionIndex: number) => {
    try {
      const supabase = createClient();
      const fractionStageSet = fractionStages.get(fractionIndex);
      
      if (!fractionStageSet || fractionStageSet.size === 0) {
        alert('Selecione etapas para esta fração antes de adicionar coringas');
        return;
      }
      
      console.log(`🃏 Calculando coringas para a fração ${fractionIndex + 1}...`);
      
      // Busca as regras de coringas do sistema
      const { data: rulesData, error: rulesError } = await supabase
        .from('business_rules')
        .select('*')
        .ilike('rule_type', 'coringa');
      
      if (rulesError) throw rulesError;
      
      const wildcardRules = rulesData && rulesData.length > 0 ? rulesData : [
        { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
        { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
        { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
        { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
        { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 8 },
      ];
      
      // Identifica os tipos de campeonatos únicos nas etapas da fração
      const selectedStagesList = stages.filter(s => fractionStageSet.has(s.id));
      const championshipTypes = new Set<string>();
      
      selectedStagesList.forEach(stage => {
        const mainChamp = stage.main_championship?.toLowerCase();
        if (mainChamp === 'sprint') {
          championshipTypes.add('Sprint');
          if (stage.include_trophy) championshipTypes.add('Trophy');
        } else if (mainChamp === 'endurance') {
          championshipTypes.add('Endurance');
          if (stage.include_trophy) championshipTypes.add('Trophy');
        }
      });
      
      if (championshipTypes.size === 0) {
        alert('Nenhum campeonato identificado nas etapas desta fração');
        return;
      }
      
      // Busca categorias únicas das etapas da fração
      const { data: calculations, error: calcError } = await supabase
        .from('demand_calculations')
        .select('categories')
        .in('stage_id', Array.from(fractionStageSet));
      
      if (calcError) throw calcError;
      
      if (!calculations || calculations.length === 0) {
        alert('Nenhum cálculo de demanda encontrado. Salve os cálculos na página "Estoque vs. Demanda" primeiro.');
        return;
      }
      
      // Coleta todas as categorias únicas
      const allCategories = new Set<string>();
      calculations.forEach((calc) => {
        if (calc.categories && Array.isArray(calc.categories)) {
          calc.categories.forEach((cat: any) => {
            if (cat.category_name) allCategories.add(cat.category_name);
          });
        }
      });
      
      // Função para determinar os modelos de pneu por categoria
      const getTireModelsForCategory = (categoria: string): { front: string; rear: string } | null => {
        if (categoria === 'Carrera') {
          return { front: 'Slick 992 Dianteiro', rear: 'Slick 992 Traseiro' };
        } else if (categoria === 'Challenge' || categoria === 'Trophy') {
          return { front: 'Slick 991 Dianteiro', rear: 'Slick 991 Traseiro' };
        }
        return null;
      };
      
      // Calcula coringas por categoria
      const wildcardsByCategory = new Map<string, number>();
      let totalWildcards = 0;
      
      championshipTypes.forEach(championship => {
        allCategories.forEach(categoria => {
          const rule = wildcardRules.find(r => {
            if (r.categoria !== categoria) return false;
            if (r.campeonato === championship) return true;
            if (championship === 'Endurance' && r.campeonato?.toLowerCase().includes('endurance')) return true;
            return false;
          });
          
          if (rule) {
            const current = wildcardsByCategory.get(categoria) || 0;
            wildcardsByCategory.set(categoria, current + rule.quantidade);
            totalWildcards += rule.quantidade;
          }
        });
      });
      
      if (totalWildcards === 0) {
        alert('Nenhum coringa configurado para as categorias e campeonatos das etapas desta fração');
        return;
      }
      
      // Remove coringas existentes desta fração
      setFractionPedidoItems(prev => {
        const newMap = new Map(prev);
        const items = newMap.get(fractionIndex) || [];
        const filtered = items.filter(item => {
          const notes = item.notes?.toLowerCase() || '';
          return !notes.includes('coringa');
        });
        newMap.set(fractionIndex, filtered);
        return newMap;
      });
      
      // Cria itens separados por categoria
      const wildcardItems: PedidoItem[] = [];
      const alertDetails: string[] = [];
      
      wildcardsByCategory.forEach((totalQty, categoria) => {
        const models = getTireModelsForCategory(categoria);
        if (!models) return;
        
        const frontQty = Math.ceil(totalQty / 2);
        const rearQty = totalQty - frontQty;
        
        const frontModel = tireModels.find(tm => tm.name === models.front);
        const rearModel = tireModels.find(tm => tm.name === models.rear);
        
        if (!frontModel || !rearModel) return;
        
        const frontPrice = getPriceByModelCode(frontModel.code);
        const rearPrice = getPriceByModelCode(rearModel.code);
        
        wildcardItems.push({
          id: crypto.randomUUID(),
          model_code: frontModel.code,
          model_description: frontModel.name,
          quantity_needed: frontQty,
          quantity_ordered: frontQty,
          unit_price: frontPrice,
          total_price: frontPrice * frontQty,
          notes: `Coringas ${categoria} - Dianteiros (50%)`,
        });
        
        wildcardItems.push({
          id: crypto.randomUUID(),
          model_code: rearModel.code,
          model_description: rearModel.name,
          quantity_needed: rearQty,
          quantity_ordered: rearQty,
          unit_price: rearPrice,
          total_price: rearPrice * rearQty,
          notes: `Coringas ${categoria} - Traseiros (50%)`,
        });
        
        alertDetails.push(`• ${categoria}: ${totalQty} pneus (${frontQty} diant. + ${rearQty} tras.)`);
      });
      
      setFractionPedidoItems(prev => {
        const newMap = new Map(prev);
        const items = newMap.get(fractionIndex) || [];
        newMap.set(fractionIndex, [...items, ...wildcardItems]);
        return newMap;
      });
      
      if (wildcardItems.length === 0) {
        alert('Não foi possível adicionar coringas. Verifique se os modelos de pneus estão cadastrados.');
        return;
      }
      
      const fractionName = fractionNames.get(fractionIndex) || `Fração ${fractionIndex + 1}`;
      const alertMessage = [
        `Coringas adicionados à ${fractionName}!`,
        '',
        'Detalhamento por categoria:',
        ...alertDetails,
        '',
        '─────────────────────',
        `Total: ${totalWildcards} pneus`,
      ].join('\n');
      
      alert(alertMessage);

    } catch (error) {
      console.error('❌ Erro ao calcular coringas:', error);
      alert('Erro ao calcular coringas');
    }
  };


  const addWildcards = async () => {
    try {
      const supabase = createClient();
      
      console.log('🃏 Calculando coringas para as etapas selecionadas...');
      
      // Busca as regras de coringas do sistema
      const { data: rulesData, error: rulesError } = await supabase
        .from('business_rules')
        .select('*')
        .ilike('rule_type', 'coringa'); // Case-insensitive
      
      if (rulesError) throw rulesError;
      
      // Se não houver regras, usa valores padrão
      const wildcardRules = rulesData && rulesData.length > 0 ? rulesData : [
        { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
        { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
        { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
        { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
        { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 8 },
      ];
      
      console.log('📋 Regras de coringas:', wildcardRules);
      
      // Identifica os tipos de campeonatos únicos nas etapas selecionadas
      const selectedStagesList = stages.filter(s => selectedStages.has(s.id));
      console.log('📋 Etapas selecionadas:', selectedStagesList.map(s => ({
        id: s.id,
        name: s.name,
        main_championship: s.main_championship,
        include_trophy: s.include_trophy
      })));
      
      const championshipTypes = new Set<string>();
      
      selectedStagesList.forEach(stage => {
        const mainChamp = stage.main_championship?.toLowerCase();
        console.log(`  🔍 Etapa ${stage.name}: main_championship="${mainChamp}", include_trophy=${stage.include_trophy}`);
        
        if (mainChamp === 'sprint') {
          championshipTypes.add('Sprint');
          if (stage.include_trophy) {
            championshipTypes.add('Trophy');
          }
        } else if (mainChamp === 'endurance') {
          championshipTypes.add('Endurance');
          if (stage.include_trophy) {
            championshipTypes.add('Trophy');
          }
        }
      });
      
      console.log('🏆 Campeonatos únicos encontrados:', Array.from(championshipTypes));
      
      if (championshipTypes.size === 0) {
        alert('Nenhum campeonato identificado nas etapas selecionadas');
        return;
      }
      
      // Busca categorias únicas das etapas selecionadas
      const { data: calculations, error: calcError } = await supabase
        .from('demand_calculations')
        .select('categories')
        .in('stage_id', Array.from(selectedStages));
      
      if (calcError) throw calcError;
      
      console.log('🔍 Cálculos retornados:', calculations);
      
      if (!calculations || calculations.length === 0) {
        alert('Nenhum cálculo de demanda encontrado. Salve os cálculos na página "Estoque vs. Demanda" primeiro.');
        return;
      }
      
      // Coleta todas as categorias únicas
      const allCategories = new Set<string>();
      calculations.forEach((calc, idx) => {
        console.log(`📄 Cálculo ${idx + 1}:`, calc);
        if (calc.categories && Array.isArray(calc.categories)) {
          console.log(`  ✅ Categories é array com ${calc.categories.length} itens:`, calc.categories);
          calc.categories.forEach((cat: any) => {
            console.log(`    🔍 Processando categoria:`, cat);
            if (cat.category_name) {
              allCategories.add(cat.category_name);
              console.log(`    ✅ Categoria adicionada: ${cat.category_name}`);
            } else {
              console.log(`    ⚠️ Categoria sem campo 'category_name':`, Object.keys(cat));
            }
          });
        } else {
          console.log(`  ⚠️ Categories não é array ou está vazio:`, typeof calc.categories, calc.categories);
        }
      });
      
      console.log('🏁 Categorias únicas encontradas:', Array.from(allCategories));
      
      // Função para determinar os modelos de pneu por categoria
      const getTireModelsForCategory = (categoria: string): { front: string; rear: string } | null => {
        if (categoria === 'Carrera') {
          return {
            front: 'Slick 992 Dianteiro',
            rear: 'Slick 992 Traseiro',
          };
        } else if (categoria === 'Challenge' || categoria === 'Trophy') {
          return {
            front: 'Slick 991 Dianteiro',
            rear: 'Slick 991 Traseiro',
          };
        }
        return null;
      };
      
      // Calcula coringas por categoria
      const wildcardsByCategory = new Map<string, number>();
      let totalWildcards = 0;
      
      championshipTypes.forEach(championship => {
        allCategories.forEach(categoria => {
          // Busca regras que correspondam ao campeonato
          // Para Endurance, aceita "Endurance 300km" ou "Endurance 500km"
          const rule = wildcardRules.find(r => {
            if (r.categoria !== categoria) return false;
            
            // Match exato ou normalizado
            if (r.campeonato === championship) return true;
            
            // Se o championship for "Endurance", aceita qualquer variação de Endurance
            if (championship === 'Endurance' && r.campeonato?.toLowerCase().includes('endurance')) return true;
            
            return false;
          });
          
          if (rule) {
            const current = wildcardsByCategory.get(categoria) || 0;
            wildcardsByCategory.set(categoria, current + rule.quantidade);
            totalWildcards += rule.quantidade;
            console.log(`  ✅ ${categoria} - ${championship} (matched: ${rule.campeonato}): ${rule.quantidade} coringas`);
          } else {
            console.log(`  ⚠️ ${categoria} - ${championship}: Nenhuma regra encontrada`);
          }
        });
      });
      
      console.log(`🃏 Total de coringas: ${totalWildcards}`);
      console.log('📊 Coringas por categoria:', Object.fromEntries(wildcardsByCategory));
      
      if (totalWildcards === 0) {
        alert('Nenhum coringa configurado para as categorias e campeonatos das etapas selecionadas');
        return;
      }
      
      // Remove coringas existentes
      setPedidoItems(prev => prev.filter(item => {
        const notes = item.notes?.toLowerCase() || '';
        return !notes.includes('coringa');
      }));
      

      
      // Cria itens separados por categoria
      const wildcardItems: PedidoItem[] = [];
      const alertDetails: string[] = [];
      
      wildcardsByCategory.forEach((totalQty, categoria) => {
        const models = getTireModelsForCategory(categoria);
        
        if (!models) {
          console.warn(`⚠️ Modelos não encontrados para categoria: ${categoria}`);
          return;
        }
        
        const frontQty = Math.ceil(totalQty / 2);
        const rearQty = totalQty - frontQty;
        
        const frontModel = tireModels.find(tm => tm.name === models.front);
        const rearModel = tireModels.find(tm => tm.name === models.rear);
        
        if (!frontModel || !rearModel) {
          console.warn(`⚠️ Modelos não encontrados no cadastro: ${models.front} ou ${models.rear}`);
          return;
        }
        
        const frontPrice = getPriceByModelCode(frontModel.code);
        const rearPrice = getPriceByModelCode(rearModel.code);
        
        wildcardItems.push({
          id: crypto.randomUUID(),
          model_code: frontModel.code,
          model_description: frontModel.name,
          quantity_needed: frontQty,
          quantity_ordered: frontQty,
          unit_price: frontPrice,
          total_price: frontPrice * frontQty,
          notes: `Coringas ${categoria} - Dianteiros (50%)`,
        });
        
        wildcardItems.push({
          id: crypto.randomUUID(),
          model_code: rearModel.code,
          model_description: rearModel.name,
          quantity_needed: rearQty,
          quantity_ordered: rearQty,
          unit_price: rearPrice,
          total_price: rearPrice * rearQty,
          notes: `Coringas ${categoria} - Traseiros (50%)`,
        });
        
        alertDetails.push(`• ${categoria}: ${totalQty} pneus (${frontQty} diant. + ${rearQty} tras.)`);
        console.log(`✅ ${categoria}: ${frontQty}x ${frontModel.name} + ${rearQty}x ${rearModel.name}`);
      });
      
      setPedidoItems(prev => [...prev, ...wildcardItems]);
      
      if (wildcardItems.length === 0) {
        alert('Não foi possível adicionar coringas. Verifique se os modelos de pneus estão cadastrados.');
        return;
      }
      
      const alertMessage = [
        'Coringas adicionados com sucesso!',
        '',
        'Detalhamento por categoria:',
        ...alertDetails,
        '',
        '─────────────────────',
        `Total: ${totalWildcards} pneus`,
      ].join('\n');
      
      alert(alertMessage);

    } catch (error) {
      console.error('❌ Erro ao calcular coringas:', error);
      alert('Erro ao calcular coringas');
    }
  };

  const calculateTotals = () => {
    const totalQuantity = pedidoItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalValue = pedidoItems.reduce((sum, item) => sum + item.total_price, 0);
    return { totalQuantity, totalValue };
  };

  const saveDraft = async () => {
    try {
      setIsSaving(true);
      
      // Validações
      if (!selectedSeasonId) {
        alert('Selecione uma temporada');
        return;
      }
      
      if (!pedidoName?.trim()) {
        alert('Informe o nome do pedido');
        return;
      }

      if (!enableFractionation && !targetStageId && selectedStages.size > 0) {
        alert('Selecione a etapa de destino do pedido');
        return;
      }
      
      if (pedidoItems.length === 0) {
        alert('Adicione ao menos um item ao pedido');
        return;
      }

      const supabase = createClient();
      
      // Busca o nome da temporada
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('name, year')
        .eq('id', selectedSeasonId)
        .single();
      
      const seasonName = seasonData ? `${seasonData.name} ${seasonData.year}` : 'Temporada';

      // Busca o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Usuário não autenticado');
        return;
      }

      const { totalQuantity, totalValue } = calculateTotals();

      let pedidoId: string;

      if (editingPedidoId) {
        // MODO EDIÇÃO: Atualiza pedido existente
        
        // Primeiro, limpa os dados antigos do pedido em demand_calculations
        console.log('🧹 Limpando dados antigos do pedido em demand_calculations...');
        await supabase
          .from('demand_calculations')
          .update({
            ordered_tires: null,
            order_name: null,
            order_id: null,
            order_date: null
          })
          .eq('order_id', editingPedidoId);
        
        const { error: pedidoError } = await supabase
          .from('tire_orders')
          .update({
            season_id: selectedSeasonId,
            season_name: seasonName,
            order_name: pedidoName,
            status: 'draft',
            total_items: pedidoItems.length,
            total_quantity: totalQuantity,
            total_value: totalValue,
            notes: notes,
            selected_stages: Array.from(selectedStages)
          })
          .eq('id', editingPedidoId);

        if (pedidoError) {
          console.error('❌ Erro ao atualizar pedido:', pedidoError);
          alert('Erro ao atualizar pedido: ' + pedidoError.message);
          return;
        }

        // Deleta itens antigos
        await supabase
          .from('tire_order_items')
          .delete()
          .eq('order_id', editingPedidoId);

        pedidoId = editingPedidoId;

      } else {
        // MODO CRIAÇÃO: Insere novo pedido
        const { data: pedido, error: pedidoError } = await supabase
          .from('tire_orders')
          .insert({
            season_id: selectedSeasonId,
            season_name: seasonName,
            order_name: pedidoName,
            status: 'draft',
            total_items: pedidoItems.length,
            total_quantity: totalQuantity,
            total_value: totalValue,
            notes: notes,
            created_by: user.id,
            selected_stages: Array.from(selectedStages)
          })
          .select()
          .single();

        if (pedidoError) {
          console.error('❌ Erro ao salvar pedido:', pedidoError);
          alert('Erro ao salvar pedido: ' + pedidoError.message);
          return;
        }

        pedidoId = pedido.id;
      }

      // Salva os itens do pedido
      const itemsToInsert = pedidoItems.map(item => ({
        order_id: pedidoId,
        model_code: item.model_code,
        model_description: item.model_description,
        quantity_needed: item.quantity_needed,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('tire_order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('❌ Erro ao salvar itens:', itemsError);
        alert('Erro ao salvar itens do pedido: ' + itemsError.message);
        return;
      }

      // 🆕 Atualiza a tabela demand_calculations com informações do pedido (mesmo em rascunho)
      if (targetStageId) {
        try {
          console.log('📦 Atualizando demand_calculations para rascunho...');
          console.log('📦 Etapa de destino:', targetStageId);
          console.log('📦 Nome do pedido:', pedidoName);
          console.log('📦 ID do pedido:', pedidoId);
          console.log('📦 Modo edição:', !!editingPedidoId);
          
          // Agrupa quantidades pedidas por modelo
          const ordersByModel = new Map<string, number>();
          pedidoItems.forEach(item => {
            const current = ordersByModel.get(item.model_code) || 0;
            ordersByModel.set(item.model_code, current + item.quantity_ordered);
          });

          // Converte para array de objetos
          const orderedTires = Array.from(ordersByModel.entries()).map(([model, qty]) => ({
            model,
            qty
          }));
          
          console.log('📦 Pneus pedidos:', orderedTires);

          // Busca informações da etapa de destino
          const { data: targetStage } = await supabase
            .from('season_stages')
            .select('id, name, start_date')
            .eq('id', targetStageId)
            .single();

          if (targetStage) {
            console.log('📦 Etapa de destino encontrada:', targetStage.name);
            
            // Atualiza o registro da etapa com informações do pedido
            const { error: updateError } = await supabase
              .from('demand_calculations')
              .update({
                ordered_tires: orderedTires,
                order_name: pedidoName,
                order_id: pedidoId,
                order_date: new Date().toISOString()
              })
              .eq('stage_id', targetStage.id);

            if (updateError) {
              console.warn('⚠️ Não foi possível atualizar demand_calculations:', updateError);
            } else {
              console.log(`✅ Pedido \"${pedidoName}\" registrado em demand_calculations para etapa: ${targetStage.name}`);
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao atualizar demand_calculations:', error);
          // Não bloqueia o fluxo principal
        }
      }

      alert(editingPedidoId ? '✅ Pedido atualizado com sucesso!' : '✅ Rascunho salvo com sucesso!');
      
      // Limpa o formulário
      setPedidoName('');
      setPedidoItems([]);
      setNotes('');
      setSelectedStages(new Set());
      setTargetStageId('');
      setEditingPedidoId(null);
      
      // Recarrega histórico
      loadPedidos();
      
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert('Erro ao salvar rascunho');
    } finally {
      setIsSaving(false);
    }
  };

  const sendOrder = async () => {
    try {
      setIsSaving(true);
      
      // Validações
      if (!selectedSeasonId) {
        alert('Selecione uma temporada');
        return;
      }
      
      if (!pedidoName?.trim()) {
        alert('Informe o nome do pedido');
        return;
      }

      if (!enableFractionation && !targetStageId && selectedStages.size > 0) {
        alert('Selecione a etapa de destino do pedido');
        return;
      }
      
      if (pedidoItems.length === 0) {
        alert('Adicione ao menos um item ao pedido');
        return;
      }

      const supabase = createClient();
      
      // Busca o nome da temporada
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('name, year')
        .eq('id', selectedSeasonId)
        .single();
      
      const seasonName = seasonData ? `${seasonData.name} ${seasonData.year}` : 'Temporada';

      // Busca o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Usuário não autenticado');
        return;
      }

      const { totalQuantity, totalValue } = calculateTotals();

      let pedidoId: string;

      if (editingPedidoId) {
        // MODO EDIÇÃO: Atualiza pedido existente
        const { error: pedidoError } = await supabase
          .from('tire_orders')
          .update({
            season_id: selectedSeasonId,
            season_name: seasonName,
            order_name: pedidoName,
            status: 'sent',
            total_items: pedidoItems.length,
            total_quantity: totalQuantity,
            total_value: totalValue,
            notes: notes,
            selected_stages: Array.from(selectedStages),
            sent_at: new Date().toISOString()
          })
          .eq('id', editingPedidoId);

        if (pedidoError) {
          console.error('❌ Erro ao atualizar pedido:', pedidoError);
          alert('Erro ao atualizar pedido: ' + pedidoError.message);
          return;
        }

        // Deleta itens antigos
        await supabase
          .from('tire_order_items')
          .delete()
          .eq('order_id', editingPedidoId);

        pedidoId = editingPedidoId;

      } else {
        // MODO CRIAÇÃO: Insere novo pedido
        const { data: pedido, error: pedidoError } = await supabase
          .from('tire_orders')
          .insert({
            season_id: selectedSeasonId,
            season_name: seasonName,
            order_name: pedidoName,
            status: 'sent',
            total_items: pedidoItems.length,
            total_quantity: totalQuantity,
            total_value: totalValue,
            notes: notes,
            created_by: user.id,
            selected_stages: Array.from(selectedStages),
            sent_at: new Date().toISOString()
          })
          .select()
          .single();

        if (pedidoError) {
          console.error('❌ Erro ao enviar pedido:', pedidoError);
          alert('Erro ao enviar pedido: ' + pedidoError.message);
          return;
        }

        pedidoId = pedido.id;
      }

      // Salva os itens do pedido
      const itemsToInsert = pedidoItems.map(item => ({
        order_id: pedidoId,
        model_code: item.model_code,
        model_description: item.model_description,
        quantity_needed: item.quantity_needed,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('tire_order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('❌ Erro ao salvar itens:', itemsError);
        alert('Erro ao salvar itens do pedido: ' + itemsError.message);
        return;
      }

      // 🆕 Atualiza a tabela demand_calculations com informações do pedido
      if (targetStageId) {
        try {
          console.log('📦 Iniciando registro do pedido em demand_calculations...');
          console.log('📦 Etapa de destino:', targetStageId);
          console.log('📦 Nome do pedido:', pedidoName);
          console.log('📦 ID do pedido:', pedidoId);
          console.log('📦 Modo edição:', !!editingPedidoId);
          
          // Agrupa quantidades pedidas por modelo
          const ordersByModel = new Map<string, number>();
          pedidoItems.forEach(item => {
            const current = ordersByModel.get(item.model_code) || 0;
            ordersByModel.set(item.model_code, current + item.quantity_ordered);
          });

          // Converte para array de objetos
          const orderedTires = Array.from(ordersByModel.entries()).map(([model, qty]) => ({
            model,
            qty
          }));
          
          console.log('📦 Pneus pedidos:', orderedTires);

          // Busca informações da etapa de destino
          const { data: targetStage, error: stageError } = await supabase
            .from('season_stages')
            .select('id, name, start_date')
            .eq('id', targetStageId)
            .single();

          if (stageError) {
            console.error('❌ Erro ao buscar etapa de destino:', stageError);
          }

          if (targetStage) {
            console.log('📦 Etapa de destino encontrada:', targetStage.name);
            
            // Atualiza o registro da etapa com informações do pedido
            const { error: updateError } = await supabase
              .from('demand_calculations')
              .update({
                ordered_tires: orderedTires,
                order_name: pedidoName,
                order_id: pedidoId,
                order_date: new Date().toISOString()
              })
              .eq('stage_id', targetStage.id);

            if (updateError) {
              console.warn('⚠️ Não foi possível atualizar demand_calculations:', updateError);
              console.warn('⚠️ Erro detalhado:', JSON.stringify(updateError, null, 2));
            } else {
              console.log(`✅ Pedido "${pedidoName}" registrado em demand_calculations para etapa: ${targetStage.name}`);
            }
          } else {
            console.warn('⚠️ Etapa de destino não encontrada');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao atualizar demand_calculations:', error);
          // Não bloqueia o fluxo principal
        }
      } else {
        if (!targetStageId) {
          console.log('ℹ️ Nenhuma etapa de destino selecionada - não atualiza demand_calculations');
        }
      }

      alert(editingPedidoId ? '✅ Alterações enviadas com sucesso!' : '✅ Pedido enviado com sucesso!');
      
      // Limpa o formulário
      setPedidoName('');
      setPedidoItems([]);
      setNotes('');
      setSelectedStages(new Set());
      setTargetStageId('');
      setEditingPedidoId(null);
      
      // Recarrega histórico e muda para aba de histórico
      loadPedidos();
      setActiveTab('historico');
      
    } catch (error) {
      console.error('❌ Erro ao enviar:', error);
      alert('Erro ao enviar pedido');
    } finally {
      setIsSaving(false);
    }
  };

  const saveFractions = async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      // Validações
      if (!selectedSeasonId) {
        alert('Selecione uma temporada');
        return;
      }

      if (!basePedidoName.trim()) {
        alert('Digite o nome base do pedido');
        return;
      }

      // Busca informações da temporada
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('name, year')
        .eq('id', selectedSeasonId)
        .single();
      
      const seasonName = seasonData ? `${seasonData.name} ${seasonData.year}` : 'Temporada';

      // Busca o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Usuário não autenticado');
        return;
      }

      const savedOrders: string[] = [];
      const failedOrders: string[] = [];

      // Salva cada fração como um pedido independente
      for (let i = 0; i < numberOfFractions; i++) {
        const fractionName = fractionNames.get(i) || `Fração ${i + 1}`;
        const fractionItems = fractionPedidoItems.get(i) || [];
        const fractionStageSet = fractionStages.get(i) || new Set();

        if (fractionItems.length === 0) {
          failedOrders.push(`${fractionName}: Nenhum item`);
          continue;
        }

        if (fractionStageSet.size === 0) {
          failedOrders.push(`${fractionName}: Nenhuma etapa atribuída`);
          continue;
        }

        // Valida se todos os itens têm modelo selecionado
        const invalidItems = fractionItems.filter(item => !item.model_code);
        if (invalidItems.length > 0) {
          failedOrders.push(`${fractionName}: ${invalidItems.length} item(ns) sem modelo`);
          continue;
        }

        // Calcula totais da fração
        const totalQuantity = fractionItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
        const totalValue = fractionItems.reduce((sum, item) => sum + item.total_price, 0);

        try {
          // Salva o pedido com status "draft"
          const { data: pedido, error: pedidoError } = await supabase
            .from('tire_orders')
            .insert({
              season_id: selectedSeasonId,
              season_name: seasonName,
              order_name: fractionName,
              status: 'draft',
              total_items: fractionItems.length,
              total_quantity: totalQuantity,
              total_value: totalValue,
              notes: `Pedido fracionado - Base: ${basePedidoName}`,
              created_by: user.id,
              selected_stages: Array.from(fractionStageSet)
            })
            .select()
            .single();

          if (pedidoError) {
            console.error(`❌ Erro ao salvar ${fractionName}:`, pedidoError);
            failedOrders.push(`${fractionName}: ${pedidoError.message}`);
            continue;
          }

          // Salva os itens do pedido
          const itemsToInsert = fractionItems.map(item => ({
            order_id: pedido.id,
            model_code: item.model_code,
            model_description: item.model_description,
            quantity_needed: item.quantity_needed,
            quantity_ordered: item.quantity_ordered,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.notes
          }));

          const { error: itemsError } = await supabase
            .from('tire_order_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error(`❌ Erro ao salvar itens de ${fractionName}:`, itemsError);
            failedOrders.push(`${fractionName}: Erro ao salvar itens`);
            continue;
          }

          // 🆕 Atualiza demand_calculations para frações
          if (fractionStageSet.size > 0) {
            try {
              const ordersByModel = new Map<string, number>();
              fractionItems.forEach(item => {
                const current = ordersByModel.get(item.model_code) || 0;
                ordersByModel.set(item.model_code, current + item.quantity_ordered);
              });

              const orderedTires = Array.from(ordersByModel.entries()).map(([model, qty]) => ({
                model,
                qty
              }));

              const stageIds = Array.from(fractionStageSet);
              const { data: firstStage } = await supabase
                .from('season_stages')
                .select('id, name, start_date')
                .in('id', stageIds)
                .order('start_date', { ascending: true })
                .limit(1)
                .single();

              if (firstStage) {
                await supabase
                  .from('demand_calculations')
                  .update({
                    ordered_tires: orderedTires,
                    order_name: fractionName,
                    order_id: pedido.id,
                    order_date: new Date().toISOString()
                  })
                  .eq('stage_id', firstStage.id);
                
                console.log(`✅ Pedido ${fractionName} registrado em demand_calculations`);
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao atualizar demand_calculations para ${fractionName}:`, error);
            }
          }

          savedOrders.push(fractionName);
          console.log(`✅ ${fractionName} salvo com sucesso!`);

        } catch (error) {
          console.error(`❌ Erro ao processar ${fractionName}:`, error);
          failedOrders.push(`${fractionName}: Erro inesperado`);
        }
      }

      // Exibe resultado
      if (savedOrders.length > 0 && failedOrders.length === 0) {
        alert(`✅ ${savedOrders.length} pedido(s) salvos com sucesso!\n\n${savedOrders.join('\n')}`);
        
        // Limpa o formulário
        setBasePedidoName('');
        setNumberOfFractions(2);
        setFractionNames(new Map());
        setFractionStages(new Map());
        setFractionPedidoItems(new Map());
        setSelectedStages(new Set());
        
        // Recarrega histórico
        loadPedidos();
        
      } else if (savedOrders.length > 0 && failedOrders.length > 0) {
        alert(
          `⚠️ Alguns pedidos foram salvos:\n\n` +
          `✅ Salvos (${savedOrders.length}):\n${savedOrders.join('\n')}\n\n` +
          `❌ Falharam (${failedOrders.length}):\n${failedOrders.join('\n')}`
        );
        loadPedidos();
      } else {
        alert(`❌ Nenhum pedido foi salvo:\n\n${failedOrders.join('\n')}`);
      }

    } catch (error) {
      console.error('❌ Erro ao salvar frações:', error);
      alert('Erro ao salvar pedidos fracionados');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePedidoExpanded = (pedidoId: string) => {
    setExpandedPedidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pedidoId)) {
        newSet.delete(pedidoId);
      } else {
        newSet.add(pedidoId);
      }
      return newSet;
    });
  };

  const { totalQuantity, totalValue } = calculateTotals();

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      {/* Tabs */}
      <div className="border-b" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('criar')}
              className="flex items-center gap-2 px-4 py-4 border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'criar' ? '#DC2626' : 'transparent',
                color: activeTab === 'criar' ? '#DC2626' : '#6B7280',
              }}
            >
              <ShoppingCart size={20} />
              <span className="font-semibold">Criar Pedido</span>
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className="flex items-center gap-2 px-4 py-4 border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'historico' ? '#DC2626' : 'transparent',
                color: activeTab === 'historico' ? '#DC2626' : '#6B7280',
              }}
            >
              <Package size={20} />
              <span className="font-semibold">Histórico de Pedidos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'criar' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#DC2626' }}
                >
                  <ShoppingCart size={24} style={{ color: '#FFFFFF' }} />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedidos de Pneus</h1>
                  <p className="text-sm text-gray-500 mb-4">
                    Crie pedidos de pneus baseado na análise de demanda vs. estoque por etapas selecionadas
                  </p>
                  
                  {/* Card Informativo sobre cálculo automático */}
                  <div className="p-4 rounded-lg" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} style={{ color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
                      <div className="text-sm" style={{ color: '#1E40AF' }}>
                        <strong>Cálculo Automático:</strong> Esta página busca os cálculos de demanda já salvos na página "Estoque vs. Demanda". 
                        Se você alterou as quantidades de carros ou etapas, lembre-se de salvar os cálculos lá primeiro.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seletor de Temporada */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Temporada
                </label>
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
              </div>
            </div>

            {/* Seletor de Etapas */}
            {selectedSeasonId && stages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar size={20} style={{ color: '#DC2626' }} />
                    <h2 className="text-lg font-semibold text-gray-900">Etapas da Temporada</h2>
                    <span className="text-sm text-gray-500">
                      ({selectedStages.size} de {stages.length} selecionadas)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllStages}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ background: '#F3F4F6', color: '#374151' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    >
                      Selecionar Todas
                    </button>
                    <button
                      onClick={deselectAllStages}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ background: '#F3F4F6', color: '#374151' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    >
                      Desmarcar Todas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stages.map(stage => {
                    const isSelected = selectedStages.has(stage.id);
                    return (
                      <button
                        key={stage.id}
                        onClick={() => toggleStage(stage.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
                        style={{
                          borderColor: isSelected ? '#DC2626' : '#E5E7EB',
                          background: isSelected ? '#FEF2F2' : '#FFFFFF',
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare size={20} style={{ color: '#DC2626', flexShrink: 0 }} />
                        ) : (
                          <Square size={20} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {stage.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {new Date(stage.start_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Opção de Fracionamento */}
                {selectedStages.size > 1 && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => setEnableFractionation(!enableFractionation)}
                        className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all w-full"
                        style={{
                          borderColor: enableFractionation ? '#DC2626' : '#E5E7EB',
                          background: enableFractionation ? '#FEF2F2' : '#FFFFFF',
                        }}
                      >
                        {enableFractionation ? (
                          <CheckSquare size={20} style={{ color: '#DC2626' }} />
                        ) : (
                          <Square size={20} style={{ color: '#9CA3AF' }} />
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-gray-900">Fracionar Pedido</div>
                          <div className="text-xs text-gray-500">
                            Dividir as etapas em múltiplos pedidos independentes
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Configuração de Fracionamento */}
                    {enableFractionation && (
                      <div className="space-y-4">
                        {/* Número de Frações */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Número de Frações
                          </label>
                          <select
                            value={numberOfFractions}
                            onChange={(e) => setNumberOfFractions(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500"
                            style={{ borderColor: '#D1D5DB' }}
                          >
                            {[2, 3, 4, 5].map(num => (
                              <option key={num} value={num}>
                                {num} frações
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Distribuição de Etapas por Fração */}
                        <div className="space-y-3">
                          {Array.from({ length: numberOfFractions }, (_, i) => {
                            const fractionStageSet = fractionStages.get(i) || new Set();
                            const fractionName = fractionNames.get(i) || `Fração ${i + 1}`;
                            
                            return (
                              <div
                                key={i}
                                className="p-4 rounded-lg border"
                                style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                                    style={{ background: '#DC2626' }}
                                  >
                                    {i + 1}
                                  </div>
                                  <input
                                    type="text"
                                    value={fractionName}
                                    onChange={(e) => updateFractionName(i, e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                                    style={{ borderColor: '#D1D5DB' }}
                                    placeholder={`Nome da fração ${i + 1}`}
                                  />
                                  <span className="text-xs text-gray-500">
                                    {fractionStageSet.size} {fractionStageSet.size === 1 ? 'etapa' : 'etapas'}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2">
                                  {stages.filter(s => selectedStages.has(s.id)).map(stage => {
                                    const isInFraction = fractionStageSet.has(stage.id);
                                    
                                    return (
                                      <button
                                        key={stage.id}
                                        onClick={() => toggleFractionStage(i, stage.id)}
                                        className="flex items-center gap-2 p-2 rounded-lg border transition-all text-left"
                                        style={{
                                          borderColor: isInFraction ? '#DC2626' : '#E5E7EB',
                                          background: isInFraction ? '#FEF2F2' : '#FFFFFF',
                                        }}
                                      >
                                        {isInFraction ? (
                                          <CheckSquare size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                                        ) : (
                                          <Square size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium text-gray-900 truncate">
                                            {stage.name}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Validação de Fracionamento */}
                        {(() => {
                          const totalAssigned = Array.from(fractionStages.values()).reduce(
                            (sum, stages) => sum + stages.size,
                            0
                          );
                          const hasUnassigned = totalAssigned < selectedStages.size;
                          
                          if (hasUnassigned) {
                            return (
                              <div className="p-3 rounded-lg flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                                <div className="text-xs" style={{ color: '#DC2626' }}>
                                  <strong>Atenção:</strong> Todas as etapas selecionadas devem ser atribuídas a uma fração.
                                  Faltam {selectedStages.size - totalAssigned} etapa(s).
                                </div>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Análise de Necessidade */}
            {selectedSeasonId && selectedStages.size > 0 && !loadingAnalysis && stockAnalysis.length > 0 && !enableFractionation && (
              <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp size={20} style={{ color: '#DC2626' }} />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Análise de Necessidade ({selectedStages.size} {selectedStages.size === 1 ? 'etapa' : 'etapas'})
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ background: '#FEF2F2', borderLeft: '4px solid #DC2626' }}>
                    <div className="text-sm text-gray-600 mb-1">Modelos em Falta</div>
                    <div className="text-2xl font-bold" style={{ color: '#DC2626' }}>
                      {stockAnalysis.filter(item => item.shortage > 0).length}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B' }}>
                    <div className="text-sm text-gray-600 mb-1">Pneus Necessários</div>
                    <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                      {stockAnalysis.reduce((sum, item) => sum + item.shortage, 0)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: '#F0FDF4', borderLeft: '4px solid #10B981' }}>
                    <div className="text-sm text-gray-600 mb-1">Estoque Atual Total</div>
                    <div className="text-2xl font-bold" style={{ color: '#10B981' }}>
                      {stockAnalysis.reduce((sum, item) => sum + item.current_stock, 0)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Modelo</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estoque Atual</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Demanda</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Falta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockAnalysis.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{item.model}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">{item.current_stock}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">{item.total_demand}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                              {item.shortage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Loading Analysis */}
            {loadingAnalysis && (
              <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center" style={{ borderColor: '#E5E7EB', minHeight: '200px' }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#DC2626' }}></div>
                  <p className="text-sm text-gray-500">Calculando necessidade...</p>
                </div>
              </div>
            )}

            {/* Formulário do Pedido */}
            {selectedSeasonId && selectedStages.size > 0 && pedidoItems.length > 0 && !loadingAnalysis && !enableFractionation && (
              <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                {/* Banner de Modo Edição */}
                {editingPedidoId && (
                  <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ background: '#DBEAFE', border: '1px solid #3B82F6' }}>
                    <Edit size={20} style={{ color: '#1E40AF', flexShrink: 0, marginTop: '2px' }} />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1" style={{ color: '#1E40AF' }}>
                        Modo de Edição Ativo
                      </h3>
                      <p className="text-xs" style={{ color: '#1E3A8A' }}>
                        Você está editando um pedido existente. Faça as alterações necessárias e clique em "Salvar Alterações" ou "Enviar Alterações".
                      </p>
                      <button
                        onClick={() => {
                          if (window.confirm('⚠️ Deseja cancelar a edição? As alterações serão perdidas.')) {
                            setEditingPedidoId(null);
                            setPedidoName('');
                            setPedidoItems([]);
                            setNotes('');
                            setSelectedStages(new Set());
                          }
                        }}
                        className="mt-2 px-3 py-1 rounded text-xs font-medium transition-colors"
                        style={{ background: '#FFFFFF', color: '#1E40AF', border: '1px solid #3B82F6' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                      >
                        <X size={14} className="inline mr-1" />
                        Cancelar Edição
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Nome do Pedido */}
                <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Nome do Pedido <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={pedidoName}
                    onChange={(e) => setPedidoName(e.target.value)}
                    placeholder="Ex: Pedido Primeira Etapa 2025, Pedido Endurance 500km, etc."
                    className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ borderColor: pedidoName ? '#D1D5DB' : '#FCA5A5' }}
                  />
                  {!pedidoName && (
                    <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
                      O nome do pedido é obrigatório
                    </p>
                  )}
                </div>

                {/* 🆕 Etapa de Destino do Pedido */}
                {!enableFractionation && selectedStages.size > 0 && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Etapa de Destino <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Selecione para qual etapa este pedido será vinculado na análise "Estoque vs. Demanda"
                    </p>
                    <select
                      value={targetStageId}
                      onChange={(e) => setTargetStageId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      style={{ borderColor: targetStageId ? '#D1D5DB' : '#FCA5A5' }}
                    >
                      <option value="">Selecione a etapa de destino</option>
                      {stages
                        .filter(s => selectedStages.has(s.id))
                        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                        .map(stage => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name} - {new Date(stage.start_date).toLocaleDateString('pt-BR')}
                          </option>
                        ))}
                    </select>
                    {!targetStageId && (
                      <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
                        Selecione uma etapa de destino
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Itens do Pedido</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={addWildcards}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: '#F59E0B', color: '#FFFFFF' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#D97706'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F59E0B'}
                      >
                        <Package size={16} />
                        Incluir Coringas
                      </button>
                      <button
                        onClick={addCustomItem}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: '#DC2626', color: '#FFFFFF' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
                      >
                        <Plus size={16} />
                        Adicionar Item
                      </button>
                    </div>
                    <div className="relative group">
                      <AlertCircle size={18} style={{ color: '#F59E0B' }} />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 p-3 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" 
                           style={{ background: '#FFFBEB', border: '1px solid #F59E0B' }}>
                        <p className="text-xs" style={{ color: '#92400E' }}>
                          <strong style={{ color: '#78350F' }}>⚠️ Atenção:</strong> Se você já incluiu coringas automaticamente na análise de demanda (página "Estoque vs. Demanda"), NÃO clique em "Incluir Coringas" novamente, pois isso irá duplicá-los no pedido.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {pedidoItems.map((item, idx) => (
                    <div key={item.id} className="p-4 rounded-lg border" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Modelo</label>
                          <select
                            value={item.model_code}
                            onChange={(e) => updateItemModel(item.id, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            style={{ borderColor: '#D1D5DB' }}
                          >
                            <option value="">Selecione...</option>
                            {tireModels.map(tm => (
                              <option key={tm.id} value={tm.code}>{tm.code} - {tm.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Necessidade</label>
                          <input
                            type="number"
                            value={item.quantity_needed}
                            disabled
                            className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-100"
                            style={{ borderColor: '#D1D5DB' }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Qtd. Pedido</label>
                          <input
                            type="number"
                            value={item.quantity_ordered}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            style={{ borderColor: '#D1D5DB' }}
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Preço Unit. (€)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                            <input
                              type="number"
                              value={item.unit_price}
                              readOnly
                              className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-gray-50 cursor-not-allowed"
                              style={{ borderColor: '#D1D5DB' }}
                              min="0"
                              step="0.01"
                              title="Preço carregado automaticamente do cadastro de modelos"
                            />
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-700 mb-1 block">Total (€)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                              <input
                                type="text"
                                value={item.total_price.toFixed(2)}
                                disabled
                                className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-gray-100 font-semibold"
                                style={{ borderColor: '#D1D5DB' }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#FEE2E2'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo de Quantidades por Modelo */}
                <div className="mt-6 p-6 rounded-lg" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB' }}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Resumo por Modelo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(() => {
                      // Agrupa quantidades por modelo
                      const modelSummary = new Map<string, { description: string; quantity: number }>();
                      
                      pedidoItems.forEach(item => {
                        if (item.model_code && item.quantity_ordered > 0) {
                          const current = modelSummary.get(item.model_code) || { description: item.model_description, quantity: 0 };
                          modelSummary.set(item.model_code, {
                            description: item.model_description,
                            quantity: current.quantity + item.quantity_ordered
                          });
                        }
                      });

                      // Ordena por código do modelo
                      const sortedModels = Array.from(modelSummary.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                      return sortedModels.map(([code, data]) => (
                        <div 
                          key={code}
                          className="p-4 rounded-lg" 
                          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate">{code}</div>
                              <div className="text-xs text-gray-500 truncate" title={data.description}>
                                {data.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                            <span className="text-lg font-bold" style={{ color: '#DC2626' }}>
                              {data.quantity}
                            </span>
                            <span className="text-xs text-gray-500">unidades</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  
                  {pedidoItems.filter(item => item.quantity_ordered > 0).length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Nenhum item com quantidade pedida
                    </div>
                  )}
                </div>

                {/* Totais */}
                <div className="mt-6 p-4 rounded-lg" style={{ background: '#F9FAFB', border: '2px solid #E5E7EB' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Total de Itens:</span>
                    <span className="text-sm font-bold text-gray-900">{pedidoItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Quantidade Total:</span>
                    <span className="text-sm font-bold text-gray-900">{totalQuantity} pneus</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <span className="text-base font-semibold text-gray-900">Valor Total:</span>
                    <span className="text-xl font-bold" style={{ color: '#DC2626' }}>
                      € {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Observações */}
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Observações do Pedido</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ borderColor: '#D1D5DB' }}
                    placeholder="Adicione observações sobre o pedido..."
                  />
                </div>

                {/* Ações */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={saveDraft}
                    disabled={isSaving || !pedidoName?.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                    style={{ 
                      background: (!pedidoName?.trim() || isSaving) ? '#E5E7EB' : '#F3F4F6', 
                      color: (!pedidoName?.trim() || isSaving) ? '#9CA3AF' : '#374151',
                      cursor: (!pedidoName?.trim() || isSaving) ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving && pedidoName?.trim()) {
                        e.currentTarget.style.background = '#E5E7EB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving && pedidoName?.trim()) {
                        e.currentTarget.style.background = '#F3F4F6';
                      }
                    }}
                  >
                    <Save size={20} />
                    {editingPedidoId ? 'Salvar Alterações' : 'Salvar Rascunho'}
                  </button>
                  <button
                    onClick={sendOrder}
                    disabled={isSaving || pedidoItems.length === 0 || !pedidoName?.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                    style={{ 
                      background: (isSaving || pedidoItems.length === 0 || !pedidoName?.trim()) ? '#FCA5A5' : '#DC2626', 
                      color: '#FFFFFF',
                      cursor: (isSaving || pedidoItems.length === 0 || !pedidoName?.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (isSaving || pedidoItems.length === 0 || !pedidoName?.trim()) ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving && pedidoItems.length > 0 && pedidoName?.trim()) {
                        e.currentTarget.style.background = '#B91C1C';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving && pedidoItems.length > 0 && pedidoName?.trim()) {
                        e.currentTarget.style.background = '#DC2626';
                      }
                    }}
                  >
                    <Send size={20} />
                    {editingPedidoId ? 'Enviar Alterações' : 'Enviar Pedido'}
                  </button>
                </div>
              </div>
            )}

            {/* Visualização de Frações (quando fracionamento ativo) */}
            {selectedSeasonId && selectedStages.size > 0 && enableFractionation && (
              <div className="space-y-6">
                {/* Aviso de Fracionamento */}
                <div className="bg-white rounded-xl shadow-sm border p-4" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Modo de Fracionamento Ativo
                      </h3>
                      <p className="text-sm text-gray-600">
                        Cada fração terá seu próprio cálculo de necessidade e lista de itens. 
                        Revise e ajuste cada fração individualmente antes de salvar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nome Base do Pedido */}
                <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Nome Base do Pedido <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={basePedidoName}
                    onChange={(e) => setBasePedidoName(e.target.value)}
                    placeholder="Ex: Pedido 2025 - "
                    className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ borderColor: basePedidoName ? '#D1D5DB' : '#FCA5A5' }}
                  />
                  {!basePedidoName ? (
                    <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
                      O nome base é obrigatório. Cada fração receberá: "{'{Nome Base}'} - {'{Nome da Fração}'}"
                    </p>
                  ) : (
                    <p className="text-xs mt-1 text-gray-500">
                      Cada pedido será nomeado como: "{basePedidoName} - {fractionNames.get(0) || 'Fração 1'}", "{basePedidoName} - {fractionNames.get(1) || 'Fração 2'}", etc.
                    </p>
                  )}
                </div>

                {/* Frações Individuais */}
                {Array.from({ length: numberOfFractions }, (_, i) => {
                  const fractionStageSet = fractionStages.get(i) || new Set();
                  const fractionName = fractionNames.get(i) || `Fração ${i + 1}`;
                  const analysis = fractionStockAnalysis.get(i) || [];
                  const items = fractionPedidoItems.get(i) || [];
                  const notes = fractionNotes.get(i) || '';
                  
                  return (
                    <div key={i} className="bg-white rounded-xl shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
                      {/* Header da Fração */}
                      <div className="p-6 border-b" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-lg"
                            style={{ background: '#DC2626' }}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900">{fractionName}</h3>
                            <p className="text-sm text-gray-500">
                              {fractionStageSet.size} {fractionStageSet.size === 1 ? 'etapa' : 'etapas'} selecionada(s)
                            </p>
                          </div>
                        </div>
                        
                        {/* Etapas da Fração */}
                        {fractionStageSet.size > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {Array.from(fractionStageSet).map(stageId => {
                              const stage = stages.find(s => s.id === stageId);
                              return stage ? (
                                <span
                                  key={stageId}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                                >
                                  {stage.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg text-center" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                            <p className="text-xs text-red-600">⚠️ Nenhuma etapa atribuída a esta fração</p>
                          </div>
                        )}
                      </div>

                      {/* Análise de Necessidade da Fração */}
                      {fractionStageSet.size > 0 && analysis.length > 0 && (
                        <div className="p-6">
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-lg" style={{ background: '#FEF2F2', borderLeft: '4px solid #DC2626' }}>
                              <div className="text-sm text-gray-600 mb-1">Modelos em Falta</div>
                              <div className="text-2xl font-bold" style={{ color: '#DC2626' }}>
                                {analysis.length}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B' }}>
                              <div className="text-sm text-gray-600 mb-1">Pneus Necessários</div>
                              <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                                {analysis.reduce((sum, item) => sum + item.shortage, 0)}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ background: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
                              <div className="text-sm text-gray-600 mb-1">Valor Estimado</div>
                              <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                                € {items.reduce((sum, item) => sum + item.total_price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          {/* Itens do Pedido */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-base font-semibold text-gray-900">Itens do Pedido</h4>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => addWildcardsToFraction(i)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    style={{ background: '#F59E0B', color: '#FFFFFF' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#D97706'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#F59E0B'}
                                  >
                                    <Package size={16} />
                                    Incluir Coringas
                                  </button>
                                  <button
                                    onClick={() => addFractionCustomItem(i)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    style={{ background: '#DC2626', color: '#FFFFFF' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
                                  >
                                  <Plus size={16} />
                                  Adicionar Item
                                </button>
                              </div>
                              <div className="relative group">
                                <AlertCircle size={18} style={{ color: '#F59E0B' }} />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 p-3 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" 
                                     style={{ background: '#FFFBEB', border: '1px solid #F59E0B' }}>
                                  <p className="text-xs" style={{ color: '#92400E' }}>
                                    <strong style={{ color: '#78350F' }}>⚠️ Atenção:</strong> Se você já incluiu coringas automaticamente na análise de demanda (página "Estoque vs. Demanda"), NÃO clique em "Incluir Coringas" novamente, pois isso irá duplicá-los no pedido.
                                  </p>
                                </div>
                              </div>
                            </div>
                            </div>

                            <div className="space-y-3">
                              {items.map(item => (
                                <div
                                  key={item.id}
                                  className="p-4 rounded-lg border"
                                  style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
                                >
                                  <div className="grid grid-cols-6 gap-3 items-center">
                                    <div className="col-span-2">
                                      <label className="text-xs text-gray-500 mb-1 block">
                                        Modelo {!item.model_code && <span className="text-red-600">*</span>}
                                      </label>
                                      <select
                                        value={item.model_code}
                                        onChange={(e) => updateFractionItemModel(i, item.id, e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border text-sm font-semibold bg-white"
                                        style={{ borderColor: item.model_code ? '#D1D5DB' : '#FCA5A5' }}
                                      >
                                        <option value="">Selecione um modelo</option>
                                        {tireModels.map(model => (
                                          <option key={model.id} value={model.code}>
                                            {model.code} - {model.name}
                                          </option>
                                        ))}
                                      </select>
                                      {item.model_description && (
                                        <p className="text-xs text-gray-500 mt-1 truncate">{item.model_description}</p>
                                      )}
                                      {!item.model_code && (
                                        <p className="text-xs text-red-600 mt-1">Campo obrigatório</p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 mb-1 block">Necessário</label>
                                      <input
                                        type="number"
                                        value={item.quantity_needed}
                                        readOnly
                                        className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-100"
                                        style={{ borderColor: '#D1D5DB' }}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 mb-1 block">Pedido</label>
                                      <input
                                        type="number"
                                        value={item.quantity_ordered}
                                        onChange={(e) => updateFractionItemQuantity(i, item.id, Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                                        style={{ borderColor: '#D1D5DB' }}
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 mb-1 block">Preço Unit.</label>
                                      <input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) => updateFractionItemPrice(i, item.id, Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg border text-sm"
                                        style={{ borderColor: '#D1D5DB' }}
                                        step="0.01"
                                        min="0"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <label className="text-xs text-gray-500 mb-1 block">Total</label>
                                        <input
                                          type="text"
                                          value={item.total_price.toFixed(2)}
                                          readOnly
                                          className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-100 font-semibold"
                                          style={{ borderColor: '#D1D5DB' }}
                                        />
                                      </div>
                                      <button
                                        onClick={() => removeFractionItem(i, item.id)}
                                        className="mt-5 p-2 rounded-lg transition-colors"
                                        style={{ background: '#FEE2E2', color: '#DC2626' }}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Observações da Fração */}
                          <div className="mt-6">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Observações desta Fração
                            </label>
                            <textarea
                              value={notes}
                              onChange={(e) => {
                                setFractionNotes(prev => {
                                  const newMap = new Map(prev);
                                  newMap.set(i, e.target.value);
                                  return newMap;
                                });
                              }}
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                              style={{ borderColor: '#D1D5DB' }}
                              placeholder="Observações específicas para este pedido..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Empty State para Fração sem Etapas */}
                      {fractionStageSet.size === 0 && (
                        <div className="p-6 text-center">
                          <p className="text-sm text-gray-400 italic">
                            Atribua etapas a esta fração para ver a análise de necessidade
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Botão para Salvar Todas as Frações */}
                {(() => {
                  const totalAssigned = Array.from(fractionStages.values()).reduce(
                    (sum, stages) => sum + stages.size,
                    0
                  );
                  const allAssigned = totalAssigned === selectedStages.size;
                  const hasEmptyFractions = Array.from(fractionStages.values()).some(s => s.size === 0);
                  const hasEmptyItems = Array.from({ length: numberOfFractions }, (_, i) => {
                    const items = fractionPedidoItems.get(i) || [];
                    return items.length === 0;
                  }).some(isEmpty => isEmpty);

                  return (
                    <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: '#E5E7EB' }}>
                      {!basePedidoName.trim() && (
                        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                          <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                          <div className="text-xs" style={{ color: '#DC2626' }}>
                            Digite o nome base do pedido acima.
                          </div>
                        </div>
                      )}
                      
                      {!allAssigned && basePedidoName.trim() && (
                        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                          <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                          <div className="text-xs" style={{ color: '#DC2626' }}>
                            Atribua todas as {selectedStages.size} etapas selecionadas às frações antes de salvar.
                          </div>
                        </div>
                      )}
                      
                      {hasEmptyItems && basePedidoName.trim() && allAssigned && (
                        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                          <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                          <div className="text-xs" style={{ color: '#DC2626' }}>
                            Adicione pelo menos um item em cada fração antes de salvar.
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={saveFractions}
                        disabled={!allAssigned || hasEmptyFractions || hasEmptyItems || !basePedidoName.trim() || isSaving}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-colors"
                        style={{
                          background: (!allAssigned || hasEmptyFractions || hasEmptyItems || !basePedidoName.trim() || isSaving) ? '#FCA5A5' : '#DC2626',
                          color: '#FFFFFF',
                          cursor: (!allAssigned || hasEmptyFractions || hasEmptyItems || !basePedidoName.trim() || isSaving) ? 'not-allowed' : 'pointer',
                          opacity: (!allAssigned || hasEmptyFractions || hasEmptyItems || !basePedidoName.trim() || isSaving) ? 0.5 : 1
                        }}
                      >
                        <Save size={20} />
                        {isSaving ? `Salvando ${numberOfFractions} pedidos...` : `Salvar ${numberOfFractions} Pedidos Independentes`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Empty State - Nenhuma etapa selecionada */}
            {selectedSeasonId && selectedStages.size === 0 && (
              <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center" style={{ borderColor: '#E5E7EB', minHeight: '300px' }}>
                <div className="text-center px-6">
                  <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                      <Calendar size={40} style={{ color: '#9CA3AF' }} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione pelo menos uma etapa</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Escolha quais etapas considerar para calcular a necessidade de pneus
                  </p>
                </div>
              </div>
            )}

            {/* Empty State - Selecione uma temporada */}
            {!selectedSeasonId && (
              <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center" style={{ borderColor: '#E5E7EB', minHeight: '400px' }}>
                <div className="text-center px-6">
                  <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                      <ShoppingCart size={40} style={{ color: '#9CA3AF' }} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione uma temporada</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Escolha uma temporada para ver as etapas e criar um pedido
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && !showConferenciaFisica && !showConferenceHistory && !showConferenceResult && (
          <div className="space-y-1 -mx-6 -mt-8">
            {/* Header Compacto */}
            <div className="bg-white rounded-lg shadow-sm border px-2 py-1.5 mx-2" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-1.5">
                <Package size={14} style={{ color: '#DC2626' }} />
                <h2 className="text-xs font-semibold text-gray-900">Histórico de Pedidos</h2>
              </div>
            </div>

            {/* Lista de Pedidos */}
            {pedidos.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border flex items-center justify-center mx-2" style={{ borderColor: '#E5E7EB', minHeight: '300px' }}>
                <div className="text-center px-4">
                  <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                      <Package size={32} style={{ color: '#9CA3AF' }} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Nenhum pedido encontrado</h3>
                  <p className="text-xs text-gray-500">
                    Crie seu primeiro pedido na aba "Criar Pedido"
                  </p>
                </div>
              </div>
            )}

            {/* Pedidos */}
            {pedidos.length > 0 && (
              <div className="space-y-1.5 px-2">
                {pedidos.map(pedido => {
                  const isExpanded = expandedPedidos.has(pedido.id);
                  const statusColors = {
                    draft: { bg: '#F3F4F6', text: '#374151', label: 'Rascunho' },
                    sent: { bg: '#DBEAFE', text: '#1E40AF', label: 'Enviado' },
                    approved: { bg: '#D1FAE5', text: '#065F46', label: 'Aprovado' },
                    received: { bg: '#DCF4E4', text: '#166534', label: 'Recebido' }
                  };
                  const statusStyle = statusColors[pedido.status];

                  return (
                    <div key={pedido.id} className="bg-white rounded-lg shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
                      {/* Header do Pedido */}
                      <div
                        className="p-2.5 cursor-pointer"
                        onClick={() => togglePedidoExpanded(pedido.id)}
                      >
                        {/* Linha 1: Nome e Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold text-gray-900 truncate flex-1">
                            {pedido.order_name || pedido.season_name || 'Pedido sem nome'}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.text
                            }}
                          >
                            {statusStyle.label}
                          </span>
                        </div>

                        {/* Linha 2: Data */}
                        <p className="text-[10px] text-gray-500 mb-2">
                          {new Date(pedido.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>

                        {/* Linha 3: Informações em 2 colunas */}
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500 mb-0.5">Itens</p>
                            <p className="text-base font-bold text-gray-900">{pedido.total_items}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500 mb-0.5">Quantidade</p>
                            <p className="text-base font-bold text-gray-900">{pedido.total_quantity}</p>
                          </div>
                        </div>

                        {/* Linha 4: Ícones de ação horizontalmente */}
                        <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: '#E5E7EB' }}>
                          <div className="flex items-center gap-1.5">
                            {/* Botão Conferência Física / Reconferência */}
                            {(() => {
                              const hasConference = orderConferences.has(pedido.id);
                              const conferenceCount = orderConferencesHistory.get(pedido.id)?.length || 0;
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPedidoForConferencia(pedido.id);
                                    setConferenciaEntries([]);
                                    setShowConferenciaFisica(true);
                                  }}
                                  className="p-1.5 rounded transition-all relative"
                                  style={{
                                    color: hasConference ? '#DC2626' : '#059669',
                                    background: hasConference ? '#FEF2F2' : 'transparent'
                                  }}
                                  title={hasConference ? `Reconferência (${conferenceCount})` : 'Conferência'}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = hasConference ? '#FEE2E2' : '#F0FDF4';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = hasConference ? '#FEF2F2' : 'transparent';
                                  }}
                                >
                                  <ClipboardCheck size={14} />
                                  {hasConference && (
                                    <span
                                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[8px] font-bold flex items-center justify-center"
                                      style={{ background: '#DC2626', color: 'white' }}
                                    >
                                      {conferenceCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}

                            {/* Botão Visualizar Histórico de Conferências */}
                            {orderConferencesHistory.has(pedido.id) && orderConferencesHistory.get(pedido.id)!.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForHistory(pedido.id);
                                  setShowConferenceHistory(true);
                                }}
                                className="p-1.5 rounded transition-all"
                                style={{ color: '#7C3AED', background: 'transparent' }}
                                title="Histórico"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#F5F3FF';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <History size={14} />
                              </button>
                            )}

                            {/* Botão Editar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                editPedido(pedido);
                              }}
                              className="p-1.5 rounded transition-all hover:bg-blue-50"
                              style={{ color: '#2563EB' }}
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>

                            {/* Botão Excluir */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePedido(pedido.id, pedido.order_name);
                              }}
                              className="p-1.5 rounded transition-all hover:bg-red-50"
                              style={{ color: '#DC2626' }}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Chevron Expandir/Recolher */}
                          <button className="p-1.5 rounded transition-colors" style={{ color: '#6B7280' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Detalhes do Pedido (Expandido) */}
                      {isExpanded && (
                        <div className="border-t px-2.5 py-2" style={{ borderColor: '#E5E7EB' }}>
                          {/* Observações */}
                          {pedido.notes && (
                            <div className="mb-2 p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                              <p className="text-[10px] font-medium text-gray-700 mb-0.5">Observações</p>
                              <p className="text-xs text-gray-600">{pedido.notes}</p>
                            </div>
                          )}

                          {/* Histórico de Conferências */}
                          {orderConferencesHistory.has(pedido.id) && (() => {
                            const allConferences = orderConferencesHistory.get(pedido.id) || [];
                            return (
                              <div className="mb-2 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <ClipboardCheck size={16} style={{ color: '#6B7280' }} />
                                  <p className="text-xs font-semibold text-gray-900">
                                    Conferências ({allConferences.length})
                                  </p>
                                </div>

                                {allConferences.map((conf, confIndex) => {
                                  const difference = (conf?.total_items_scanned || 0) - (conf?.total_items_expected || 0);
                                  return (
                                    <div
                                      key={conf.id}
                                      className="p-2.5 rounded-lg border"
                                      style={{
                                        borderColor: conf?.has_divergences ? '#FCA5A5' : '#86EFAC',
                                        background: conf?.has_divergences ? '#FEF2F2' : '#F0FDF4'
                                      }}
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                              <p className="text-xs font-semibold" style={{
                                                color: conf?.has_divergences ? '#DC2626' : '#059669'
                                              }}>
                                                {conf?.has_divergences ? '⚠️ Divergências' : '✅ OK'}
                                              </p>
                                              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{
                                                background: '#E5E7EB',
                                                color: '#6B7280'
                                              }}>
                                                #{allConferences.length - confIndex}
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500">
                                              {new Date(conf?.conference_date).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2 mb-2">
                                            <div className="text-center">
                                              <p className="text-[9px] text-gray-600 mb-0.5">Esperado</p>
                                              <p className="text-xs font-semibold text-gray-900">
                                                {conf?.total_items_expected}
                                              </p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-[9px] text-gray-600 mb-0.5">Lido</p>
                                              <p className="text-xs font-semibold text-gray-900">
                                                {conf?.total_items_scanned}
                                              </p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-[9px] text-gray-600 mb-0.5">Dif.</p>
                                              <p className="text-xs font-bold" style={{
                                                color: difference === 0 ? '#059669' : '#DC2626'
                                              }}>
                                                {difference >= 0 ? '+' : ''}{difference}
                                              </p>
                                            </div>
                                          </div>

                                          {conf?.has_divergences && conf?.divergences && conf.divergences.length > 0 && (
                                            <div className="mt-2 pt-2 border-t" style={{ borderColor: conf?.has_divergences ? '#FCA5A5' : '#86EFAC' }}>
                                              <p className="text-[10px] font-semibold text-gray-700 mb-1.5">Divergências:</p>
                                              <div className="space-y-1.5">
                                                {conf.divergences.map((div: any, idx: number) => (
                                                  <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 rounded" style={{ background: '#FFF' }}>
                                                    <span className="font-medium text-gray-700 truncate flex-1">{div.model}</span>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                      <span className="text-gray-600">{div.expected}</span>
                                                      <span className="text-gray-600">{div.scanned}</span>
                                                      <span className="font-bold" style={{
                                                        color: div.difference === 0 ? '#059669' : '#DC2626'
                                                      }}>
                                                        {div.difference >= 0 ? '+' : ''}{div.difference}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Itens do Pedido */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-900 mb-2">Itens do Pedido</p>
                            {pedido.items.map(item => (
                              <div
                                key={item.id}
                                className="p-2 rounded-lg border"
                                style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
                              >
                                {/* Linha 1: Modelo */}
                                <div className="mb-1.5">
                                  <p className="text-xs font-bold text-gray-900">{item.model_code}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{item.model_description}</p>
                                </div>

                                {/* Linha 2: Grid com informações */}
                                <div className="grid grid-cols-2 gap-4 text-center">
                                  <div>
                                    <p className="text-[9px] text-gray-500 mb-0.5">Necessário</p>
                                    <p className="text-sm font-semibold text-gray-900">{item.quantity_needed}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-gray-500 mb-0.5">Pedido</p>
                                    <p className="text-sm font-semibold text-gray-900">{item.quantity_ordered}</p>
                                  </div>
                                </div>

                                {item.notes && (
                                  <div className="mt-1.5 pt-1.5 border-t" style={{ borderColor: '#E5E7EB' }}>
                                    <p className="text-[10px] text-gray-600">Obs: {item.notes}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Conferência Física Inline */}
        {showConferenciaFisica && activeTab === 'historico' && (
          <div className="-mx-6 -mt-8">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col mx-2" style={{ borderColor: '#E5E7EB', minHeight: '600px' }}>
              {/* Header Compacto */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const hasConference = selectedPedidoForConferencia && orderConferences.has(selectedPedidoForConferencia);
                    const conferenceCount = selectedPedidoForConferencia ? (orderConferencesHistory.get(selectedPedidoForConferencia)?.length || 0) : 0;
                    return (
                      <>
                        <ClipboardCheck size={14} style={{ color: hasConference ? '#DC2626' : '#059669' }} />
                        <div>
                          <h2 className="text-xs font-semibold text-gray-900">
                            {hasConference ? 'Reconferência Física' : 'Conferência Física'}
                            {hasConference && (
                              <span className="ml-1 text-[10px] font-normal text-gray-600">
                                (#{conferenceCount + 1})
                              </span>
                            )}
                          </h2>
                          {conferenciaEntries.length > 0 && (
                            <p className="text-[10px] text-gray-600">
                              {conferenciaEntries.length} {conferenciaEntries.length === 1 ? 'pneu' : 'pneus'}
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => {
                    setShowConferenciaFisica(false);
                    setSelectedPedidoForConferencia(null);
                    setConferenciaEntries([]);
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  Voltar
                </button>
              </div>

              {/* Conteúdo - TireStockEntry */}
              <div className="flex-1 overflow-y-auto">
                <TireStockEntry
                  onEntriesChange={setConferenciaEntries}
                  hideFinishButton={true}
                />
              </div>

              {/* Footer Compacto com botão Finalizar */}
              <div className="flex items-center justify-end gap-2 px-2 py-2 border-t" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
              <button
                onClick={() => {
                  setShowConferenciaFisica(false);
                  setSelectedPedidoForConferencia(null);
                  setConferenciaEntries([]);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: '#E5E7EB', color: '#374151' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#D1D5DB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#E5E7EB'; }}
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizarConferencia}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: '#DC2626', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#B91C1C'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#DC2626'; }}
              >
                <ClipboardCheck size={14} />
                <span>Finalizar</span>
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Histórico de Conferências Inline */}
        {showConferenceHistory && selectedOrderForHistory && activeTab === 'historico' && (
          <div className="-mx-6 -mt-8">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col mx-2" style={{ borderColor: '#E5E7EB' }}>
              {/* Header Compacto */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck size={14} style={{ color: '#7C3AED' }} />
                  <h2 className="text-xs font-semibold text-gray-900">Histórico de Conferências</h2>
                </div>
                <button
                  onClick={() => {
                    setShowConferenceHistory(false);
                    setSelectedOrderForHistory(null);
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  Voltar
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-2" style={{ maxHeight: '70vh' }}>
              {orderConferencesHistory.get(selectedOrderForHistory)?.map((conference: any, index: number) => (
                <div key={conference.id} className="mb-2 last:mb-0">
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 mb-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-xs text-blue-900">
                        Conferência #{orderConferencesHistory.get(selectedOrderForHistory)!.length - index}
                      </h3>
                      <span className="px-1.5 py-0 rounded-full text-[9px] font-medium bg-blue-100 text-blue-800">
                        {new Date(conference.conference_date).toLocaleDateString('pt-BR')} às {new Date(conference.conference_date).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-800">
                      Por: <span className="font-semibold">{conference.performed_by_name || 'Não registrado'}</span>
                    </p>
                  </div>

                  <div className="border border-gray-300 rounded-lg overflow-hidden mb-2">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="border border-gray-600 px-1.5 py-1 text-left text-[9px]">Modelo</th>
                          <th className="border border-gray-600 px-1.5 py-1 text-center text-[9px]">Pedido</th>
                          <th className="border border-gray-600 px-1.5 py-1 text-center text-[9px]">Conf.</th>
                          <th className="border border-gray-600 px-1.5 py-1 text-center text-[9px]">Div.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conference.items_detail?.map((item: any, itemIndex: number) => (
                          <tr key={itemIndex} className="bg-white">
                            <td className="border border-gray-300 px-1.5 py-1">
                              <div className="font-medium text-[10px]">{item.model_code}</div>
                              <div className="text-[8px] text-gray-600 truncate">{item.model_description}</div>
                            </td>
                            <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{item.quantity_ordered}</td>
                            <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{item.quantity_scanned}</td>
                            <td className="border border-gray-300 px-1.5 py-1 text-center">
                              <span className={`font-bold text-[10px] ${
                                item.quantity_scanned - item.quantity_ordered > 0 ? 'text-green-600' :
                                item.quantity_scanned - item.quantity_ordered < 0 ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {item.quantity_scanned - item.quantity_ordered > 0 ? '+' : ''}{item.quantity_scanned - item.quantity_ordered}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="bg-gray-100 rounded p-1.5 text-center">
                      <div className="text-gray-600 text-[8px]">Esperado</div>
                      <div className="text-xs font-bold text-gray-900">{conference.total_items_expected}</div>
                    </div>
                    <div className="bg-gray-100 rounded p-1.5 text-center">
                      <div className="text-gray-600 text-[8px]">Conferido</div>
                      <div className="text-xs font-bold text-gray-900">{conference.total_items_scanned}</div>
                    </div>
                    <div className={`rounded p-1.5 text-center ${conference.has_divergences ? 'bg-red-100' : 'bg-green-100'}`}>
                      <div className="text-gray-700 text-[8px]">Status</div>
                      <div className="text-[10px] font-bold" style={{ color: conference.has_divergences ? '#DC2626' : '#059669' }}>
                        {conference.has_divergences ? 'Div.' : 'OK'}
                      </div>
                    </div>
                  </div>

                  {index < orderConferencesHistory.get(selectedOrderForHistory)!.length - 1 && (
                    <div className="border-t border-dashed border-gray-300 my-2"></div>
                  )}
                </div>
              ))}

              {(!orderConferencesHistory.get(selectedOrderForHistory) || orderConferencesHistory.get(selectedOrderForHistory)!.length === 0) && (
                <div className="text-center py-6 text-gray-500">
                  <ClipboardCheck size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhuma conferência registrada</p>
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Resultado da Conferência Inline */}
      {showConferenceResult && conferenceResultData && activeTab === 'historico' && (
        <div className="-mx-6 -mt-8">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col mx-2" style={{ borderColor: '#E5E7EB' }}>
            {/* Header */}
            <div className="px-2 py-2 border-b" style={{ background: '#D50000' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Resultado da Conferência Física</h2>
                  <p className="text-white text-opacity-90 text-[10px] mt-0.5">
                    {new Date(conferenceResultData.conferenceDate).toLocaleDateString('pt-BR')} às {new Date(conferenceResultData.conferenceDate).toLocaleTimeString('pt-BR')} - {conferenceResultData.performedByName}
                  </p>
                </div>
                <button
                  onClick={() => setShowConferenceResult(false)}
                  className="text-xs text-white hover:text-gray-200"
                >
                  Voltar
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '70vh' }}>
              {/* Resumo Geral */}
              <div className="mb-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                <h3 className="font-bold text-xs mb-2 text-gray-900">Resumo Geral:</h3>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold text-[9px]">Descrição</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-right font-semibold text-[9px]">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border border-gray-300 px-1.5 py-1">Packing list total</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right font-medium">{conferenceResultData.totalExpected}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-gray-300 px-1.5 py-1">Contagem física total</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right font-medium">{conferenceResultData.totalScanned}</td>
                    </tr>
                    <tr className={conferenceResultData.divergencias.length > 0 ? 'bg-red-50' : 'bg-green-50'}>
                      <td className="border border-gray-300 px-1.5 py-1 font-semibold">Divergência apurada</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right font-bold" style={{ color: conferenceResultData.divergencias.length > 0 ? '#DC2626' : '#059669' }}>
                        {conferenceResultData.totalScanned - conferenceResultData.totalExpected >= 0 ? '+' : '-'}{Math.abs(conferenceResultData.totalScanned - conferenceResultData.totalExpected)}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-gray-300 px-1.5 py-1">Salvos no estoque</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right font-medium text-green-600">{conferenceResultData.successCount}</td>
                    </tr>
                    {conferenceResultData.errorCount > 0 && (
                      <tr className="bg-red-50">
                        <td className="border border-gray-300 px-1.5 py-1 text-red-700">Erros ao salvar</td>
                        <td className="border border-gray-300 px-1.5 py-1 text-right font-medium text-red-700">{conferenceResultData.errorCount}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Detalhamento por Modelo */}
              <div>
                <h3 className="font-bold text-xs mb-2 text-gray-900">Detalhamento por Modelo:</h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border border-gray-600 px-1.5 py-1 text-left text-[9px]">Modelo</th>
                        <th className="border border-gray-600 px-1.5 py-1 text-center text-[9px]">Ped.</th>
                        <th className="border border-gray-600 px-1.5 py-1 text-center text-[9px]">Conf.</th>
                        <th className="border border-gray-600 px-1.5 py-1 text-center text-[9px]">Div.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conferenceResultData.itemsDetail.map((item: any, index: number) => (
                        <tr key={index} className={item.difference !== 0 ? 'bg-yellow-50' : 'bg-white'}>
                          <td className="border border-gray-300 px-1.5 py-1">
                            <div className="font-medium text-gray-900">{item.model_code}</div>
                            <div className="text-[8px] text-gray-600 truncate">{item.model_description}</div>
                          </td>
                          <td className="border border-gray-300 px-1.5 py-1 text-center font-medium">{item.quantity_ordered}</td>
                          <td className="border border-gray-300 px-1.5 py-1 text-center font-medium">{item.quantity_scanned}</td>
                          <td className="border border-gray-300 px-1.5 py-1 text-center">
                            <span className={`font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {item.difference > 0 ? `+${item.difference}` : item.difference}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Erros (se houver) */}
              {conferenceResultData.errors && conferenceResultData.errors.length > 0 && (
                <div className="mt-2 bg-red-50 rounded-lg p-2 border border-red-200">
                  <h3 className="font-bold text-xs mb-1.5 text-red-900">Erros ao Salvar:</h3>
                  <ul className="list-disc list-inside text-[10px] text-red-800 space-y-0.5">
                    {conferenceResultData.errors.slice(0, 5).map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                    {conferenceResultData.errors.length > 5 && (
                      <li className="font-semibold">... e mais {conferenceResultData.errors.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-2 py-2 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowConferenceResult(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowConferenceResult(false);
                  // Recarrega os pedidos para atualizar o status
                  loadPedidos();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                style={{ background: '#D50000' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#B00000'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#D50000'}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}