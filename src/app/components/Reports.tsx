import { useState, useEffect } from 'react';
import { BarChart3, Package, TrendingUp, Calendar, Search, Truck, Box, Users, FileDown, X, Activity, Trash2, ChevronDown, ChevronUp, User, FileSpreadsheet, ChevronsUpDown } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { type StockEntry, type TireModel } from '../utils/storage';
import { StatusSelect } from './StatusSelect';
import { StatusBadge } from './StatusBadge';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MultiSelect } from './ui/multi-select';
import { ReportSkeleton, ChartSkeleton, TableSkeleton, DashboardCardSkeleton } from './LoadingSkeleton';
import { LoadingSpinner, ButtonLoading } from './LoadingSpinner';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { useHaptic } from './TouchFeedback';
import { exportStockToExcel } from '../utils/excelExport';
import { MobileFilters } from './MobileFilters';
import { ExportMenu, type ExportFormat, type ExportOptions } from './ExportMenu';
import { AnimatedTransition, AnimatedList, AnimatedListItem } from './AnimatedTransition';
import { ProtheusExportDialog } from './ProtheusExportDialog';

interface StockSummary {
  model: string;
  container: string;
  quantity: number;
  lastEntry: string;
}

import { ResponsiveTable } from './ResponsiveTable';
import { VirtualizedTable } from './VirtualizedTable';
import { ColumnSelector, type ColumnOption } from './ColumnSelector';

// Cores para gráficos - DEFINIDO NO TOPO
const COLORS = ['#D50000', '#FF6B00', '#FFA500', '#FFD700', '#90EE90', '#4169E1', '#9370DB', '#FF69B4'];

interface StatCard {
  title: string;
  value: number;
  changeLabel: string;
  icon: any;
  gradient: string;
  iconBg: string;
  accentColor: string;
  containers?: number;
  type: 'total' | 'active' | 'new' | 'discard' | 'discard-pilot' | 'pilot' | string;
}

// Helper: Converte hex para rgba
const hexToRgba = (hex: string, alpha: number = 1): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(156, 163, 175, ${alpha})`; // fallback cinza
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function Reports() {
  const haptic = useHaptic(); // 📱 Haptic feedback
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState<string[]>([]);
  const [filterContainer, setFilterContainer] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterSeason, setFilterSeason] = useState<string[]>([]);
  const [hasInitializedSeason, setHasInitializedSeason] = useState(false); // Flag para controlar inicialização da temporada
  const [filterStage, setFilterStage] = useState<string[]>([]);
  const [filterPilot, setFilterPilot] = useState<string[]>([]);
  const [filterChampionship, setFilterChampionship] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(200);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [dashboardStats, setDashboardStats] = useState<StatCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<'total' | 'active' | 'new' | 'discard' | 'discard-pilot' | 'pilot' | null>(null);

  // Estados para filtros da aba Ocupação de Contêineres
  const [occupancySearchTerm, setOccupancySearchTerm] = useState('');
  const [occupancyFilterLocation, setOccupancyFilterLocation] = useState('all');
  const [occupancyFilterSector, setOccupancyFilterSector] = useState('PNR'); // 🆕 Filtro por setor com padrão PNR
  const [occupancyFilterOccupancy, setOccupancyFilterOccupancy] = useState('all');
  const [occupancyFilterStatus, setOccupancyFilterStatus] = useState('all');

  // Estado para armazenar etapas dinâmicas do banco
  const [stages, setStages] = useState<string[]>([]);

  // Estado para armazenar status com cores do banco
  const [tireStatuses, setTireStatuses] = useState<{ id: string; name: string; color: string }[]>([]);
  
  // Estados para ordenação do histórico
  const [historySortColumn, setHistorySortColumn] = useState<string | null>(null);
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc' | null>(null);

  // Estado para modal de exportação Protheus
  const [showProtheusDialog, setShowProtheusDialog] = useState(false);

  // Estado para controlar visualização por status no gráfico de pneus
  const [showTiresByStatus, setShowTiresByStatus] = useState(false);

  // Estados para seleção de colunas do histórico
  const historyAvailableColumns: ColumnOption[] = [
    { key: 'barcode', label: 'Código de Barras', defaultVisible: true },
    { key: 'model_name', label: 'Modelo', defaultVisible: true },
    { key: 'model_type', label: 'Tipo', defaultVisible: false },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'container_name', label: 'Contêiner', defaultVisible: true },
    { key: 'created_at', label: 'Data de Entrada', defaultVisible: true },
    { key: 'pilot', label: 'Piloto', defaultVisible: false },
    { key: 'team', label: 'Equipe', defaultVisible: false },
    { key: 'session_id', label: 'ID da Sessão', defaultVisible: false },
    { key: 'etapa', label: 'Etapa', defaultVisible: false },
    { key: 'ano', label: 'Ano/Temporada', defaultVisible: false },
    { key: 'campeonato', label: 'Campeonato', defaultVisible: false },
    { key: 'categoria', label: 'Categoria', defaultVisible: false },
  ];

  const [historyVisibleColumns, setHistoryVisibleColumns] = useState<string[]>(() => {
    // Tenta carregar preferências salvas do localStorage
    try {
      const saved = localStorage.getItem('column-preference-reports-history');
      if (saved) {
        const savedColumns = JSON.parse(saved);
        // Valida que as colunas salvas ainda existem
        const validColumns = savedColumns.filter((key: string) => 
          historyAvailableColumns.some(c => c.key === key)
        );
        if (validColumns.length > 0) {
          return validColumns;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferências de colunas:', error);
    }
    // Fallback para colunas padrão
    return historyAvailableColumns.filter(c => c.defaultVisible !== false).map(c => c.key);
  });

  // Estado para controlar linhas expandidas na tabela de histórico
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 🔍 Estados para detalhamento de container/modelo
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTires, setDetailTires] = useState<StockEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContainer, setDetailContainer] = useState('');
  const [detailModel, setDetailModel] = useState('');

  // Carrega entradas do localStorage e escuta todas as atualizações
  useEffect(() => {
    loadEntries();
    loadStages(); // Carrega etapas do banco

    // Dispara evento para onboarding checklist
    window.dispatchEvent(new Event('reports-viewed'));

    // Escuta atualizações de estoque, modelos e contêineres
    const handleUpdate = () => {
      loadEntries();
    };

    window.addEventListener('stock-entries-updated', handleUpdate);
    window.addEventListener('tire-models-updated', handleUpdate);
    window.addEventListener('containers-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('stock-entries-updated', handleUpdate);
      window.removeEventListener('tire-models-updated', handleUpdate);
      window.removeEventListener('containers-updated', handleUpdate);
    };
  }, []);

  const loadEntries = async () => {
    console.log('📊 [Reports] Carregando dados do Supabase...');
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      
      // Busca entradas incluindo descartadas
      console.log('🔄 Reports: Buscando TODOS os stock_entries (sem limite)');
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      console.log(`✅ Reports: Query executada. Registros retornados: ${(stockData || []).length}`);

      if (stockError) {
        console.error('❌ Erro ao buscar entradas:', stockError);
      } else {
        // Converte snake_case para camelCase
        const stockEntries: StockEntry[] = (stockData || []).map((entry: any) => ({
          id: entry.id,
          barcode: entry.barcode,
          model_id: entry.model_id,
          model_name: entry.model_name,
          model_type: entry.model_type,
          container_id: entry.container_id || '',
          container_name: entry.container_name || 'Sem Contêiner',
          status: entry.status,
          session_id: entry.session_id,
          pilot: entry.pilot,
          team: entry.team,
          ano: entry.ano, // Campo temporada/ano
          etapa: entry.etapa, // Campo etapa
          categoria: entry.categoria, // Campo categoria
          campeonato: entry.campeonato, // Campo campeonato
          set_pneu: entry.set_pneu, // Campo set do pneu
          lado: entry.lado, // Campo lado do pneu
          notes: entry.notes,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          created_by: entry.created_by,
        }));

        setEntries(stockEntries);
        console.log(`✅ [Reports] ${stockEntries.length} entradas carregadas`);
      }

      // Busca modelos de pneus
      const { data: modelsData, error: modelsError } = await supabase
        .from('tire_models')
        .select('*')
        .order('name');

      if (modelsError) {
        console.error('❌ Erro ao buscar modelos:', modelsError);
      } else {
        const models: TireModel[] = (modelsData || []).map((model: any) => ({
          id: model.id,
          name: model.name,
          code: model.code,
          type: model.type,
          protheus_code: model.protheus_code,
          price_by_year: model.price_by_year,
          sale_price_by_year: model.sale_price_by_year,
        }));

        setTireModels(models);
        console.log(`✅ [Reports] ${models.length} modelos carregados`);
      }

      // Busca containers
      const { data: containersData, error: containersError } = await supabase
        .from('containers')
        .select('*')
        .order('name');

      if (containersError) {
        console.error('❌ Erro ao buscar containers:', containersError);
      } else {
        setContainers(containersData || []);
        console.log(`✅ [Reports] ${containersData?.length || 0} containers carregados`);
      }

      // Carrega dados dos cards do dashboard
      loadDashboardCards(stockData || [], containersData || []);
    } catch (error) {
      console.error('❌ Erro ao carregar relatórios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para carregar os cards do dashboard
  const loadDashboardCards = async (allEntries: any[], containers: any[]) => {
    try {
      const supabase = createClient();

      // Filtra pneus ativos (exclui descartados DSI)
      const activeEntries = allEntries.filter(entry => 
        entry.status !== 'Descartado DSI' && 
        entry.status !== 'Descarte DSI' && 
        entry.status !== 'Descarte'
      );

      // Busca status com ordem
      let tireStatusData: any[] | null = null;
      const result = await supabase
        .from('tire_status')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      
      tireStatusData = result.data;
      
      // Containers com pneus ativos
      const containersWithActiveTires = new Set(
        activeEntries
          .filter(e => e.container_id != null && e.container_id !== '')
          .map(e => e.container_id)
      ).size;

      // CARD FIXO: Total de Pneus
      const statsData: StatCard[] = [
        {
          title: 'Total de Pneus em estoque',
          value: activeEntries.length,
          changeLabel: 'em estoque ativo',
          icon: Package,
          gradient: 'from-blue-50 to-blue-100',
          iconBg: 'from-blue-500 to-blue-600',
          accentColor: '#3B82F6',
          containers: containersWithActiveTires,
          type: 'total',
        },
      ];

      // CARDS DINÂMICOS: Baseados nos status cadastrados
      if (tireStatusData && tireStatusData.length > 0) {
        tireStatusData.forEach((status: any) => {
          const isDiscardStatus = status.name === 'Descartado DSI' || 
                                  status.name === 'Descarte DSI' || 
                                  status.name === 'Descarte';
          const entriesToCount = isDiscardStatus ? allEntries : activeEntries;
          const countWithStatus = entriesToCount.filter(e => e.status === status.name).length;
          
          const containersWithStatus = new Set(
            entriesToCount
              .filter(e => e.status === status.name)
              .filter(e => e.container_id != null && e.container_id !== '')
              .map(e => e.container_id)
          ).size;

          // Mapeamento de ícones
          const getIconForStatus = (statusName: string) => {
            const lowerName = statusName.toLowerCase();
            if (lowerName.includes('novo')) return TrendingUp;
            if (lowerName.includes('cup') || lowerName.includes('ativo')) return Activity;
            if (lowerName.includes('descart')) return Trash2;
            if (lowerName.includes('piloto')) return User;
            return Box;
          };

          statsData.push({
            title: status.name,
            value: countWithStatus,
            changeLabel: `${countWithStatus} ${countWithStatus === 1 ? 'pneu' : 'pneus'}`,
            icon: getIconForStatus(status.name),
            gradient: '',
            iconBg: '',
            accentColor: status.color,
            containers: containersWithStatus,
            type: status.name.toLowerCase().replace(/\s+/g, '-') as any,
          });
        });
      }

      setDashboardStats(statsData);
    } catch (error) {
      console.error('❌ Erro ao carregar cards do dashboard:', error);
    }
  };

  // Carrega etapas cadastradas no master_data
  const loadStages = async () => {
    console.log('🏁 [Reports] Carregando etapas do banco...');
    
    try {
      const supabase = createClient();
      
      const { data: stagesData, error: stagesError } = await supabase
        .from('master_data')
        .select('name')  // CORREÇÃO: coluna correta é 'name', não 'value'
        .eq('type', 'etapa')
        .order('name');

      if (stagesError) {
        console.error('❌ Erro ao buscar etapas:', stagesError);
        // Fallback para etapas padrão se houver erro
        setStages(['0', '1', '2', '3', '4', '5', '5.1', '6', '7', '8', '9']);
      } else if (stagesData && stagesData.length > 0) {
        // Extrai os valores das etapas e ordena numericamente
        const stageValues = stagesData.map((item: any) => item.name); // CORREÇÃO: usa 'name'
        
        // Ordena numericamente (suporta decimais como 5.1)
        const sortedStages = stageValues.sort((a: string, b: string) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          return numA - numB;
        });
        
        setStages(sortedStages);
        console.log(`✅ [Reports] ${sortedStages.length} etapas carregadas:`, sortedStages);
      } else {
        // Fallback se não houver etapas cadastradas
        console.warn('⚠️ Nenhuma etapa cadastrada no banco. Usando etapas padrão.');
        setStages(['0', '1', '2', '3', '4', '5', '5.1', '6', '7', '8', '9']);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar etapas:', error);
      // Fallback para etapas padrão
      setStages(['0', '1', '2', '3', '4', '5', '5.1', '6', '7', '8', '9']);
    }
    
    // Carrega status do banco
    await loadTireStatuses();
  };

  // Carrega status de pneus cadastrados no tire_status
  const loadTireStatuses = async () => {
    console.log('🎨 [Reports] Carregando status de pneus do banco...');
    
    try {
      const supabase = createClient();
      
      const { data: statusData, error: statusError } = await supabase
        .from('tire_status')
        .select('id, name, color')
        .order('display_order', { ascending: true })
        .order('name');

      if (statusError) {
        console.error('❌ Erro ao buscar status:', statusError);
        setTireStatuses([]);
      } else if (statusData && statusData.length > 0) {
        setTireStatuses(statusData);
        console.log(`✅ [Reports] ${statusData.length} status carregados:`, statusData);
      } else {
        // Falha silenciosa - usa lista vazia
        setTireStatuses([]);
      }
    } catch (error) {
      // Falha silenciosa - usa lista vazia
      setTireStatuses([]);
    }
  };

  // 🔍 Função para carregar detalhes dos pneus de um container/modelo específico
  const loadTireDetails = async (containerName: string, modelName: string) => {
    setDetailLoading(true);
    setDetailContainer(containerName);
    setDetailModel(modelName);
    setDetailModalOpen(true);

    try {
      const supabase = createClient();
      
      // Busca todos os pneus deste container e modelo
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('container_name', containerName)
        .eq('model_name', modelName)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar detalhes:', error);
        toast.error('Erro ao carregar detalhes dos pneus');
        setDetailTires([]);
      } else {
        // Converte para formato StockEntry
        const tires: StockEntry[] = (data || []).map((entry: any) => ({
          id: entry.id,
          barcode: entry.barcode,
          model_id: entry.model_id,
          model_name: entry.model_name,
          model_type: entry.model_type,
          container_id: entry.container_id || '',
          container_name: entry.container_name || 'Sem Contêiner',
          status: entry.status,
          created_at: entry.created_at,
          pilot: entry.pilot,
          team: entry.team,
          session_id: entry.session_id,
          etapa: entry.etapa,
          ano: entry.ano,
          campeonato: entry.campeonato,
          categoria: entry.categoria,
          compound: entry.compound,
          set_pneu: entry.set_pneu,
          lado: entry.lado,
        }));
        
        setDetailTires(tires);
        toast.success(`${tires.length} ${tires.length === 1 ? 'pneu encontrado' : 'pneus encontrados'}`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes dos pneus');
      setDetailTires([]);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtra entradas por status, temporada, etapa, piloto, campeonato e categoria antes de agrupar
  const filteredEntriesByStatus = entries.filter(entry => {
    const matchesStatus = filterStatus.length === 0 || filterStatus.includes(entry.status || 'Novo');
    const matchesSeason = filterSeason.length === 0 || filterSeason.includes((entry as any).ano?.toString() || '');
    const matchesStage = filterStage.length === 0 || filterStage.includes((entry as any).etapa?.toString() || '');
    const matchesPilot = filterPilot.length === 0 || filterPilot.includes((entry as any).pilot || '');
    const matchesChampionship = filterChampionship.length === 0 || filterChampionship.includes((entry as any).campeonato || '');
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes((entry as any).categoria || '');
    const matchesModel = filterModel.length === 0 || filterModel.includes(entry.model_name || '');
    const matchesContainer = filterContainer.length === 0 || filterContainer.includes(entry.container_name || '');
    
    return matchesStatus && matchesSeason && matchesStage && matchesPilot && matchesChampionship && matchesCategory && matchesModel && matchesContainer;
  });

  // Agrupa entradas por modelo e contêiner
  const stockSummary: StockSummary[] = filteredEntriesByStatus.reduce((acc: StockSummary[], entry) => {
    const modelName = entry.model_name || 'Sem Modelo';
    const containerName = entry.container_name || 'Sem Contêiner';
    const key = `${modelName}-${containerName}`;
    const existing = acc.find(item => 
      item.model === modelName && item.container === containerName
    );

    if (existing) {
      existing.quantity += 1;
      if (new Date(entry.created_at) > new Date(existing.lastEntry)) {
        existing.lastEntry = entry.created_at;
      }
    } else {
      acc.push({
        model: modelName,
        container: containerName,
        quantity: 1,
        lastEntry: entry.created_at,
      });
    }

    return acc;
  }, []);

  // Ordena do maior para o menor
  const sortedSummary = [...stockSummary].sort((a, b) => b.quantity - a.quantity);

  // Filtra dados
  const filteredSummary = sortedSummary.filter(item => {
    const matchesSearch = (item.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.container || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = filterModel.length === 0 || filterModel.includes(item.model);
    const matchesContainer = filterContainer.length === 0 || filterContainer.includes(item.container);
    
    return matchesSearch && matchesModel && matchesContainer;
  });

  // Paginação
  const totalPages = Math.ceil(filteredSummary.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredSummary.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterModel, filterContainer, filterStatus, filterSeason, filterStage, filterPilot, filterChampionship, filterCategory, itemsPerPage]);

  // Reset página de histórico quando itens por página ou filtros mudam
  useEffect(() => {
    setHistoryPage(1);
    console.log(`[Reports] Paginação alterada para: ${historyItemsPerPage} itens por página`);
  }, [historyItemsPerPage, historySearchTerm, filterStatus, filterModel, filterContainer, filterSeason, filterStage, filterPilot, filterChampionship, filterCategory]);

  // Seleciona automaticamente a temporada atual (última cadastrada) - apenas na primeira carga
  useEffect(() => {
    // Só executa se ainda não inicializou e se há entradas
    if (hasInitializedSeason || entries.length === 0) {
      return;
    }
    
    // Calcula temporadas únicas a partir das entradas
    const currentUniqueSeasons = Array.from(new Set(entries.map((e: any) => e.ano || '')))
      .filter(s => s && s.toString().trim() !== '')
      .sort((a, b) => b.toString().localeCompare(a.toString())); // Ordem decrescente (2025, 2024...)
    
    // Se houver temporadas, seleciona a primeira (mais recente - última cadastrada)
    if (currentUniqueSeasons.length > 0) {
      const currentSeason = currentUniqueSeasons[0]; // Primeira posição = temporada mais recente
      setFilterSeason([currentSeason.toString()]);
      setHasInitializedSeason(true); // Marca como inicializado
      console.log(`✅ [Reports] Temporada atual selecionada automaticamente: ${currentSeason}`);
    }
  }, [entries, hasInitializedSeason]); // Executa quando entries mudar ou flag mudar

  // Prepara dados para o gráfico - agrupa por modelo (soma todos os containers)
  const modelSummary = filteredEntriesByStatus.reduce((acc: { [key: string]: number }, entry) => {
    const modelName = entry.model_name || 'Sem Modelo';
    if (!acc[modelName]) {
      acc[modelName] = 0;
    }
    acc[modelName] += 1;
    return acc;
  }, {});

  const chartData = Object.entries(modelSummary)
    .map(([name, quantidade]) => ({ name, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
  
  // Debug log para verificar dados
  console.log('[Reports] chartData:', chartData);

  // CORREÇÃO: Prepara dados para o gráfico de status - usa filteredEntriesByStatus
  // Isso garante que a contagem respeite os filtros aplicados (temporada, etapa, piloto, status)
  const statusSummary = filteredEntriesByStatus.reduce((acc: { [key: string]: { count: number; color: string } }, entry) => {
    const statusName = entry.status || 'Sem Status';
    if (!acc[statusName]) {
      // Busca a cor do status no array tireStatuses
      const statusInfo = tireStatuses.find(s => s.name === statusName);
      acc[statusName] = {
        count: 0,
        color: statusInfo?.color || '#6B7280' // Cinza padrão se não encontrar
      };
    }
    acc[statusName].count += 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(statusSummary)
    .map(([name, data]) => ({ 
      name, 
      quantidade: data.count,
      color: data.color
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
  
  console.log('[Reports] statusChartData:', statusChartData);

  // Estatísticas gerais (usa entradas filtradas por status)
  const totalTires = filteredEntriesByStatus.length;
  const totalModels = new Set(filteredEntriesByStatus.map(e => e.model_name || '').filter(m => m !== '')).size;
  // IMPORTANTE: Conta apenas containers com pneus ATIVOS (não descartados e com container válido)
  const totalContainers = new Set(
    filteredEntriesByStatus
      .filter(e => 
        e.container_name != null && 
        e.container_name !== '' &&
        e.container_name !== 'null' && // Exclui string 'null'
        e.container_name !== 'Sem Contêiner' &&
        e.status !== 'Descartado/DSI' // Exclui pneus descartados
      )
      .map(e => e.container_name)
  ).size;

  // Modelos únicos para filtro - usa lista completa do Supabase
  const uniqueModels = tireModels.map(m => m.name).sort();
  
  // Containers únicos para filtro - usa lista completa do Supabase
  const uniqueContainers = containers.map(c => c.name).sort();
  
  // Temporadas únicas (ano)
  const uniqueSeasons = Array.from(new Set(entries.map((e: any) => e.ano || '')))
    .filter(s => s && s.toString().trim() !== '')
    .sort((a, b) => b.toString().localeCompare(a.toString())); // Ordem decrescente (2025, 2024...)
  
  // Etapas únicas - filtra baseado em outros filtros ativos (exceto filterStage)
  // Melhora UX mostrando apenas etapas com registros considerando outros filtros
  const uniqueStages = Array.from(new Set(
    entries
      .filter(entry => {
        const matchesStatus = filterStatus.length === 0 || filterStatus.includes(entry.status || 'Novo');
        const matchesSeason = filterSeason.length === 0 || filterSeason.includes((entry as any).ano?.toString() || '');
        const matchesPilot = filterPilot.length === 0 || filterPilot.includes((entry as any).pilot || '');
        const matchesChampionship = filterChampionship.length === 0 || filterChampionship.includes((entry as any).campeonato || '');
        const matchesCategory = filterCategory.length === 0 || filterCategory.includes((entry as any).categoria || '');
        const matchesModel = filterModel.length === 0 || filterModel.includes(entry.model_name || '');
        const matchesContainer = filterContainer.length === 0 || filterContainer.includes(entry.container_name || '');

        return matchesStatus && matchesSeason && matchesPilot && matchesChampionship && matchesCategory && matchesModel && matchesContainer;
      })
      .map((e: any) => e.etapa || '')
  ))
    .filter(s => s && s.toString().trim() !== '')
    .sort((a, b) => {
      const numA = parseFloat(a.toString());
      const numB = parseFloat(b.toString());
      return numA - numB; // Ordem crescente (0, 1, 2, 3...)
    });
  
  // Pilotos únicos
  const uniquePilots = Array.from(new Set(entries.map((e: any) => e.pilot || '')))
    .filter(p => p && p.toString().trim() !== '')
    .sort((a, b) => a.toString().localeCompare(b.toString(), 'pt-BR'));
  
  // Campeonatos únicos
  const uniqueChampionships = Array.from(new Set(entries.map((e: any) => e.campeonato || '')))
    .filter(c => c && c.toString().trim() !== '')
    .sort((a, b) => a.toString().localeCompare(b.toString(), 'pt-BR'));
  
  // Categorias únicas (da coluna categoria em stock_entries)
  const uniqueCategories = Array.from(new Set(entries.map((e: any) => e.categoria || '')))
    .filter(c => c && c.toString().trim() !== '')
    .sort((a, b) => a.toString().localeCompare(b.toString(), 'pt-BR'));

  // Busca o tipo do modelo a partir dos modelos carregados
  const getModelType = (modelName: string): string => {
    const model = tireModels.find(m => m.name === modelName);
    return model?.type || 'Slick';
  };

  // 📊 Colunas disponíveis para exportação
  const exportColumns = [
    { id: 'barcode', label: 'Código de Barras', required: true },
    { id: 'model', label: 'Modelo', required: true },
    { id: 'tire_code', label: 'Código do Pneu' },
    { id: 'status', label: 'Status', required: true },
    { id: 'set', label: 'Set' },
    { id: 'lado', label: 'Lado' },
    { id: 'container', label: 'Contêiner' },
    { id: 'season', label: 'Temporada' },
    { id: 'stage', label: 'Etapa' },
    { id: 'pilot', label: 'Piloto' },
    { id: 'championship', label: 'Campeonato' },
    { id: 'category', label: 'Categoria' },
    { id: 'date', label: 'Data de Registro' }
  ];

  // 📥 Função unificada de exportação
  const handleExport = async (format: ExportFormat, options: ExportOptions) => {
    try {
      switch (format) {
        case 'excel':
          exportStockToExcel(filteredEntriesByStatus, tireModels, {
            fileName: `Estoque_Pneus_${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: {
              season: filterSeason,
              stage: filterStage,
              status: filterStatus,
              model: filterModel,
              container: filterContainer,
              pilot: filterPilot,
              championship: filterChampionship,
              category: filterCategory,
            },
            includeFiltersSummary: options.includeFooter,
          });
          toast.success('Excel exportado com sucesso!', { duration: 3000 });
          break;

        case 'protheus':
          // Abre o modal para seleção de temporada e etapa
          setShowProtheusDialog(true);
          break;

        case 'pdf':
          exportToPDF(options);
          break;

        case 'csv':
          exportToCSV(options);
          break;

        case 'print':
          handlePrint(options);
          break;
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      throw error; // Re-throw para o ExportMenu capturar
    }
  };

  // 📊 Função para exportar relatório Protheus (chamada pelo modal)
  const handleProtheusExport = async (season: string, stage: string) => {
    try {
      toast.info('Gerando relatório Protheus...', { duration: 2000 });
      
      console.log('[Reports] Iniciando exportação Protheus');
      console.log('[Reports] Total de entries:', entries.length);
      console.log('[Reports] Total de tire models:', tireModels.length);
      console.log('[Reports] Amostra tire models:', tireModels.slice(0, 3).map(m => ({
        name: m.name,
        protheus_code: m.protheus_code,
        price_by_year: m.price_by_year,
        sale_price_by_year: m.sale_price_by_year
      })));
      
      const { exportProtheusReport } = await import('../utils/excelExport');
      const result = exportProtheusReport(entries, tireModels, season, stage);
      
      toast.success('Relatório Protheus exportado!', { 
        description: `${result.recordCount} pneus exportados (Temporada ${season}, Etapa ${stage})`,
        duration: 4000 
      });
    } catch (error: any) {
      console.error('Erro ao exportar Protheus:', error);
      toast.error('Erro ao exportar', {
        description: error.message || 'Tente novamente'
      });
      throw error;
    }
  };

  // 📄 Exportar para CSV
  const exportToCSV = (options: ExportOptions) => {
    try {
      toast.info('Gerando CSV...', { duration: 2000 });

      // Headers
      const headers = ['Código', 'Modelo', 'Código do Pneu', 'Status', 'Contêiner', 'Temporada', 'Etapa', 'Piloto', 'Campeonato', 'Categoria', 'Data'];

      // Filtrar colunas baseado nas seleções
      const selectedHeaders = headers.filter((_, index) => {
        const columnIds = ['barcode', 'model', 'tire_code', 'status', 'container', 'season', 'stage', 'pilot', 'championship', 'category', 'date'];
        return options.selectedColumns.includes(columnIds[index]);
      });

      // Dados
      const rows = filteredEntriesByStatus.map((entry: any) => {
        const model = tireModels.find(m => m.name === entry.model_name);
        const tireCode = model?.code || '';

        const row = [
          entry.barcode || '',
          entry.model_name || '',
          tireCode,
          entry.status || '',
          entry.container_name || 'Sem Contêiner',
          entry.ano || '',
          entry.etapa || '',
          entry.pilot || '',
          entry.campeonato || '',
          entry.categoria || '',
          new Date(entry.created_at).toLocaleDateString('pt-BR')
        ];

        // Filtrar colunas
        const columnIds = ['barcode', 'model', 'tire_code', 'status', 'container', 'season', 'stage', 'pilot', 'championship', 'category', 'date'];
        return row.filter((_, index) => options.selectedColumns.includes(columnIds[index]));
      });

      // Montar CSV
      let csv = options.includeHeaders ? selectedHeaders.join(',') + '\n' : '';
      csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      // Footer
      if (options.includeFooter) {
        csv += '\n\n';
        csv += `"Total de Registros","${filteredEntriesByStatus.length}"\n`;
      }

      // Timestamp
      if (options.includeTimestamp) {
        csv += `\n"Exportado em","${new Date().toLocaleString('pt-BR')}"\n`;
      }

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Estoque_Pneus_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('CSV exportado com sucesso!', { duration: 3000 });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV');
      throw error;
    }
  };

  // 🖨️ Imprimir
  const handlePrint = (options: ExportOptions) => {
    try {
      toast.info('Preparando impressão...', { duration: 2000 });

      // Criar janela de impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup bloqueado. Permita popups para imprimir.');
        return;
      }

      // Mapeia IDs de colunas para configuração
      const columnConfig = {
        barcode: { label: 'Código', visible: options.selectedColumns.includes('barcode') },
        model: { label: 'Modelo', visible: options.selectedColumns.includes('model') },
        tire_code: { label: 'Código do Pneu', visible: options.selectedColumns.includes('tire_code') },
        status: { label: 'Status', visible: options.selectedColumns.includes('status') },
        container: { label: 'Contêiner', visible: options.selectedColumns.includes('container') },
        season: { label: 'Temporada', visible: options.selectedColumns.includes('season') },
        stage: { label: 'Etapa', visible: options.selectedColumns.includes('stage') },
        pilot: { label: 'Piloto', visible: options.selectedColumns.includes('pilot') },
        championship: { label: 'Campeonato', visible: options.selectedColumns.includes('championship') },
        category: { label: 'Categoria', visible: options.selectedColumns.includes('category') },
        date: { label: 'Data', visible: options.selectedColumns.includes('date') }
      };

      // Gera cabeçalhos da tabela
      const tableHeaders = Object.entries(columnConfig)
        .filter(([_, config]) => config.visible)
        .map(([_, config]) => `<th>${config.label}</th>`)
        .join('');

      // Gera linhas da tabela
      const tableRows = filteredEntriesByStatus.slice(0, 500).map((entry: any) => {
        const model = tireModels.find(m => m.name === entry.model_name);
        const tireCode = model?.code || '';

        const cells: string[] = [];
        if (columnConfig.barcode.visible) cells.push(`<td>${entry.barcode || ''}</td>`);
        if (columnConfig.model.visible) cells.push(`<td>${entry.model_name || ''}</td>`);
        if (columnConfig.tire_code.visible) cells.push(`<td>${tireCode}</td>`);
        if (columnConfig.status.visible) cells.push(`<td>${entry.status || ''}</td>`);
        if (columnConfig.container.visible) cells.push(`<td>${entry.container_name || 'Sem Contêiner'}</td>`);
        if (columnConfig.season.visible) cells.push(`<td>${entry.ano || ''}</td>`);
        if (columnConfig.stage.visible) cells.push(`<td>${entry.etapa || ''}</td>`);
        if (columnConfig.pilot.visible) cells.push(`<td>${entry.pilot || ''}</td>`);
        if (columnConfig.championship.visible) cells.push(`<td>${entry.campeonato || ''}</td>`);
        if (columnConfig.category.visible) cells.push(`<td>${entry.categoria || ''}</td>`);
        if (columnConfig.date.visible) cells.push(`<td>${new Date(entry.created_at).toLocaleDateString('pt-BR')}</td>`);
        return `<tr>${cells.join('')}</tr>`;
      }).join('');

      // HTML da impressão
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório de Estoque - Conecta Cup</title>
          <style>
            @page { margin: 2cm; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10pt;
              line-height: 1.4;
            }
            h1 { 
              color: #D50000; 
              font-size: 18pt;
              margin-bottom: 0.5cm;
              border-bottom: 2px solid #D50000;
              padding-bottom: 0.3cm;
            }
            .summary {
              background: #f5f5f5;
              padding: 0.5cm;
              margin: 0.5cm 0;
              border-left: 4px solid #D50000;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 0.5cm 0;
            }
            th { 
              background: #D50000; 
              color: white; 
              padding: 8px; 
              text-align: left;
              font-weight: bold;
              font-size: 9pt;
            }
            td { 
              border-bottom: 1px solid #ddd; 
              padding: 6px; 
              font-size: 9pt;
            }
            tr:nth-child(even) { background: #f9f9f9; }
            .footer {
              margin-top: 1cm;
              padding-top: 0.5cm;
              border-top: 1px solid #ddd;
              font-size: 8pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Estoque de Pneus - Conecta Cup</h1>
          
          ${options.includeHeaders ? `
          <div class="summary">
            <strong>Resumo:</strong><br>
            Total de Pneus: ${totalTires} | 
            Modelos: ${totalModels} | 
            Contêineres: ${totalContainers}
          </div>
          ` : ''}

          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          ${filteredEntriesByStatus.length > 500 ? '<p><em>Exibindo primeiros 500 registros de ' + filteredEntriesByStatus.length + '</em></p>' : ''}

          ${options.includeFooter ? `
          <div class="footer">
            ${options.includeTimestamp ? `Gerado em: ${new Date().toLocaleString('pt-BR')}<br>` : ''}
            Sistema de Gestão de Pneus - Conecta Cup
          </div>
          ` : ''}
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Aguardar carregamento e imprimir
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        toast.success('Impressão iniciada!', { duration: 3000 });
      };
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao preparar impressão');
      throw error;
    }
  };

  // Função para exportar PDF
  const exportToPDF = (options: ExportOptions) => {
    try {
      toast.info('Gerando PDF...', { duration: 2000 });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Função auxiliar para adicionar nova página se necessário
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Função para adicionar título de seção
      const addSectionTitle = (title: string) => {
        checkPageBreak(15);
        doc.setFillColor(213, 0, 0);
        doc.rect(14, yPosition - 2, pageWidth - 28, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageWidth / 2, yPosition + 5, { align: 'center' });
        yPosition += 15;
        doc.setTextColor(0, 0, 0);
      };

      // CABEÇALHO DO RELATÓRIO
      if (options.includeHeaders) {
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO OPERACIONAL DE PNEUS', pageWidth / 2, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Porsche Cup Brasil', pageWidth / 2, 20, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPosition = 40;

        // Data de geração
        if (options.includeTimestamp) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, yPosition, { align: 'right' });
          yPosition += 10;
        }
      } else {
        yPosition = 20;
      }

      // ===================================
      // 1. RESUMO EXECUTIVO
      // ===================================
      addSectionTitle('1. RESUMO EXECUTIVO');
      
      const summaryData = [
        ['Total de Pneus', totalTires.toString()],
        ['Modelos Cadastrados', totalModels.toString()],
        ['Contêineres Ativos', totalContainers.toString()],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Indicador', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'center', cellWidth: 80 }
        },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===================================
      // 2. DISTRIBUIÇÃO POR MODELO
      // ===================================
      addSectionTitle('2. DISTRIBUIÇÃO POR MODELO');

      const modelTableData = chartData.map(item => [
        item.name,
        item.quantidade.toString(),
        ((item.quantidade / totalTires) * 100).toFixed(1) + '%'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Modelo', 'Quantidade', '% do Total']],
        body: modelTableData,
        theme: 'striped',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 45 },
          2: { halign: 'center', cellWidth: 45 }
        },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===================================
      // 3. DISTRIBUIÇÃO POR STATUS
      // ===================================
      addSectionTitle('3. DISTRIBUIÇÃO POR STATUS');

      const statusTableData = statusChartData.map(item => [
        item.name,
        item.quantidade.toString(),
        ((item.quantidade / entries.length) * 100).toFixed(1) + '%'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Status', 'Quantidade', '% do Total']],
        body: statusTableData,
        theme: 'striped',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 45 },
          2: { halign: 'center', cellWidth: 45 }
        },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===================================
      // 4. OCUPAÇÃO DE CONTÊINERES
      // ===================================
      doc.addPage();
      yPosition = 20;
      addSectionTitle('4. OCUPAÇÃO DE CONTÊINERES');

      const containerTableData = containers.map((container: any) => {
        const containerEntries = entries.filter(e => e.container_name === container.name);
        const occupancy = container.capacity > 0 
          ? ((containerEntries.length / container.capacity) * 100).toFixed(1) + '%'
          : 'N/A';
        return [
          container.name,
          container.location || '-',
          containerEntries.length.toString(),
          container.capacity?.toString() || '-',
          occupancy
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Contêiner', 'Localização', 'Ocupados', 'Capacidade', 'Ocupação']],
        body: containerTableData,
        theme: 'grid',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 28 },
          4: { halign: 'center', cellWidth: 25 }
        },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===================================
      // 5. DISTRIBUIÇÃO POR PILOTOS (Top 10)
      // ===================================
      checkPageBreak(60);
      addSectionTitle('5. DISTRIBUIÇÃO POR PILOTOS (Top 10)');

      const pilotCounts = uniquePilots.map(pilot => {
        const count = entries.filter((e: any) => e.pilot === pilot).length;
        return { pilot, count };
      }).sort((a, b) => b.count - a.count).slice(0, 10);

      const pilotTableData = pilotCounts.map(item => [
        item.pilot,
        item.count.toString()
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Piloto', 'Quantidade de Pneus']],
        body: pilotTableData,
        theme: 'striped',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===================================
      // 6. DISTRIBUIÇÃO POR CATEGORIAS
      // ===================================
      checkPageBreak(60);
      addSectionTitle('6. DISTRIBUIÇÃO POR CATEGORIAS');

      const categoryCounts = categoryDataArray.map(cat => [
        cat.category,
        cat.total.toString()
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Categoria', 'Quantidade de Pneus']],
        body: categoryCounts,
        theme: 'striped',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===================================
      // 7. DADOS DETALHADOS DO ESTOQUE (Personalizado)
      // ===================================
      doc.addPage();
      yPosition = 20;
      addSectionTitle('7. DADOS DETALHADOS DO ESTOQUE');

      // Mapeia IDs de colunas para configuração
      const columnConfig = {
        barcode: { label: 'Código', visible: options.selectedColumns.includes('barcode') },
        model: { label: 'Modelo', visible: options.selectedColumns.includes('model') },
        tire_code: { label: 'Cód. Pneu', visible: options.selectedColumns.includes('tire_code') },
        status: { label: 'Status', visible: options.selectedColumns.includes('status') },
        container: { label: 'Contêiner', visible: options.selectedColumns.includes('container') },
        season: { label: 'Temp.', visible: options.selectedColumns.includes('season') },
        stage: { label: 'Etapa', visible: options.selectedColumns.includes('stage') },
        pilot: { label: 'Piloto', visible: options.selectedColumns.includes('pilot') },
        championship: { label: 'Camp.', visible: options.selectedColumns.includes('championship') },
        category: { label: 'Categ.', visible: options.selectedColumns.includes('category') },
        date: { label: 'Data', visible: options.selectedColumns.includes('date') }
      };

      // Gera cabeçalhos e índices das colunas visíveis
      const visibleColumns = Object.entries(columnConfig)
        .filter(([_, config]) => config.visible)
        .map(([key, config]) => ({ key, ...config }));

      const tableHead = [visibleColumns.map(col => col.label)];

      // Gera corpo da tabela (limita a 100 registros para não sobrecarregar o PDF)
      const tableBody = filteredEntriesByStatus.slice(0, 100).map((entry: any) => {
        const model = tireModels.find(m => m.name === entry.model_name);
        const tireCode = model?.code || '';

        const row: string[] = [];
        visibleColumns.forEach(col => {
          switch (col.key) {
            case 'barcode':
              row.push(entry.barcode || '');
              break;
            case 'model':
              row.push(entry.model_name || '');
              break;
            case 'tire_code':
              row.push(tireCode);
              break;
            case 'status':
              row.push(entry.status || '');
              break;
            case 'container':
              row.push(entry.container_name || 'Sem Contêiner');
              break;
            case 'season':
              row.push(entry.ano || '');
              break;
            case 'stage':
              row.push(entry.etapa || '');
              break;
            case 'pilot':
              row.push(entry.pilot || '');
              break;
            case 'championship':
              row.push(entry.campeonato || '');
              break;
            case 'category':
              row.push(entry.categoria || '');
              break;
            case 'date':
              row.push(new Date(entry.created_at).toLocaleDateString('pt-BR'));
              break;
          }
        });
        return row;
      });

      autoTable(doc, {
        startY: yPosition,
        head: options.includeHeaders ? tableHead : [],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [213, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
        margin: { left: 10, right: 10 },
        tableWidth: 'auto'
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      if (filteredEntriesByStatus.length > 100) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `* Exibindo primeiros 100 registros de ${filteredEntriesByStatus.length}. Para relatório completo, exporte em Excel.`,
          pageWidth / 2,
          yPosition,
          { align: 'center' }
        );
      }

      // ===================================
      // RODAPÉ EM TODAS AS PÁGINAS
      // ===================================
      if (options.includeFooter) {
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          
          let footerText = 'Conecta Cup - Sistema de Gestão de Pneus';
          if (options.includeTimestamp) {
            footerText += ` | ${new Date().toLocaleString('pt-BR')}`;
          }
          
          doc.text(
            footerText,
            14,
            pageHeight - 10
          );
        }
      }

      // Salvar PDF
      const fileName = `Relatorio_Operacional_Pneus_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('PDF exportado com sucesso!', { duration: 3000 });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.', { duration: 5000 });
    }
  };

  // Agrupa pneus por container para visualização
  const containerGroups = uniqueContainers.map(containerName => {
    const containerEntries = filteredEntriesByStatus.filter(e => e.container_name === containerName);
    const modelBreakdown = containerEntries.reduce((acc: any[], entry) => {
      const modelName = entry.model_name || 'Sem Modelo';
      const existing = acc.find(item => item.model === modelName);
      if (existing) {
        existing.quantity += 1;
      } else {
        acc.push({
          model: modelName,
          type: entry.model_type || getModelType(modelName),
          quantity: 1,
        });
      }
      return acc;
    }, []);

    return {
      containerName,
      totalPneus: containerEntries.length,
      models: modelBreakdown.sort((a, b) => b.quantity - a.quality),
      lastEntry: containerEntries.length > 0 
        ? new Date(Math.max(...containerEntries.map(e => new Date(e.created_at).getTime())))
        : null,
      entries: containerEntries,
    };
  }).filter(container => container.totalPneus > 0).sort((a, b) => b.totalPneus - a.totalPneus);

  // ===================================
  // DASHBOARD DE PILOTOS POR ETAPA
  // ===================================
  
  // Agrupa pneus por piloto e etapa (usa etapas dinâmicas do estado)
  interface PilotStageData {
    pilot: string;
    stages: { [stage: string]: number };
    total: number;
  }
  
  const pilotData: { [pilot: string]: PilotStageData } = {};
  
  // Processa todas as entradas FILTRADAS (respeita filtros globais)
  filteredEntriesByStatus.forEach(entry => {
    const pilotName = entry.pilot?.trim();
    const stageName = (entry as any).etapa?.trim(); // etapa vem do campo ARCS
    
    // Só processa se tiver piloto definido
    if (pilotName && pilotName !== '') {
      if (!pilotData[pilotName]) {
        pilotData[pilotName] = {
          pilot: pilotName,
          stages: {},
          total: 0,
        };
      }
      
      // Incrementa contador da etapa (se etapa estiver definida)
      if (stageName && stageName !== '') {
        if (!pilotData[pilotName].stages[stageName]) {
          pilotData[pilotName].stages[stageName] = 0;
        }
        pilotData[pilotName].stages[stageName]++;
      }
      
      // Incrementa total
      pilotData[pilotName].total++;
    }
  });
  
  // Converte para array e ordena por nome do piloto
  const pilotDataArray = Object.values(pilotData).sort((a, b) => 
    a.pilot.localeCompare(b.pilot, 'pt-BR')
  );

  // ===================================
  // DASHBOARD DE CATEGORIAS POR ETAPA
  // ===================================
  
  // Agrupa pneus por categoria e etapa
  interface CategoryStageData {
    category: string;
    stages: { [stage: string]: number };
    total: number;
  }
  
  const categoryData: { [category: string]: CategoryStageData } = {};
  
  // Processa todas as entradas FILTRADAS (respeita filtros globais)
  filteredEntriesByStatus.forEach(entry => {
    const categoryName = (entry as any).categoria?.trim(); // categoria vem do campo ARCS
    const stageName = (entry as any).etapa?.trim(); // etapa vem do campo ARCS
    
    // Só processa se tiver categoria definida
    if (categoryName && categoryName !== '') {
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = {
          category: categoryName,
          stages: {},
          total: 0,
        };
      }
      
      // Incrementa contador da etapa (se etapa estiver definida)
      if (stageName && stageName !== '') {
        if (!categoryData[categoryName].stages[stageName]) {
          categoryData[categoryName].stages[stageName] = 0;
        }
        categoryData[categoryName].stages[stageName]++;
      }
      
      // Incrementa total
      categoryData[categoryName].total++;
    }
  });
  
  // Converte para array e ordena por nome da categoria
  const categoryDataArray = Object.values(categoryData).sort((a, b) =>
    a.category.localeCompare(b.category, 'pt-BR')
  );

  // ===================================
  // DADOS POR MODELO DE PNEU
  // ===================================
  interface ModelStageData {
    model: string;
    stages: { [stage: string]: number };
    total: number;
  }

  const modelData: { [model: string]: ModelStageData } = {};

  // Cria mapeamento de model_id para code (formato 30/65-18)
  const modelIdToCode = new Map<string, string>();
  tireModels.forEach(model => {
    modelIdToCode.set(model.id, model.code);
  });

  // Processa todas as entradas FILTRADAS (respeita filtros globais)
  filteredEntriesByStatus.forEach(entry => {
    const modelCode = modelIdToCode.get(entry.model_id) || entry.model_name; // usa code do tire_models (ex: 30/65-18)
    const stageName = (entry as any).etapa?.trim(); // etapa vem do campo ARCS

    // Só processa se tiver modelo definido
    if (modelCode && modelCode !== '' && modelCode !== '-') {
      if (!modelData[modelCode]) {
        modelData[modelCode] = {
          model: modelCode,
          stages: {},
          total: 0,
        };
      }

      // Incrementa contador da etapa (se etapa estiver definida)
      if (stageName && stageName !== '') {
        if (!modelData[modelCode].stages[stageName]) {
          modelData[modelCode].stages[stageName] = 0;
        }
        modelData[modelCode].stages[stageName]++;
      }

      // Incrementa total
      modelData[modelCode].total++;
    }
  });

  // Converte para array e ordena por nome do modelo
  const modelDataArray = Object.values(modelData).sort((a, b) =>
    a.model.localeCompare(b.model, 'pt-BR')
  );

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 px-3 py-3 sm:p-4 lg:p-8 w-full max-w-full">
        <div className="max-w-7xl lg:mx-auto w-full space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-3">
            <div className="h-8 w-1/3 bg-gray-200 rounded animate-shimmer" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-shimmer" />
          </div>

          {/* Report Skeleton */}
          <ReportSkeleton />

          {/* Loading centralizado */}
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Carregando relatórios..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedTransition variant="fade">
      <div className="flex-1 px-3 py-3 sm:p-4 lg:p-8 w-full max-w-full">
        <div className="max-w-7xl lg:mx-auto w-full">
          {/* Header */}
          <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-gray-900 mb-1 sm:mb-2 truncate">Relatórios & Histórico</h1>
            <p className="text-gray-500 text-sm">Visualize e analise o estoque de pneus</p>
          </div>
          <ExportMenu
            onExport={handleExport}
            columns={exportColumns}
            totalRecords={filteredEntriesByStatus.length}
            size="sm"
            className="bg-[#D50000] hover:bg-[#A80000] text-white shadow-md hover:shadow-lg transition-all"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
          <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Total de Pneus</p>
                <p className="text-gray-900 text-xl sm:text-2xl">{totalTires}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D50000]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="text-[#D50000]" size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Modelos Ativos</p>
                <p className="text-gray-900 text-xl sm:text-2xl">{totalModels}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-blue-600" size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Contêineres Ativos</p>
                <p className="text-gray-900 text-xl sm:text-2xl">{totalContainers}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-green-600" size={20} />
              </div>
            </div>
          </Card>
        </div>

        {/* KPI Cards do Dashboard */}
        {dashboardStats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4 mb-8">
            {dashboardStats.map((stat, index) => {
              const Icon = stat.icon;
              const isSelected = selectedCard === stat.type;
              
              return (
                <Card 
                  key={index}
                  onClick={() => setSelectedCard(isSelected ? null : stat.type)}
                  className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-102 cursor-pointer group"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(stat.accentColor, 0.1)} 0%, ${hexToRgba(stat.accentColor, 0.2)} 100%)`,
                    borderColor: hexToRgba(stat.accentColor, 0.3),
                    ...(isSelected && {
                      boxShadow: `0 0 0 3px ${hexToRgba(stat.accentColor, 0.4)}`,
                      transform: 'scale(1.02)'
                    })
                  }}
                >
                  {/* Background decoration */}
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150"
                    style={{
                      backgroundColor: hexToRgba(stat.accentColor, 0.1)
                    }}
                  />
                  
                  {/* Content */}
                  <div className="relative p-3 space-y-2">
                    {/* Header com ícone */}
                    <div className="flex items-center justify-between">
                      <div 
                        className="p-2 rounded-lg shadow-sm transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${stat.accentColor} 0%, ${stat.accentColor}dd 100%)`
                        }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Título */}
                    <div>
                      <p 
                        className="text-xs font-medium mb-1 line-clamp-2"
                        style={{ color: stat.accentColor }}
                      >
                        {stat.title}
                      </p>
                      <p 
                        className="text-2xl font-bold"
                        style={{ color: stat.accentColor }}
                      >
                        {stat.value.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* Label de mudança e containers */}
                    <div className="space-y-0.5">
                      <p 
                        className="text-[10px] flex items-center gap-1 line-clamp-1"
                        style={{ color: hexToRgba(stat.accentColor, 0.8) }}
                      >
                        <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{stat.changeLabel}</span>
                      </p>
                      {stat.containers !== undefined && (
                        <p 
                          className="text-[10px] font-medium flex items-center gap-1"
                          style={{ color: hexToRgba(stat.accentColor, 0.7) }}
                        >
                          <Package className="w-2.5 h-2.5 flex-shrink-0" />
                          {stat.containers} {stat.containers === 1 ? 'cont.' : 'conts.'}
                        </p>
                      )}
                    </div>

                    {/* Indicador de clique */}
                    <div 
                      className={`absolute bottom-1.5 right-1.5 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                      style={{ color: hexToRgba(stat.accentColor, 0.6) }}
                    >
                      {isSelected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </Card>
              );
            })}
          </div>
        )}

        {/* Filtros Globais - Aplicam em todas as abas */}
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm mb-4 sm:mb-6" style={{ contain: 'layout style paint' }}>
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
            <h3 className="text-gray-900 text-base sm:text-lg">Filtros</h3>
            {(filterStatus.length > 0 || filterModel.length > 0 || filterContainer.length > 0 || 
              filterCategory.length > 0 || filterSeason.length > 0 || filterStage.length > 0 || 
              filterPilot.length > 0 || filterChampionship.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStatus([]);
                  setFilterModel([]);
                  setFilterContainer([]);
                  setFilterCategory([]);
                  setFilterSeason([]);
                  setFilterStage([]);
                  setFilterPilot([]);
                  setFilterChampionship([]);
                  // Não reseta hasInitializedSeason - permite que usuário limpe filtros manualmente
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Limpar filtros</span>
                <span className="sm:hidden">Limpar</span>
              </Button>
            )}
          </div>
          
          {/* 📱 MOBILE: MobileFilters */}
          <div className="lg:hidden">
            <MobileFilters
              sections={[
                {
                  id: 'status',
                  label: 'Status',
                  icon: <Activity className="w-5 h-5" />,
                  options: tireStatuses.map(status => ({
                    value: status.name,
                    label: status.name,
                    count: filteredEntriesByStatus.filter(e => e.status === status.name).length
                  })),
                  selectedValues: filterStatus,
                  onChange: setFilterStatus
                },
                {
                  id: 'model',
                  label: 'Modelo de Pneu',
                  icon: <Package className="w-5 h-5" />,
                  options: uniqueModels.map(model => ({
                    value: model,
                    label: model,
                    count: filteredEntriesByStatus.filter(e => e.model_name === model).length
                  })),
                  selectedValues: filterModel,
                  onChange: setFilterModel
                },
                {
                  id: 'container',
                  label: 'Contêiner',
                  icon: <Box className="w-5 h-5" />,
                  options: uniqueContainers.map(container => ({
                    value: container,
                    label: container,
                    count: filteredEntriesByStatus.filter(e => e.container_name === container).length
                  })),
                  selectedValues: filterContainer,
                  onChange: setFilterContainer
                },
                {
                  id: 'category',
                  label: 'Categoria',
                  icon: <Users className="w-5 h-5" />,
                  options: uniqueCategories.map(category => ({
                    value: category,
                    label: category,
                    count: filteredEntriesByStatus.filter((e: any) => e.categoria === category).length
                  })),
                  selectedValues: filterCategory,
                  onChange: setFilterCategory
                },
                {
                  id: 'season',
                  label: 'Temporada',
                  icon: <Calendar className="w-5 h-5" />,
                  options: uniqueSeasons.map(season => ({
                    value: season.toString(),
                    label: season.toString(),
                    count: filteredEntriesByStatus.filter((e: any) => e.ano === season).length
                  })),
                  selectedValues: filterSeason,
                  onChange: setFilterSeason
                },
                {
                  id: 'stage',
                  label: 'Etapa',
                  icon: <TrendingUp className="w-5 h-5" />,
                  options: uniqueStages.map(stage => ({
                    value: stage.toString(),
                    label: `Etapa ${stage}`,
                    count: filteredEntriesByStatus.filter((e: any) => e.etapa?.toString() === stage.toString()).length
                  })),
                  selectedValues: filterStage,
                  onChange: setFilterStage
                },
                {
                  id: 'pilot',
                  label: 'Piloto',
                  icon: <User className="w-5 h-5" />,
                  options: uniquePilots.map(pilot => ({
                    value: pilot,
                    label: pilot,
                    count: filteredEntriesByStatus.filter((e: any) => e.pilot === pilot).length
                  })),
                  selectedValues: filterPilot,
                  onChange: setFilterPilot
                },
                {
                  id: 'championship',
                  label: 'Campeonato',
                  icon: <Truck className="w-5 h-5" />,
                  options: uniqueChampionships.map(championship => ({
                    value: championship,
                    label: championship,
                    count: filteredEntriesByStatus.filter((e: any) => e.campeonato === championship).length
                  })),
                  selectedValues: filterChampionship,
                  onChange: setFilterChampionship
                }
              ]}
              onClear={() => {
                setFilterStatus([]);
                setFilterModel([]);
                setFilterContainer([]);
                setFilterCategory([]);
                setFilterSeason([]);
                setFilterStage([]);
                setFilterPilot([]);
                setFilterChampionship([]);
              }}
              totalResults={filteredEntriesByStatus.length}
            />
          </div>

          {/* 🖥️ DESKTOP: MultiSelect Grid */}
          <div className="hidden lg:block space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MultiSelect
                options={tireStatuses.map(status => ({
                  label: status.name,
                  value: status.name,
                  color: status.color
                }))}
                selected={filterStatus}
                onChange={setFilterStatus}
                placeholder="Todos os status"
                searchPlaceholder="Buscar status..."
                emptyMessage="Nenhum status encontrado."
              />

              <MultiSelect
                options={uniqueModels.map(model => ({
                  label: model,
                  value: model
                }))}
                selected={filterModel}
                onChange={setFilterModel}
                placeholder="Todos os modelos"
                searchPlaceholder="Buscar modelo..."
                emptyMessage="Nenhum modelo encontrado."
              />

              <MultiSelect
                options={uniqueContainers.map(container => ({
                  label: container,
                  value: container
                }))}
                selected={filterContainer}
                onChange={setFilterContainer}
                placeholder="Todos os contêineres"
                searchPlaceholder="Buscar contêiner..."
                emptyMessage="Nenhum contêiner encontrado."
              />

              <MultiSelect
                options={uniqueCategories.map(category => ({
                  label: category,
                  value: category
                }))}
                selected={filterCategory}
                onChange={setFilterCategory}
                placeholder="Todas as categorias"
                searchPlaceholder="Buscar categoria..."
                emptyMessage="Nenhuma categoria encontrada."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MultiSelect
                options={uniqueSeasons.map(season => ({
                  label: season.toString(),
                  value: season.toString()
                }))}
                selected={filterSeason}
                onChange={setFilterSeason}
                placeholder="Todas as temporadas"
                searchPlaceholder="Buscar temporada..."
                emptyMessage="Nenhuma temporada encontrada."
              />

              <MultiSelect
                options={uniqueStages.map(stage => ({
                  label: `Etapa ${stage}`,
                  value: stage.toString()
                }))}
                selected={filterStage}
                onChange={setFilterStage}
                placeholder="Todas as etapas"
                searchPlaceholder="Buscar etapa..."
                emptyMessage="Nenhuma etapa encontrada."
              />

              <MultiSelect
                options={uniquePilots.map(pilot => ({
                  label: pilot,
                  value: pilot
                }))}
                selected={filterPilot}
                onChange={setFilterPilot}
                placeholder="Todos os pilotos"
                searchPlaceholder="Buscar piloto..."
                emptyMessage="Nenhum piloto encontrado."
              />

              <MultiSelect
                options={uniqueChampionships.map(championship => ({
                  label: championship,
                  value: championship
                }))}
                selected={filterChampionship}
                onChange={setFilterChampionship}
                placeholder="Todos os campeonatos"
                searchPlaceholder="Buscar campeonato..."
                emptyMessage="Nenhum campeonato encontrado."
              />
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-6 gap-1 h-auto p-1">
            <TabsTrigger value="summary" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
              <span className="hidden lg:inline">Visão Geral</span>
              <span className="lg:hidden">Visão</span>
            </TabsTrigger>
            <TabsTrigger value="container-occupancy" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
              <span className="hidden md:inline">Container</span>
              <span className="md:hidden">Cont.</span>
            </TabsTrigger>
            <TabsTrigger value="pilots" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
              <span className="hidden md:inline">Pilotos</span>
              <span className="md:hidden">Pilot.</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
              <span className="hidden md:inline">Categorias</span>
              <span className="md:hidden">Categ.</span>
            </TabsTrigger>
            <TabsTrigger value="tires" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
              <span className="hidden md:inline">Pneus</span>
              <span className="md:hidden">Pneus</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
              <span className="hidden md:inline">Histórico</span>
              <span className="md:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4 sm:space-y-8 w-full">
            {/* Gráfico de Barras: Modelos por Quantidade */}
            {chartData.length > 0 ? (
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint', willChange: 'auto' }}>
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-gray-900 mb-1 sm:mb-2 text-base sm:text-lg">
                    Distribuição por Modelo de Pneu
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm">Quantidade total de pneus agrupados por modelo</p>
                </div>
                <div className="w-full overflow-hidden touch-pan-y" style={{ height: '500px', contain: 'strict', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData} 
                      margin={{ top: 10, right: 10, left: 0, bottom: 80 }}
                      barSize={40}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#666', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        tick={{ fill: '#666', fontSize: 11 }}
                        allowDecimals={false}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        cursor={{ fill: 'rgba(213, 0, 0, 0.1)' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="quantidade" 
                        name="Quantidade de Pneus" 
                        fill="#D50000" 
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-center">Nenhum dado disponível para o gráfico</p>
              </Card>
            )}

            {/* Gráfico de Barras: Pneus por Status */}
            {statusChartData.length > 0 ? (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint', willChange: 'auto' }}>
                <div className="mb-6">
                  <h3 className="text-gray-900 mb-2">
                    Distribuição por Status
                  </h3>
                  <p className="text-gray-500 text-sm">Quantidade total de pneus agrupados por status</p>
                </div>
                <div className="w-full overflow-hidden touch-pan-y chart-wrapper-no-scroll" style={{ height: '500px', contain: 'strict', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={statusChartData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      barSize={60}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#666', fontSize: 13 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        tick={{ fill: '#666', fontSize: 13 }}
                        allowDecimals={false}
                        label={{ value: 'Quantidade de Pneus', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#666' } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #e5e5e5',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          padding: '12px'
                        }}
                        cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                        labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
                        formatter={(value: any) => [value, 'Quantidade']}
                      />
                      <Bar 
                        dataKey="quantidade"
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList 
                          dataKey="quantidade" 
                          position="top"
                          fill="#1F2937"
                          fontSize={14}
                          fontWeight={700}
                          offset={10}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legenda com totais por status */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    {statusChartData.map((status) => (
                      <div key={status.name} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm text-gray-700 font-medium">
                          {status.name}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {status.quantidade}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-center">Nenhum dado de status disponível</p>
              </Card>
            )}

            {/* Stock Table */}

          </TabsContent>

          {/* Container Occupancy Tab */}
          <TabsContent value="container-occupancy" className="space-y-6 w-full">
            {/* Filtros */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">


                <Select value={occupancyFilterLocation} onValueChange={setOccupancyFilterLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as localizações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as localizações</SelectItem>
                    {Array.from(new Set(containers.map(c => c.location).filter(Boolean))).map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={occupancyFilterSector} onValueChange={setOccupancyFilterSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {Array.from(new Set(containers.map(c => c.sector).filter(Boolean))).map(sector => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={occupancyFilterOccupancy} onValueChange={setOccupancyFilterOccupancy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Taxa de ocupação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as taxas</SelectItem>
                    <SelectItem value="low">Baixa (&lt; 50%)</SelectItem>
                    <SelectItem value="medium">Média (50-80%)</SelectItem>
                    <SelectItem value="high">Alta (80-100%)</SelectItem>
                    <SelectItem value="full">Lotado (100%)</SelectItem>
                  </SelectContent>
                </Select>


              </div>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Ocupação dos Contêineres</h3>
                <p className="text-gray-500 text-sm">Status de capacidade e utilização</p>
              </div>

              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                {(() => {
                  const allContainers = containers;
                  
                  // Aplica filtros
                  const filteredContainers = allContainers.filter(container => {
                    // Filtro de busca
                    const matchesSearch = occupancySearchTerm === '' ||
                      (container.name || '').toLowerCase().includes(occupancySearchTerm.toLowerCase()) ||
                      (container.location || '').toLowerCase().includes(occupancySearchTerm.toLowerCase());
                    
                    // Filtro de localização
                    const matchesLocation = occupancyFilterLocation === 'all' ||
                      container.location === occupancyFilterLocation;

                    // 🆕 Filtro de setor
                    const matchesSector = occupancyFilterSector === 'all' ||
                      (container.sector || '').toUpperCase() === occupancyFilterSector.toUpperCase();

                    // Filtro de taxa de ocupação
                    const occupancyRate = container.capacity > 0 
                      ? (container.current_stock / container.capacity) * 100 
                      : 0;
                    
                    let matchesOccupancy = true;
                    if (occupancyFilterOccupancy === 'low') {
                      matchesOccupancy = occupancyRate < 50;
                    } else if (occupancyFilterOccupancy === 'medium') {
                      matchesOccupancy = occupancyRate >= 50 && occupancyRate < 80;
                    } else if (occupancyFilterOccupancy === 'high') {
                      matchesOccupancy = occupancyRate >= 80 && occupancyRate < 100;
                    } else if (occupancyFilterOccupancy === 'full') {
                      matchesOccupancy = occupancyRate >= 100;
                    }
                    
                    // Filtro de status dos pneus - DINÂMICO
                    const tiresInContainer = entries.filter(e => e.container_id === container.id);
                    const isEmpty = tiresInContainer.length === 0;
                    
                    let matchesStatus = true;
                    if (occupancyFilterStatus === 'all') {
                      matchesStatus = true;
                    } else if (occupancyFilterStatus === 'empty') {
                      matchesStatus = isEmpty;
                    } else if (occupancyFilterStatus.startsWith('has-')) {
                      // Extrai o nome do status do filtro (ex: "has-Novo" -> "Novo")
                      const statusName = occupancyFilterStatus.replace('has-', '');
                      matchesStatus = tiresInContainer.some(e => e.status === statusName);
                    }
                    
                    return matchesSearch && matchesLocation && matchesSector && matchesOccupancy && matchesStatus;
                  });

                  const filteredContainersList = filteredContainers;
                  const totalQuantity = filteredContainersList.reduce((sum, c) => sum + (c.current_stock || 0), 0);
                  const totalCapacity = filteredContainersList.reduce((sum, c) => sum + (c.capacity || 0), 0);
                  const globalRate = totalCapacity > 0 ? (totalQuantity / totalCapacity) * 100 : 0;

                  return (
                    <>
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Contêiner
                            </th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Localização
                            </th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">
                              Quantidade
                            </th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">
                              Capacidade
                            </th>
                            <th className="px-6 py-3 text-center text-xs text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">
                              Ocupação
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredContainersList.map((container) => {
                            const occupancyRate = container.capacity > 0 
                              ? (container.current_stock / container.capacity) * 100 
                              : 0;
                            
                            // Busca pneus neste container e conta por status
                            const tiresInContainer = entries.filter(e => e.container_id === container.id);
                            
                            // Conta pneus por TODOS os status disponíveis dinamicamente
                            const statusCounts: Record<string, number> = {};
                            tireStatuses.forEach(status => {
                              statusCounts[status.name] = tiresInContainer.filter(e => e.status === status.name).length;
                            });
                            
                            return (
                              <tr key={container.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{container.name}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-600">{container.location}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="text-sm text-gray-900">{container.current_stock}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="text-sm text-gray-900">{container.capacity}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {tireStatuses.map(status => {
                                      const count = statusCounts[status.name];
                                      if (!count || count === 0) return null;
                                      
                                      return (
                                        <div key={status.id} className="group relative">
                                          <div 
                                            className="w-3 h-3 rounded-sm shadow-sm" 
                                            style={{ 
                                              backgroundColor: status.color,
                                              borderColor: status.color,
                                              borderWidth: '1px',
                                              filter: 'brightness(0.95)'
                                            }}
                                          />
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            {count} {status.name}{count !== 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {tiresInContainer.length === 0 && (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all ${
                                          occupancyRate >= 90 ? 'bg-red-500' :
                                          occupancyRate >= 70 ? 'bg-yellow-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                      />
                                    </div>
                                    <Badge 
                                      variant="secondary"
                                      className={`min-w-[60px] justify-center ${
                                        occupancyRate >= 90 ? 'bg-red-100 text-red-700' :
                                        occupancyRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                      }`}
                                    >
                                      {occupancyRate.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Informações e Legenda */}
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">
                            {containers.length === 0 ? (
                              'Nenhum container encontrado'
                            ) : (
                              `Mostrando ${containers.length} ${containers.length === 1 ? 'container' : 'containers'}`
                            )}
                          </span>
                          {occupancySearchTerm || occupancyFilterLocation !== 'all' ||
                           occupancyFilterSector !== 'PNR' || occupancyFilterOccupancy !== 'all' || occupancyFilterStatus !== 'all' ? (
                            <button
                              onClick={() => {
                                setOccupancySearchTerm('');
                                setOccupancyFilterLocation('all');
                                setOccupancyFilterSector('PNR');
                                setOccupancyFilterOccupancy('all');
                                setOccupancyFilterStatus('all');
                              }}
                              className="text-sm text-[#D50000] hover:text-[#A80000] transition-colors"
                            >
                              Limpar filtros
                            </button>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-center gap-4 flex-wrap text-xs">
                          {tireStatuses.map(status => {
                            // Calcula quantidade de pneus com este status
                            const statusCount = entries.filter(e => e.status === status.name).length;
                            // Calcula percentual em relação ao total
                            const percentage = entries.length > 0 ? ((statusCount / entries.length) * 100).toFixed(1) : '0.0';
                            
                            return (
                              <div key={status.id} className="flex items-center gap-1.5">
                                <div 
                                  className="w-3 h-3 rounded-sm shadow-sm" 
                                  style={{ 
                                    backgroundColor: status.color,
                                    borderColor: status.color,
                                    borderWidth: '1px',
                                    filter: 'brightness(0.95)'
                                  }}
                                />
                                <span className="text-gray-600">{status.name} ({percentage}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Taxa Global (apenas se não houver filtros ativos) */}
                      {containers.length > 0 && (
                        <div className="p-6 border-t-2 border-gray-300 bg-gradient-to-r from-gray-50 to-white">
                          <div className="max-w-2xl mx-auto">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-gray-900">
                                {occupancySearchTerm || occupancyFilterLocation !== 'all' ||
                                 occupancyFilterSector !== 'PNR' || occupancyFilterOccupancy !== 'all' || occupancyFilterStatus !== 'all'
                                  ? 'Taxa de Ocupação (Filtrada)'
                                  : 'Taxa Global de Ocupação'}
                              </h4>
                              <Badge 
                                variant="secondary"
                                className={`text-lg px-4 py-2 ${
                                  globalRate >= 90 ? 'bg-red-100 text-red-700' :
                                  globalRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}
                              >
                                {globalRate.toFixed(1)}%
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    globalRate >= 90 ? 'bg-red-500' :
                                    globalRate >= 70 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(globalRate, 100)}%` }}
                                />
                              </div>
                              
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Total: {totalQuantity} pneus</span>
                                <span>Capacidade: {totalCapacity} pneus</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </Card>

            {/* Seção: Visualização por Contêiner */}
            <div className="space-y-6 mt-8">
              <div className="border-t-2 border-gray-200 pt-8">
                <h2 className="text-gray-900 mb-2">Visualização por Contêiner</h2>
                <p className="text-gray-500 text-sm mb-6">Distribuição detalhada de modelos em cada contêiner</p>
              </div>

              {containerGroups.length === 0 ? (
                <Card className="p-12 text-center text-gray-400">
                  <Truck size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Nenhum contêiner com pneus registrados</p>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {containerGroups.map((container, idx) => (
                    <Card key={container.containerName} className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
                      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#D50000]/10 rounded-xl flex items-center justify-center">
                              <Truck size={28} className="text-[#D50000]" />
                            </div>
                            <div>
                              <h3 className="text-gray-900">{container.containerName}</h3>
                              <p className="text-gray-500 text-sm">
                                {container.totalPneus} {container.totalPneus === 1 ? 'pneu' : 'pneus'} • {container.models.length} {container.models.length === 1 ? 'modelo' : 'modelos'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant="secondary" 
                              className="bg-[#D50000] text-white"
                            >
                              {container.totalPneus}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 p-6">
                        {/* Chart */}
                        <div>
                          <h4 className="text-gray-900 mb-4">Distribuição por Modelo</h4>
                          <div className="w-full overflow-hidden touch-pan-y" style={{ height: '300px', contain: 'strict', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={container.models}
                                  dataKey="quantity"
                                  nameKey="model"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={90}
                                  innerRadius={40}
                                  label={(entry) => `${entry.quantity}`}
                                  labelLine={true}
                                  animationDuration={800}
                                  onClick={(data: any) => {
                                    if (data && data.model) {
                                      haptic.light();
                                      loadTireDetails(container.containerName, data.model);
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {container.models.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Models Table */}
                        <div>
                          <h4 className="text-gray-900 mb-4">Detalhamento</h4>
                          <div className="space-y-3">
                            {container.models.map((model, modelIdx) => (
                              <div 
                                key={modelIdx}
                                onClick={() => {
                                  haptic.light();
                                  loadTireDetails(container.containerName, model.model);
                                }}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer active:scale-98 touch-manipulation"
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[modelIdx % COLORS.length] }}
                                  />
                                  <div>
                                    <p className="text-sm text-gray-900">{model.model}</p>
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs ${model.type === 'Slick' 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : 'bg-blue-100 text-blue-700'
                                      }`}
                                    >
                                      {model.type}
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="bg-gray-200 text-gray-900">
                                  {model.quantity}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          {container.lastEntry && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                Última entrada: {container.lastEntry.toLocaleString('pt-BR')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pilots Tab - Dashboard por Piloto e Etapa */}
          <TabsContent value="pilots" className="space-y-8 w-full">
            {/* Gráfico de Linhas: Pneus e Pilotos por Etapa */}
            {(() => {
              // Prepara dados para o gráfico de linhas (Pneus e Pilotos por Etapa)
              // USA FILTROS GLOBAIS
              const lineChartData = stages.map(stage => {
                // Conta pneus nesta etapa (com filtros aplicados)
                const tiresInStage = filteredEntriesByStatus.filter(entry => 
                  (entry as any).etapa?.trim() === stage
                ).length;
                
                // Conta pilotos únicos nesta etapa da coluna "pilot" da tabela stock_entries (com filtros)
                const uniquePilotsInStage = new Set(
                  filteredEntriesByStatus
                    .filter(entry => (entry as any).etapa?.trim() === stage)
                    .map(entry => entry.pilot?.trim()) // Usa entry.pilot (coluna da tabela stock_entries)
                    .filter(pilot => pilot && pilot !== '')
                ).size;
                
                return {
                  etapa: stage,
                  pneus: tiresInStage,
                  pilotos: uniquePilotsInStage,
                };
              });

              return lineChartData.length > 0 && lineChartData.some(d => d.pneus > 0 || d.pilotos > 0) ? (
                <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint', willChange: 'auto' }}>
                  <div className="mb-6">
                    <h3 className="text-gray-900 mb-2">Evolução por Etapa</h3>
                    <p className="text-gray-500 text-sm">Total de pneus comprados e pilotos confirmados em cada etapa</p>
                  </div>
                  
                  <div className="w-full overflow-hidden touch-pan-y chart-wrapper-no-scroll" style={{ height: '450px', contain: 'strict', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={lineChartData} 
                        margin={{ top: 30, right: 50, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="etapa" 
                          tick={{ fill: '#666', fontSize: 14, fontWeight: 600 }}
                          height={60}
                          interval={0}
                          label={{ value: 'Etapa', position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: '#666' } }}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fill: '#3B82F6', fontSize: 13, fontWeight: 600 }}
                          allowDecimals={false}
                          label={{ value: 'Pneus Comprados', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#3B82F6' } }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 600 }}
                          allowDecimals={false}
                          label={{ value: 'Pilotos Confirmados', angle: 90, position: 'insideRight', style: { fontSize: 13, fill: '#9CA3AF' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '2px solid #e5e5e5',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            padding: '12px'
                          }}
                          labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
                          formatter={(value: any, name: any) => {
                            if (name === 'pneus') return [value, 'Pneus Comprados'];
                            if (name === 'pilotos') return [value, 'Pilotos Confirmados'];
                            return [value, name];
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                          formatter={(value) => {
                            if (value === 'pneus') return 'PNEUS COMPRADOS';
                            if (value === 'pilotos') return 'PILOTOS CONFIRMADOS';
                            return value;
                          }}
                        />
                        
                        {/* Linha de Pneus Comprados (Azul) */}
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="pneus" 
                          name="pneus"
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ 
                            fill: '#3B82F6', 
                            r: 6,
                            strokeWidth: 2,
                            stroke: '#ffffff'
                          }}
                          activeDot={{ 
                            r: 8,
                            strokeWidth: 2,
                            stroke: '#ffffff',
                            fill: '#3B82F6'
                          }}
                          animationDuration={1000}
                          label={{ 
                            position: 'top', 
                            fill: '#3B82F6',
                            fontSize: 14,
                            fontWeight: 700,
                            offset: 10
                          }}
                        />
                        
                        {/* Linha de Pilotos Confirmados (Cinza) */}
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="pilotos" 
                          name="pilotos"
                          stroke="#9CA3AF" 
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ 
                            fill: '#9CA3AF', 
                            r: 6,
                            strokeWidth: 2,
                            stroke: '#ffffff'
                          }}
                          activeDot={{ 
                            r: 8,
                            strokeWidth: 2,
                            stroke: '#ffffff',
                            fill: '#9CA3AF'
                          }}
                          animationDuration={1000}
                          label={{ 
                            position: 'top', 
                            fill: '#9CA3AF',
                            fontSize: 14,
                            fontWeight: 700,
                            offset: 10
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Resumo Estatístico */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Total de Pneus</p>
                        <p className="text-2xl text-[#3B82F6]">
                          {lineChartData.reduce((sum, d) => sum + d.pneus, 0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Pilotos Únicos</p>
                        <p className="text-2xl text-gray-700">
                          {(() => {
                            // Conta pilotos únicos em TODAS as etapas (da coluna pilot)
                            const allUniquePilots = new Set(
                              entries
                                .map(entry => entry.pilot?.trim())
                                .filter(pilot => pilot && pilot !== '')
                            );
                            return allUniquePilots.size;
                          })()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Média Pneus/Etapa</p>
                        <p className="text-2xl text-[#3B82F6]">
                          {lineChartData.length > 0 
                            ? Math.round(lineChartData.reduce((sum, d) => sum + d.pneus, 0) / lineChartData.length)
                            : 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Etapas Registradas</p>
                        <p className="text-2xl text-gray-700">
                          {lineChartData.filter(d => d.pneus > 0 || d.pilotos > 0).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : null;
            })()}

            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Dashboard de Pilotos por Etapa</h3>
                <p className="text-gray-500 text-sm">Quantidade de pneus por piloto em cada etapa do campeonato</p>
              </div>

              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-scrollbar touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {pilotDataArray.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum pneu com piloto registrado</p>
                    <p className="text-sm mt-2">
                      Certifique-se de importar dados ARCS ou registrar pneus com informações de piloto
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                          Piloto
                        </th>
                        {stages.map(stage => (
                          <th key={stage} className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {stage}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-100 font-semibold">
                          Total Geral
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {pilotDataArray.map((pilotItem, index) => (
                        <tr key={pilotItem.pilot} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium w-6">
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-900 font-medium">
                                {pilotItem.pilot}
                              </span>
                            </div>
                          </td>
                          {stages.map(stage => {
                            const count = pilotItem.stages[stage] || 0;
                            return (
                              <td key={stage} className="px-4 py-3 text-center whitespace-nowrap">
                                {count > 0 ? (
                                  <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-medium text-gray-900">
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center whitespace-nowrap bg-gray-50">
                            <Badge 
                              variant="secondary" 
                              className="bg-[#D50000] text-white hover:bg-[#B00000] font-semibold"
                            >
                              {pilotItem.total}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Linha de total por etapa */}
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                          Total por Etapa
                        </td>
                        {stages.map(stage => {
                          const stageTotal = pilotDataArray.reduce((sum, pilot) => 
                            sum + (pilot.stages[stage] || 0), 0
                          );
                          return (
                            <td key={stage} className="px-4 py-3 text-center font-semibold text-gray-900">
                              {stageTotal > 0 ? stageTotal : '0'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center bg-gray-200">
                          <Badge 
                            variant="secondary" 
                            className="bg-[#D50000] text-white font-bold text-base"
                          >
                            {pilotDataArray.reduce((sum, pilot) => sum + pilot.total, 0)}
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {pilotDataArray.length > 0 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {pilotDataArray.length} {pilotDataArray.length === 1 ? 'piloto' : 'pilotos'} registrados
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total de {pilotDataArray.reduce((sum, pilot) => sum + pilot.total, 0)} pneus com informação de piloto
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Categories Tab - Dashboard por Categoria e Etapa */}
          <TabsContent value="categories" className="w-full space-y-6">
            {/* Gráfico de Barras Empilhadas por Etapa e Categoria */}
            {(() => {
              // Prepara dados para o gráfico de barras empilhadas
              const stackedChartData = stages.map(stage => {
                const stageData: any = { etapa: stage };
                
                // Para cada categoria, adiciona a quantidade nesta etapa
                categoryDataArray.forEach(category => {
                  stageData[category.category] = category.stages[stage] || 0;
                });
                
                // Calcula total da etapa
                stageData.total = categoryDataArray.reduce((sum, category) => 
                  sum + (category.stages[stage] || 0), 0
                );
                
                return stageData;
              });

              // Define cores por categoria (inspirado na imagem)
              const categoryColors: { [key: string]: string } = {
                'TROPHY': '#FFB800',      // Amarelo (Racing Yellow)
                'CHALLENGE': '#D50000',   // Vermelho Porsche
                'CARRERA': '#3B82F6',     // Azul
                'GT3': '#00A86B',         // Verde Racing (caso exista)
                'SPORT': '#9370DB',       // Roxo (caso exista)
              };

              return stackedChartData.length > 0 && categoryDataArray.length > 0 ? (
                <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint', willChange: 'auto' }}>
                  <div className="mb-6">
                    <h3 className="text-gray-900 mb-2">Pneus por Etapa e Categoria</h3>
                    <p className="text-gray-500 text-sm">Distribuição de pneus em cada etapa, separados por categoria</p>
                  </div>
                  
                  <div className="w-full overflow-hidden touch-pan-y chart-wrapper-no-scroll" style={{ height: '500px', contain: 'strict', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={stackedChartData} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="etapa" 
                          tick={{ fill: '#666', fontSize: 14, fontWeight: 600 }}
                          height={60}
                          interval={0}
                          label={{ value: 'Etapa', position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: '#666' } }}
                        />
                        <YAxis 
                          tick={{ fill: '#666', fontSize: 13 }}
                          allowDecimals={false}
                          label={{ value: 'Quantidade de Pneus', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#666' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '2px solid #e5e5e5',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            padding: '12px'
                          }}
                          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                          labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
                          formatter={(value: any, name: any) => [value, name]}
                        />
                        {/* Barras empilhadas para cada categoria */}
                        {categoryDataArray.map((category, index) => (
                          <Bar 
                            key={category.category}
                            dataKey={category.category} 
                            name={category.category}
                            stackId="a"
                            fill={categoryColors[category.category.toUpperCase()] || COLORS[index % COLORS.length]}
                            radius={index === categoryDataArray.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                            animationDuration={800}
                          >
                            {/* Label com valor dentro da barra */}
                            {/* <LabelList 
                              dataKey={category.category} 
                              position="center" 
                              fill="white"
                              fontSize={12}
                              fontWeight={600}
                              formatter={(value: number) => value > 0 ? value : ''}
                            /> */}
                          </Bar>
                        ))}
                        {/* Label com total no topo de cada barra */}
                        <Bar 
                          dataKey="total" 
                          fill="transparent" 
                          stackId="b"
                          label={{ 
                            position: 'top', 
                            fill: '#1F2937',
                            fontSize: 14,
                            fontWeight: 700,
                            offset: 10
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legenda adicional com totais */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      {categoryDataArray.map((category, index) => {
                        const color = categoryColors[category.category.toUpperCase()] || COLORS[index % COLORS.length];
                        return (
                          <div key={category.category} className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm text-gray-700 font-medium">
                              {category.category.toUpperCase()}
                            </span>
                            <Badge variant="secondary" className="ml-1">
                              {category.total}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ) : null;
            })()}

            {/* Tabela de Categorias por Etapa */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Tabela Detalhada por Categoria e Etapa</h3>
                <p className="text-gray-500 text-sm">Quantidade de pneus por categoria em cada etapa do campeonato</p>
              </div>

              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-scrollbar touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {categoryDataArray.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum pneu com categoria registrada</p>
                    <p className="text-sm mt-2">
                      Certifique-se de importar dados ARCS ou registrar pneus com informações de categoria
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                          Categoria
                        </th>
                        {stages.map(stage => (
                          <th key={stage} className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {stage}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-100 font-semibold">
                          Total Geral
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {categoryDataArray.map((categoryItem, index) => (
                        <tr key={categoryItem.category} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium w-6">
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-900 font-medium">
                                {categoryItem.category}
                              </span>
                            </div>
                          </td>
                          {stages.map(stage => {
                            const count = categoryItem.stages[stage] || 0;
                            return (
                              <td key={stage} className="px-4 py-3 text-center whitespace-nowrap">
                                {count > 0 ? (
                                  <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-medium text-gray-900">
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center whitespace-nowrap bg-gray-50">
                            <Badge 
                              variant="secondary" 
                              className="bg-[#D50000] text-white hover:bg-[#B00000] font-semibold"
                            >
                              {categoryItem.total}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Linha de total por etapa */}
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                          Total por Etapa
                        </td>
                        {stages.map(stage => {
                          const stageTotal = categoryDataArray.reduce((sum, category) => 
                            sum + (category.stages[stage] || 0), 0
                          );
                          return (
                            <td key={stage} className="px-4 py-3 text-center font-semibold text-gray-900">
                              {stageTotal > 0 ? stageTotal : '0'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center bg-gray-200">
                          <Badge 
                            variant="secondary" 
                            className="bg-[#D50000] text-white font-bold text-base"
                          >
                            {categoryDataArray.reduce((sum, category) => sum + category.total, 0)}
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {categoryDataArray.length > 0 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {categoryDataArray.length} {categoryDataArray.length === 1 ? 'categoria' : 'categorias'} registradas
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total de {categoryDataArray.reduce((sum, category) => sum + category.total, 0)} pneus com informação de categoria
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tires Tab - Dashboard por Modelo de Pneu e Etapa */}
          <TabsContent value="tires" className="w-full space-y-6">
            {/* Gráfico de Pneus por Código e Status */}
            {(() => {
              // Agrupa pneus por código do pneu (tire code)
              const tireCodeData: { [key: string]: { total: number; byStatus: { [status: string]: number } } } = {};

              filteredEntriesByStatus.forEach((entry: any) => {
                const model = tireModels.find(m => m.name === entry.model_name);
                const tireCode = model?.code || entry.model_name || 'Sem Código';
                const status = entry.status || 'Novo';

                if (!tireCodeData[tireCode]) {
                  tireCodeData[tireCode] = { total: 0, byStatus: {} };
                }

                tireCodeData[tireCode].total += 1;
                tireCodeData[tireCode].byStatus[status] = (tireCodeData[tireCode].byStatus[status] || 0) + 1;
              });

              // Converte para array e ordena por total (decrescente)
              const tireCodeArray = Object.entries(tireCodeData)
                .map(([code, data]) => ({
                  code,
                  total: data.total,
                  byStatus: data.byStatus
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10); // Top 10 códigos

              // Prepara dados para o gráfico
              const chartData = tireCodeArray.map(item => {
                const result: any = {
                  name: item.code,
                  total: item.total
                };

                // Adiciona cada status como uma propriedade separada
                Object.entries(item.byStatus).forEach(([status, count]) => {
                  result[status] = count;
                });

                return result;
              });

              // Extrai todos os status únicos
              const allStatuses = Array.from(
                new Set(
                  tireCodeArray.flatMap(item => Object.keys(item.byStatus))
                )
              );

              // Cores para cada status
              const statusColors: { [key: string]: string } = {
                'Novo': '#3B82F6',
                'Piloto': '#10B981',
                'Descarte Piloto': '#F59E0B',
                'Descartado DSI': '#EF4444',
                'Descarte': '#6B7280',
              };

              return chartData.length > 0 ? (
                <Card className="p-6 bg-white border border-gray-200 shadow-sm" style={{ contain: 'layout style paint' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-gray-900 mb-2 flex items-center gap-2">
                        <Package size={20} className="text-[#D50000]" />
                        Modelos de Pneus
                        {showTiresByStatus && <span className="text-sm font-normal text-gray-500">• Por Status</span>}
                      </h3>
                      <p className="text-gray-500 text-sm">Top 10 códigos de pneus mais utilizados</p>
                    </div>
                    <Button
                      onClick={() => {
                        setShowTiresByStatus(!showTiresByStatus);
                        haptic.light();
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-[#D50000] text-[#D50000] hover:bg-red-50"
                    >
                      <BarChart3 size={16} />
                      {showTiresByStatus ? 'Ver Simples' : 'Ver por Status'}
                    </Button>
                  </div>

                  <div className="w-full overflow-hidden touch-pan-y" style={{ height: '500px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 20, right: 80, left: 120, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: '#666', fontSize: 12 }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: '#333', fontSize: 13, fontWeight: 500 }}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '2px solid #e5e5e5',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            padding: '12px'
                          }}
                          cursor={{ fill: 'rgba(213, 0, 0, 0.05)' }}
                        />

                        {showTiresByStatus ? (
                          <>
                            {/* Barras empilhadas por status */}
                            {allStatuses.map((status, index) => {
                              const isLast = index === allStatuses.length - 1;
                              return (
                                <Bar
                                  key={status}
                                  dataKey={status}
                                  name={status}
                                  stackId="a"
                                  fill={statusColors[status] || COLORS[index % COLORS.length]}
                                  radius={isLast ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                  animationDuration={800}
                                  onClick={() => {
                                    setShowTiresByStatus(false);
                                    haptic.light();
                                  }}
                                  cursor="pointer"
                                >
                                  <LabelList
                                    dataKey={status}
                                    position="center"
                                    fill="white"
                                    fontSize={11}
                                    fontWeight={600}
                                    formatter={(value: number) => value > 0 ? value : ''}
                                  />
                                  {/* Label de total apenas na última barra do stack */}
                                  {isLast && (
                                    <LabelList
                                      dataKey="total"
                                      position="right"
                                      fill="#1F2937"
                                      fontSize={13}
                                      fontWeight={700}
                                      offset={10}
                                    />
                                  )}
                                </Bar>
                              );
                            })}
                          </>
                        ) : (
                          <>
                            {/* Barra simples com total */}
                            <Bar
                              dataKey="total"
                              fill="#D50000"
                              radius={[0, 4, 4, 0]}
                              animationDuration={800}
                              onClick={() => {
                                setShowTiresByStatus(true);
                                haptic.light();
                              }}
                              cursor="pointer"
                            >
                              <LabelList
                                dataKey="total"
                                position="right"
                                fill="#1F2937"
                                fontSize={13}
                                fontWeight={700}
                                offset={10}
                              />
                              <LabelList
                                dataKey="total"
                                position="center"
                                fill="white"
                                fontSize={12}
                                fontWeight={600}
                                formatter={(value: number, entry: any) => {
                                  const percentage = ((value / filteredEntriesByStatus.length) * 100).toFixed(1);
                                  return `${percentage}%`;
                                }}
                              />
                            </Bar>
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legenda quando mostra por status */}
                  {showTiresByStatus && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex flex-wrap items-center justify-center gap-4">
                        {allStatuses.map((status, index) => {
                          const color = statusColors[status] || COLORS[index % COLORS.length];
                          const total = tireCodeArray.reduce((sum, item) => sum + (item.byStatus[status] || 0), 0);
                          return (
                            <div key={status} className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm text-gray-700 font-medium">
                                {status}
                              </span>
                              <Badge variant="secondary" className="ml-1">
                                {total}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              ) : null;
            })()}

            {/* Tabela de Pneus por Etapa */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-900">Tabela Detalhada por Modelo de Pneu e Etapa</h3>
                <p className="text-gray-500 text-sm">Quantidade de pneus por modelo em cada etapa do campeonato</p>
              </div>

              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-scrollbar touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {modelDataArray.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum pneu com modelo registrado</p>
                    <p className="text-sm mt-2">
                      Certifique-se de importar dados ARCS ou registrar pneus com informações de modelo
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                          Modelo
                        </th>
                        {stages.map(stage => (
                          <th key={stage} className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {stage}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-100 font-semibold">
                          Total Geral
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {modelDataArray.map((modelItem, index) => (
                        <tr key={modelItem.model} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium w-6">
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-900 font-medium">
                                {modelItem.model}
                              </span>
                            </div>
                          </td>
                          {stages.map(stage => {
                            const count = modelItem.stages[stage] || 0;
                            return (
                              <td key={stage} className="px-4 py-3 text-center whitespace-nowrap">
                                {count > 0 ? (
                                  <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-medium text-gray-900">
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center whitespace-nowrap bg-gray-50">
                            <Badge
                              variant="secondary"
                              className="bg-[#D50000] text-white hover:bg-[#B00000] font-semibold"
                            >
                              {modelItem.total}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Linha de total por etapa */}
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                          Total por Etapa
                        </td>
                        {stages.map(stage => {
                          const stageTotal = modelDataArray.reduce((sum, model) =>
                            sum + (model.stages[stage] || 0), 0
                          );
                          return (
                            <td key={stage} className="px-4 py-3 text-center font-semibold text-gray-900">
                              {stageTotal > 0 ? stageTotal : '0'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center bg-gray-200">
                          <Badge
                            variant="secondary"
                            className="bg-[#D50000] text-white font-bold text-base"
                          >
                            {modelDataArray.reduce((sum, model) => sum + model.total, 0)}
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {modelDataArray.length > 0 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {modelDataArray.length} {modelDataArray.length === 1 ? 'modelo' : 'modelos'} registrados
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total de {modelDataArray.reduce((sum, model) => sum + model.total, 0)} pneus com informação de modelo
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="w-full">
            {/* Filtros do Histórico */}
            {/* Tabela de Histórico */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ contain: 'layout style paint' }}>
              {(() => {
                // Calcula as entradas filtradas ANTES de renderizar o contador
                const filteredHistory = entries.filter(entry => {
                  const matchesSearch = historySearchTerm === '' ||
                    (entry.barcode || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    (entry.model_name || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    (entry.container_name || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    (entry.pilot || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    (entry.team || '').toLowerCase().includes(historySearchTerm.toLowerCase());
                  
                  // Aplicar FILTROS GLOBAIS da página (com arrays)
                  const matchesStatus = filterStatus.length === 0 || filterStatus.includes(entry.status || 'Novo');
                  const matchesModel = filterModel.length === 0 || filterModel.includes(entry.model_name || '');
                  const matchesContainer = filterContainer.length === 0 || filterContainer.includes(entry.container_name || '');
                  const matchesSeason = filterSeason.length === 0 || filterSeason.includes((entry as any).ano?.toString() || '');
                  const matchesStage = filterStage.length === 0 || filterStage.includes((entry as any).etapa?.toString() || '');
                  const matchesPilot = filterPilot.length === 0 || filterPilot.includes((entry as any).pilot || '');
                  const matchesChampionship = filterChampionship.length === 0 || filterChampionship.includes((entry as any).campeonato || '');
                  const matchesCategory = filterCategory.length === 0 || filterCategory.includes((entry as any).categoria || '');
                  
                  return matchesSearch && matchesStatus && matchesModel && matchesContainer && 
                         matchesSeason && matchesStage && matchesPilot && matchesChampionship && matchesCategory;
                });

                return (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-gray-900">Histórico Completo</h3>
                          <p className="text-gray-500 text-sm">Todas as entradas registradas no sistema</p>
                        </div>
                        
                        {/* Controles: Contagem e Seletor de Colunas */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{filteredHistory.length} {filteredHistory.length === 1 ? 'registro' : 'registros'}</span>
                          </div>
                          <ColumnSelector 
                            availableColumns={historyAvailableColumns}
                            visibleColumns={historyVisibleColumns}
                            onVisibleColumnsChange={setHistoryVisibleColumns}
                            storageKey="reports-history"
                          />
                        </div>
                      </div>
                    </div>

              <div className="overflow-hidden">
                {(() => {
                  // Define todas as colunas disponíveis
                  const allHistoryColumns = [
                    {
                      key: 'barcode',
                      header: 'Código de Barras',
                      width: '140px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="font-mono text-sm">{entry.barcode}</span>
                      )
                    },
                    {
                      key: 'model_name',
                      header: 'Modelo',
                      width: '180px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm">{entry.model_name || '-'}</span>
                      )
                    },
                    {
                      key: 'model_type',
                      header: 'Tipo',
                      width: '120px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <Badge 
                          variant="secondary" 
                          className={entry.model_type === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'}
                        >
                          {entry.model_type || 'Slick'}
                        </Badge>
                      )
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      width: '140px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <StatusBadge statusName={entry.status || 'Novo'} />
                      )
                    },
                    {
                      key: 'container_name',
                      header: 'Contêiner',
                      width: '160px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-600">{entry.container_name || 'Sem Contêiner'}</span>
                      )
                    },
                    {
                      key: 'created_at',
                      header: 'Data de Entrada',
                      width: '160px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-600">
                          {new Date(entry.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )
                    },
                    {
                      key: 'pilot',
                      header: 'Piloto',
                      width: '140px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-900">{entry.pilot || '-'}</span>
                      )
                    },
                    {
                      key: 'team',
                      header: 'Equipe',
                      width: '140px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-900">{entry.team || '-'}</span>
                      )
                    },
                    {
                      key: 'session_id',
                      header: 'ID da Sessão',
                      width: '160px',
                      sortable: false,
                      render: (entry: StockEntry) => (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {entry.session_id || '-'}
                        </code>
                      )
                    },
                    {
                      key: 'etapa',
                      header: 'Etapa',
                      width: '100px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-900">{(entry as any).etapa ? `Etapa ${(entry as any).etapa}` : '-'}</span>
                      )
                    },
                    {
                      key: 'ano',
                      header: 'Ano/Temporada',
                      width: '120px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-900">{(entry as any).ano || '-'}</span>
                      )
                    },
                    {
                      key: 'campeonato',
                      header: 'Campeonato',
                      width: '160px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-900">{(entry as any).campeonato || '-'}</span>
                      )
                    },
                    {
                      key: 'categoria',
                      header: 'Categoria',
                      width: '120px',
                      sortable: true,
                      render: (entry: StockEntry) => (
                        <span className="text-sm text-gray-900">{(entry as any).categoria || '-'}</span>
                      )
                    }
                  ];

                  // Filtra e ordena as colunas conforme a ordem em historyVisibleColumns
                  const historyColumns = historyVisibleColumns
                    .map(key => allHistoryColumns.find(col => col.key === key))
                    .filter((col): col is typeof allHistoryColumns[0] => col !== undefined);

                  // Aplica ordenação aos dados filtrados
                  let sortedHistory = [...filteredHistory];
                  if (historySortColumn && historySortDirection) {
                    sortedHistory.sort((a, b) => {
                      let valueA: any;
                      let valueB: any;

                      if (historySortColumn === 'created_at') {
                        valueA = new Date(a.created_at).getTime();
                        valueB = new Date(b.created_at).getTime();
                      } else if (historySortColumn === 'etapa') {
                        valueA = (a as any).etapa || '';
                        valueB = (b as any).etapa || '';
                      } else if (historySortColumn === 'ano') {
                        valueA = (a as any).ano || '';
                        valueB = (b as any).ano || '';
                      } else if (historySortColumn === 'campeonato') {
                        valueA = (a as any).campeonato || '';
                        valueB = (b as any).campeonato || '';
                      } else if (historySortColumn === 'categoria') {
                        valueA = (a as any).categoria || '';
                        valueB = (b as any).categoria || '';
                      } else {
                        valueA = (a as any)[historySortColumn] || '';
                        valueB = (b as any)[historySortColumn] || '';
                      }

                      if (valueA < valueB) return historySortDirection === 'asc' ? -1 : 1;
                      if (valueA > valueB) return historySortDirection === 'asc' ? 1 : -1;
                      return 0;
                    });
                  }

                  // Handler de ordenação
                  const handleHistorySort = (columnKey: string, direction: 'asc' | 'desc' | null) => {
                    setHistorySortColumn(direction ? columnKey : null);
                    setHistorySortDirection(direction);
                  };

                  // Conteúdo expandido
                  const expandedContent = (entry: StockEntry) => (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 py-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tipo</p>
                        <Badge 
                          variant="secondary" 
                          className={entry.model_type === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'}
                        >
                          {entry.model_type || 'Slick'}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Piloto</p>
                        <p className="text-sm text-gray-900">{entry.pilot || '-'}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Time</p>
                        <p className="text-sm text-gray-900">{entry.team || '-'}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sessão</p>
                        <p className="text-sm text-gray-900">{entry.session_id || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Etapa</p>
                        <p className="text-sm text-gray-900">{(entry as any).etapa || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Temporada</p>
                        <p className="text-sm text-gray-900">{(entry as any).ano || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Campeonato</p>
                        <p className="text-sm text-gray-900">{(entry as any).campeonato || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Categoria</p>
                        <p className="text-sm text-gray-900">{(entry as any).categoria || '-'}</p>
                      </div>
                    </div>
                  );

                  return (
                    <VirtualizedTable
                      data={sortedHistory}
                      columns={historyColumns}
                      rowHeight={72}
                      overscan={3}
                      isLoading={isLoading}
                      emptyMessage={
                        entries.length === 0 
                          ? 'Nenhuma entrada registrada ainda. Comece registrando pneus no módulo "Entrada de Estoque"' 
                          : 'Nenhum resultado encontrado com os filtros aplicados'
                      }
                      onSort={handleHistorySort}
                      sortColumn={historySortColumn}
                      sortDirection={historySortDirection}
                      className="border-0"
                    />
                  );
                })()}
              </div>
            </>
                );
              })()}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {/* 🔍 Modal de Detalhamento de Pneus */}
    {detailModalOpen && (
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 touch-manipulation"
        onClick={() => setDetailModalOpen(false)}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header do Modal */}
          <div className="bg-gradient-to-r from-[#D50000] to-[#FF4444] p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white">Detalhamento de Pneus</h2>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation active:scale-95"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Truck size={16} />
                <span>{detailContainer}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package size={16} />
                <span>{detailModel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {detailTires.length} {detailTires.length === 1 ? 'pneu' : 'pneus'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Conteúdo do Modal */}
          <div className="flex-1 overflow-auto p-6">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : detailTires.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nenhum pneu encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Estatísticas Resumidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Total de Pneus</p>
                    <p className="text-gray-900">{detailTires.length}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Status Diferentes</p>
                    <p className="text-gray-900">
                      {new Set(detailTires.map(t => t.status || 'Novo')).size}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Pilotos</p>
                    <p className="text-gray-900">
                      {new Set(detailTires.map(t => t.pilot).filter(p => p)).size || '-'}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Última Entrada</p>
                    <p className="text-gray-900 text-sm">
                      {new Date(detailTires[0].created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </Card>
                </div>

                {/* Tabela de Pneus */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">ARCS</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Composto</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Piloto</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Time</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Etapa</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detailTires.map((tire) => (
                          <tr key={tire.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">{tire.barcode}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={tire.status || 'Novo'} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{tire.compound || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{tire.pilot || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{tire.team || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{(tire as any).etapa || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(tire.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botão de Exportar */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setDetailModalOpen(false)}
                    className="touch-manipulation"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      const dataToExport = detailTires.map(tire => ({
                        'ARCS': tire.barcode,
                        'Modelo': tire.model_name,
                        'Tipo': tire.model_type,
                        'Contêiner': tire.container_name,
                        'Status': tire.status || 'Novo',
                        'Composto': tire.compound || '-',
                        'Piloto': tire.pilot || '-',
                        'Time': tire.team || '-',
                        'Etapa': (tire as any).etapa || '-',
                        'Temporada': (tire as any).ano || '-',
                        'Data': new Date(tire.created_at).toLocaleDateString('pt-BR'),
                      }));
                      
                      exportStockToExcel(
                        dataToExport,
                        tireModels,
                        {
                          fileName: `Pneus_${detailContainer}_${detailModel}_${new Date().toISOString().split('T')[0]}.xlsx`
                        }
                      );
                      
                      haptic.medium();
                      toast.success('Exportado com sucesso!');
                    }}
                    className="bg-[#D50000] hover:bg-[#B00000] text-white touch-manipulation"
                  >
                    <FileSpreadsheet size={16} className="mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Modal de Exportação Protheus */}
      <ProtheusExportDialog
        isOpen={showProtheusDialog}
        onClose={() => setShowProtheusDialog(false)}
        onExport={handleProtheusExport}
        seasons={uniqueSeasons}
        stages={uniqueStages}
      />
    </AnimatedTransition>
  );
}
