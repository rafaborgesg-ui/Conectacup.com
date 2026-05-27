import { useState, useEffect } from 'react';
import { generateUUID } from '../utils/uuid';
import { Database, Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle, Settings, Scale, MapPin, RefreshCw, Grid3x3, TableIcon, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  getMasterData, 
  saveMasterDataItem, 
  deleteMasterDataItem,
  type MasterDataItem 
} from '../utils/storage';
import { 
  getPistas, 
  createPista, 
  updatePista, 
  deletePista,
  type Pista 
} from '../utils/pistaStorage';
import { MasterDataMigrationAlert } from './MasterDataMigrationAlert';
import { PistaFormExtended } from './PistaFormExtended';
import { ProtheusExcelImporter } from './ProtheusExcelImporter';
import { ChassisManager } from './ChassisManager';
import { GeracaoManager } from './GeracaoManager';

// Tipos para as regras
interface WildcardRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

interface TirePurchaseRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

interface WetTirePurchaseRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

interface BusinessRules {
  wildcardRules: WildcardRule[];
  tirePurchaseRules: TirePurchaseRule[];
  wetTirePurchaseRules: WetTirePurchaseRule[];
}

export function MasterData() {
  const [masterData, setMasterData] = useState<Record<string, MasterDataItem[]>>({});
  const [pistas, setPistas] = useState<Pista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categoria');
  const [isEditing, setIsEditing] = useState(false);
  
  // Verifica se o usuário é admin
  const isAdmin = (() => {
    try {
      const userData = localStorage.getItem('porsche-cup-user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role === 'admin';
      }
      return false;
    } catch {
      return false;
    }
  })();
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [editingPista, setEditingPista] = useState<Pista | null>(null);
  const [editingSubType, setEditingSubType] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<MasterDataItem | Pista | null>(null);
  const [dbError, setDbError] = useState<{ code?: string; message?: string } | null>(null);

  // Estados para as regras de negócio
  const [businessRules, setBusinessRules] = useState<BusinessRules>({
    wildcardRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 8 },
    ],
    tirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 1 },
    ],
    wetTirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 4 },
    ],
  });
  const [isEditingRules, setIsEditingRules] = useState(false);

  // Estados específicos para campos estendidos de Pista
  const [pistaAddress, setPistaAddress] = useState('');
  const [pistaCoordinates, setPistaCoordinates] = useState('');
  const [pistaLatitude, setPistaLatitude] = useState<number | undefined>();
  const [pistaLongitude, setPistaLongitude] = useState<number | undefined>();

  // Estados específicos para campos estendidos de Protheus
  const [protheusDescription, setProtheusDescription] = useState('');
  const [protheusResponsavel, setProtheusResponsavel] = useState('');
  
  // Estados para visualização e filtros de Protheus
  const [protheusViewMode, setProtheusViewMode] = useState<Record<string, 'card' | 'table'>>({
    setor: 'table',
    projeto: 'table',
    conta_contabil: 'table'
  });
  const [protheusSearchTerm, setProtheusSearchTerm] = useState<Record<string, string>>({
    setor: '',
    projeto: '',
    conta_contabil: ''
  });

  // Estados para visualização e filtros de seções simples
  const [viewMode, setViewMode] = useState<Record<string, 'card' | 'table'>>({
    categoria: 'table',
    campeonato: 'table',
    temporada: 'table',
    etapa: 'table',
    pista: 'table'
  });
  const [searchTerm, setSearchTerm] = useState<Record<string, string>>({
    categoria: '',
    campeonato: '',
    temporada: '',
    etapa: '',
    pista: ''
  });

  // Estados para visualização e filtros de subseções compostas
  // REMOVIDO: carrosViewMode e carrosSearchTerm (migrado para ChassisManager)

  const [pneuViewMode, setPneuViewMode] = useState<Record<string, 'card' | 'table'>>({
    tipo_pneu: 'table',
    lado_pneu: 'table'
  });
  const [pneuSearchTerm, setPneuSearchTerm] = useState<Record<string, string>>({
    tipo_pneu: '',
    lado_pneu: ''
  });

  const dataTypes = [
    { id: 'categoria', label: 'Categoria', icon: '🏁', defaultValues: ['Carrera', 'Challenge', 'Trophy'] },
    { id: 'carros', label: 'Carros', icon: '🏎️', defaultValues: [], isComposite: true },
    { id: 'pneu', label: 'Pneu', icon: '🔴', defaultValues: [], isComposite: true },
    { id: 'campeonato', label: 'Campeonato', icon: '🏆', defaultValues: ['Endurance', 'Sprint'] },
    { id: 'temporada', label: 'Temporada', icon: '📅', defaultValues: ['2025'] },
    { id: 'etapa', label: 'Etapa', icon: '📍', defaultValues: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
    { id: 'pista', label: 'Pista', icon: '🏁', defaultValues: ['Interlagos', 'Velocitta', 'Goiânia', 'Estoril', 'Algarve'], hasExtendedFields: true },
    { id: 'protheus', label: 'Protheus', icon: '💼', defaultValues: [], isComposite: true },
    { id: 'regras', label: 'Regras', icon: '⚙️', defaultValues: [] },
  ];

  // Nota: Gestão de Chassis movida para ChassisManager (tabela dedicada)

  // Subtipos para a seção composta "Pneu"
  const pneuSubTypes = [
    { id: 'tipo_pneu', label: 'Tipo de Pneu', icon: '⚫', defaultValues: ['SLICK', 'WET'] },
    { id: 'lado_pneu', label: 'Lado do Pneu', icon: '↔️', defaultValues: ['DD', 'DE', 'TD', 'TE'] },
  ];

  // Subtipos para a seção composta "Protheus"
  const protheusSubTypes = [
    { id: 'setor', label: 'Setor', icon: '🏢', defaultValues: [], hasDescription: true, hasResponsavel: true },
    { id: 'projeto', label: 'Projeto', icon: '📊', defaultValues: [], hasDescription: true },
    { id: 'conta_contabil', label: 'Conta Contábil', icon: '💰', defaultValues: [], hasDescription: true },
  ];

  useEffect(() => {
    // Carrega dados mestre primeiro, depois as regras e pistas
    const loadData = async () => {
      await loadMasterData();
      await loadPistas();
      await loadBusinessRules();
    };
    loadData();
  }, []);

  // Limpa o estado de edição quando mudar de aba
  useEffect(() => {
    setIsEditing(false);
    setEditingItem(null);
    setEditingPista(null);
    setEditingSubType(null);
    setNewItemName('');
    // Limpa campos de pista
    setPistaAddress('');
    setPistaCoordinates('');
    setPistaLatitude(undefined);
    setPistaLongitude(undefined);
    // Limpa campos de protheus
    setProtheusDescription('');
    setProtheusResponsavel('');
  }, [activeTab]);

  useEffect(() => {
    // Atualiza as regras quando categorias ou campeonatos mudarem
    // OU quando as regras são carregadas pela primeira vez
    if (masterData.categoria && masterData.campeonato && masterData.categoria.length > 0 && masterData.campeonato.length > 0) {
      // Pequeno delay para garantir que os dados estão prontos
      const timer = setTimeout(() => {
        syncBusinessRulesWithMasterData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [masterData.categoria, masterData.campeonato]);

  const syncBusinessRulesWithMasterData = () => {
    const categorias = masterData.categoria || [];
    const campeonatos = masterData.campeonato || [];

    // Se não houver categorias ou campeonatos, limpa as regras
    if (categorias.length === 0 || campeonatos.length === 0) {
      setBusinessRules({
        wildcardRules: [],
        tirePurchaseRules: [],
        wetTirePurchaseRules: []
      });
      return;
    }

    // Cria um mapa para manter quantidades existentes
    const existingWildcards = new Map(
      businessRules.wildcardRules.map(r => [`${r.categoria}-${r.campeonato}`, r.quantidade])
    );
    const existingTirePurchase = new Map(
      businessRules.tirePurchaseRules.map(r => [`${r.categoria}-${r.campeonato}`, r.quantidade])
    );
    const existingWetTirePurchase = new Map(
      businessRules.wetTirePurchaseRules.map(r => [`${r.categoria}-${r.campeonato}`, r.quantidade])
    );

    // Gera novas regras baseadas nas categorias e campeonatos cadastrados
    const newWildcardRules: WildcardRule[] = [];
    const newTirePurchaseRules: TirePurchaseRule[] = [];
    const newWetTirePurchaseRules: WetTirePurchaseRule[] = [];

    categorias.forEach(cat => {
      campeonatos.forEach(camp => {
        const key = `${cat.name}-${camp.name}`;
        
        newWildcardRules.push({
          categoria: cat.name,
          campeonato: camp.name,
          quantidade: existingWildcards.get(key) ?? 4 // Valor padrão: 4
        });

        newTirePurchaseRules.push({
          categoria: cat.name,
          campeonato: camp.name,
          quantidade: existingTirePurchase.get(key) ?? 3 // Valor padrão: 3
        });

        newWetTirePurchaseRules.push({
          categoria: cat.name,
          campeonato: camp.name,
          quantidade: existingWetTirePurchase.get(key) ?? 4 // Valor padrão: 4
        });
      });
    });

    // Verifica se houve mudanças
    const hasChanges = 
      newWildcardRules.length !== businessRules.wildcardRules.length ||
      JSON.stringify(newWildcardRules) !== JSON.stringify(businessRules.wildcardRules);

    // Atualiza e notifica se houver mudanças
    if (hasChanges) {
      setBusinessRules({
        wildcardRules: newWildcardRules,
        tirePurchaseRules: newTirePurchaseRules,
        wetTirePurchaseRules: newWetTirePurchaseRules
      });

      // Notifica o usuário sobre a sincronização
      const newCombinations = newWildcardRules.length - businessRules.wildcardRules.length;
      if (newCombinations > 0) {
        toast.info(`${newCombinations} ${newCombinations === 1 ? 'nova regra gerada' : 'novas regras geradas'} automaticamente`, {
          description: 'As tabelas de regras foram atualizadas com base nas categorias e campeonatos.'
        });
      }
    }
  };

  const loadMasterData = async () => {
    try {
      setIsLoading(true);
      setDbError(null);
      console.log('📊 Master Data: Carregando dados do Supabase...');
      const data = await getMasterData();
      console.log('✅ Master Data: Dados carregados do Supabase com sucesso');
      setMasterData(data);
    } catch (error: any) {
      console.error('Erro ao carregar master data:', error);
      
      // Verifica se é erro de tabela não encontrada
      if (error?.code === 'PGRST205' || error?.message?.includes('master_data')) {
        setDbError({
          code: error?.code || 'PGRST205',
          message: error?.message || 'Tabela master_data não encontrada'
        });
        toast.error('Tabela master_data não encontrada. Execute a migration primeiro.', {
          duration: 10000,
          action: {
            label: 'Ver instruções',
            onClick: () => window.open('/PASSO_A_PASSO_MASTER_DATA.md', '_blank')
          }
        });
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadPistas = async () => {
    try {
      console.log('🏁 Carregando pistas do Supabase...');
      const data = await getPistas();
      console.log(`✅ ${data.length} pistas carregadas com sucesso`);
      setPistas(data);
    } catch (error: any) {
      console.error('Erro ao carregar pistas:', error);
      toast.error('Erro ao carregar pistas');
    }
  };

  const loadBusinessRules = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/business-rules`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (response.ok) {
        const rules = await response.json();
        if (rules) {
          // Garante que wetTirePurchaseRules sempre existe (retrocompatibilidade)
          // Não filtramos aqui, pois a sincronização com categorias/campeonatos
          // é feita pelo useEffect que monitora mudanças em masterData
          const completeRules: BusinessRules = {
            wildcardRules: rules.wildcardRules || [],
            tirePurchaseRules: rules.tirePurchaseRules || [],
            wetTirePurchaseRules: rules.wetTirePurchaseRules || [],
          };
          setBusinessRules(completeRules);
        }
      }
    } catch (error) {
      console.log('Usando regras padrão');
    }
  };

  const saveBusinessRules = async () => {
    try {
      // Validação antes de salvar
      const categoriasValidas = masterData['categoria']?.map(c => c.name) || [];
      const campeonatosValidos = masterData['campeonato']?.map(c => c.name) || [];
      
      // Filtra apenas regras com categoria e campeonato válidos
      const validatedRules: BusinessRules = {
        wildcardRules: businessRules.wildcardRules.filter(rule => 
          categoriasValidas.includes(rule.categoria) && 
          campeonatosValidos.includes(rule.campeonato)
        ),
        tirePurchaseRules: businessRules.tirePurchaseRules.filter(rule => 
          categoriasValidas.includes(rule.categoria) && 
          campeonatosValidos.includes(rule.campeonato)
        ),
        wetTirePurchaseRules: businessRules.wetTirePurchaseRules.filter(rule => 
          categoriasValidas.includes(rule.categoria) && 
          campeonatosValidos.includes(rule.campeonato)
        ),
      };
      
      // Verifica se alguma regra foi filtrada
      const filteredCount = 
        (businessRules.wildcardRules.length - validatedRules.wildcardRules.length) +
        (businessRules.tirePurchaseRules.length - validatedRules.tirePurchaseRules.length) +
        (businessRules.wetTirePurchaseRules.length - validatedRules.wetTirePurchaseRules.length);
      
      if (filteredCount > 0) {
        toast.error(`${filteredCount} regra(s) com categoria ou campeonato inválido foram removidas. Verifique os dados cadastrados.`);
        setBusinessRules(validatedRules);
        return;
      }

      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/business-rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedRules),
        }
      );

      if (response.ok) {
        toast.success('Regras salvas com sucesso');
        setIsEditingRules(false);
      } else {
        const errorData = await response.json();
        console.error('Erro ao salvar regras:', errorData);
        
        // Verifica se é erro de constraint
        const errorMessage = errorData.error || '';
        if (errorMessage.includes('business_rules_campeonato_check') || 
            errorMessage.includes('business_rules_categoria_check') ||
            errorMessage.includes('check constraint')) {
          toast.error('Erro: O banco de dados não aceita novos valores. Execute a migration FIX_BUSINESS_RULES_CONSTRAINTS.sql', {
            duration: 10000,
            description: 'Consulte /docs/BUSINESS_RULES_CONSTRAINTS_FIX.md para instruções'
          });
        } else {
          toast.error(errorMessage || 'Erro ao salvar regras');
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar regras:', error);
      
      // Verifica se é erro de constraint no catch também
      const errorMessage = error?.message || '';
      if (errorMessage.includes('business_rules_campeonato_check') || 
          errorMessage.includes('business_rules_categoria_check') ||
          errorMessage.includes('check constraint')) {
        toast.error('Erro: O banco de dados não aceita novos valores. Execute a migration FIX_BUSINESS_RULES_CONSTRAINTS.sql', {
          duration: 10000,
          description: 'Consulte /docs/BUSINESS_RULES_CONSTRAINTS_FIX.md para instruções'
        });
      } else {
        toast.error('Erro ao salvar regras');
      }
    }
  };

  const updateWildcardRule = (index: number, quantidade: number) => {
    const newRules = [...businessRules.wildcardRules];
    newRules[index].quantidade = quantidade;
    setBusinessRules({ ...businessRules, wildcardRules: newRules });
  };

  const updateTirePurchaseRule = (index: number, quantidade: number) => {
    const newRules = [...businessRules.tirePurchaseRules];
    newRules[index].quantidade = quantidade;
    setBusinessRules({ ...businessRules, tirePurchaseRules: newRules });
  };

  const updateWetTirePurchaseRule = (index: number, quantidade: number) => {
    const newRules = [...businessRules.wetTirePurchaseRules];
    newRules[index].quantidade = quantidade;
    setBusinessRules({ ...businessRules, wetTirePurchaseRules: newRules });
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditingItem(null);
    setNewItemName('');
    // Limpa campos de pista
    setPistaAddress('');
    setPistaCoordinates('');
    setPistaLatitude(undefined);
    setPistaLongitude(undefined);
    // Limpa campos de protheus
    setProtheusDescription('');
    setProtheusResponsavel('');
  };

  const handleEdit = (item: MasterDataItem | Pista) => {
    setIsEditing(true);
    
    // Verifica se é uma Pista pela activeTab ou pela propriedade type
    if (activeTab === 'pista' || (item as any).type === 'pista') {
      // Busca a pista original do estado
      const pistaOriginal = pistas.find(p => p.id === item.id);
      
      if (pistaOriginal) {
        setEditingPista(pistaOriginal);
        setNewItemName(pistaOriginal.nome);
        setPistaAddress(pistaOriginal.endereco || '');
        setPistaCoordinates(pistaOriginal.coordenadas || '');
      } else {
        // Fallback: usa o objeto transformado
        const masterItem = item as MasterDataItem;
        setNewItemName(masterItem.name);
        setPistaAddress(masterItem.address || '');
        setPistaCoordinates(masterItem.coordinates || '');
      }
      return;
    }
    
    // É MasterDataItem
    const masterItem = item as MasterDataItem;
    setEditingItem(masterItem);
    setNewItemName(masterItem.name);
    
    // Carrega campos de protheus se existirem
    const protheusTypes = ['setor', 'projeto', 'conta_contabil'];
    if (protheusTypes.includes(masterItem.type)) {
      setProtheusDescription(masterItem.description || '');
      setProtheusResponsavel(masterItem.responsavel || '');
    }
  };

  const handleSave = async () => {
    if (!newItemName.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }

    try {
      // Lógica especial para PISTA - usa tabela separada
      if (activeTab === 'pista') {
        const pistaData = {
          nome: newItemName.trim(),
          endereco: pistaAddress.trim() || undefined,
          coordenadas: pistaCoordinates.trim() || undefined,
        };

        if (editingPista) {
          // Atualização de pista existente
          await updatePista(editingPista.id, pistaData);
          toast.success('Pista atualizada');
        } else {
          // Criação de nova pista
          await createPista(pistaData);
          toast.success('Pista adicionada');
        }
        
        await loadPistas();
        
        setIsEditing(false);
        setEditingPista(null);
        setNewItemName('');
        setPistaAddress('');
        setPistaCoordinates('');
        setPistaLatitude(undefined);
        setPistaLongitude(undefined);
        return;
      }

      // Lógica NORMAL para outros tipos (master_data)
      const baseItem: MasterDataItem = editingItem 
        ? { ...editingItem, name: newItemName.trim() }
        : {
            id: generateUUID(),
            type: activeTab,
            name: newItemName.trim(),
            createdAt: new Date().toISOString(),
          };

      let item: MasterDataItem = baseItem;

      // Adiciona campos de protheus se for tipo protheus (setor, projeto, conta_contabil)
      const protheusTypes = ['setor', 'projeto', 'conta_contabil'];
      if (protheusTypes.includes(activeTab)) {
        item = {
          ...item,
          description: protheusDescription.trim() || undefined,
          responsavel: activeTab === 'setor' ? (protheusResponsavel.trim() || undefined) : undefined,
        };
      }

      await saveMasterDataItem(item);
      await loadMasterData();
      
      setIsEditing(false);
      setEditingItem(null);
      setEditingSubType(null);
      setNewItemName('');
      setPistaAddress('');
      setPistaCoordinates('');
      setPistaLatitude(undefined);
      setPistaLongitude(undefined);
      // Limpa campos de protheus
      setProtheusDescription('');
      setProtheusResponsavel('');
      
      toast.success(editingItem ? 'Item atualizado' : 'Item adicionado');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar item');
    }
  };

  const handleDelete = async (item: MasterDataItem | Pista) => {
    try {
      // Verifica se é uma Pista (tabela separada)
      // Usa propriedade 'type' ou 'address' porque a transformação muda 'endereco' para 'address'
      if ((item as any).type === 'pista' || 'address' in item || 'endereco' in item) {
        await deletePista(item.id);
        await loadPistas();
        toast.success('Pista removida');
      } else {
        // É MasterDataItem
        await deleteMasterDataItem(item.id);
        await loadMasterData();
        toast.success('Item removido');
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao remover item');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingItem(null);
    setEditingPista(null);
    setEditingSubType(null);
    setNewItemName('');
    // Limpa campos de pista
    setPistaAddress('');
    setPistaCoordinates('');
    setPistaLatitude(undefined);
    setPistaLongitude(undefined);
    // Limpa campos de protheus
    setProtheusDescription('');
    setProtheusResponsavel('');
  };

  // Se for pista, usa o estado de pistas; senão usa masterData
  const currentTypeData = activeTab === 'pista' 
    ? pistas.map(p => ({ id: p.id, name: p.nome, address: p.endereco, coordinates: p.coordenadas, createdAt: p.created_at, type: 'pista' }))
    : (masterData[activeTab] || []);
  const currentDataType = dataTypes.find(dt => dt.id === activeTab);

  if (isLoading) {
    return (
      <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      {/* Alerta de Migration */}
      <MasterDataMigrationAlert 
        errorCode={dbError?.code}
        errorMessage={dbError?.message}
      />
      
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-gray-900">Master Data</h1>
              <p className="text-gray-500">Dados base do sistema</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-blue-900 text-sm mb-1">Sobre Master Data</h3>
              <p className="text-xs text-blue-700">
                Configure aqui os dados mestres que serão utilizados em todo o sistema: categorias, gerações de carros, 
                tipos de pneus, campeonatos, pistas e mais. Esses dados alimentam os formulários e relatórios.
              </p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto hide-scrollbar">
            <TabsList className="inline-flex min-w-full lg:min-w-0">
              {dataTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="whitespace-nowrap">
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {dataTypes.filter(type => type.id !== 'regras' && type.id !== 'pneu' && type.id !== 'carros' && type.id !== 'protheus').map((type) => {
            const currentViewMode = viewMode[type.id] || 'table';
            const currentSearchTerm = searchTerm[type.id] || '';
            
            // Filtrar itens baseado na pesquisa
            const allData = currentTypeData;
            const filteredData = allData.filter(item => {
              if (!currentSearchTerm) return true;
              const searchLower = currentSearchTerm.toLowerCase();
              return (
                item.name.toLowerCase().includes(searchLower) ||
                (item.address && item.address.toLowerCase().includes(searchLower)) ||
                (item.coordinates && item.coordinates.toLowerCase().includes(searchLower))
              );
            });
            
            return (
            <TabsContent key={type.id} value={type.id} className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-gray-900 mb-1">{type.label}</h2>
                    <p className="text-sm text-gray-500">
                      {filteredData.length} {filteredData.length === 1 ? 'item' : 'itens'} {currentSearchTerm && `(${allData.length} total)`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddNew}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <Plus size={16} className="mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
                
                {/* Barra de Filtro e Visualização */}
                {allData.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        placeholder="Pesquisar..."
                        value={currentSearchTerm}
                        onChange={(e) => setSearchTerm({
                          ...searchTerm,
                          [type.id]: e.target.value
                        })}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex border rounded-lg overflow-hidden">
                      <Button
                        onClick={() => setViewMode({
                          ...viewMode,
                          [type.id]: 'card'
                        })}
                        variant={currentViewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        className={currentViewMode === 'card' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <Grid3x3 size={16} />
                      </Button>
                      <Button
                        onClick={() => setViewMode({
                          ...viewMode,
                          [type.id]: 'table'
                        })}
                        variant={currentViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className={currentViewMode === 'table' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <TableIcon size={16} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Form de Edição/Criação */}
                {isEditing && (
                  <Card className="p-4 mb-4 bg-gray-50 border-2 border-red-200">
                    <div className="space-y-4">
                      {type.id === 'pista' ? (
                        // Formulário estendido para Pista
                        <>
                          <PistaFormExtended
                            name={newItemName}
                            address={pistaAddress}
                            coordinates={pistaCoordinates}
                            latitude={pistaLatitude}
                            longitude={pistaLongitude}
                            onNameChange={setNewItemName}
                            onAddressChange={setPistaAddress}
                            onCoordinatesChange={(coords, lat, lng) => {
                              setPistaCoordinates(coords);
                              setPistaLatitude(lat);
                              setPistaLongitude(lng);
                            }}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSave}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Save size={16} className="mr-2" />
                              Salvar
                            </Button>
                            <Button
                              onClick={handleCancel}
                              variant="outline"
                              size="sm"
                            >
                              <X size={16} className="mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </>
                      ) : (
                        // Formulário simples para outros tipos
                        <>
                          <div>
                            <Label htmlFor="item-name">
                              {editingItem ? 'Editar' : 'Novo'} {type.label}
                            </Label>
                            <Input
                              id="item-name"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder={`Digite o nome do ${type.label.toLowerCase()}`}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') handleCancel();
                              }}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSave}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Save size={16} className="mr-2" />
                              Salvar
                            </Button>
                            <Button
                              onClick={handleCancel}
                              variant="outline"
                              size="sm"
                            >
                              <X size={16} className="mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                )}

                {/* Lista de Itens */}
                {filteredData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-gray-900 mb-2">
                      {currentSearchTerm ? 'Nenhum resultado encontrado' : 'Nenhum item cadastrado'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {currentSearchTerm ? 'Tente buscar com outros termos.' : 'Clique em "Adicionar" para cadastrar novos itens.'}
                    </p>
                  </div>
                ) : currentViewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredData
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((item) => (
                        <Card
                          key={item.id}
                          className="p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{type.icon}</span>
                                <span className="text-gray-900">{item.name}</span>
                              </div>
                              
                              {/* Campos especiais para pista */}
                              {type.id === 'pista' && item.address && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-gray-600 flex items-start gap-1">
                                    <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                                    <span>{item.address}</span>
                                  </p>
                                  {item.coordinates && (
                                    <p className="text-xs text-gray-500">
                                      📍 {item.coordinates}
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {item.createdAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEdit(item)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 size={14} className="text-blue-600" />
                              </Button>
                              <Button
                                onClick={() => setDeleteConfirm(item)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-700">{type.label}</th>
                          {type.id === 'pista' && (
                            <>
                              <th className="px-4 py-3 text-left text-gray-700">Endereço</th>
                              <th className="px-4 py-3 text-left text-gray-700">Coordenadas</th>
                            </>
                          )}
                          <th className="px-4 py-3 text-left text-gray-700">Data de Criação</th>
                          <th className="px-4 py-3 text-right text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((item, index) => (
                            <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span>{type.icon}</span>
                                  <span className="text-gray-900">{item.name}</span>
                                </div>
                              </td>
                              {type.id === 'pista' && (
                                <>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {item.address || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {item.coordinates || '-'}
                                  </td>
                                </>
                              )}
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    onClick={() => handleEdit(item)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 size={14} className="text-blue-600" />
                                  </Button>
                                  <Button
                                    onClick={() => setDeleteConfirm(item)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 size={14} className="text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>
          );
          })}

          {/* Aba Especial de Carros (Nova gestão dedicada) */}
          <TabsContent value="carros" className="space-y-6">
            <Card className="p-6">
              <GeracaoManager />
            </Card>
            
            <Card className="p-6">
              <ChassisManager />
            </Card>
          </TabsContent>

          {/* Aba Especial de Pneu (Composta) */}
          <TabsContent value="pneu" className="space-y-6">
            {pneuSubTypes.map((subType, subTypeIndex) => {
              const subTypeData = masterData[subType.id] || [];
              return (
                <Card key={subType.id} className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-gray-900 mb-1">{subType.label}</h2>
                      <p className="text-sm text-gray-500">
                        {subTypeData.length} {subTypeData.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setIsEditing(true);
                          setEditingSubType(subType.id);
                          setEditingItem(null);
                          setNewItemName('');
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        <Plus size={16} className="mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Form de Edição/Criação */}
                  {isEditing && editingSubType === subType.id && (
                    <Card className="p-4 mb-4 bg-gray-50 border-2 border-red-200">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`item-name-${subType.id}`}>
                            {editingItem ? 'Editar' : 'Novo'} {subType.label}
                          </Label>
                          <Input
                            id={`item-name-${subType.id}`}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={`Digite o nome do ${subType.label.toLowerCase()}`}
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                if (!newItemName.trim()) {
                                  toast.error('Nome não pode estar vazio');
                                  return;
                                }

                                try {
                                  const item: MasterDataItem = editingItem 
                                    ? { ...editingItem, name: newItemName.trim() }
                                    : {
                                        id: generateUUID(),
                                        type: subType.id,
                                        name: newItemName.trim(),
                                        createdAt: new Date().toISOString(),
                                      };

                                  await saveMasterDataItem(item);
                                  await loadMasterData();
                                  
                                  setIsEditing(false);
                                  setEditingItem(null);
                                  setEditingSubType(null);
                                  setNewItemName('');
                                  
                                  toast.success(editingItem ? 'Item atualizado' : 'Item adicionado');
                                } catch (error) {
                                  console.error('Erro ao salvar:', error);
                                  toast.error('Erro ao salvar item');
                                }
                              }
                              if (e.key === 'Escape') {
                                setIsEditing(false);
                                setEditingItem(null);
                                setEditingSubType(null);
                                setNewItemName('');
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              if (!newItemName.trim()) {
                                toast.error('Nome não pode estar vazio');
                                return;
                              }

                              try {
                                const item: MasterDataItem = editingItem 
                                  ? { ...editingItem, name: newItemName.trim() }
                                  : {
                                      id: generateUUID(),
                                      type: subType.id,
                                      name: newItemName.trim(),
                                      createdAt: new Date().toISOString(),
                                    };

                                await saveMasterDataItem(item);
                                await loadMasterData();
                                
                                setIsEditing(false);
                                setEditingItem(null);
                                setEditingSubType(null);
                                setNewItemName('');
                                
                                toast.success(editingItem ? 'Item atualizado' : 'Item adicionado');
                              } catch (error) {
                                console.error('Erro ao salvar:', error);
                                toast.error('Erro ao salvar item');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Save size={16} className="mr-2" />
                            Salvar
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditing(false);
                              setEditingItem(null);
                              setEditingSubType(null);
                              setNewItemName('');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <X size={16} className="mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Lista de Itens */}
                  {subTypeData.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Database className="text-gray-400" size={32} />
                      </div>
                      <h3 className="text-gray-900 mb-2">Nenhum item cadastrado</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Clique em "Adicionar" para cadastrar novos itens.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subTypeData
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item) => (
                          <Card
                            key={item.id}
                            className="p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{subType.icon}</span>
                                  <span className="text-gray-900">{item.name}</span>
                                </div>
                                {item.createdAt && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => {
                                    setIsEditing(true);
                                    setEditingSubType(subType.id);
                                    setEditingItem(item);
                                    setNewItemName(item.name);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 size={14} className="text-blue-600" />
                                </Button>
                                <Button
                                  onClick={() => setDeleteConfirm(item)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 size={14} className="text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* Aba Especial de Protheus (Composta) */}
          <TabsContent value="protheus" className="space-y-6">
            {/* Componente de Importação de Excel */}
            <ProtheusExcelImporter 
              onImportComplete={() => loadMasterData()} 
              isAdmin={isAdmin}
            />
            
            {protheusSubTypes.map((subType, subTypeIndex) => {
              const subTypeData = masterData[subType.id] || [];
              const currentViewMode = protheusViewMode[subType.id] || 'card';
              const currentSearchTerm = protheusSearchTerm[subType.id] || '';
              
              // Filtrar itens baseado na pesquisa
              const filteredData = subTypeData.filter(item => {
                if (!currentSearchTerm) return true;
                const searchLower = currentSearchTerm.toLowerCase();
                return (
                  item.name.toLowerCase().includes(searchLower) ||
                  (item.description && item.description.toLowerCase().includes(searchLower)) ||
                  (item.responsavel && item.responsavel.toLowerCase().includes(searchLower))
                );
              });
              
              return (
                <Card key={subType.id} className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-gray-900 mb-1">{subType.label}</h2>
                      <p className="text-sm text-gray-500">
                        {filteredData.length} {filteredData.length === 1 ? 'item' : 'itens'} {currentSearchTerm && `(${subTypeData.length} total)`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setIsEditing(true);
                          setEditingSubType(subType.id);
                          setEditingItem(null);
                          setNewItemName('');
                          setProtheusDescription('');
                          setProtheusResponsavel('');
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        <Plus size={16} className="mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Barra de Filtro e Visualização */}
                  {subTypeData.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                          placeholder="Pesquisar..."
                          value={currentSearchTerm}
                          onChange={(e) => setProtheusSearchTerm({
                            ...protheusSearchTerm,
                            [subType.id]: e.target.value
                          })}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex border rounded-lg overflow-hidden">
                        <Button
                          onClick={() => setProtheusViewMode({
                            ...protheusViewMode,
                            [subType.id]: 'card'
                          })}
                          variant={currentViewMode === 'card' ? 'default' : 'ghost'}
                          size="sm"
                          className={currentViewMode === 'card' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          <Grid3x3 size={16} />
                        </Button>
                        <Button
                          onClick={() => setProtheusViewMode({
                            ...protheusViewMode,
                            [subType.id]: 'table'
                          })}
                          variant={currentViewMode === 'table' ? 'default' : 'ghost'}
                          size="sm"
                          className={currentViewMode === 'table' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          <TableIcon size={16} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Form de Edição/Criação */}
                  {isEditing && editingSubType === subType.id && (
                    <Card className="p-4 mb-4 bg-gray-50 border-2 border-red-200">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`item-name-${subType.id}`}>
                            {subType.id === 'setor' ? 'Setor' : subType.id === 'projeto' ? 'Projeto' : 'Conta Contábil'}
                          </Label>
                          <Input
                            id={`item-name-${subType.id}`}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={`Digite o nome ${subType.id === 'conta_contabil' ? 'da conta contábil' : `do ${subType.label.toLowerCase()}`}`}
                            autoFocus
                          />
                        </div>

                        {/* Campo Descrição (todos os tipos) */}
                        {subType.hasDescription && (
                          <div>
                            <Label htmlFor={`item-description-${subType.id}`}>
                              Descrição
                            </Label>
                            <Input
                              id={`item-description-${subType.id}`}
                              value={protheusDescription}
                              onChange={(e) => setProtheusDescription(e.target.value)}
                              placeholder="Digite a descrição"
                            />
                          </div>
                        )}

                        {/* Campo Responsável (apenas para Setor) */}
                        {subType.hasResponsavel && (
                          <div>
                            <Label htmlFor={`item-responsavel-${subType.id}`}>
                              Responsável
                            </Label>
                            <Input
                              id={`item-responsavel-${subType.id}`}
                              value={protheusResponsavel}
                              onChange={(e) => setProtheusResponsavel(e.target.value)}
                              placeholder="Digite o nome do responsável"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              if (!newItemName.trim()) {
                                toast.error('Nome não pode estar vazio');
                                return;
                              }

                              try {
                                const baseItem: MasterDataItem = editingItem 
                                  ? { ...editingItem, name: newItemName.trim() }
                                  : {
                                      id: generateUUID(),
                                      type: subType.id,
                                      name: newItemName.trim(),
                                      createdAt: new Date().toISOString(),
                                    };

                                // Adiciona campos estendidos
                                const item: MasterDataItem = {
                                  ...baseItem,
                                  description: protheusDescription.trim() || undefined,
                                  responsavel: subType.hasResponsavel ? (protheusResponsavel.trim() || undefined) : undefined,
                                };

                                console.log('💾 Salvando item Protheus:', {
                                  type: item.type,
                                  name: item.name,
                                  description: item.description,
                                  responsavel: item.responsavel,
                                });

                                await saveMasterDataItem(item);
                                await loadMasterData();
                                
                                setIsEditing(false);
                                setEditingItem(null);
                                setEditingSubType(null);
                                setNewItemName('');
                                setProtheusDescription('');
                                setProtheusResponsavel('');
                                
                                toast.success(editingItem ? 'Item atualizado' : 'Item adicionado');
                              } catch (error) {
                                console.error('Erro ao salvar:', error);
                                toast.error('Erro ao salvar item');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Save size={16} className="mr-2" />
                            Salvar
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditing(false);
                              setEditingItem(null);
                              setEditingSubType(null);
                              setNewItemName('');
                              setProtheusDescription('');
                              setProtheusResponsavel('');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <X size={16} className="mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Lista de Itens */}
                  {filteredData.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Database className="text-gray-400" size={32} />
                      </div>
                      <h3 className="text-gray-900 mb-2">
                        {currentSearchTerm ? 'Nenhum resultado encontrado' : 'Nenhum item cadastrado'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {currentSearchTerm ? 'Tente buscar com outros termos.' : 'Clique em "Adicionar" para cadastrar novos itens.'}
                      </p>
                    </div>
                  ) : currentViewMode === 'card' ? (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredData
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item) => (
                          <Card
                            key={item.id}
                            className="p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl">{subType.icon}</span>
                                  <span className="text-gray-900">{item.name}</span>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mb-1 ml-9">
                                    <span className="text-gray-500">Descrição:</span> {item.description}
                                  </p>
                                )}
                                {item.responsavel && (
                                  <p className="text-sm text-gray-600 mb-1 ml-9">
                                    <span className="text-gray-500">Responsável:</span> {item.responsavel}
                                  </p>
                                )}
                                {item.createdAt && (
                                  <p className="text-xs text-gray-400 mt-1 ml-9">
                                    Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => {
                                    setIsEditing(true);
                                    setEditingSubType(subType.id);
                                    setEditingItem(item);
                                    setNewItemName(item.name);
                                    setProtheusDescription(item.description || '');
                                    setProtheusResponsavel(item.responsavel || '');
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 size={14} className="text-blue-600" />
                                </Button>
                                <Button
                                  onClick={() => setDeleteConfirm(item)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 size={14} className="text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-700">
                              {subType.id === 'setor' ? 'Setor' : subType.id === 'projeto' ? 'Projeto' : 'Conta Contábil'}
                            </th>
                            <th className="px-4 py-3 text-left text-gray-700">Descrição</th>
                            {subType.hasResponsavel && (
                              <th className="px-4 py-3 text-left text-gray-700">Responsável</th>
                            )}
                            <th className="px-4 py-3 text-left text-gray-700">Data de Criação</th>
                            <th className="px-4 py-3 text-right text-gray-700">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((item, index) => (
                              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span>{subType.icon}</span>
                                    <span className="text-gray-900">{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {item.description || '-'}
                                </td>
                                {subType.hasResponsavel && (
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {item.responsavel || '-'}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      onClick={() => {
                                        setIsEditing(true);
                                        setEditingSubType(subType.id);
                                        setEditingItem(item);
                                        setNewItemName(item.name);
                                        setProtheusDescription(item.description || '');
                                        setProtheusResponsavel(item.responsavel || '');
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 size={14} className="text-blue-600" />
                                    </Button>
                                    <Button
                                      onClick={() => setDeleteConfirm(item)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 size={14} className="text-red-600" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* Aba de Regras */}
          <TabsContent value="regras" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-gray-900 mb-1">Regras de Negócio</h2>
                  <p className="text-sm text-gray-500">
                    Configure limites de compra de pneus e coringas
                  </p>
                </div>
                <div className="flex gap-2">
                  {isEditingRules ? (
                    <>
                      <Button
                        onClick={saveBusinessRules}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Save size={16} className="mr-2" />
                        Salvar Regras
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingRules(false);
                          loadBusinessRules();
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X size={16} className="mr-2" />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          syncBusinessRulesWithMasterData();
                          toast.success('Regras regeneradas com sucesso!');
                        }}
                        variant="outline"
                        size="sm"
                        title="Regenera as regras baseado nas Categorias e Campeonatos cadastrados"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        Regenerar Regras
                      </Button>
                      <Button
                        onClick={() => setIsEditingRules(true)}
                        className="bg-red-600 hover:bg-red-700"
                        size="sm"
                        disabled={businessRules.wildcardRules.length === 0}
                      >
                        <Edit2 size={16} className="mr-2" />
                        Editar Regras
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Info Card - Tabelas Dinâmicas */}
              <Card className="p-4 mb-6 bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-green-600 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-green-900 text-sm mb-1">Tabelas Dinâmicas</h3>
                    <p className="text-xs text-green-700">
                      As regras abaixo são geradas automaticamente com base nas <strong>Categorias</strong> e <strong>Campeonatos</strong> cadastrados. 
                      Cadastre primeiro esses dados nas respectivas abas para configurar as regras.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Mensagem quando não há regras */}
              {businessRules.wildcardRules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="text-gray-400" size={32} />
                  </div>
                  <h3 className="text-gray-900 mb-2">Nenhuma regra disponível</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Cadastre <strong>Categorias</strong> e <strong>Campeonatos</strong> primeiro<br />
                    para gerar as tabelas de regras automaticamente.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setActiveTab('categoria')}
                      variant="outline"
                      size="sm"
                    >
                      Ir para Categorias
                    </Button>
                    <Button
                      onClick={() => setActiveTab('campeonato')}
                      variant="outline"
                      size="sm"
                    >
                      Ir para Campeonatos
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Regras de Coringas */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-gray-900 mb-1">Coringas por Piloto/Ano</h3>
                      <p className="text-sm text-gray-500">
                        Quantidade de coringas que podem ser comprados por piloto no ano/temporada
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Categoria</th>
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Campeonato</th>
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businessRules.wildcardRules.map((rule, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {rule.categoria}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  {rule.campeonato}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {isEditingRules ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={rule.quantidade}
                                    onChange={(e) => updateWildcardRule(index, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                ) : (
                                  <span className="text-gray-900">{rule.quantidade} coringas</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Regras de Pneus Slick por Etapa */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-gray-900 mb-1">Pneus SLICK por Piloto/Etapa</h3>
                      <p className="text-sm text-gray-500">
                        Quantidade de pneus slick que podem ser comprados por piloto e etapa
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Categoria</th>
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Campeonato</th>
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businessRules.tirePurchaseRules.map((rule, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {rule.categoria}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  {rule.campeonato}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {isEditingRules ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={rule.quantidade}
                                    onChange={(e) => updateTirePurchaseRule(index, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                ) : (
                                  <span className="text-gray-900">{rule.quantidade} pneus</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Regras de Pneus WET por Etapa */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-gray-900 mb-1">Pneus WET por Piloto/Etapa</h3>
                      <p className="text-sm text-gray-500">
                        Quantidade de pneus wet que podem ser comprados por piloto e etapa
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Categoria</th>
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Campeonato</th>
                            <th className="text-left py-3 px-4 text-sm text-gray-700">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(businessRules.wetTirePurchaseRules || []).map((rule, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {rule.categoria}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  {rule.campeonato}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {isEditingRules ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={rule.quantidade}
                                    onChange={(e) => updateWetTirePurchaseRule(index, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                ) : (
                                  <span className="text-gray-900">{rule.quantidade} pneus</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Info Card */}
                  <Card className="p-4 bg-yellow-50 border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                      <div>
                        <h3 className="text-yellow-900 text-sm mb-1">Importante</h3>
                        <p className="text-xs text-yellow-700">
                          Estas regras definem os limites permitidos no sistema. Alterações afetam todos os registros futuros.
                          Certifique-se de revisar antes de salvar.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteConfirm?.name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}