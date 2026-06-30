import { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Search, Filter, Package, Calendar, Barcode, Tag, Truck, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ChevronsUpDown, Edit, Save, X } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { toastUndoable } from '../utils/toastHelpers';
import { ActionButton } from './ActionFeedback';
import { MultiSelect } from './ui/multi-select';
import { Card } from './ui/card';
import { StatusBadge } from './StatusBadge';
import { readFromClipboard } from '../utils/clipboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { getStockEntries, getStockEntriesSync, getTireModels, getContainers, updateStockEntryByBarcode, type StockEntry } from '../utils/storage';
import { DatabaseHealthCheck } from './DatabaseHealthCheck';
import { ColumnSelector, type ColumnOption } from './ColumnSelector';

interface TireEntry {
  id: string;
  barcode: string;
  modelId: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  containerId: string;
  containerName: string;
  timestamp: string;
  status?: string;
  set?: string;
  pilot?: string;
  team?: string;
  ano?: string;
  etapa?: string;
  categoria?: string;
  campeonato?: string;
  pista?: string;
  lado?: string;
  tv?: string;
}

// 📡 Funções RFID (SGTIN-96 Decoding)
function isRFIDCode(code: string): boolean {
  const trimmed = code.trim();
  return /^[0-9A-Fa-f]{24}$/.test(trimmed);
}

function decodeRFID(epcHex: string): { barcode: string; cai: string } | null {
  try {
    console.log('📡 Decodificando RFID:', epcHex);

    const epcBigInt = BigInt('0x' + epcHex);

    // Serial Number (38 bits finais)
    const serial = Number(epcBigInt & BigInt('0x3FFFFFFFFF'));

    // Item Reference (bits 38-61, 24 bits)
    const itemReference = Number((epcBigInt >> BigInt(38)) & BigInt('0xFFFFFF'));

    // Cálculos de conversão
    const cai = Math.floor(itemReference / 16).toString();
    const barcodeNumber = Math.floor(serial / 4);
    const barcode = barcodeNumber.toString().padStart(8, '0');

    console.log('📊 RFID Decodificado: ItemRef=' + itemReference + ', Serial=' + serial);
    console.log('🔑 Código CAI extraído:', cai, '(ItemReference:', itemReference, ')');
    console.log('📊 Código de Barras extraído:', barcode, '(Serial:', serial, '/ 4 =', barcodeNumber, ')');

    return { cai, barcode };
  } catch (error) {
    console.error('❌ Erro ao decodificar RFID:', error);
    return null;
  }
}

// Deleta um pneu via API
async function deleteStockEntryByBarcode(barcode: string): Promise<void> {
  // Validação crítica: detecta se está recebendo UUID ao invés de barcode
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(barcode)) {
    console.error('❌ ERRO CRÍTICO: deleteStockEntryByBarcode recebeu UUID ao invés de barcode!');
    console.error('   UUID recebido:', barcode);
    console.error('   Stack trace:', new Error().stack);
    throw new Error(`ERRO: Tentativa de deletar usando UUID (${barcode}) ao invés de barcode de 8 dígitos. Verifique o código que está chamando esta função.`);
  }
  
  // Validação: barcode deve ter 8 dígitos
  if (!/^\d{8}$/.test(barcode)) {
    console.error('❌ ERRO: barcode inválido (deve ter 8 dígitos):', barcode);
    throw new Error(`Barcode inválido: "${barcode}". Esperado: 8 dígitos numéricos.`);
  }
  
  console.log(`🗑️ Deletando pneu com barcode: ${barcode}`);
  
  const { projectId, publicAnonKey } = await import('../utils/supabase/info');
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/stock-entries/${barcode}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || 'Erro ao deletar pneu');
  }

  console.log(`✅ Pneu ${barcode} deletado com sucesso`);
  window.dispatchEvent(new Event('stock-entries-updated'));
}

type SortField = 'barcode' | 'model' | 'type' | 'container' | 'status' | 'date' | 'ano' | 'pilot' | 'etapa' | 'categoria' | 'campeonato';
type SortDirection = 'asc' | 'desc' | null;

export function StockAdjustment() {
  const [entries, setEntries] = useState<TireEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TireEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeFilter, setBarcodeFilter] = useState('');
  
  // Filtros MultiSelect (mesmos do Reports)
  const [filterModel, setFilterModel] = useState<string[]>([]);
  const [filterContainer, setFilterContainer] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterSeason, setFilterSeason] = useState<string[]>([]);
  const [filterStage, setFilterStage] = useState<string[]>([]);
  const [filterPilot, setFilterPilot] = useState<string[]>([]);
  const [filterChampionship, setFilterChampionship] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TireEntry | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkEditProgress, setBulkEditProgress] = useState({ current: 0, total: 0 });
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TireEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    barcode: '',
    modelId: '',
    containerId: '',
    timestamp: '',
    status: 'Novo' as string,
    etapa: 'no-stage',
    categoria: '',
    ano: '',
    pilot: '',
  });
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkEditFormData, setBulkEditFormData] = useState({
    modelId: 'no-change',
    containerId: 'no-change',
    status: 'no-change',
    etapa: 'no-change',
    categoria: 'no-change',
    ano: 'no-change',
    pilot: 'no-change',
  });
  const [bulkEditBarcodes, setBulkEditBarcodes] = useState('');
  const [bulkEditSource, setBulkEditSource] = useState<'selection' | 'text'>('selection');
  const [tireModels, setTireModels] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [tireStatuses, setTireStatuses] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // 📡 Refs para RFID
  const barcodeFilterRef = useRef<HTMLTextAreaElement>(null);
  const bulkEditBarcodesRef = useRef<HTMLTextAreaElement>(null);

  // Opções de colunas disponíveis no banco de dados
  const availableColumns: ColumnOption[] = [
    { key: 'barcode', label: 'Código de Barras', defaultVisible: true },
    { key: 'model', label: 'Modelo', defaultVisible: true },
    { key: 'type', label: 'Tipo', defaultVisible: true },
    { key: 'container', label: 'Contêiner', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'date', label: 'Data de Entrada', defaultVisible: true },
    { key: 'pilot', label: 'Piloto', defaultVisible: false },
    { key: 'team', label: 'Equipe', defaultVisible: false },
    { key: 'ano', label: 'Ano/Temporada', defaultVisible: false },
    { key: 'etapa', label: 'Etapa', defaultVisible: false },
    { key: 'categoria', label: 'Categoria', defaultVisible: false },
    { key: 'campeonato', label: 'Campeonato', defaultVisible: false },
    { key: 'set', label: 'Set', defaultVisible: false },
    { key: 'pista', label: 'Pista', defaultVisible: false },
    { key: 'lado', label: 'Lado', defaultVisible: false },
    { key: 'tv', label: 'T.V', defaultVisible: false },
  ];

  // Estado para colunas visíveis (inicializa com preferências salvas ou padrões)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // Tenta carregar preferências salvas do localStorage
    try {
      const saved = localStorage.getItem('column-preference-stock-adjustment');
      if (saved) {
        const savedColumns = JSON.parse(saved);
        // Valida que as colunas salvas ainda existem
        const validColumns = savedColumns.filter((key: string) => 
          availableColumns.some(c => c.key === key)
        );
        if (validColumns.length > 0) {
          return validColumns;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferências de colunas:', error);
    }
    // Fallback para colunas padrão
    return availableColumns.filter(c => c.defaultVisible !== false).map(c => c.key);
  });

  // Debug: verificar colunas visíveis
  console.log('Colunas visíveis no StockAdjustment:', visibleColumns);
  console.log('availableColumns:', availableColumns);

  // 📡 Handler para campo "Filtrar por códigos de barras"
  const handleBarcodeFilterChange = (value: string) => {
    const cleanValue = value.toUpperCase();

    // Detecta RFID no último conteúdo adicionado
    const lines = cleanValue.split('\n');
    const lastLine = lines[lines.length - 1]?.trim();

    // Se a última linha é um RFID completo (24 chars hex)
    if (lastLine && isRFIDCode(lastLine)) {
      console.log('📡 RFID detectado no filtro:', lastLine);
      const rfidData = decodeRFID(lastLine);

      if (rfidData) {
        console.log('✅ RFID decodificado:', rfidData.barcode);

        // Substitui última linha (RFID) pelo código decodificado + quebra de linha
        lines[lines.length - 1] = rfidData.barcode;
        const newValue = lines.join('\n') + '\n'; // Adiciona quebra de linha

        setBarcodeFilter(newValue);

        toast.success('RFID Decodificado', {
          description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
          duration: 2000,
        });

        // Foca no final do textarea para próxima leitura
        setTimeout(() => {
          if (barcodeFilterRef.current) {
            barcodeFilterRef.current.focus();
            barcodeFilterRef.current.setSelectionRange(newValue.length, newValue.length);
          }
        }, 50);

        return; // Não atualiza com RFID bruto
      }
    }

    // Se não é RFID ou falhou decodificação, atualiza normalmente
    setBarcodeFilter(cleanValue);
  };

  // 📡 Handler para campo "Edição em Massa - Códigos de Barras"
  const handleBulkEditBarcodesChange = (value: string) => {
    const cleanValue = value.toUpperCase();

    // Detecta RFID no último conteúdo adicionado
    const lines = cleanValue.split('\n');
    const lastLine = lines[lines.length - 1]?.trim();

    // Se a última linha é um RFID completo (24 chars hex)
    if (lastLine && isRFIDCode(lastLine)) {
      console.log('📡 RFID detectado na edição em massa:', lastLine);
      const rfidData = decodeRFID(lastLine);

      if (rfidData) {
        console.log('✅ RFID decodificado:', rfidData.barcode);

        // Substitui última linha (RFID) pelo código decodificado + quebra de linha
        lines[lines.length - 1] = rfidData.barcode;
        const newValue = lines.join('\n') + '\n'; // Adiciona quebra de linha

        setBulkEditBarcodes(newValue);

        toast.success('RFID Decodificado', {
          description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
          duration: 2000,
        });

        // Foca no final do textarea para próxima leitura
        setTimeout(() => {
          if (bulkEditBarcodesRef.current) {
            bulkEditBarcodesRef.current.focus();
            bulkEditBarcodesRef.current.setSelectionRange(newValue.length, newValue.length);
          }
        }, 50);

        return; // Não atualiza com RFID bruto
      }
    }

    // Se não é RFID ou falhou decodificação, atualiza normalmente
    setBulkEditBarcodes(cleanValue);
  };

  useEffect(() => {
    loadEntries();
    loadTireModels();
    loadContainers();
    loadTireStatuses();
    loadStages();
    
    // Escuta atualizações de outros módulos
    const handleUpdate = () => {
      loadEntries();
    };
    
    window.addEventListener('stock-entries-updated', handleUpdate);
    return () => window.removeEventListener('stock-entries-updated', handleUpdate);
  }, []);

  // Otimização: usa useMemo ao invés de useEffect para filtros
  // Isso evita renderizações desnecessárias com grandes volumes de dados
  const filteredEntriesMemo = useMemo(() => {
    const filterStart = performance.now();
    let filtered = [...(entries || [])];
    console.log(`🔍 Iniciando filtragem de ${entries?.length || 0} entradas...`);

    // Filtro de busca geral (código de barras, modelo, contêiner)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        (entry.barcode || '').toLowerCase().includes(searchLower) ||
        (entry.modelName || '').toLowerCase().includes(searchLower) ||
        (entry.containerName || '').toLowerCase().includes(searchLower) ||
        (entry.pilot || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtro específico de código de barras (suporta múltiplos códigos, um por linha)
    if (barcodeFilter) {
      const barcodes = barcodeFilter
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0);
      
      if (barcodes.length > 0) {
        const barcodesLower = barcodes.map(b => b.toLowerCase());
        filtered = filtered.filter(entry => 
          barcodesLower.some(code => 
            (entry.barcode || '').toLowerCase().includes(code)
          )
        );
      }
    }

    // Filtros MultiSelect
    if (filterModel.length > 0) {
      filtered = filtered.filter(entry => filterModel.includes(entry.modelName));
    }

    if (filterContainer.length > 0) {
      filtered = filtered.filter(entry => filterContainer.includes(entry.containerName));
    }

    if (filterStatus.length > 0) {
      filtered = filtered.filter(entry => filterStatus.includes(entry.status || 'Novo'));
    }

    if (filterSeason.length > 0) {
      filtered = filtered.filter(entry => filterSeason.includes(entry.ano || ''));
    }

    if (filterStage.length > 0) {
      filtered = filtered.filter(entry => filterStage.includes(entry.etapa || ''));
    }

    if (filterPilot.length > 0) {
      filtered = filtered.filter(entry => filterPilot.includes(entry.pilot || ''));
    }

    if (filterChampionship.length > 0) {
      filtered = filtered.filter(entry => filterChampionship.includes(entry.campeonato || ''));
    }

    if (filterCategory.length > 0) {
      filtered = filtered.filter(entry => filterCategory.includes(entry.categoria || ''));
    }

    // Ordenação
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let compareA: any;
        let compareB: any;

        switch (sortField) {
          case 'barcode':
            compareA = a.barcode;
            compareB = b.barcode;
            break;
          case 'model':
            compareA = a.modelName;
            compareB = b.modelName;
            break;
          case 'type':
            compareA = a.modelType;
            compareB = b.modelType;
            break;
          case 'container':
            compareA = a.containerName;
            compareB = b.containerName;
            break;
          case 'status':
            compareA = a.status || 'Novo';
            compareB = b.status || 'Novo';
            break;
          case 'date':
            compareA = new Date(a.timestamp).getTime();
            compareB = new Date(b.timestamp).getTime();
            break;
          case 'ano':
            compareA = a.ano || '';
            compareB = b.ano || '';
            break;
          case 'pilot':
            compareA = a.pilot || '';
            compareB = b.pilot || '';
            break;
          case 'etapa':
            compareA = a.etapa || '';
            compareB = b.etapa || '';
            break;
          case 'categoria':
            compareA = a.categoria || '';
            compareB = b.categoria || '';
            break;
          case 'campeonato':
            compareA = a.campeonato || '';
            compareB = b.campeonato || '';
            break;
          default:
            return 0;
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const filterTime = performance.now() - filterStart;
    console.log(`✅ Filtragem concluída: ${filtered.length} resultados em ${filterTime.toFixed(0)}ms`);
    return filtered;
  }, [entries, searchTerm, barcodeFilter, filterModel, filterContainer, filterStatus, filterSeason, filterStage, filterPilot, filterChampionship, filterCategory, sortField, sortDirection]);

  // Sincroniza filteredEntries com o memo (mantém compatibilidade com código existente)
  useEffect(() => {
    setFilteredEntries(filteredEntriesMemo);
  }, [filteredEntriesMemo]);

  // Calcula etapas disponíveis baseado nos outros filtros ativos (exceto filterStage)
  // Melhora UX mostrando apenas etapas com registros considerando outros filtros
  const availableStages = useMemo(() => {
    let filtered = [...(entries || [])];

    // Aplica todos os filtros EXCETO filterStage
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        (entry.barcode || '').toLowerCase().includes(searchLower) ||
        (entry.modelName || '').toLowerCase().includes(searchLower) ||
        (entry.containerName || '').toLowerCase().includes(searchLower) ||
        (entry.pilot || '').toLowerCase().includes(searchLower)
      );
    }

    if (barcodeFilter) {
      const barcodes = barcodeFilter
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0);

      if (barcodes.length > 0) {
        const barcodesLower = barcodes.map(b => b.toLowerCase());
        filtered = filtered.filter(entry =>
          barcodesLower.some(code =>
            (entry.barcode || '').toLowerCase().includes(code)
          )
        );
      }
    }

    if (filterModel.length > 0) {
      filtered = filtered.filter(entry => filterModel.includes(entry.modelName));
    }

    if (filterContainer.length > 0) {
      filtered = filtered.filter(entry => filterContainer.includes(entry.containerName));
    }

    if (filterStatus.length > 0) {
      filtered = filtered.filter(entry => filterStatus.includes(entry.status || 'Novo'));
    }

    if (filterSeason.length > 0) {
      filtered = filtered.filter(entry => filterSeason.includes(entry.ano || ''));
    }

    if (filterPilot.length > 0) {
      filtered = filtered.filter(entry => filterPilot.includes(entry.pilot || ''));
    }

    if (filterChampionship.length > 0) {
      filtered = filtered.filter(entry => filterChampionship.includes(entry.campeonato || ''));
    }

    if (filterCategory.length > 0) {
      filtered = filtered.filter(entry => filterCategory.includes(entry.categoria || ''));
    }

    // Extrai etapas únicas e ordena numericamente
    return Array.from(new Set(filtered.map(e => e.etapa).filter(Boolean))).sort((a, b) => {
      const numA = parseFloat(a!);
      const numB = parseFloat(b!);
      return numA - numB;
    });
  }, [entries, searchTerm, barcodeFilter, filterModel, filterContainer, filterStatus, filterSeason, filterPilot, filterChampionship, filterCategory]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, barcodeFilter, filterModel, filterContainer, filterStatus, filterSeason, filterStage, filterPilot, filterChampionship, filterCategory, itemsPerPage]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      // StockAdjustment mostra TODOS os pneus incluindo descartados para gestão completa
      // Otimização: Carrega em chunks para evitar timeout de iframe
      console.log('🔄 Carregando entradas de estoque...');
      const allEntries = await getStockEntries(true);
      
      console.log(`📦 Total de entradas retornadas (após validação): ${allEntries?.length || 0}`);
      
      // Mapeia para o formato esperado pelo componente
      // Usando requestIdleCallback para não bloquear a UI
      const mappedEntries = (allEntries || []).map((entry: StockEntry) => ({
        id: entry.id,
        barcode: entry.barcode,
        modelId: entry.model_id,
        modelName: entry.model_name,
        modelType: entry.model_type,
        containerId: entry.container_id,
        containerName: entry.container_name,
        timestamp: entry.created_at,
        status: entry.status as any,
        set: entry.set_pneu,
        pilot: entry.pilot,
        team: entry.team,
        ano: entry.ano,
        etapa: entry.etapa,
        categoria: entry.categoria,
        campeonato: entry.campeonato,
        pista: entry.pista,
        lado: entry.lado,
        tv: entry.tempo_vida,
      }));
      
      console.log(`✅ ${mappedEntries.length} pneus mapeados com sucesso`);
      console.log(`📊 Total de ${mappedEntries.length} registros válidos carregados do banco`);
      setEntries(mappedEntries);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados', {
        description: 'Não foi possível carregar os dados do estoque.',
        dismissible: true,
      });
      // Fallback para array vazio para evitar erros de .map()
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTireModels = async () => {
    const models = await getTireModels();
    setTireModels(models);
  };

  const loadContainers = async () => {
    const containersList = await getContainers();
    setContainers(containersList);
  };

  const loadTireStatuses = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const { getAccessToken } = await import('../utils/supabase/client');
      
      const token = await getAccessToken();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/tire-status`,
        {
          headers: {
            'Authorization': `Bearer ${token || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Falha silenciosa
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setTireStatuses(result.data);
      }
    } catch (error) {
      // Falha silenciosa
    }
  };

  const loadStages = async () => {
    try {
      const { createClient } = await import('../utils/supabase/client');
      const supabase = createClient();
      
      const { data: stagesData, error: stagesError } = await supabase
        .from('master_data')
        .select('name')
        .eq('type', 'etapa')
        .order('name');

      if (stagesError) {
        console.error('❌ Erro ao buscar etapas:', stagesError);
        // Fallback para etapas padrão se houver erro
        setStages(['0', '1', '2', '3', '4', '5', '5.1', '6', '7', '8', '9']);
      } else if (stagesData && stagesData.length > 0) {
        const stageValues = stagesData.map(s => s.name);
        setStages(stageValues);
      } else {
        // Se não houver dados, usa valores padrão
        setStages(['0', '1', '2', '3', '4', '5', '5.1', '6', '7', '8', '9']);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar etapas:', error);
      setStages(['0', '1', '2', '3', '4', '5', '5.1', '6', '7', '8', '9']);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEntries();
    setIsRefreshing(false);
    toast.success('Dados atualizados', {
      description: `${(entries || []).length} pneus carregados.`,
      dismissible: true,
    });
  };

  // DEPRECATED: Função applyFilters removida - agora usa useMemo para otimização
  // Mantida apenas para compatibilidade (não faz mais nada)
  const applyFilters = () => {
    // Agora gerenciado por useMemo - não faz nada
    return;
    let filtered = [...(entries || [])];

    // Filtro de busca geral (código de barras, modelo, contêiner)
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        (entry.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.modelName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.containerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.pilot || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro específico de código de barras (suporta múltiplos códigos, um por linha)
    if (barcodeFilter) {
      // Divide o texto por quebras de linha e remove espaços em branco extras
      const barcodes = barcodeFilter
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0);
      
      if (barcodes.length > 0) {
        filtered = filtered.filter(entry => 
          barcodes.some(code => 
            (entry.barcode || '').toLowerCase().includes(code.toLowerCase())
          )
        );
      }
    }

    // Filtros MultiSelect
    if (filterModel.length > 0) {
      filtered = filtered.filter(entry => filterModel.includes(entry.modelName));
    }

    if (filterContainer.length > 0) {
      filtered = filtered.filter(entry => filterContainer.includes(entry.containerName));
    }

    if (filterStatus.length > 0) {
      filtered = filtered.filter(entry => filterStatus.includes(entry.status || 'Novo'));
    }

    if (filterSeason.length > 0) {
      filtered = filtered.filter(entry => filterSeason.includes(entry.ano || ''));
    }

    if (filterStage.length > 0) {
      filtered = filtered.filter(entry => filterStage.includes(entry.etapa || ''));
    }

    if (filterPilot.length > 0) {
      filtered = filtered.filter(entry => filterPilot.includes(entry.pilot || ''));
    }

    if (filterChampionship.length > 0) {
      filtered = filtered.filter(entry => filterChampionship.includes(entry.campeonato || ''));
    }

    if (filterCategory.length > 0) {
      filtered = filtered.filter(entry => filterCategory.includes(entry.categoria || ''));
    }

    // Ordenação
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let compareA: any;
        let compareB: any;

        switch (sortField) {
          case 'barcode':
            compareA = a.barcode;
            compareB = b.barcode;
            break;
          case 'model':
            compareA = a.modelName;
            compareB = b.modelName;
            break;
          case 'type':
            compareA = a.modelType;
            compareB = b.modelType;
            break;
          case 'container':
            compareA = a.containerName;
            compareB = b.containerName;
            break;
          case 'status':
            compareA = a.status || 'Novo';
            compareB = b.status || 'Novo';
            break;
          case 'date':
            compareA = new Date(a.timestamp).getTime();
            compareB = new Date(b.timestamp).getTime();
            break;
          case 'ano':
            compareA = a.ano || '';
            compareB = b.ano || '';
            break;
          case 'pilot':
            compareA = a.pilot || '';
            compareB = b.pilot || '';
            break;
          case 'etapa':
            compareA = a.etapa || '';
            compareB = b.etapa || '';
            break;
          case 'categoria':
            compareA = a.categoria || '';
            compareB = b.categoria || '';
            break;
          case 'campeonato':
            compareA = a.campeonato || '';
            compareB = b.campeonato || '';
            break;
          default:
            return 0;
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredEntries(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Ciclo: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={14} className="text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} className="text-[#D50000]" />;
    }
    return <ChevronDown size={14} className="text-[#D50000]" />;
  };

  const handleDeleteClick = (entry: TireEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (entry: TireEntry) => {
    setEntryToEdit(entry);
    setEditFormData({
      barcode: entry.barcode,
      modelId: entry.modelId,
      containerId: entry.containerId,
      timestamp: entry.timestamp,
      status: entry.status || 'Novo',
      etapa: entry.etapa || 'no-stage',
      categoria: entry.categoria || '',
      ano: entry.ano || '',
      pilot: entry.pilot || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!entryToEdit) return;

    // Validação
    if (!editFormData.barcode || editFormData.barcode.length !== 8) {
      toast.error('❌ Código inválido', {
        description: 'O código de barras deve ter exatamente 8 dígitos.',
        duration: 4000,
      });
      return;
    }

    if (!/^\d{8}$/.test(editFormData.barcode)) {
      toast.error('❌ Código inválido', {
        description: 'O código de barras deve conter apenas números.',
        duration: 4000,
      });
      return;
    }

    // Verifica se o código já existe (exceto o próprio) - apenas se mudou o código
    if (editFormData.barcode !== entryToEdit.barcode) {
      const existingEntry = entries.find(e => e.barcode === editFormData.barcode);
      if (existingEntry) {
        toast.error('⚠️ Código duplicado', {
          description: 'Este código de barras já está cadastrado.',
          duration: 4000,
        });
        return;
      }
    }

    if (!editFormData.modelId) {
      toast.error('❌ Campo obrigatório', {
        description: 'Selecione o modelo do pneu.',
        duration: 4000,
      });
      return;
    }

    // Busca dados do modelo
    const model = tireModels.find(m => m.id === editFormData.modelId);

    if (!model) {
      toast.error('❌ Erro ao salvar', {
        description: 'Modelo não encontrado.',
        duration: 4000,
      });
      return;
    }

    // Busca dados do contêiner (pode ser null/vazio para "Sem Contêiner")
    const container = editFormData.containerId 
      ? containers.find(c => c.id === editFormData.containerId)
      : null;

    // Valida se contêiner foi fornecido mas não foi encontrado
    if (editFormData.containerId && !container) {
      toast.error('❌ Erro ao salvar', {
        description: 'Contêiner não encontrado.',
        duration: 4000,
      });
      return;
    }

    setIsSaving(true);

    try {
      // Se o código de barras mudou, precisamos deletar o antigo e criar um novo
      // porque o barcode é a chave primária
      if (editFormData.barcode !== entryToEdit.barcode) {
        // Deleta o antigo
        await deleteStockEntryByBarcode(entryToEdit.barcode);
        
        // Cria um novo com os dados atualizados
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/stock-entries`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              barcode: editFormData.barcode,
              model_id: model.id,
              model_name: model.name,
              model_type: model.type,
              container_id: container?.id || null,
              container_name: container?.name || null,
              status: editFormData.status,
              etapa: editFormData.etapa === 'no-stage' ? null : editFormData.etapa,
              categoria: editFormData.categoria || null,
              ano: editFormData.ano || null,
              pilot: editFormData.pilot || null,
            }),
          }
        );
      } else {
        // Apenas atualiza os campos
        await updateStockEntryByBarcode(entryToEdit.barcode, {
          model_id: model.id,
          model_name: model.name,
          model_type: model.type,
          container_id: container?.id || null,
          container_name: container?.name || null,
          status: editFormData.status,
          etapa: editFormData.etapa === 'no-stage' ? null : editFormData.etapa,
          categoria: editFormData.categoria || null,
          ano: editFormData.ano || null,
          pilot: editFormData.pilot || null,
        });
      }

      toast.success('✅ Pneu atualizado', {
        description: `Código ${editFormData.barcode} atualizado com sucesso.`,
        duration: 3000,
      });

      // Recarrega a lista
      await loadEntries();

      setIsSaving(false);
      setEditDialogOpen(false);
      setEntryToEdit(null);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('❌ Erro ao salvar', {
        description: error?.message || 'Não foi possível atualizar o pneu.',
        duration: 4000,
      });
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    setIsDeleting(true);

    try {
      // 💾 Salva backup completo do registro antes de deletar
      const backup = { ...entryToDelete };
      
      // Deleta do banco via API
      await deleteStockEntryByBarcode(entryToDelete.barcode);

      // 🔄 Toast com botão "Desfazer"
      toastUndoable.delete({
        title: '🗑️ Pneu Excluído',
        description: `${entryToDelete.modelName} • Código ${entryToDelete.barcode}`,
        duration: 8000, // 8 segundos para exclusões
        onUndo: async () => {
          // Restaura o registro no banco
          const { projectId, publicAnonKey } = await import('../utils/supabase/info');
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/stock-entries`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: backup.id,
                barcode: backup.barcode,
                model_id: backup.modelId,
                model_name: backup.modelName,
                model_type: backup.modelType,
                container_id: backup.containerId,
                container_name: backup.containerName,
                status: backup.status || 'Novo',
                created_at: backup.timestamp,
                set_pneu: backup.set,
                pilot: backup.pilot,
                team: backup.team,
                ano: backup.ano,
                etapa: backup.etapa,
                categoria: backup.categoria,
                campeonato: backup.campeonato,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('Falha ao restaurar registro');
          }
          
          // Recarrega a lista
          await loadEntries();
          
          console.log('✅ Exclusão desfeita:', backup.barcode);
        }
      });

      // Recarrega a lista
      await loadEntries();

      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast.error('❌ Erro ao excluir', {
        description: error?.message || 'Não foi possível excluir o pneu.',
        duration: 4000,
      });
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) {
      toast.error('Nenhum pneu selecionado', {
        description: 'Selecione os pneus que deseja excluir.',
      });
      return;
    }

    const count = selectedEntries.size;
    const barcodesToDelete = Array.from(selectedEntries);
    
    console.log('🗑️ Iniciando deleção em massa');
    console.log('   Total de itens selecionados:', count);
    console.log('   Primeiros 5 itens:', barcodesToDelete.slice(0, 5));
    
    // Validação de segurança: verifica se algum item é UUID
    const hasUUID = barcodesToDelete.some(item => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(item);
    });
    
    if (hasUUID) {
      console.error('❌ ERRO CRÍTICO: selectedEntries contém UUIDs ao invés de barcodes!');
      console.error('   Conteúdo completo do Set:', Array.from(selectedEntries));
      toast.error('Erro interno: dados inválidos detectados', {
        description: 'Por favor, recarregue a página e tente novamente.',
        duration: 6000,
      });
      return;
    }
    
    setIsDeleting(true);

    try {
      // 💾 Salva backup de TODOS os registros antes de deletar
      const backupEntries = (entries || []).filter(entry => 
        barcodesToDelete.includes(entry.barcode)
      );
      
      // Deleta cada pneu usando o barcode diretamente
      for (const barcode of barcodesToDelete) {
        await deleteStockEntryByBarcode(barcode);
      }

      // 🔄 Toast com botão "Desfazer" para exclusão em massa
      toastUndoable.delete({
        title: `🗑️ ${count} ${count === 1 ? 'Pneu Excluído' : 'Pneus Excluídos'}`,
        description: `${count} ${count === 1 ? 'item removido' : 'itens removidos'} do estoque`,
        duration: 10000, // 10 segundos para operações em massa
        onUndo: async () => {
          // Restaura TODOS os registros no banco
          const { projectId, publicAnonKey } = await import('../utils/supabase/info');
          
          for (const backup of backupEntries) {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/stock-entries`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: backup.id,
                  barcode: backup.barcode,
                  model_id: backup.modelId,
                  model_name: backup.modelName,
                  model_type: backup.modelType,
                  container_id: backup.containerId,
                  container_name: backup.containerName,
                  status: backup.status || 'Novo',
                  created_at: backup.timestamp,
                  set_pneu: backup.set,
                  pilot: backup.pilot,
                  team: backup.team,
                  ano: backup.ano,
                  etapa: backup.etapa,
                  categoria: backup.categoria,
                  campeonato: backup.campeonato,
                }),
              }
            );
          }
          
          // Recarrega a lista
          await loadEntries();
          
          console.log('✅ Exclusão em massa desfeita:', backupEntries.length, 'registros restaurados');
        }
      });

      // Recarrega a lista
      await loadEntries();
      setSelectedEntries(new Set());
      setIsDeleting(false);
    } catch (error: any) {
      console.error('Erro ao deletar em massa:', error);
      toast.error('❌ Erro ao excluir', {
        description: error?.message || 'Não foi possível excluir todos os pneus.',
        duration: 4000,
      });
      setIsDeleting(false);
    }
  };

  const handleBulkEdit = async () => {
    // Determina quais códigos de barras usar
    let barcodesToEdit: string[] = [];
    let invalidBarcodes: string[] = [];

    if (bulkEditSource === 'text') {
      // Processa códigos de barras do campo de texto
      const inputBarcodes = bulkEditBarcodes
        .split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0);

      if (inputBarcodes.length === 0) {
        toast.error('Nenhum código de barras informado', {
          description: 'Digite ao menos um código de barras.',
        });
        return;
      }

      // Valida se os códigos existem no estoque
      const existingBarcodes = new Set(entries.map(e => e.barcode));
      inputBarcodes.forEach(barcode => {
        if (existingBarcodes.has(barcode)) {
          barcodesToEdit.push(barcode);
        } else {
          invalidBarcodes.push(barcode);
        }
      });

      if (barcodesToEdit.length === 0) {
        toast.error('Nenhum código válido encontrado', {
          description: 'Todos os códigos digitados são inválidos ou não existem no estoque.',
        });
        return;
      }
    } else {
      // Usa seleção visual
      if (selectedEntries.size === 0) {
        toast.error('Nenhum pneu selecionado', {
          description: 'Selecione ao menos um pneu na tabela.',
        });
        return;
      }
      barcodesToEdit = Array.from(selectedEntries);
    }

    const count = barcodesToEdit.length;
    
    // Identifica quais campos serão alterados
    const fieldsToUpdate: string[] = [];
    if (bulkEditFormData.modelId !== 'no-change') fieldsToUpdate.push('Modelo');
    if (bulkEditFormData.containerId !== 'no-change') fieldsToUpdate.push('Contêiner');
    if (bulkEditFormData.status !== 'no-change') fieldsToUpdate.push('Status');
    if (bulkEditFormData.etapa !== 'no-change') fieldsToUpdate.push('Etapa');
    if (bulkEditFormData.categoria !== 'no-change') fieldsToUpdate.push('Categoria');
    if (bulkEditFormData.ano !== 'no-change') fieldsToUpdate.push('Ano');
    if (bulkEditFormData.pilot !== 'no-change') fieldsToUpdate.push('Piloto');

    if (fieldsToUpdate.length === 0) {
      toast.error('Nenhuma alteração selecionada', {
        description: 'Selecione ao menos um campo para editar.',
      });
      return;
    }

    setIsSaving(true);
    setBulkEditProgress({ current: 0, total: barcodesToEdit.length });

    try {
      // Atualiza cada pneu selecionado
      let processedCount = 0;
      for (const barcode of barcodesToEdit) {
        const updateData: any = {};

        // Só atualiza os campos que foram modificados
        if (bulkEditFormData.modelId !== 'no-change') {
          const model = tireModels.find(m => m.id === bulkEditFormData.modelId);
          if (model) {
            updateData.model_id = model.id;
            updateData.model_name = model.name;
            updateData.model_type = model.type;
          }
        }

        if (bulkEditFormData.containerId !== 'no-change') {
          if (bulkEditFormData.containerId === 'no-container') {
            updateData.container_id = null;
            updateData.container_name = null;
          } else {
            const container = containers.find(c => c.id === bulkEditFormData.containerId);
            if (container) {
              updateData.container_id = container.id;
              updateData.container_name = container.name;
            }
          }
        }

        if (bulkEditFormData.status !== 'no-change') {
          updateData.status = bulkEditFormData.status;
        }

        if (bulkEditFormData.etapa !== 'no-change') {
          updateData.etapa = bulkEditFormData.etapa === 'no-stage' ? null : bulkEditFormData.etapa;
        }

        if (bulkEditFormData.categoria !== 'no-change') {
          updateData.categoria = bulkEditFormData.categoria === 'no-category' ? null : bulkEditFormData.categoria;
        }

        if (bulkEditFormData.ano !== 'no-change') {
          updateData.ano = bulkEditFormData.ano === 'no-season' ? null : bulkEditFormData.ano;
        }

        if (bulkEditFormData.pilot !== 'no-change') {
          updateData.pilot = bulkEditFormData.pilot === 'no-pilot' ? null : bulkEditFormData.pilot;
        }

        // Atualiza via API
        await updateStockEntryByBarcode(barcode, updateData);
        
        // Atualiza o progresso
        processedCount++;
        setBulkEditProgress({ current: processedCount, total: barcodesToEdit.length });
      }

      const successMessage = invalidBarcodes.length > 0
        ? `${count} atualizados, ${invalidBarcodes.length} inválidos`
        : `${count} ${count === 1 ? 'pneu atualizado' : 'pneus atualizados'}`;

      toast.success(`✅ ${successMessage}`, {
        description: `Campos alterados: ${fieldsToUpdate.join(', ')}`,
        duration: 4000,
      });

      // Recarrega a lista
      await loadEntries();

      setIsSaving(false);
      setBulkEditProgress({ current: 0, total: 0 });
      setBulkEditDialogOpen(false);
      setSelectedEntries(new Set());
      setBulkEditBarcodes('');
      setBulkEditSource('selection');
      setBulkEditFormData({
        modelId: 'no-change',
        containerId: 'no-change',
        status: 'no-change',
        etapa: 'no-change',
        categoria: 'no-change',
        ano: 'no-change',
        pilot: 'no-change',
      });
    } catch (error: any) {
      console.error('Erro ao editar em massa:', error);
      toast.error('❌ Erro ao editar', {
        description: error?.message || 'Não foi possível atualizar todos os pneus.',
        duration: 4000,
      });
      setIsSaving(false);
      setBulkEditProgress({ current: 0, total: 0 });
    }
  };

  const toggleSelectEntry = (barcode: string) => {
    // Validação: garante que não está adicionando UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(barcode)) {
      console.error('❌ ERRO: toggleSelectEntry tentou adicionar UUID ao invés de barcode!');
      console.error('   UUID recebido:', barcode);
      console.error('   Stack trace:', new Error().stack);
      toast.error('Erro interno detectado', {
        description: 'Por favor, recarregue a página.',
        duration: 5000,
      });
      return;
    }
    
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(barcode)) {
      newSelected.delete(barcode);
    } else {
      newSelected.add(barcode);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      const barcodes = filteredEntries.map(e => e.barcode);
      
      // Validação: verifica se algum item é UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const hasUUID = barcodes.some(b => uuidRegex.test(b));
      
      if (hasUUID) {
        console.error('❌ ERRO: filteredEntries contém registros com barcode UUID!');
        console.error('   Primeiros 5 entries:', filteredEntries.slice(0, 5).map(e => ({
          id: e.id,
          barcode: e.barcode
        })));
        toast.error('Erro: dados corrompidos detectados', {
          description: 'Por favor, recarregue a página.',
          duration: 6000,
        });
        return;
      }
      
      setSelectedEntries(new Set(barcodes));
    }
  };



  // Obter lista única de contêineres (filtra vazios)
  const uniqueContainers = Array.from(
    (entries || [])
      .reduce((map, e) => {
        // Apenas adiciona se tiver ID válido e não vazio
        if (e.containerId && e.containerId !== '') {
          map.set(e.containerId, { id: e.containerId, name: e.containerName });
        }
        return map;
      }, new Map<string, { id: string; name: string }>())
      .values()
  );

  // Função helper para renderizar o cabeçalho de uma coluna
  const renderColumnHeader = (columnKey: string) => {
    const columnConfig: Record<string, { label: string; sortable: boolean; sortField?: SortField }> = {
      barcode: { label: 'Código de Barras', sortable: true, sortField: 'barcode' },
      model: { label: 'Modelo', sortable: true, sortField: 'model' },
      type: { label: 'Tipo', sortable: true, sortField: 'type' },
      container: { label: 'Contêiner', sortable: true, sortField: 'container' },
      status: { label: 'Status', sortable: true, sortField: 'status' },
      date: { label: 'Data de Entrada', sortable: true, sortField: 'date' },
      pilot: { label: 'Piloto', sortable: true, sortField: 'pilot' },
      team: { label: 'Equipe', sortable: false },
      ano: { label: 'Ano/Temporada', sortable: true, sortField: 'ano' },
      etapa: { label: 'Etapa', sortable: true, sortField: 'etapa' },
      categoria: { label: 'Categoria', sortable: true, sortField: 'categoria' },
      campeonato: { label: 'Campeonato', sortable: true, sortField: 'campeonato' },
      set: { label: 'Set', sortable: true, sortField: 'set' },
      pista: { label: 'Pista', sortable: true, sortField: 'pista' },
      lado: { label: 'Lado', sortable: true, sortField: 'lado' },
      tv: { label: 'T.V', sortable: false },
    };

    const config = columnConfig[columnKey];
    if (!config) return null;

    if (config.sortable && config.sortField) {
      return (
        <th 
          key={columnKey}
          className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
          onClick={() => handleSort(config.sortField!)}
        >
          <div className="flex items-center gap-2">
            <span>{config.label}</span>
            {getSortIcon(config.sortField!)}
          </div>
        </th>
      );
    }

    return (
      <th key={columnKey} className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
        {config.label}
      </th>
    );
  };

  // Função helper para renderizar uma célula
  const renderCell = (columnKey: string, entry: TireEntry) => {
    switch (columnKey) {
      case 'barcode':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Barcode size={16} className="text-gray-400" />
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {entry.barcode}
              </code>
            </div>
          </td>
        );
      
      case 'model':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-gray-400" />
              <span className="text-sm text-gray-900">{entry.modelName}</span>
            </div>
          </td>
        );
      
      case 'type':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <Badge
              variant="secondary"
              className={entry.modelType === 'Slick' 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-blue-100 text-blue-700'
              }
            >
              {entry.modelType}
            </Badge>
          </td>
        );
      
      case 'container':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-gray-400" />
              <span className="text-sm text-gray-900">{entry.containerName}</span>
            </div>
          </td>
        );
      
      case 'status':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <StatusBadge statusName={entry.status || 'Novo'} />
          </td>
        );
      
      case 'date':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-900">
                  {new Date(entry.timestamp).toLocaleDateString('pt-BR')}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          </td>
        );
      
      case 'pilot':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.pilot || '-'}</span>
          </td>
        );
      
      case 'team':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.team || '-'}</span>
          </td>
        );
      
      case 'ano':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.ano || '-'}</span>
          </td>
        );
      
      case 'etapa':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.etapa ? `Etapa ${entry.etapa}` : '-'}</span>
          </td>
        );
      
      case 'categoria':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.categoria || '-'}</span>
          </td>
        );
      
      case 'campeonato':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.campeonato || '-'}</span>
          </td>
        );
      
      case 'set':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.set || '-'}</span>
          </td>
        );

      case 'pista':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.pista || '-'}</span>
          </td>
        );

      case 'lado':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.lado || '-'}</span>
          </td>
        );

      case 'tv':
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">{entry.tv || '-'}</span>
          </td>
        );
      
      default:
        return (
          <td key={columnKey} className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm text-gray-900">-</span>
          </td>
        );
    }
  };

  // Loading state otimizado para grandes volumes
  if (isLoading && entries.length === 0) {
    return (
      <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl lg:mx-auto w-full">
          <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <RefreshCw className="animate-spin text-[#D50000]" size={48} />
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Carregando dados do estoque...</h3>
              <p className="text-sm text-gray-500">Aguarde enquanto processamos os registros</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-[#D50000]" />
            </div>
            <div>
              <h1 className="text-gray-900">Ajuste de Estoque</h1>
              <p className="text-gray-500">Gerencie e remova pneus cadastrados (Área Restrita)</p>
            </div>
          </div>
        </div>

        {/* Verificação de Integridade do Banco de Dados */}
        <div className="mb-6">
          <DatabaseHealthCheck />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total de Pneus</p>
                <p className="text-gray-900">{entries.length}</p>
              </div>
              <Package className="text-gray-400" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Filtrados</p>
                <p className="text-gray-900">{filteredEntries.length}</p>
              </div>
              <Filter className="text-gray-400" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Selecionados</p>
                <p className="text-gray-900">{selectedEntries.size}</p>
              </div>
              <Trash2 className="text-gray-400" size={24} />
            </div>
          </div>
        </div>

        {/* Quick Bulk Edit Button */}
        <div className="mb-4">
          <Button
            onClick={() => {
              setBulkEditFormData({
                modelId: 'no-change',
                containerId: 'no-change',
                status: 'no-change',
                etapa: 'no-change',
                categoria: 'no-change',
              });
              setBulkEditBarcodes('');
              setBulkEditSource('text');
              setBulkEditDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit size={16} className="mr-2" />
            Editar em Massa por Códigos
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 sm:p-6 mb-6">
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
            <h3 className="text-gray-900 text-base sm:text-lg">Filtros</h3>
            {(filterStatus.length > 0 || filterModel.length > 0 || filterContainer.length > 0 || 
              filterCategory.length > 0 || filterSeason.length > 0 || filterStage.length > 0 || 
              filterPilot.length > 0 || filterChampionship.length > 0 || searchTerm || barcodeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setBarcodeFilter('');
                  setFilterStatus([]);
                  setFilterModel([]);
                  setFilterContainer([]);
                  setFilterCategory([]);
                  setFilterSeason([]);
                  setFilterStage([]);
                  setFilterPilot([]);
                  setFilterChampionship([]);
                  setSortField(null);
                  setSortDirection(null);
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Limpar filtros</span>
                <span className="sm:hidden">Limpar</span>
              </Button>
            )}
          </div>
          
          {/* Busca Geral e Código de Barras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            
            <div className="relative">
              <Barcode className="absolute left-3 top-3 text-gray-400" size={18} />
              <Textarea
                ref={barcodeFilterRef}
                placeholder="Filtrar por códigos de barras ou RFID (um por linha)&#10;Exemplo:&#10;04613246&#10;05284508&#10;301854AAE059B8000149614B"
                value={barcodeFilter}
                onChange={(e) => handleBarcodeFilterChange(e.target.value)}
                className="!pl-10 min-h-[120px] resize-y font-mono"
                rows={5}
              />
            </div>
          </div>

          <div className="space-y-3">
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
                options={tireModels.map(model => ({
                  label: model.name,
                  value: model.name
                }))}
                selected={filterModel}
                onChange={setFilterModel}
                placeholder="Todos os modelos"
                searchPlaceholder="Buscar modelo..."
                emptyMessage="Nenhum modelo encontrado."
              />

              <MultiSelect
                options={containers.map(container => ({
                  label: container.name,
                  value: container.name
                }))}
                selected={filterContainer}
                onChange={setFilterContainer}
                placeholder="Todos os contêineres"
                searchPlaceholder="Buscar contêiner..."
                emptyMessage="Nenhum contêiner encontrado."
              />

              <MultiSelect
                options={Array.from(new Set(entries.map(e => e.categoria).filter(Boolean))).sort().map(category => ({
                  label: category!,
                  value: category!
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
                options={Array.from(new Set(entries.map(e => e.ano).filter(Boolean))).sort((a, b) => b!.localeCompare(a!)).map(season => ({
                  label: season!,
                  value: season!
                }))}
                selected={filterSeason}
                onChange={setFilterSeason}
                placeholder="Todas as temporadas"
                searchPlaceholder="Buscar temporada..."
                emptyMessage="Nenhuma temporada encontrada."
              />

              <MultiSelect
                options={availableStages.map(stage => ({
                  label: `Etapa ${stage}`,
                  value: stage!
                }))}
                selected={filterStage}
                onChange={setFilterStage}
                placeholder="Todas as etapas"
                searchPlaceholder="Buscar etapa..."
                emptyMessage="Nenhuma etapa encontrada."
              />

              <MultiSelect
                options={Array.from(new Set(entries.map(e => e.pilot).filter(Boolean))).sort().map(pilot => ({
                  label: pilot!,
                  value: pilot!
                }))}
                selected={filterPilot}
                onChange={setFilterPilot}
                placeholder="Todos os pilotos"
                searchPlaceholder="Buscar piloto..."
                emptyMessage="Nenhum piloto encontrado."
              />

              <MultiSelect
                options={Array.from(new Set(entries.map(e => e.campeonato).filter(Boolean))).sort().map(championship => ({
                  label: championship!,
                  value: championship!
                }))}
                selected={filterChampionship}
                onChange={setFilterChampionship}
                placeholder="Todos os campeonatos"
                searchPlaceholder="Buscar campeonato..."
                emptyMessage="Nenhum campeonato encontrado."
              />
            </div>
          </div>
          
          {sortField && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag size={14} />
                <span>
                  Ordenando por <strong>{
                    sortField === 'barcode' ? 'Código' :
                    sortField === 'model' ? 'Modelo' :
                    sortField === 'type' ? 'Tipo' :
                    sortField === 'container' ? 'Contêiner' :
                    sortField === 'status' ? 'Status' :
                    sortField === 'date' ? 'Data' :
                    sortField === 'ano' ? 'Ano/Temporada' :
                    sortField === 'pilot' ? 'Piloto' :
                    sortField === 'etapa' ? 'Etapa' :
                    sortField === 'categoria' ? 'Categoria' :
                    sortField === 'campeonato' ? 'Campeonato' : sortField
                  }</strong> ({sortDirection === 'asc' ? 'Crescente' : 'Decrescente'})
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Bulk Actions */}
        {selectedEntries.size > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-[#D50000]" size={20} />
              <span className="text-gray-900">
                {selectedEntries.size} {selectedEntries.size === 1 ? 'pneu selecionado' : 'pneus selecionados'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setSelectedEntries(new Set())}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setBulkEditFormData({
                    modelId: 'no-change',
                    containerId: 'no-change',
                    status: 'no-change',
                    etapa: 'no-change',
                    categoria: 'no-change',
                  });
                  setBulkEditBarcodes('');
                  setBulkEditSource('selection');
                  setBulkEditDialogOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Edit size={16} className="mr-2" />
                Editar Seleção
              </Button>
              <Button
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Excluir Selecionados
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-gray-600">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Visualização:</span>
                <ColumnSelector
                  columns={availableColumns}
                  selectedColumns={visibleColumns}
                  onChange={setVisibleColumns}
                  storageKey="stock-adjustment"
                />
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Registros por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <RefreshCw size={48} className="mx-auto mb-4 text-gray-300 animate-spin" />
                <p className="text-gray-500">Carregando dados do banco...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-30" />
                <p>
                  {entries.length === 0 
                    ? 'Nenhum pneu cadastrado no estoque' 
                    : 'Nenhum pneu encontrado com os filtros aplicados'
                  }
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-[#D50000] rounded border-gray-300 focus:ring-[#D50000]"
                      />
                    </th>
                    {visibleColumns.map(columnKey => renderColumnHeader(columnKey))}
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((entry) => (
                    <tr 
                      key={entry.barcode} 
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedEntries.has(entry.barcode) ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.barcode)}
                          onChange={() => toggleSelectEntry(entry.barcode)}
                          className="w-4 h-4 text-[#D50000] rounded border-gray-300 focus:ring-[#D50000]"
                        />
                      </td>
                      {visibleColumns.map(columnKey => renderCell(columnKey, entry))}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(entry)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Editar pneu"
                            aria-label={`Editar pneu ${entry.barcode}`}
                          >
                            <Edit size={18} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Excluir pneu"
                            aria-label={`Excluir pneu ${entry.barcode}`}
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredEntries.length > 0 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredEntries.length)} de {filteredEntries.length} registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  aria-label="Página anterior"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {Math.ceil(filteredEntries.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredEntries.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(filteredEntries.length / itemsPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  aria-label="Próxima página"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-gray-900 mb-1">Atenção: Área Restrita</p>
              <p className="text-xs text-gray-600">
                Esta funcionalidade é exclusiva para administradores. A exclusão de pneus é permanente 
                e afetará os relatórios e históricos do sistema. Use com cautela.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pneu do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pneu com código <strong>{entryToDelete?.barcode}</strong>?
              <br /><br />
              <strong>Modelo:</strong> {entryToDelete?.modelName}
              <br />
              <strong>Contêiner:</strong> {entryToDelete?.containerName}
              <br /><br />
              Esta ação não pode ser desfeita e o pneu será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Pneu</DialogTitle>
            <DialogDescription>
              Altere os dados do pneu cadastrado no estoque.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Código de Barras */}
            <div className="space-y-2">
              <Label htmlFor="edit-barcode">Código de Barras</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <Input
                  id="edit-barcode"
                  type="text"
                  maxLength={8}
                  value={editFormData.barcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEditFormData({ ...editFormData, barcode: value });
                  }}
                  placeholder="00000000"
                  className="pl-11 font-mono"
                />
              </div>
              <p className="text-xs text-gray-500">8 dígitos numéricos</p>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modelo do Pneu</Label>
              <Select 
                value={editFormData.modelId} 
                onValueChange={(value) => setEditFormData({ ...editFormData, modelId: value })}
              >
                <SelectTrigger id="edit-model">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {tireModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={model.type === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {model.type}
                        </Badge>
                        <span>{model.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contêiner */}
            <div className="space-y-2">
              <Label htmlFor="edit-container">Contêiner</Label>
              <Select 
                value={editFormData.containerId || 'no-container'} 
                onValueChange={(value) => setEditFormData({ ...editFormData, containerId: value === 'no-container' ? '' : value })}
              >
                <SelectTrigger id="edit-container">
                  <SelectValue placeholder="Selecione o contêiner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-container">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-orange-500" />
                      <span className="text-orange-700">Sem Contêiner</span>
                    </div>
                  </SelectItem>
                  {containers.map((container) => (
                    <SelectItem key={container.id} value={container.id}>
                      {container.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status do Pneu</Label>
              <Select 
                value={editFormData.status} 
                onValueChange={(value: any) => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {tireStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        ></div>
                        <span>{status.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Status atual do pneu
              </p>
            </div>

            {/* Etapa */}
            <div className="space-y-2">
              <Label htmlFor="edit-etapa">Etapa</Label>
              <Select 
                value={editFormData.etapa === '' || !editFormData.etapa ? 'no-stage' : editFormData.etapa} 
                onValueChange={(value: any) => setEditFormData({ ...editFormData, etapa: value === 'no-stage' ? 'no-stage' : value })}
              >
                <SelectTrigger id="edit-etapa">
                  <SelectValue placeholder="Selecione a etapa (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-stage">
                    <span className="text-gray-500">Nenhuma</span>
                  </SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      Etapa {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Etapa do campeonato (opcional)
              </p>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Select
                value={editFormData.categoria || 'no-category'}
                onValueChange={(value: any) => setEditFormData({ ...editFormData, categoria: value === 'no-category' ? '' : value })}
              >
                <SelectTrigger id="edit-categoria">
                  <SelectValue placeholder="Selecione a categoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-category">
                    <span className="text-gray-500">Nenhuma</span>
                  </SelectItem>
                  {Array.from(new Set(entries.map(e => e.categoria).filter(Boolean))).sort().map((categoria) => (
                    <SelectItem key={categoria} value={categoria!}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Categoria do campeonato (opcional)
              </p>
            </div>

            {/* Ano (Temporada) */}
            <div className="space-y-2">
              <Label htmlFor="edit-ano">Ano / Temporada</Label>
              <Select
                value={editFormData.ano || 'no-season'}
                onValueChange={(value: any) => setEditFormData({ ...editFormData, ano: value === 'no-season' ? '' : value })}
              >
                <SelectTrigger id="edit-ano">
                  <SelectValue placeholder="Selecione o ano (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-season">
                    <span className="text-gray-500">Nenhum</span>
                  </SelectItem>
                  {Array.from(new Set(entries.map(e => e.ano).filter(Boolean))).sort((a, b) => b!.localeCompare(a!)).map((ano) => (
                    <SelectItem key={ano} value={ano!}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Ano da temporada (opcional)
              </p>
            </div>

            {/* Piloto */}
            <div className="space-y-2">
              <Label htmlFor="edit-pilot">Piloto</Label>
              <Select
                value={editFormData.pilot || 'no-pilot'}
                onValueChange={(value: any) => setEditFormData({ ...editFormData, pilot: value === 'no-pilot' ? '' : value })}
              >
                <SelectTrigger id="edit-pilot">
                  <SelectValue placeholder="Selecione o piloto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-pilot">
                    <span className="text-gray-500">Nenhum</span>
                  </SelectItem>
                  {Array.from(new Set(entries.map(e => e.pilot).filter(Boolean))).sort().map((pilot) => (
                    <SelectItem key={pilot} value={pilot!}>
                      {pilot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Piloto responsável (opcional)
              </p>
            </div>

            {/* Data/Hora */}
            <div className="space-y-2">
              <Label htmlFor="edit-timestamp">Data e Hora</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <Input
                  id="edit-timestamp"
                  type="datetime-local"
                  value={editFormData.timestamp ? new Date(editFormData.timestamp).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const isoString = new Date(e.target.value).toISOString();
                    setEditFormData({ ...editFormData, timestamp: isoString });
                  }}
                  className="pl-11"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEntryToEdit(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#D50000] hover:bg-[#B00000] text-white"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog 
        open={bulkEditDialogOpen} 
        onOpenChange={(open) => {
          // Não permite fechar o diálogo enquanto está salvando
          if (!isSaving) {
            setBulkEditDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar em Massa</DialogTitle>
            <DialogDescription>
              Escolha os pneus por seleção ou digitando códigos de barras. Apenas os campos alterados serão atualizados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tabs para escolher fonte */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setBulkEditSource('selection')}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-b-2 ${
                  bulkEditSource === 'selection'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Package size={16} />
                Pneus Selecionados ({selectedEntries.size})
              </button>
              <button
                onClick={() => setBulkEditSource('text')}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-b-2 ${
                  bulkEditSource === 'text'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Barcode size={16} />
                Digitar Códigos
              </button>
            </div>

            {/* Preview/Input baseado na fonte selecionada */}
            {bulkEditSource === 'selection' ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm text-gray-700 mb-2">
                  {selectedEntries.size} {selectedEntries.size === 1 ? 'pneu selecionado' : 'pneus selecionados'}:
                </h4>
                {selectedEntries.size > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {Array.from(selectedEntries).slice(0, 20).map(barcode => (
                      <Badge key={barcode} variant="secondary" className="font-mono">
                        {barcode}
                      </Badge>
                    ))}
                    {selectedEntries.size > 20 && (
                      <Badge variant="secondary">
                        +{selectedEntries.size - 20} mais
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Nenhum pneu selecionado. Selecione pneus na tabela abaixo ou use a aba "Digitar Códigos de Barras".
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulk-barcodes">
                    Códigos de Barras (um por linha)
                  </Label>
                  <div className="flex gap-2">
                    {bulkEditBarcodes && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBulkEditBarcodes('')}
                        className="text-xs h-auto py-1 px-2 text-gray-500 hover:text-gray-700"
                      >
                        Limpar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const text = await readFromClipboard();
                          setBulkEditBarcodes(text);
                          toast.success('Códigos colados com sucesso!');
                        } catch (err) {
                          toast.error('Erro ao colar', {
                            description: 'Use Ctrl+V para colar os códigos manualmente.',
                          });
                        }
                      }}
                      className="text-xs h-auto py-1 px-2"
                    >
                      Colar
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Barcode className="absolute left-3 top-3 text-gray-400 pointer-events-none z-10" size={18} />
                  <Textarea
                    ref={bulkEditBarcodesRef}
                    id="bulk-barcodes"
                    placeholder="Digite os códigos de barras ou RFID, um por linha:&#10;04613246&#10;05284508&#10;301854AAE059B8000149614B"
                    value={bulkEditBarcodes}
                    onChange={(e) => handleBulkEditBarcodesChange(e.target.value)}
                    className="!pl-10 min-h-[180px] resize-y font-mono"
                    rows={8}
                  />
                </div>
                {(() => {
                  const inputBarcodes = bulkEditBarcodes
                    .split('\n')
                    .map(b => b.trim())
                    .filter(b => b.length > 0);
                  
                  if (inputBarcodes.length === 0) {
                    return (
                      <p className="text-xs text-gray-500">
                        Digite os códigos de barras acima, um por linha
                      </p>
                    );
                  }

                  const existingBarcodes = new Set(entries.map(e => e.barcode));
                  const validCodes = inputBarcodes.filter(b => existingBarcodes.has(b));
                  const invalidCodes = inputBarcodes.filter(b => !existingBarcodes.has(b));

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-green-600">
                          ✓ {validCodes.length} válidos
                        </span>
                        {invalidCodes.length > 0 && (
                          <span className="text-red-600">
                            ✗ {invalidCodes.length} inválidos
                          </span>
                        )}
                      </div>
                      {invalidCodes.length > 0 && invalidCodes.length <= 5 && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-xs text-red-700 mb-1">Códigos não encontrados:</p>
                          <div className="flex flex-wrap gap-1">
                            {invalidCodes.map(code => (
                              <Badge key={code} variant="destructive" className="font-mono text-xs">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="bulk-model">Modelo do Pneu</Label>
              <Select 
                value={bulkEditFormData.modelId} 
                onValueChange={(value) => setBulkEditFormData({ ...bulkEditFormData, modelId: value })}
              >
                <SelectTrigger id="bulk-model">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  {tireModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge variant={model.type === 'Slick' ? 'default' : 'secondary'} className="text-xs">
                          {model.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.modelId === 'no-change' 
                  ? 'Modelo não será alterado' 
                  : 'Todos os pneus terão o modelo alterado'
                }
              </p>
            </div>

            {/* Contêiner */}
            <div className="space-y-2">
              <Label htmlFor="bulk-container">Contêiner</Label>
              <Select 
                value={bulkEditFormData.containerId} 
                onValueChange={(value) => setBulkEditFormData({ ...bulkEditFormData, containerId: value })}
              >
                <SelectTrigger id="bulk-container">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  <SelectItem value="no-container">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-orange-500" />
                      <span className="text-orange-700">Sem Contêiner</span>
                    </div>
                  </SelectItem>
                  {containers.map((container) => (
                    <SelectItem key={container.id} value={container.id}>
                      {container.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.containerId === 'no-change' 
                  ? 'Contêiner não será alterado' 
                  : 'Todos os pneus selecionados serão movidos para este contêiner'
                }
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="bulk-status">Status do Pneu</Label>
              <Select 
                value={bulkEditFormData.status} 
                onValueChange={(value: any) => setBulkEditFormData({ ...bulkEditFormData, status: value })}
              >
                <SelectTrigger id="bulk-status">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  {tireStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        ></div>
                        <span>{status.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.status === 'no-change' 
                  ? 'Status não será alterado' 
                  : 'Todos os pneus terão o status alterado'
                }
              </p>
            </div>

            {/* Etapa */}
            <div className="space-y-2">
              <Label htmlFor="bulk-etapa">Etapa</Label>
              <Select 
                value={bulkEditFormData.etapa} 
                onValueChange={(value: any) => setBulkEditFormData({ ...bulkEditFormData, etapa: value })}
              >
                <SelectTrigger id="bulk-etapa">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  <SelectItem value="no-stage">
                    <span className="text-gray-500">Nenhuma</span>
                  </SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      Etapa {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.etapa === 'no-change' 
                  ? 'Etapa não será alterada' 
                  : bulkEditFormData.etapa === 'no-stage'
                  ? 'Etapa será removida de todos os pneus'
                  : `Todos os pneus terão a etapa alterada para ${bulkEditFormData.etapa}`
                }
              </p>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="bulk-categoria">Categoria</Label>
              <Select
                value={bulkEditFormData.categoria}
                onValueChange={(value: any) => setBulkEditFormData({ ...bulkEditFormData, categoria: value })}
              >
                <SelectTrigger id="bulk-categoria">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  <SelectItem value="no-category">
                    <span className="text-gray-500">Nenhuma</span>
                  </SelectItem>
                  {Array.from(new Set(entries.map(e => e.categoria).filter(Boolean))).sort().map((categoria) => (
                    <SelectItem key={categoria} value={categoria!}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.categoria === 'no-change'
                  ? 'Categoria não será alterada'
                  : bulkEditFormData.categoria === 'no-category'
                  ? 'Categoria será removida de todos os pneus'
                  : `Todos os pneus terão a categoria alterada para ${bulkEditFormData.categoria}`
                }
              </p>
            </div>

            {/* Ano (Temporada) */}
            <div className="space-y-2">
              <Label htmlFor="bulk-ano">Ano / Temporada</Label>
              <Select
                value={bulkEditFormData.ano}
                onValueChange={(value: any) => setBulkEditFormData({ ...bulkEditFormData, ano: value })}
              >
                <SelectTrigger id="bulk-ano">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  <SelectItem value="no-season">
                    <span className="text-gray-500">Nenhum</span>
                  </SelectItem>
                  {Array.from(new Set(entries.map(e => e.ano).filter(Boolean))).sort((a, b) => b!.localeCompare(a!)).map((ano) => (
                    <SelectItem key={ano} value={ano!}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.ano === 'no-change'
                  ? 'Ano não será alterado'
                  : bulkEditFormData.ano === 'no-season'
                  ? 'Ano será removido de todos os pneus'
                  : `Todos os pneus terão o ano alterado para ${bulkEditFormData.ano}`
                }
              </p>
            </div>

            {/* Piloto */}
            <div className="space-y-2">
              <Label htmlFor="bulk-pilot">Piloto</Label>
              <Select
                value={bulkEditFormData.pilot}
                onValueChange={(value: any) => setBulkEditFormData({ ...bulkEditFormData, pilot: value })}
              >
                <SelectTrigger id="bulk-pilot">
                  <SelectValue placeholder="Selecione para alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">
                    <span className="text-gray-500 italic">Não alterar</span>
                  </SelectItem>
                  <SelectItem value="no-pilot">
                    <span className="text-gray-500">Nenhum</span>
                  </SelectItem>
                  {Array.from(new Set(entries.map(e => e.pilot).filter(Boolean))).sort().map((pilot) => (
                    <SelectItem key={pilot} value={pilot!}>
                      {pilot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {bulkEditFormData.pilot === 'no-change'
                  ? 'Piloto não será alterado'
                  : bulkEditFormData.pilot === 'no-pilot'
                  ? 'Piloto será removido de todos os pneus'
                  : `Todos os pneus terão o piloto alterado para ${bulkEditFormData.pilot}`
                }
              </p>
            </div>

            {/* Resumo das alterações */}
            {(() => {
              let targetCount = 0;
              if (bulkEditSource === 'text') {
                const inputBarcodes = bulkEditBarcodes
                  .split('\n')
                  .map(b => b.trim())
                  .filter(b => b.length > 0);
                const existingBarcodes = new Set(entries.map(e => e.barcode));
                targetCount = inputBarcodes.filter(b => existingBarcodes.has(b)).length;
              } else {
                targetCount = selectedEntries.size;
              }

              const hasChanges = bulkEditFormData.modelId !== 'no-change' ||
                               bulkEditFormData.containerId !== 'no-change' ||
                               bulkEditFormData.status !== 'no-change' ||
                               bulkEditFormData.etapa !== 'no-change' ||
                               bulkEditFormData.categoria !== 'no-change' ||
                               bulkEditFormData.ano !== 'no-change' ||
                               bulkEditFormData.pilot !== 'no-change';

              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm text-blue-900 mb-2">Resumo das alterações:</h4>
                  {targetCount === 0 ? (
                    <p className="text-sm text-gray-600 italic">
                      {bulkEditSource === 'text' 
                        ? 'Digite códigos de barras válidos acima'
                        : 'Selecione pneus na tabela ou use a aba "Digitar Códigos de Barras"'
                      }
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-900">
                        <strong>{targetCount}</strong> {targetCount === 1 ? 'pneu será atualizado' : 'pneus serão atualizados'}
                      </p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {bulkEditFormData.modelId !== 'no-change' && (
                          <li>✓ Modelo será alterado</li>
                        )}
                        {bulkEditFormData.containerId !== 'no-change' && (
                          <li>✓ Contêiner será alterado</li>
                        )}
                        {bulkEditFormData.status !== 'no-change' && (
                          <li>✓ Status será alterado</li>
                        )}
                        {bulkEditFormData.etapa !== 'no-change' && (
                          <li>✓ Etapa será alterada</li>
                        )}
                        {bulkEditFormData.categoria !== 'no-change' && (
                          <li>✓ Categoria será alterada</li>
                        )}
                        {bulkEditFormData.ano !== 'no-change' && (
                          <li>✓ Ano será alterado</li>
                        )}
                        {bulkEditFormData.pilot !== 'no-change' && (
                          <li>✓ Piloto será alterado</li>
                        )}
                        {!hasChanges && (
                          <li className="text-gray-600 italic">Nenhum campo selecionado para alteração</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Barra de Progresso */}
          {isSaving && bulkEditProgress.total > 0 && (
            <div className="space-y-2 px-6 pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Processando...
                </span>
                <span className="font-medium text-[#D50000]">
                  {bulkEditProgress.current} / {bulkEditProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#D50000] h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${(bulkEditProgress.current / bulkEditProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {Math.round((bulkEditProgress.current / bulkEditProgress.total) * 100)}% concluído
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                setBulkEditDialogOpen(false);
                setBulkEditBarcodes('');
                setBulkEditSource('selection');
                setBulkEditFormData({
                  modelId: 'no-change',
                  containerId: 'no-change',
                  status: 'no-change',
                  etapa: 'no-change',
                  categoria: 'no-change',
                });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={isSaving}
              className="bg-[#D50000] hover:bg-[#B00000] text-white"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  {bulkEditProgress.total > 0 
                    ? `Salvando ${bulkEditProgress.current}/${bulkEditProgress.total}...`
                    : 'Salvando...'}
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
